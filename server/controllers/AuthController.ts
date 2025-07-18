import axios from 'axios';
import { randomBytes } from 'crypto';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  CompactEncrypt,
  createRemoteJWKSet,
  exportJWK,
  importPKCS8,
  importSPKI,
  JWK,
  jwtVerify,
  KeyLike,
  SignJWT,
} from 'jose';
import { TextEncoder } from 'util';
import { URLSearchParams } from 'url';
import { Agent } from 'https';
import { Op, UniqueConstraintError, WhereOptions } from 'sequelize';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { Application, ResetPasswordToken, sequelize, Session, User, UserApplication } from '../models';
import { EmailVerificationController } from './EmailVerificationController';
import { MailController } from './MailController';
import { DEFAULT_AVATAR, UUID_V4_REGEX } from './UserController';
import { DEFAULT_FIRST_NAME, DEFAULT_LAST_NAME, getProductionURL } from '../helpers';
import errors from '../errors';
import { CookieOptions, Request, Response } from 'express';
import type {
  RegisterBody,
  VerifyEmailBody,
  CreateUserFromExternalIdPHeaders,
  CompleteLoginQuery,
  InitLoginQuery,
  InitResetPasswordBody,
  ResetPasswordBody,
  TokenAuthenticationVerificationResult,
  CheckCASInterruptQuery,
  AutoProvisionUserBody,
  completeRegistrationBody,
  ADAPTSpecialRole,
  BackChannelSLOBody,
  BackChannelSLOQuery,
} from '../types/auth';
import { LoginEventController } from '@server/controllers/LoginEventController';
import { XMLParser } from 'fast-xml-parser';
import { EventSubscriberEmitter } from '@server/events/EventSubscriberEmitter';
import { AppLicenseController } from './AppLicenseController';

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
const SESSION_DOMAIN = getProductionURL();
const COOKIE_DOMAIN = SESSION_DOMAIN.replace('https://', '');
const SESSION_DEFAULT_EXPIRY_MINUTES = 7 * 24 * 60; // 7 days

const SELF_PROTO = process.env.NODE_ENV === 'production' ? 'https' : 'http';
const SELF_BASE = `${SELF_PROTO}://${process.env.DOMAIN}`;

const CAS_PROTO = process.env.CAS_PROTO || 'https';
const CAS_BASE = `${CAS_PROTO}://${process.env.CAS_DOMAIN}`;
const CAS_LOGIN = `${CAS_BASE}/cas/login`;
const CAS_CALLBACK = `${SESSION_DOMAIN}/api/v1/auth/cas-callback`;
const CAS_VALIDATE = `${CAS_BASE}/cas/p3/serviceValidate`;
const CAS_LOGOUT = `${CAS_BASE}/cas/logout`;

export class AuthController {
  private ssm: SSMClient;
  private casBridgePrivKey: KeyLike;
  private casBridgePubKey: JWK;
  private casBridgePubKeyID: string;

  constructor() {
    this.ssm = new SSMClient({
      credentials: {
        accessKeyId: process.env.AWS_SSM_ACCESS_KEY || 'unknown',
        secretAccessKey: process.env.AWS_SSM_SECRET_KEY || 'unknown',
      },
      region: process.env.AWS_SSM_REGION,
    });
  }

  /**
   * Determines whether an API request contains authentication cookies.
   *
   * @param req - An incoming API request.
   * @returns True if authentication cookies are present, false otherwise.
   */
  static checkAuthCookies(req: Request): boolean {
    return Object.hasOwn(req.cookies, 'one_access') && Object.hasOwn(req.cookies, 'one_signed');
  }

  /**
   * Parses a header from CAS (in key=value) string format into an object.
   *
   * @param header - The header string to parse.
   * @returns The parsed key-value pair(s).
   */
  static parseCASKeyValueHeader(header: string) {
    const headerObject: Record<string, string> = {};
    const regex = /(\w+)=\[(.*?)\]/g;
    let match;
    while ((match = regex.exec(header)) !== null) {
      const key = match[1];
      let value = match[2];
      if (value.includes(',')) {
        value = value.split(',').map((v) => v.replace(/['"]/g, '').trim());
      } else {
        value = value.replace(/['"]/g, '');
      }
      headerObject[key] = value;
    }
    return headerObject;
  }

  /**
   * Attempts to extract the currently authenticated user from their session JWT.
   *
   * @param req - An incoming API request.
   * @returns Information about the current user's session.
   */
  static async extractUserFromToken(req: Request): Promise<TokenAuthenticationVerificationResult> {
    let expired = false;
    let sessionInvalid = false;
    let isAuthenticated = false;
    let userUUID: string | null = null;
    try {
      const authToken = `${req.cookies.one_access}.${req.cookies.one_signed}`;
      const { payload } = await jwtVerify(authToken, SESSION_SECRET, {
        issuer: SESSION_DOMAIN,
        audience: SESSION_DOMAIN,
      });

      const session_id = payload.session_id;
      if (!session_id) {
        throw new Error('INVALID_SESSION');
      }

      const session = await Session.findByPk(session_id.toString());
      if (!session || !session.valid) {
        throw new Error('INVALID_SESSION');
      }

      if (session.expires_at.getTime() < Date.now()) {
        throw new Error('EXPIRED_SESSION');
      }

      userUUID = payload.sub ?? null;
      isAuthenticated = true;
    } catch (e: any) {
      if (e.message === 'INVALID_SESSION') {
        sessionInvalid = true;
      } else {
        expired = true;
      }
    }
    return { expired, sessionInvalid, isAuthenticated, userUUID };
  }

  /**
   * Attempts to extract information about the current client application user.
   *
   * @param req - Incoming server-side rendering request.
   * @returns Information about the current user's session, if applicable.
   */
  static async verifyClientAuthentication(req: Request): Promise<TokenAuthenticationVerificationResult> {
    if (AuthController.checkAuthCookies(req)) {
      return await AuthController.extractUserFromToken(req);
    }
    return {
      expired: false,
      sessionInvalid: false,
      isAuthenticated: false,
      userUUID: null,
    };
  }

  /**
   * Creates a JWT for a local session.
   *
   * @param uuid - The User UUID to initialize the session for.
   * @param session_id - The session ID to initialize the session for.
   * @returns The generated JWT.
   */
  static async createSessionJWT(uuid: string, session_id: string): Promise<string> {
    return await new SignJWT({ uuid, session_id: session_id })
      .setSubject(uuid)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(SESSION_DOMAIN)
      .setAudience(SESSION_DOMAIN)
      .setExpirationTime('7d')
      .sign(SESSION_SECRET);
  }

  /**
   * Splits a JWT for a local session into the "access" and "signed" components.
   *
   * @param sessionJWT - JWT to split into components.
   * @returns The access and signed components.
   */
  static splitSessionJWT(sessionJWT: string): [string, string] {
    const splitJWT = sessionJWT.split('.');
    const access = splitJWT.slice(0, 2).join('.');
    const signed = splitJWT[2];
    return [access, signed];
  }

  /**
   * Attaches necessary cookies to the provided API response object
   * in order to create a local session.
   *
   * @param res - The response object to attach the session cookies to.
   * @param uuid - The User UUID to initialize the session for.
   * @param ticket - The CAS service ticket identifier for the session.
   */
  public async createAndAttachLocalSession(res: Response, uuid: string, ticket?: string, expiryMinutes?: number): Promise<{
    user_id: string;
    session_id: string;
  }> {
    const sessionID = uuidv4();
    const sessionCreated = new Date();
    const sessionExpiry = new Date(sessionCreated.getTime() + (expiryMinutes || SESSION_DEFAULT_EXPIRY_MINUTES) * 60 * 1000);

    // If uuid received is not a valid UUID, we may have received a external subject ID
    // from an external identity provider. Check if we can find a user with that external ID.
    let finalUserUUID = uuid;
    if (!validateUUID(uuid)) {
      const foundUser = await User.findOne({ where: { external_subject_id: uuid } });
      if (!foundUser) {
        throw new Error('User not found for external subject ID! Cannot create session record.');
      }
      finalUserUUID = foundUser.uuid;
    }

    await Session.create({
      session_id: sessionID,
      user_id: finalUserUUID,
      valid: true,
      created_at: new Date(),
      expires_at: sessionExpiry,
      ...(ticket && { session_ticket: ticket })
    });

    const sessionJWT = await AuthController.createSessionJWT(finalUserUUID, sessionID);
    const [access, signed] = AuthController.splitSessionJWT(sessionJWT);

    const prodCookieConfig: CookieOptions = {
      secure: true,
      domain: COOKIE_DOMAIN,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie('one_access', access, {
      path: '/',
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });
    res.cookie('one_signed', signed, {
      path: '/',
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });

    return { user_id: finalUserUUID, session_id: sessionID };
  }

  /**
   * Retrieves the private JWK for CAS Bridge (used by the libraries). Internal use only.
   */
  private async retrieveCASBridgePrivateKey() {
    // "cache"
    if (this.casBridgePrivKey) {
      return this.casBridgePrivKey;
    }

    try {
      const paramsRes = await this.ssm.send(new GetParametersByPathCommand({
        Path: process.env.AWS_SSM_LIBRE_ONE_CAS_BRIDGE_SSM_PATH || '/libreone/cas-bridge',
        Recursive: true,
        WithDecryption: true,
      }));
      const privKeyParam = paramsRes.Parameters?.find((param) => param?.Name?.endsWith('private'));
      if (!privKeyParam || !privKeyParam.Value) {
        throw new Error('CAS Bridge private key not found!');
      }
      const privKeyStr = privKeyParam.Value;
      const key = await importPKCS8(privKeyStr, 'RS256');

      this.casBridgePrivKey = key;
      return key;
    } catch (e) {
      console.error({
        msg: 'Error loading CAS Bridge private key!',
        name: `${process.env.AWS_SSM_LIBRE_ONE_CAS_BRIDGE_SSM_PATH}/public`,
        error: e,
      });
      throw new Error('Unable to retrieve CAS Bridge private key!');
    }
  }

  /**
   * Retrieves the public JWKS for CAS Bridge (used by the libraries).
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async retrieveCASBridgePublicKey(_req: Request, res: Response): Promise<Response> {
    const genKeySetResponse = (key: JWK, keyID: string) => {
      return {
        keys: [
          {
            alg: 'RS256',
            key_ops: ['verify'],
            kid: keyID,
            use: 'sig',
            ...key,
          },
        ],
      };
    };

    res.set('Cache-Control', 'public,  max-age=604800, immutable, must-revalidate, no-transform');
    // "cache"
    if (this.casBridgePubKey && this.casBridgePubKeyID) {
      return res.send(genKeySetResponse(this.casBridgePubKey, this.casBridgePubKeyID));
    }

    try {
      const paramsRes = await this.ssm.send(new GetParametersByPathCommand({
        Path: process.env.AWS_SSM_LIBRE_ONE_CAS_BRIDGE_SSM_PATH || '/libreone/cas-bridge',
        Recursive: true,
        WithDecryption: true,
      }));
      const pubKeyParam = paramsRes.Parameters?.find((param) => param?.Name?.endsWith('public'));
      const pubKeyIDParam = paramsRes.Parameters?.find((param) => param?.Name?.endsWith('pub-kid'));
      if (!pubKeyParam || !pubKeyParam.Value) {
        throw new Error('CAS Bridge public key not found!');
      }
      if (!pubKeyIDParam || !pubKeyIDParam.Value) {
        throw new Error('CAS Bridge public key identifier not found!');
      }
      const pubKeyStr = pubKeyParam.Value;
      const pubKeyID = pubKeyIDParam.Value;
      const key = await importSPKI(pubKeyStr, 'RS256');
      const asJWK = await exportJWK(key);

      this.casBridgePubKey = asJWK;
      this.casBridgePubKeyID = pubKeyID;
      return res.send(genKeySetResponse(asJWK, pubKeyID));
    } catch (e) {
      console.error({
        msg: 'Error loading CAS Bridge public key!',
        name: `${process.env.AWS_SSM_LIBRE_ONE_CAS_BRIDGE_SSM_PATH}/public`,
        error: e,
      });
      throw new Error('Unable to retrieve CAS Bridge public key!');
    }
  }

  public async handleCASBridgeAuthentication(req: Request, res: Response) {
    // @ts-ignore
    const { principal } = req; // added by CAS client middleware
    if (!principal) {
      console.error({ msg: 'CAS Bridge authentication failed: no principal returned!' });
      return errors.badRequest(res);
    }

    let resolvedUUID = principal.attributes.uuid;

    // If there was no UUID or it was invalid, check if we have a user attribute (i.e. an external subject ID)
    if ((!resolvedUUID || !validateUUID(resolvedUUID)) && principal.user && typeof principal.user === 'string') {
      const fromExternal = await User.findOne({ where: { external_subject_id: principal.user } });
      if (fromExternal?.uuid) {
        resolvedUUID = fromExternal.uuid;
      }
    }

    // resolvedUUID should be a valid UUID at this point, if not, don't proceed
    if (!resolvedUUID || !validateUUID(resolvedUUID)) {
      console.error({
        msg: 'CAS Bridge authentication failed: no valid user identifier available!',
        principal,
      });
      return errors.badRequest(res);
    }

    const cookies = req.cookies;
    const redirect = cookies?.cas_bridge_redirect;
    const source = cookies?.cas_bridge_source;
    if (!source) {
      console.warn({
        msg: 'No source found in CAS Bridge authentication request.',
        principal,
        cookies,
      });
    }
    const foundUser = await User.findByPk(resolvedUUID, {
      include: [
        {
          model: Application,
          attributes: ['app_type', 'main_url'],
        },
      ],
    });
    if (!foundUser) {
      console.error({
        msg: 'CAS Bridge authentication failed: user not found!',
        principal,
        cookies,
      });
      return errors.unauthorized(res);
    }

    const userLibs = foundUser.get('applications')?.filter((l) => l.get('app_type') === 'library')
      .map((l) => l.get('main_url'));
    const foundLib = userLibs?.find((u) => u === `https://${source}`);

    const payload = {
      first_name: principal.attributes?.first_name ?? principal.attributes?.given_name,
      last_name: principal.attributes?.last_name ?? principal.attributes?.family_name,
      email: principal.attributes?.email,
      picture: principal.attributes?.picture,
      educational: /(?<=.*?)@.*?\.edu/.test(principal.attributes?.email),
    };

    console.log(`CAS Bridge authentication successful for user ${resolvedUUID} (${foundUser.get('email')})`);
    console.log(`Payload: ${JSON.stringify(payload)}`);

    const privKey = await this.retrieveCASBridgePrivateKey();
    const token = await new SignJWT(payload)
      .setSubject(resolvedUUID)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(SESSION_DOMAIN)
      .setAudience('libretexts.org')
      .setExpirationTime('7d')
      .sign(privKey);
    console.log(`Token: ${token}`);
    const cookieConfig: CookieOptions = {
      path: '/',
      secure: true,
      domain: 'libretexts.org',
      sameSite: 'lax',
      maxAge: 604800, // 10 minutes
    };

    res.cookie(`cas_bridge_token_${source}`, token, cookieConfig);
    if (foundLib) {
      res.cookie(
        `cas_bridge_authorized_${source}`,
        'true',
        cookieConfig,
      );
    } else if (foundUser.user_type === 'instructor' && foundUser.verify_status !== 'verified') {
      res.cookie(
        `cas_bridge_unverified_${source}`,
        'true',
        cookieConfig,
      );
    }

    // Set a longer term cookie to indicate that the CAS Bridge authentication was used (not sufficient for authorization)
    res.cookie('cas_bridge_used', 'true', {
      ...cookieConfig,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    if (redirect) {
      return res.redirect(redirect);
    }
    return res.send({});
  }

  /**
   * Creates a user in a sandboxed state, then sends an email verification code.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async register(req: Request, res: Response): Promise<Response> {
    try {
      const props = req.body as RegisterBody;
      const ip = req.get('x-forwarded-for') || req.socket.remoteAddress || '';

      const verificationController = new EmailVerificationController();
      const mailSender = new MailController();
      if (!mailSender.isReady()) {
        throw new Error('No mail sender available to issue email verification!');
      }

      const hashed = await bcrypt.hash(props.password, 10);

      const newUser = await User.create({
        uuid: uuidv4(),
        email: props.email,
        password: hashed,
        first_name: DEFAULT_FIRST_NAME,
        last_name: DEFAULT_LAST_NAME,
        disabled: true,
        expired: false,
        legacy: false,
        ip_address: ip,
        verify_status: 'not_attempted',
        registration_type: 'self',
      });
      const verifyCode = await verificationController.createVerification(
        newUser.get('uuid'),
        props.email,
      );

      // Send email verification
      const emailRes = await verificationController.sendEmailVerificationMessage(
        mailSender,
        props.email,
        verifyCode,
      );
      mailSender.destroy();
      if (!emailRes) {
        throw new Error('Unable to send email verification!');
      }

      const resourceURL = `${getProductionURL()}/api/v1/users/${newUser.get('uuid')}`;
      return res.status(201).set('Location', resourceURL).send({
        data: {
          uuid: newUser.get('uuid'),
        },
      });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        return errors.conflict(res);
      }
      throw e;
    }
  }

  /**
   * Validates a provided email verification code, then creates a local session as the new user
   * in order to complete onboarding.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async verifyRegistrationEmail(req: Request, res: Response): Promise<Response> {
    const { email, code } = req.body as VerifyEmailBody;

    const foundVerification = await new EmailVerificationController().checkVerification(email, code);
    if (!foundVerification || !foundVerification.uuid) {
      return errors.badRequest(res);
    }

    const foundUser = await User.findOne({ where: { uuid: foundVerification.uuid } });
    if (!foundUser) {
      return errors.badRequest(res);
    }

    foundUser.disabled = false;
    await foundUser.save();

    // Create a short-lived local session
    // User will be directed to CAS at the end of registration
    // where they will get a real long-lived CAS session ticket.
    await this.createAndAttachLocalSession(res, foundUser.uuid, undefined, 30);

    return res.send({
      data: {
        uuid: foundUser.uuid,
      },
    });
  }

  /**
   * Activates a new user after onboarding has been completed, then generates a JWT to use
   * to create a new SSO session where necessary.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async completeRegistration(req: Request, res: Response): Promise<Response | void> {
    const { userUUID } = req;
    const { source, adapt_role } = req.body as completeRegistrationBody;

    const foundUser = await User.findOne({ where: { uuid: userUUID } });
    if (!foundUser) {
      return errors.badRequest(res);
    }

    foundUser.registration_complete = true;
    await foundUser.save();

    const defaultApps = await Application.findAll({ where: { default_access: 'all' } });
    const userAppsToCreate = defaultApps.map((app) => ({
      user_id: foundUser.get('uuid'),
      application_id: app.get('id'),
    }));
    try {
      await UserApplication.bulkCreate(userAppsToCreate, {
        ignoreDuplicates: true,
      });
    } catch (e) {
      console.error('Error creating default user applications!', e);
    }

    const webhookPromises = [
      this._notifyConductorOfNewUser(foundUser),
      this._notifyADAPTOfNewUser(foundUser, source, adapt_role)
    ];

    const webhookResults = await Promise.all(webhookPromises); // both return false and log if failed, so they shouldn't affect each other

    EventSubscriberEmitter.emit('user:created', foundUser.get({ plain: true }));

    let shouldCreateSSOSession = true;
    let redirectCASService: string | null = null;
    let afterRegisterRedirect: string | null = null;
    if (req.cookies.cas_state) {
      try {
        const cas_state = JSON.parse(req.cookies.cas_state);
        if (cas_state.hasCASSession) {
          shouldCreateSSOSession = false;
        }
        if (cas_state.redirectCASServiceURI) {
          shouldCreateSSOSession = false;
          redirectCASService = cas_state.redirectCASServiceURI;
        }
      } catch (e) {
        console.warn('Error parsing cookie value as JSON.');
      }
    }
    if (req.cookies.post_register_service_url) {
      shouldCreateSSOSession = true;
      afterRegisterRedirect = encodeURI(req.cookies.post_register_service_url);
    }


    const adaptToken = webhookResults[1];
    const getRedirectURI = (source?: string, tkn?: string | boolean) => {
      // If source was ADAPT and we have a token, use it to redirect to ADAPT, otherwise fallback to registration-complete
      if (source === 'adapt-registration' && tkn && typeof tkn === 'string') {
        const ADAPT_BASE = this._getADAPTWebhookBase();
        return `${ADAPT_BASE}/login-by-jwt/${tkn}`;
      }

      return `${SESSION_DOMAIN}/registration-complete`;
    }

    // create SSO session tokens
    let casJWE: string | null = null;
    if (shouldCreateSSOSession) {
      const casSignSecret = new TextEncoder().encode(process.env.CAS_JWT_SIGN_SECRET);
      const casEncryptSecret = new TextEncoder().encode(process.env.CAS_JWT_ENCRYPT_SECRET);
      const casJWT = await new SignJWT({ sub: foundUser.uuid })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(SESSION_DOMAIN)
        .setAudience(CAS_BASE || SESSION_DOMAIN)
        .setExpirationTime('1m')
        .sign(casSignSecret);
      casJWE = await new CompactEncrypt(new TextEncoder().encode(casJWT))
        .setProtectedHeader({ alg: 'A256KW', enc: 'A256GCM' })
        .encrypt(casEncryptSecret);
      const state = JSON.stringify({
        redirectURI: getRedirectURI(source, adaptToken),
      });
      const prodCookieConfig: CookieOptions = {
        sameSite: 'lax',
        domain: COOKIE_DOMAIN,
        secure: true,
      };
      res.cookie('cas_state', state, {
        httpOnly: true,
        ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
      });
    }

    let initSessionURL: string | null = null;
    if (redirectCASService) {
      initSessionURL = redirectCASService;
    } else {
      const casParams = new URLSearchParams({
        service: afterRegisterRedirect ?? CAS_CALLBACK,
        ...(casJWE && { token: casJWE }),
      });
      initSessionURL = `${CAS_LOGIN}?${casParams.toString()}`;
    }

    return res.send({
      data: {
        initSessionURL,
        uuid: foundUser.uuid,
      },
    });
  }

  /**
   * Creates a new user via a request from CAS to authenticate using an external identity
   * provider (e.g. Microsoft Active Directory).
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createUserFromExternalIdentityProvider(req: Request, res: Response): Promise<Response> {
    const headers = req.headers as CreateUserFromExternalIdPHeaders;
    const userData = {
      clientname: headers.clientname,
      userSub: headers.principalid,
      principalattributes: AuthController.parseCASKeyValueHeader(headers.principalattributes),
      profileattributes: AuthController.parseCASKeyValueHeader(headers.profileattributes),
    };

    const getDiscoveryURI = (clientName: string): string => {
      switch (clientName) {
        case 'GoogleWorkspace':
          return 'https://accounts.google.com/.well-known/openid-configuration';
        case 'MicrosoftActiveDirectory':
          return 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
        default:
          return 'INVALID_URI';
      }
    };

    const discoveryURI = getDiscoveryURI(userData.clientname);
    const discoveryConfig = await axios.get(discoveryURI);
    const jwksURI = discoveryConfig.data.jwks_uri;
    const jwks = createRemoteJWKSet(new URL(jwksURI));
    const { payload } = await jwtVerify(userData.principalattributes.id_token, jwks, {
      issuer: userData.principalattributes.iss,
      audience: userData.principalattributes.aud,
    });

    let givenName = payload.given_name as string;
    let familyName = payload.family_name as string;
    if ((!givenName || !familyName) && payload.name) {
      const nameSplit = (payload.name as string).split(' ');
      if (nameSplit.length > 1) {
        givenName = nameSplit[0];
        familyName = nameSplit.slice(1).join(' ');
      }
    }

    const getEmailPayloadField = (clientName: string): string => {
      switch (clientName) {
        case 'GoogleWorkspace':
          return 'email';
        case 'MicrosoftActiveDirectory':
          return 'upn';
        default:
          return 'INVALID_FIELD';
      }
    };

    const email = payload[getEmailPayloadField(userData.clientname)];

    const criteria: WhereOptions[] = [{ external_subject_id: payload.sub }];
    if (email) {
      criteria.push({ email });
    }

    const foundUser = await User.findOne({
      where: criteria.length > 1 ? { [Op.or]: criteria } : criteria[0],
    });
    if (!foundUser) {
      const created = await User.create({
        uuid: uuidv4(),
        external_subject_id: payload.sub,
        email,
        first_name: givenName?.trim() ?? DEFAULT_FIRST_NAME,
        last_name: familyName?.trim() ?? DEFAULT_LAST_NAME,
        avatar: payload.picture || DEFAULT_AVATAR,
        disabled: false,
        expired: false,
        legacy: false,
        ip_address: payload.ipaddr,
        verify_status: 'not_attempted',
        external_idp: userData.clientname,
        last_access: new Date(),
        registration_type: 'self'
      });

      EventSubscriberEmitter.emit('user:created', created.get({ plain: true }));
    } else {
      const updated = await foundUser.update({
        external_subject_id: payload.sub,
        email,
        first_name: givenName?.trim() ?? DEFAULT_FIRST_NAME,
        last_name: familyName?.trim() ?? DEFAULT_LAST_NAME,
        avatar: payload.picture || DEFAULT_AVATAR,
        ip_address: payload.ipaddr,
        external_idp: userData.clientname,
        last_access: new Date(),
      });

      EventSubscriberEmitter.emit('user:updated', updated.get({ plain: true }));
    }

    return res.status(200).send({});
  }

  /**
 * Creates a new user via a request from an authorized LibreOne application. Used to generate user
 * accounts on-demand for scenarios like Canvas LTI. In these cases, LibreOne is still the identity provider,
 * so this would not be handled in the same manner as external identity providers.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
  public async autoProvisionUser(req: Request, res: Response): Promise<Response> {
    const { email, first_name, last_name, user_type, time_zone } = req.body as AutoProvisionUserBody;

    const foundUser = await User.findOne({
      where: { email }
    });

    let resultingUUID = '';

    if (!foundUser) {
      resultingUUID = uuidv4();
      await User.create({
        uuid: resultingUUID,
        email,
        first_name: first_name?.trim() ?? DEFAULT_FIRST_NAME,
        last_name: last_name?.trim() ?? DEFAULT_LAST_NAME,
        user_type,
        time_zone,
        avatar: DEFAULT_AVATAR,
        disabled: false,
        expired: false,
        legacy: false,
        verify_status: 'not_attempted',
        last_access: new Date(),
        registration_type: 'api',
        registration_complete: true,
      });
    } else {
      return errors.conflict(res, "User already exists", {
        "central_identity_id": foundUser.uuid
      });
    }

    if (!resultingUUID) {
      return errors.internalServerError(res);
    }

    return res.status(200).send({
      central_identity_id: resultingUUID
    });
  }

  public async checkCASInterrupt(req: Request, res: Response): Promise<Response> {
    const { registeredService, username } = req.query as CheckCASInterruptQuery;

    // Decide which attribute to match a record with
    const getAttrMatchKey = (username: string) => {
      if (username.includes('@')) {
        return 'email';
      }
      if (UUID_V4_REGEX.test(username)) {
        return 'uuid';
      }
      return 'external_subject_id';
    };
    const attrMatch = { [getAttrMatchKey(username)]: username };

    const foundUser = await User.findOne({
      where: attrMatch,
    });
    if (!foundUser) {
      return res.send({
        interrupt: true,
        block: true,
        ssoEnabled: false,
        message: 'Sorry, we couldn\'t find a LibreOne account associated with that username. Please <a href="https://commons.libretexts.org/support/contact">submit a support ticket</a> for assistance.',
        links: {},
      });
    }

    if (foundUser.disabled) {
      return res.send({
        interrupt: true,
        block: true,
        ssoEnabled: false,
        message: 'This account has been disabled. Please <a href="https://commons.libretexts.org/support/contact">submit a support ticket</a> for assistance.',
        links: {},
      });
    }

    // <update last_access timestamp and log event>
    try {
      const timestamp = new Date();
      await foundUser.update({ last_access: timestamp });
      await (new LoginEventController()).log(foundUser.get('uuid'), timestamp);
    } catch (err) {
      console.warn(`Error updating last access time or saving login event for user ${foundUser.get('uuid')}`);
      console.warn(err);
    }
    // </update last_access timestamp and log event>

    if (!foundUser.registration_complete) {
      const redirectParams = new URLSearchParams({
        redirectCASServiceURI: req.query.service ? (req.query.service as string) : CAS_LOGIN,
      });

      return res.send({
        interrupt: true,
        block: false,
        ssoEnabled: true,
        message: 'Thanks for registering with LibreOne. Lets finish setting up your account.',
        autoRedirect: true,
        links: {
          'Go': `${SELF_BASE}/api/v1/auth/login?${redirectParams.toString()}`,
        },
      });
    }

    if (!registeredService) {
      return res.send({
        interrupt: true,
        block: false,
        ssoEnabled: true,
        message: 'Just a moment while we redirect you to Launchpad...',
        autoRedirect: true,
        links: {
          'Go': `${SELF_BASE}/api/v1/auth/login`,
        },
      });
    }

    const allowAccess = () => {
      return res.send({
        interrupt: false,
        block: false,
        ssoEnabled: true,
      });
    }

    if (registeredService === CAS_CALLBACK) {
      return allowAccess();
    }

    const foundApp = await Application.findOne({ where: { cas_service_url: registeredService } });
    if (!foundApp) {
      return res.send({
        interrupt: true,
        block: true,
        ssoEnabled: false,
        message: 'Sorry, we don\'t recognize the application you\'re trying to access. Please <a href="https://commons.libretexts.org/support/contact">submit a support ticket</a> for assistance.',
        links: {},
      });
    }

    // If the app is set to default access, we can skip the user app check
    // if (foundApp.default_access === 'all') {
    //   return res.send({
    //     interrupt: false,
    //     block: false,
    //     ssoEnabled: true,
    //   });
    // }

    // If app's default access is not 'all', we need to check if the user has access to it
    if (foundApp.default_access !== 'all') {
      const foundUserApp = await UserApplication.findOne({
        where: {
          user_id: foundUser.get('uuid'),
          application_id: foundApp.get('id'),
        },
      });
      if (!foundUserApp) {
        return res.send({
          interrupt: true,
          block: true,
          ssoEnabled: false,
          message: 'Sorry, you don\'t have access to this application. Please request access in your <a href="https://one.libretexts.org/instructor">LibreOne instructor profile</a> or <a href="https://commons.libretexts.org/support/contact">submit a support ticket</a> for assistance.',
          links: {},
        });
      }
    }


    // If we got here, the app exists and the user has security access to it.
    // Now, we need to check if the app requires an app license (or we are not currently enforcing app licenses)
    if (process.env.ENFORCE_APP_LICENSES !== 'true' || !foundApp.requires_license) {
      return allowAccess();
    }

    // If we got here, the app requires a license and we are enforcing app licenses.
    if (foundUser.user_type === 'instructor') {
      if (foundUser.verify_status === 'verified') {
        return allowAccess();
      }
    }

    const appLicenseController = new AppLicenseController();
    const accessResult = await appLicenseController.checkLicenseAccessRaw({
      user_id: foundUser.get('uuid'),
      app_id: foundApp.get('id'),
    });

    if (!accessResult.meta.has_access) {
      const redirectParams = new URLSearchParams({
        application: foundApp.id,
        ...(req.query.service && { service_url: req.query.service as string }),
      });

      const expiredType = accessResult.meta.status === "expired" ? accessResult.meta.was_trial ? 'trial' : 'license' : undefined;
      if (expiredType) {
        redirectParams.set('expired_type', expiredType);
      }

      const goLink = `${SELF_BASE}/interrupt/trial?${redirectParams.toString()}`;

      return res.send({
        interrupt: true,
        block: false,
        ssoEnabled: false,
        message: 'Just a moment while we redirect you...',
        autoRedirect: true,
        links: {
          'Go': goLink,
        },
      });
    }

    return allowAccess();
  }

  /**
   * Redirects the browser to the CAS login server after generating state and nonce parameters.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response (302 redirect).
   */
  public async initLogin(req: Request, res: Response): Promise<void> {
    const { redirectURI, redirectCASServiceURI, tryGateway } = req.query as InitLoginQuery;
    const state = JSON.stringify({
      ...(redirectURI && { redirectURI: decodeURIComponent(redirectURI) }),
      ...(redirectCASServiceURI && { redirectCASServiceURI }),
      ...(tryGateway && { tryGateway }),
    });

    const prodCookieConfig: CookieOptions = {
      sameSite: 'lax',
      domain: COOKIE_DOMAIN,
      secure: true,
    };
    res.cookie('cas_state', state, {
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });

    const casParams = new URLSearchParams({ service: CAS_CALLBACK });
    if (tryGateway) {
      casParams.set('gateway', 'true');
      res.cookie('one_tried_gateway', true, {
        httpOnly: true,
        maxAge: 60 * 1000, // 60 seconds
        ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
      });
    }
    const redirURL = `${CAS_LOGIN}?${casParams.toString()}`;
    return res.redirect(redirURL);
  }

  /**
   * Validates an authentication response from the CAS server, then initiates a local session.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async completeLogin(req: Request, res: Response): Promise<Response | void> {
    const { ticket } = req.query as CompleteLoginQuery;

    let redirectURI = '/home';
    if (req.cookies.cas_state) {
      try {
        const cas_state = JSON.parse(req.cookies.cas_state);
        if (cas_state.redirectURI) {
          redirectURI = cas_state.redirectURI;
        }
      } catch (e) {
        console.warn('Error parsing CAS state cookie value as JSON.');
      }
    }

    if (!ticket && req.cookies.one_tried_gateway) {
      return res.redirect(redirectURI);
    }
    if (!ticket) {
      return errors.badRequest(res);
    }

    const networkAgent = process.env.NODE_ENV === 'production'
      ? null
      : new Agent({ rejectUnauthorized: false });

    // Validate ticket
    const validateParams = new URLSearchParams({
      ticket,
      service: CAS_CALLBACK,
      format: 'json',
    });
    const { data: validData } = await axios.get(`${CAS_VALIDATE}?${validateParams.toString()}`, {
      ...(networkAgent && {
        httpsAgent: networkAgent,
      }),
    });
    if (!validData.serviceResponse || validData.serviceResponse?.authenticationFailure) {
      return errors.unauthorized(res);
    }

    // create local session
    const uuid = validData.serviceResponse.authenticationSuccess.user;
    const { user_id: localUUID } = await this.createAndAttachLocalSession(res, uuid, ticket);
    const prodCookieConfig: CookieOptions = {
      sameSite: 'lax',
      domain: COOKIE_DOMAIN,
      secure: true,
    };
    res.cookie('cas_state', JSON.stringify({ hasCASSession: true }), {
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });

    // check registration status
    const foundUser = await User.findOne({ where: { uuid: localUUID } });
    if (!foundUser) {
      return errors.badRequest(res);
    }

    if (!foundUser.registration_complete) {
      redirectURI = '/complete-registration/index';
    }
    return res.redirect(redirectURI);
  }

  /**
   * Ends the user's local session and redirects to the CAS logout endpoint.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response (with 302 redirect).
   */
  public logout(_req: Request, res: Response): void {
    const prodCookieConfig: CookieOptions = {
      secure: true,
      domain: COOKIE_DOMAIN,
      sameSite: 'lax',
    };
    res.clearCookie('one_access', {
      path: '/',
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });
    res.clearCookie('one_signed', {
      path: '/',
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });
    res.clearCookie('one_tried_gateway', {
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    })
    res.clearCookie('cas_state', {
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });
    res.clearCookie('post_register_service_url', {
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    })
    return res.redirect(CAS_LOGOUT);
  }

  public async backChannelSLO(req: Request, res: Response): Promise<Response> {
    console.log('Received back-channel SLO request!');
    const body = req.body as BackChannelSLOBody;
    const query = req.query as BackChannelSLOQuery;

    // Load balancer/Cloudflare may rewrite the body as query param, so
    // check both, but favor the body if both are present.
    const logoutRequest = body.logoutRequest || query.logoutRequest;
    console.log('LOGOUT_REQUEST:', logoutRequest);
    if (!logoutRequest || typeof logoutRequest !== 'string') {
      return errors.badRequest(res, "No logout token provided");
    }

    // Parse the SAML logout request
    const parser = new XMLParser();
    const parsed = parser.parse(logoutRequest);
    const sessionIndex = parsed?.['samlp:LogoutRequest']?.['samlp:SessionIndex'];
    const userID = parsed?.['samlp:LogoutRequest']?.['saml:NameID'];
    if (!sessionIndex || !userID) {
      return errors.badRequest(res, "Missing session index or user identifier in logout request");
    }

    const foundSession = await Session.findOne({
      where: {
        session_ticket: sessionIndex,
        valid: true,
      },
      include: [
        {
          model: User,
          where: {
            [Op.or]: [
              { uuid: userID },
              { email: userID }
            ]
          },
          attributes: ['uuid']
        },
      ]
    });

    if (!foundSession) {
      return res.status(200).send({}); // If no matching session, just return 200
    }

    console.log(`Received logout request for user ${foundSession.user_id}`);
    await Session.update({
      valid: false,
    }, {
      where: {
        session_ticket: sessionIndex,
        user_id: foundSession.user_id,
      }
    });

    return res.status(200).send({});
  }

  /**
   * Initiates the self-Password Recovery flow by sending an email to the user.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async sendResetPasswordLink(req: Request, res: Response): Promise<Response> {
    const { email, redirectURI } = req.body as InitResetPasswordBody;
    const response = { msg: 'Reset link sent.' };

    const mailSender = new MailController();
    if (!mailSender.isReady()) {
      return errors.internalServerError(res);
    }

    const foundUser = await User.findOne({ where: { email } });
    if (!foundUser) {
      return res.send(response);
    }

    const token = randomBytes(32).toString('hex'); // 64 characters
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);
    const expires_at = Math.floor(expires.getTime() / 1000);
    await ResetPasswordToken.create({
      token,
      expires_at,
      uuid: foundUser.uuid,
    });

    // Send reset link via email
    const linkParams = new URLSearchParams({
      token,
      ...(redirectURI && { redirect_uri: redirectURI }),
    });
    const resetLink = `${getProductionURL()}/passwordrecovery/complete?${linkParams.toString()}`;
    const emailRes = await mailSender.send({
      destination: { to: [email] },
      subject: 'Reset Your LibreOne Password',
      htmlContent: `
        <p>Hello there,</p>
        <p>We received a request to reset your LibreOne password. You can do so by following this link:</p>
        <a href="${resetLink}" target="_blank" rel="noopener noreferrer">${resetLink}</a>
        <p>If this wasn't you, you can safely ignore this email.</p>
        <p>Best,</p>
        <p>The LibreTexts Team</p>
        <p>&nbsp;</p>
        <p>P.S.: Stay safe by never opening suspicious or unsolicited links received via email. Official communication from LibreTexts will always come from an <em>@libretexts.org</em> address.</p>
      `,
    });
    mailSender.destroy();
    if (!emailRes) {
      console.error(`Error sending password reset email to "${email}"!`);
      return errors.internalServerError(res);
    }

    return res.send(response);
  }

  /**
   * Completes the self-Password Recovery flow by validating a provided token and updating the
   * associated user's password.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async resetPassword(req: Request, res: Response): Promise<Response> {
    const { token, password } = req.body as ResetPasswordBody;

    const foundToken = await ResetPasswordToken.findOne({ where: { token } });
    if (!foundToken) {
      return errors.badRequest(res);
    }

    const expiry = new Date(foundToken.expires_at * 1000);
    const now = new Date();
    if (now > expiry) {
      foundToken.destroy();
      return errors.badRequest(res);
    }
    const foundUser = await User.findOne({ where: { uuid: foundToken.uuid } });
    if (!foundUser) {
      foundToken.destroy();
      return errors.badRequest(res);
    }

    const hashed = await bcrypt.hash(password, 10);
    await foundUser.update({
      password: hashed,
      last_password_change: sequelize.fn('NOW'),
    });
    await foundToken.destroy();

    // Send password changed email
    try {
      const mailSender = new MailController();
      if (mailSender.isReady()) {
        const dateStr = now.toLocaleDateString('en-US', { timeZone: 'UTC' });
        const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'UTC' });
        const emailRes = await mailSender.send({
          destination: { to: [foundUser.email] },
          subject: 'LibreOne Password Changed',
          htmlContent: `
            <p>Hello there,</p>
            <p>We're writing to confirm that your LibreOne password was updated on ${dateStr} at ${timeStr} UTC.</p>
            <p>If this wasn't you, please <a href="mailto:support@libretexts.org?subject=Unrecognized Password Change" target="_blank" rel="noopener">contact LibreTexts.</p>
            <p>Best,</p>
            <p>The LibreTexts Team</p>
          `,
        });
        mailSender.destroy();
        if (!emailRes) {
          throw new Error('Email send failed.');
        }
      }
    } catch (e) {
      console.warn('Error sending "Password Changed" notification:');
      console.warn(e);
    }

    return res.send('Password updated.');
  }

  private _getConductorWebhookHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${process.env.CONDUCTOR_API_KEY}`,
      'Origin': process.env.PRODUCTION_DOMAIN ?? process.env.DOMAIN ?? 'one.libretexts.org',
    };
  }

  public async notifyConductorOfUserLibraryAccess(user: User, library: string) {
    try {

      const conductorWebhookURL = process.env.CONDUCTOR_WEBHOOK_BASE + '/user-library-access' || 'http://localhost:5000/api/v1/central-identity/webhooks/user-library-access';

      const payload = {
        central_identity_id: user.uuid,
        library,
      };

      const res = await axios.post(conductorWebhookURL, payload, {
        headers: this._getConductorWebhookHeaders(),
      });

      if (res.data.err) {
        throw new Error(res.data.data.errMsg ?? 'Unknown error');
      }

      return true;
    } catch (err) {
      console.error({
        msg: 'Error notifying Conductor of user library access!',
        error: err,
      });
      return true; // Fail silently
    }
  }

  private async _notifyConductorOfNewUser(user: User) {
    try {
      const conductorWebhookURL = process.env.CONDUCTOR_WEBHOOK_BASE + '/new-user' || 'http://localhost:5000/api/v1/central-identity/webhooks/new-user';

      const payload = {
        central_identity_id: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        time_zone: user.time_zone,
        ...(user.avatar && { avatar: user.avatar }),
      };

      const res = await axios.post(conductorWebhookURL, payload, {
        headers: this._getConductorWebhookHeaders(),
      });

      if (res.data.err) {
        throw new Error(res.data.data.errMsg ?? 'Unknown error');
      }

      return true;
    } catch (err) {
      console.error({
        msg: 'Error notifying Conductor of new user!',
        error: err,
      });
      return false;
    }
  }

  public async notifyConductorOfVerificationUpdate(user: User) {
    try {
      const conductorWebhookURL = process.env.CONDUCTOR_WEBHOOK_BASE + '/verify-status' || 'http://localhost:5000/api/v1/central-identity/webhooks/verify-status';

      const payload = {
        central_identity_id: user.uuid,
        verify_status: user.verify_status,
      };

      const res = await axios.post(conductorWebhookURL, payload, {
        headers: this._getConductorWebhookHeaders(),
      });

      if (res.data.err) {
        throw new Error(res.data.errMsg ?? 'Unknown error');
      }

      return true;
    } catch (err) {
      console.error({
        msg: 'Error notifying Conductor of updated verification status!',
        error: err,
      });
      return false;
    }
  }

  // public async notifyConductorOfDeleteAccountRequest(user: User) {
  //   try {
  //     const conductorWebhookURL = process.env.CONDUCTOR_WEBHOOK_BASE + '/delete-account' || 'http://localhost:5000/api/v1/central-identity/webhooks/delete-account';

  //     const payload = {
  //       central_identity_id: user.uuid
  //     };

  //     const res = await axios.post(conductorWebhookURL, payload, {
  //       headers: this._getConductorWebhookHeaders(),
  //     });

  //     if (res.data.err) {
  //       throw new Error(res.data.errMsg ?? 'Unknown error');
  //     }

  //     return true;
  //   } catch (err) {
  //     console.error({
  //       msg: 'Error notifying Conductor of delete account request!',
  //       error: err,
  //     });
  //     return false;
  //   }
  // }

  private async _getADAPTWebhookHeaders(data?: Record<string, string>) {
    const encoded = new TextEncoder().encode(process.env.ADAPT_API_KEY ?? 'unknown');
    const jwtToSend = await new SignJWT({
      ...(data ?? {}),
    }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('1h').sign(encoded);

    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${jwtToSend}`,
      'Origin': process.env.PRODUCTION_DOMAIN ?? process.env.DOMAIN ?? 'one.libretexts.org',
    };
  }

  private _getADAPTWebhookBase() {
    switch (process.env.ADAPT_WEBHOOK_ENV) {
      case 'dev':
        return 'https://dev.adapt.libretexts.org';
      case 'staging':
        return 'https://staging-adapt.libretexts.org';
      default:
        return 'https://adapt.libretexts.org';
    }
  }

  private async _notifyADAPTOfNewUser(user: User, source?: string, adapt_role?: ADAPTSpecialRole): Promise<string | boolean> {
    try {
      const adaptWebhookBase = this._getADAPTWebhookBase();
      const adaptWebhookURL = adaptWebhookBase + '/api/oidc/libreone/new-user-created';

      const payload = {
        central_identity_id: user.uuid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        time_zone: user.time_zone,
        role: adapt_role ? adapt_role : user.user_type ?? 'student', // default to student if no role provided or otherwise can't be determined
        verify_status: user.verify_status,
        ...(user.avatar && { avatar: user.avatar }),
        ...(source && { source }),
      };

      const res = await axios.post(adaptWebhookURL, payload, {
        headers: await this._getADAPTWebhookHeaders(payload),
      });

      if (!res.data || res.data.type === 'error') {
        throw new Error(res.data.message ?? 'Unknown error');
      }

      if (source === 'adapt-registration' && !res.data.token) {
        throw new Error('No token returned from ADAPT');
      }

      return source === 'adapt-registration' ? res.data.token : true;
    } catch (err) {
      console.error({
        msg: 'Error notifying ADAPT of new user!',
        error: err,
      });
      return false;
    }
  }

  public async notifyADAPTOfVerificationUpdate(user: User) {
    try {
      const adaptWebhookBase = this._getADAPTWebhookBase();
      const adaptWebhookURL = adaptWebhookBase + '/api/oidc/libreone/instructor-verified';

      const payload = {
        central_identity_id: user.uuid,
        user_type: user.user_type,
        verify_status: user.verify_status,
      };

      const res = await axios.post(adaptWebhookURL, payload, {
        headers: await this._getADAPTWebhookHeaders({
          central_identity_id: user.uuid,
          verify_status: user.verify_status,
        }),
      });

      if (!res.data || res.data.type === 'error') {
        throw new Error(res.data.message ?? 'Unknown error');
      }

      return true;
    } catch (err) {
      console.error({
        msg: 'Error notifying ADAPT of updated verification status!',
        error: err,
      });
      return false;
    }
  }

  public async notifyADAPTOfDeleteAccountRequest(user: User): Promise<boolean> {
    try {
      const adaptWebhookBase = this._getADAPTWebhookBase();
      const adaptWebhookURL = adaptWebhookBase + '/api/pending-delete-user';

      const payload = {
        central_identity_id: user.uuid
      };

      const res = await axios.post(adaptWebhookURL, payload, {
        headers: await this._getADAPTWebhookHeaders({
          central_identity_id: user.uuid,
        }),
      });

      if (!res.data || res.data.type === 'error') {
        throw new Error(res.data.message ?? 'Unknown error');
      }

      return true;
    } catch (err) {
      console.error({
        msg: 'Error notifying ADAPT of delete account request!',
        error: err,
      });
      return false;
    }
  }
}