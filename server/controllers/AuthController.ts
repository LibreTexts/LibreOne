import axios from 'axios';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { CompactEncrypt, createRemoteJWKSet, SignJWT, jwtVerify } from 'jose';
import { TextEncoder } from 'util';
import { URLSearchParams } from 'url';
import { Agent } from 'https';
import { Op, UniqueConstraintError } from 'sequelize';
import { ResetPasswordToken, sequelize, User } from '../models';
import { MailController } from './MailController';
import { getProductionURL } from '../helpers';
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
} from '../types/auth';

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
const SESSION_DOMAIN = getProductionURL();
const COOKIE_DOMAIN = SESSION_DOMAIN.replace('https://', '');

const CAS_PROTO = process.env.CAS_PROTO || 'https';
const CAS_BASE = `${CAS_PROTO}://${process.env.CAS_DOMAIN}`;
const CAS_LOGIN = `${CAS_BASE}/cas/login`;
const CAS_CALLBACK = `${SESSION_DOMAIN}/api/v1/auth/cas-callback`;
const CAS_VALIDATE = `${CAS_BASE}/cas/p3/serviceValidate`;
const CAS_LOGOUT = `${CAS_BASE}/cas/logout`;

export class AuthController {
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
    
      const mailSender = new MailController();
      if (!mailSender.isReady()) {
        throw new Error('No mail sender available to issue email verification!');
      }
    
      const hashed = await bcrypt.hash(props.password, 10);

      const verifyCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
      const newUser = await User.create({
        uuid: uuidv4(),
        email: props.email,
        password: hashed,
        first_name: 'LibreTexts',
        last_name: 'User',
        active: false,
        enabled: false,
        legacy: false,
        ip_address: ip,
        verify_status: 'not_attempted',
        email_verify_code: verifyCode,
      });

      // Send email verification
      const emailRes = await mailSender.send({
        destination: { to: [props.email] },
        subject: `LibreOne Verification Code: ${verifyCode}`,
        htmlContent: `
          <p>Hello there,</p>
          <p>Please verify your email address by entering this code:</p>
          <p style="font-size: 1.5em;">${verifyCode}</p>
          <p>If this wasn't you, you can safely ignore this email.</p>
          <p>Best,</p>
          <p>The LibreTexts Team</p>
        `,
      });
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

    const foundUser = await User.findOne({
      where: {
        [Op.and]: [
          { email },
          { email_verify_code: code },
        ],
      },
    });
    if (!foundUser) {
      return errors.badRequest(res);
    }

    foundUser.email_verify_code = null;
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
   * to create a new SSO session.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async completeRegistration(req: Request, res: Response): Promise<Response | void> {
    const { userUUID } = req;
    const foundUser = await User.findOne({ where: { uuid: userUUID }});
    if (!foundUser || foundUser.active || foundUser.enabled) {
      return errors.badRequest(res);
    }

    foundUser.active = true;
    foundUser.enabled = true;
    await foundUser.save();

    // create SSO session tokens
    const casSignSecret = new TextEncoder().encode(process.env.CAS_JWT_SIGN_SECRET);
    const casEncryptSecret = new TextEncoder().encode(process.env.CAS_JWT_ENCRYPT_SECRET);
    const casJWT = await new SignJWT({ sub: foundUser.uuid })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(SESSION_DOMAIN)
      .setAudience(CAS_BASE || SESSION_DOMAIN)
      .setExpirationTime('1m')
      .sign(casSignSecret);
    const casJWE = await new CompactEncrypt(new TextEncoder().encode(casJWT))
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

    const casParams = new URLSearchParams({
      service: CAS_CALLBACK,
      token: casJWE,
    });
    const initSessionURL = `${CAS_LOGIN}?${casParams.toString()}`;

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

    if (userData.clientname === 'MicrosoftActiveDirectory') {
      const microsoftURL = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
      const microsoftConfig = await axios.get(microsoftURL);
      const jwksURI = microsoftConfig.data.jwks_uri;

      const jwks = createRemoteJWKSet(new URL (jwksURI));
      const { payload } = await jwtVerify(userData.principalattributes.id_token, jwks, {
        issuer: userData.principalattributes.iss,
        audience: userData.principalattributes.aud,
      });

      let givenName = payload.given_name;
      let familyName = payload.family_name;
      if ((!givenName || !familyName) && payload.name) {
        const nameSplit = (payload.name as string).split(' ');
        if (nameSplit.length > 1) {
          givenName = nameSplit[0];
          familyName = nameSplit.slice(1).join(' ');
        }
      }

      const foundUser = await User.findOne({ where: { external_subject_id: payload.sub } });
      if (!foundUser) {
        await User.create({
          uuid: uuidv4(),
          external_subject_id: payload.sub,
          email: payload.upn,
          first_name: givenName,
          last_name: familyName,
          active: true,
          enabled: true,
          legacy: false,
          ip_address: payload.ipaddr,
          verify_status: 'not_attempted',
          external_idp: userData.clientname,
          last_access: new Date(),
        });
      } else {
        await foundUser.update({
          email: payload.upn,
          first_name: givenName,
          last_name: familyName,
          ip_address: payload.ipaddr,
          last_access: new Date(),
        });
      }
      return res.status(200).send({});
    }

    return errors.badRequest(res);
  }

  /**
   * Redirects the browser to the CAS login server after generating state and nonce parameters.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response (302 redirect).
   */
  public async initLogin(req: Request, res: Response): Promise<void> {
    const { redirectURI } = req.query as InitLoginQuery;
    const state = JSON.stringify({
      ...(redirectURI && { redirectURI }),
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

    let redirectURI = '/dashboard';
    if (req.cookies.cas_state) {
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