import axios from 'axios';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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
import { Application, ResetPasswordToken, sequelize, User, UserApplication } from '../models';
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
} from '../types/auth';

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
const SESSION_DOMAIN = getProductionURL();
const COOKIE_DOMAIN = SESSION_DOMAIN.replace('https://', '');

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
    let isAuthenticated = false;
    let userUUID: string | null = null;
    try {
      const authToken = `${req.cookies.one_access}.${req.cookies.one_signed}`;
      const { payload } = await jwtVerify(authToken, SESSION_SECRET, {
        issuer: SESSION_DOMAIN,
        audience: SESSION_DOMAIN,
      });
      if (payload.sub) {
        isAuthenticated = true;
        userUUID = payload.sub;
      }
    } catch (e) {
      expired = true;
    }
    return { expired, isAuthenticated, userUUID };
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
      isAuthenticated: false,
      userUUID: null,
    };
  }

  /**
   * Creates a JWT for a local session.
   *
   * @param uuid - The User UUID to initialize the session for.
   * @returns The generated JWT.
   */
  static async createSessionJWT(uuid: string): Promise<string> {
    return await new SignJWT({ uuid })
      .setSubject(uuid)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(SESSION_DOMAIN)
      .setAudience(SESSION_DOMAIN)
      .setExpirationTime('24h')
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
   */
  public async createAndAttachLocalSession(res: Response, uuid: string): Promise<void> {
    const sessionJWT = await AuthController.createSessionJWT(uuid);
    const [access, signed] = AuthController.splitSessionJWT(sessionJWT);

    const prodCookieConfig: CookieOptions = {
      secure: true,
      domain: COOKIE_DOMAIN,
      sameSite: 'strict',
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

    if (!principal?.attributes?.uuid) {
      console.error({
        msg: 'CAS Bridge authentication failed: no user identifier available!',
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
    const foundUser = await User.findByPk(principal.attributes.uuid, {
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
      first_name: principal.attributes?.first_name,
      last_name: principal.attributes?.last_name,
      email: principal.attributes?.email,
      picture: principal.attributes?.picture,
      educational: /(?<=.*?)@.*?\.edu/.test(principal.attributes?.email),
    };

    const privKey = await this.retrieveCASBridgePrivateKey();
    const token = await new SignJWT(payload)
      .setSubject(principal.attributes.uuid)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(SESSION_DOMAIN)
      .setAudience('libretexts.org')
      .setExpirationTime('7d')
      .sign(privKey);
    
    res.cookie('overlayJWT', token, {
      path: '/',
      secure: true,
      domain: source,
      sameSite: 'lax',
      maxAge: 604800,
    });
    if (foundLib) {
      res.cookie(
        `cas_bridge_authorized_${source}`,
        'true',
        {
          path: '/',
          secure: true,
          domain: source,
          sameSite: 'lax',
          maxAge: 604800,
        },
      ); 
    }

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

    // create a local session
    await this.createAndAttachLocalSession(res, foundUser.uuid);

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
    const foundUser = await User.findOne({ where: { uuid: userUUID }});
    if (!foundUser) {
      return errors.badRequest(res);
    }

    if (foundUser.user_type === 'student' && !foundUser.student_id) {
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
      await UserApplication.bulkCreate(userAppsToCreate);
    } catch (e) {
      console.error('Error creating default user applications!', e);
    }

    let shouldCreateSSOSession = true;
    let redirectCASService = null;
    if (req.cookies.cas_state) {
      try {
        const cas_state = JSON.parse(req.cookies.cas_state);
        if (cas_state.redirectCASServiceURI) {
          shouldCreateSSOSession = false;
          redirectCASService = cas_state.redirectCASServiceURI;
        }
      } catch (e) {
        console.warn('Error parsing cookie value as JSON.');
      }
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
        redirectURI: `${SESSION_DOMAIN}/registration-complete`,
      });
      const prodCookieConfig: CookieOptions = {
        sameSite: 'strict',
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
        service: CAS_CALLBACK,
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
    const jwks = createRemoteJWKSet(new URL (jwksURI));
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
      await User.create({
        uuid: uuidv4(),
        external_subject_id: payload.sub,
        email,
        first_name: givenName.trim(),
        last_name: familyName.trim(),
        avatar: payload.picture || DEFAULT_AVATAR,
        disabled: false,
        expired: false,
        legacy: false,
        ip_address: payload.ipaddr,
        verify_status: 'not_attempted',
        external_idp: userData.clientname,
        last_access: new Date(),
      });
    } else {
      await foundUser.update({
        external_subject_id: payload.sub,
        email,
        first_name: givenName.trim(),
        last_name: familyName.trim(),
        avatar: payload.picture || DEFAULT_AVATAR,
        ip_address: payload.ipaddr,
        external_idp: userData.clientname,
        last_access: new Date(),
      });
    }

    return res.status(200).send({});
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
        message: 'Sorry, we couldn\'t find a LibreOne account associated with that username. Please contact <a href="mailto:support@libretexts.org">support@libretexts.org</a> for assistance.',
        links: {},
      });
    }

    if (foundUser.disabled) {
      return res.send({
        interrupt: true,
        block: true,
        ssoEnabled: false,
        message: 'This account has been disabled. Please contact <a href="mailto:support@libretexts.org">support@libretexts.org</a> to regain access.',
        links: {},
      });
    }

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

    if (registeredService && registeredService !== CAS_CALLBACK) {
      const foundApp = await Application.findOne({ where: { cas_service_url: registeredService } });
      if (!foundApp) {
        return res.send({
          interrupt: true,
          block: true,
          ssoEnabled: false,
          message: 'Sorry, we don\'t recognize the application you\'re trying to access. Please contact <a href="mailto:support@libretexts.org">support@libretexts.org</a> for assistance.',
          links: {},
        });
      }

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
          message: 'Sorry, you don\'t have access to this application. Please request access in <a href="https://commons.libretexts.org">LibreTexts Conductor</a> or contact <a href="mailto:support@libretexts.org">support@libretexts.org</a> for assistance.',
          links: {},
        });
      }
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

    return res.send({
      interrupt: false,
      block: false,
      ssoEnabled: true,
    });
  }

  /**
   * Redirects the browser to the CAS login server after generating state and nonce parameters.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response (302 redirect).
   */
  public async initLogin(req: Request, res: Response): Promise<void> {
    const { redirectURI, redirectCASServiceURI } = req.query as InitLoginQuery;
    const state = JSON.stringify({
      ...(redirectURI && { redirectURI }),
      ...(redirectCASServiceURI && { redirectCASServiceURI }),
    });

    const prodCookieConfig: CookieOptions = {
      sameSite: 'strict',
      domain: COOKIE_DOMAIN,
      secure: true,
    };
    res.cookie('cas_state', state, {
      httpOnly: true,
      ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
    });

    const casParams = new URLSearchParams({
      service: CAS_CALLBACK,
    });
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
    await this.createAndAttachLocalSession(res, uuid);

    // check registration status
    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.badRequest(res);
    }

    let redirectURI = '/home';
    if (!foundUser.registration_complete) {
      redirectURI = '/complete-registration';
    } else if (req.cookies.cas_state) {
      try {
        const cas_state = JSON.parse(req.cookies.cas_state);
        if (cas_state.redirectURI) {
          redirectURI = cas_state.redirectURI;
        }
      } catch (e) {
        console.warn('Error parsing cookie value as JSON.');
      }
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
      sameSite: 'strict',
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
    return res.redirect(CAS_LOGOUT);
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

}