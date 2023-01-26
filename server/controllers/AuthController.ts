import axios from 'axios';
import { randomBytes } from 'crypto';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { CompactEncrypt, SignJWT, jwtVerify } from 'jose';
import { TextEncoder } from 'util';
import { URLSearchParams } from 'url';
import { Agent } from 'https';
import { Op, UniqueConstraintError } from 'sequelize';
import { ResetPasswordToken, sequelize, User } from '../models';
import { useMailSender } from './MailController';
import { getProductionURL } from '../helpers';
import errors from '../errors';
import { CookieOptions, Request, Response } from 'express';
import type {
  RegisterBody,
  VerifyEmailBody,
  CompleteLoginQuery,
  InitLoginQuery,
  InitResetPasswordBody,
  ResetPasswordBody,
  TokenAuthenticationVerificationResult,
} from '../types/auth';

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
const SESSION_DOMAIN = getProductionURL();

const CAS_PROTO = process.env.CAS_PROTO || 'https';
const CAS_BASE = `${CAS_PROTO}://${process.env.CAS_DOMAIN}`;
const CAS_LOGIN = `${CAS_BASE}/cas/login`;
const CAS_CALLBACK = `${SESSION_DOMAIN}/api/v1/auth/cas-callback`;
const CAS_VALIDATE = `${CAS_BASE}/cas/p3/serviceValidate`;
const CAS_LOGOUT = `${CAS_BASE}/cas/logout`;

/**
 * Determines whether an API request contains authentication cookies.
 *
 * @param req - An incoming API request.
 * @returns True if authentication cookies are present, false otherwise.
 */
export function checkAuthCookies(req: Request): boolean {
  return Object.hasOwn(req.cookies, 'one_access') && Object.hasOwn(req.cookies, 'one_signed');
}

/**
 * Attempts to extract the currently authenticated user from their session JWT.
 *
 * @param req - An incoming API request.
 * @returns Information about the current user's session.
 */
export async function extractUserFromToken(req: Request): Promise<TokenAuthenticationVerificationResult> {
  let expired = false;
  let isAuthenticated = false;
  let userUUID = null;
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
export async function verifyClientAuthentication(req: Request): Promise<TokenAuthenticationVerificationResult> {
  if (checkAuthCookies(req)) {
    return await extractUserFromToken(req);
  }
  return {
    expired: false,
    isAuthenticated: false,
    userUUID: null,
  }
}

/**
 * Creates a user in a sandboxed state, then sends an email verification code.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function register(req: Request, res: Response): Promise<Response> {
  try {
    const props = req.body as RegisterBody;
    const ip = req.get('x-forwarded-for') || req.socket.remoteAddress || '';

    const sesClient = await useMailSender();
    if (!sesClient) {
      throw new Error('No mail sender available to issue email verification!');
    }
  
    const hashed = await bcrypt.hash(props.password, 10);

    const verifyCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    const newUser = await User.create({
      uuid: uuidv4(),
      email: props.email,
      password: hashed,
      active: false,
      enabled: false,
      legacy: false,
      ip_address: ip,
      verify_status: 'not_attempted',
      email_verify_code: verifyCode,
    });

    // Send email verification
    const emailRes = await sesClient.send(new SendEmailCommand({
      Content: {
        Simple: {
          Subject: { Data: `LibreOne Verification Code: ${verifyCode}` },
          Body: {
            Html: {
              Data: `
                <p>Hello there,</p>
                <p>Please verify your email address by entering this code:</p>
                <p style="font-size: 1.5em;">${verifyCode}</p>
                <p>If this wasn't you, you can safely ignore this email.</p>
                <p>Best,</p>
                <p>The LibreTexts Team</p>
              `,
            },
          },
        },
      },
      Destination: { ToAddresses: [props.email] },
      FromEmailAddress: process.env.AWS_SES_FROM_ADDR || 'no-reply@one.libretexts.org',
    }));
    if (emailRes.$metadata.httpStatusCode !== 200) {
      console.warn(`Error sending email verification to "${props.email}"!`);
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
 * Validates a provided email verification code, then generates a JWT to initiate a CAS session
 * as the new user.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function verifyRegistrationEmail(req: Request, res: Response): Promise<Response> {
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
  foundUser.active = true;
  foundUser.enabled = true;
  await foundUser.save();

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
    redirectURI: `${SESSION_DOMAIN}/complete-registration`,
  });

  const prodCookieConfig: CookieOptions = {
    sameSite: 'strict',
    domain: SESSION_DOMAIN,
    secure: true,
  };
  res.cookie('cas_state', state, {
    httpOnly: true,
    ...(process.env.NODE_ENV === 'production' && prodCookieConfig),
  });

  const casParams = new URLSearchParams({
    service: CAS_CALLBACK,
    token: casJWE,
  });``
  const initSessionURL = `${CAS_LOGIN}?${casParams.toString()}`;

  return res.send({
    data: {
      initSessionURL,
      uuid: foundUser.uuid,
    },
  });
}

/**
 * Redirects the browser to the CAS login server after generating state and nonce parameters.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API request.
 * @returns The fulfilled API response (302 redirect).
 */
export async function initLogin(req: Request, res: Response): Promise<void> {
  const { redirectURI } = req.query as InitLoginQuery;
  const state = JSON.stringify({
    ...(redirectURI && { redirectURI }),
  });

  const prodCookieConfig: CookieOptions = {
    sameSite: 'strict',
    domain: SESSION_DOMAIN,
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
export async function completeLogin(req: Request, res: Response): Promise<Response | void> {
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

  const uuid = validData.serviceResponse.authenticationSuccess.user;
  const sessionJWT = await new SignJWT({ uuid })
    .setSubject(uuid)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(SESSION_DOMAIN)
    .setAudience(SESSION_DOMAIN)
    .setExpirationTime('24h')
    .sign(SESSION_SECRET);
  
  const splitJWT = sessionJWT.split('.');
  const access = `${splitJWT[0]}.${splitJWT[1]}`;
  const signed = splitJWT[2];

  const prodCookieConfig: CookieOptions = {
    secure: true,
    domain: SESSION_DOMAIN,
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
export function logout(_req: Request, res: Response): void {
  const prodCookieConfig: CookieOptions = {
    secure: true,
    domain: SESSION_DOMAIN,
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
export async function sendResetPasswordLink(req: Request, res: Response): Promise<Response> {
  const { email, redirectURI } = req.body as InitResetPasswordBody;
  const response = { msg: 'Reset link sent.' };

  const sesClient = await useMailSender();
  if (!sesClient) {
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
  const emailRes = await sesClient.send(new SendEmailCommand({
    Content: {
      Simple: {
        Subject: { Data: `Reset Your LibreOne Password` },
        Body: {
          Html: {
            Data: `
              <p>Hello there,</p>
              <p>We received a request to reset your LibreOne password. You can do so by following this link:</p>
              <a href="${resetLink}" target="_blank" rel="noopener noreferrer">${resetLink}</a>
              <p>If this wasn't you, you can safely ignore this email.</p>
              <p>Best,</p>
              <p>The LibreTexts Team</p>
              <p>&nbsp;</p>
              <p>P.S.: Stay safe by never opening suspicious or unsolicited links received via email. Official communication from LibreTexts will always come from an <em>@libretexts.org</em> address.</p>
            `,
          },
        },
      },
    },
    Destination: { ToAddresses: [email] },
    FromEmailAddress: process.env.AWS_SES_FROM_ADDR || 'no-reply@one.libretexts.org',
  }));

  if (emailRes.$metadata.httpStatusCode !== 200) {
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
export async function resetPassword(req: Request, res: Response): Promise<Response> {
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
    const sesClient = await useMailSender();
    if (sesClient) {
      const dateStr = now.toLocaleDateString('en-US', { timeZone: 'UTC' });
      const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'UTC' });
      const emailRes = await sesClient.send(new SendEmailCommand({
        Content: {
          Simple: {
            Subject: { Data: `LibreOne Password Changed` },
            Body: {
              Html: {
                Data: `
                  <p>Hello there,</p>
                  <p>We're writing to confirm that your LibreOne password was updated on ${dateStr} at ${timeStr} UTC.</p>
                  <p>If this wasn't you, please <a href="mailto:support@libretexts.org?subject=Unrecognized Password Change" target="_blank" rel="noopener">contact LibreTexts.</p>
                  <p>Best,</p>
                  <p>The LibreTexts Team</p>
                `,
              },
            },
          },
        },
        Destination: { ToAddresses: [foundUser.email] },
        FromEmailAddress: process.env.AWS_SES_FROM_ADDR || 'no-reply@one.libretexts.org',
      }));
      if (emailRes.$metadata.httpStatusCode !== 200) {
        throw new Error(`${emailRes.$metadata.httpStatusCode}`);
      }
    }
  } catch (e) {
    console.warn('Error sending "Password Changed" notification:');
    console.warn(e);
  }

  return res.send('Password updated.');
}
