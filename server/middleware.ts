import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import {
  checkAuthCookies,
  extractUserFromToken,
} from './controllers/AuthController';
import { verifyAPIUserAuth } from './controllers/APIUserController';
import errors from './errors';

type MiddlewareResult = Response | void;
type AsyncMiddlewareResult = Promise<MiddlewareResult>;
type AsyncMiddleware = (request: Request, response: Response, next: NextFunction) => AsyncMiddlewareResult;

/**
 * Verifies that an incoming request contains valid credentials for an individual User (in the form of cookies).
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @param next - The next function to run in the middleware chain.
 * @returns The result of the next middleware, or an error response.
 */
export async function verifyTokenAuthentication(req: Request, res: Response, next: NextFunction): AsyncMiddlewareResult {
  const { expired, isAuthenticated, userUUID } = await extractUserFromToken(req);
  if (isAuthenticated && userUUID) {
    req.isAuthenticated = true;
    req.userUUID = userUUID;
    return next();
  }
  if (expired) {
    return errors.forbidden(res);
  }
  return errors.unauthorized(res);
}

/**
 * Verifies that a request's Basic authentication header contains valid credentials for
 * an API User.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @param next - The next function to run in the middleware chain.
 * @returns The result of the next middleware, or an error response.
 */
export async function verifyBasicAuthorization(req: Request, res: Response, next: NextFunction): AsyncMiddlewareResult {
  try {
    const authHeader = req.headers.authorization;
    const authEncoded = authHeader?.split(' ')?.[1];
    if (!authHeader || !authEncoded) {
      return errors.unauthorized(res, undefined, 'LibreOne API');
    }
    const authBuff = Buffer.from(authEncoded, 'base64');
    const authUnencoded = authBuff.toString('utf-8');
    const authParts = authUnencoded.split(':');
    if (authParts.length < 2) {
      return errors.badRequest(res);
    }
    const authorized = await verifyAPIUserAuth(authParts[0], authParts[1], req.ip);
    if (!authorized) {
      return errors.unauthorized(res, undefined, 'LibreOne API');
    }
    req.isAPIUser = true;
    return next();
  } catch (e) {
    return errors.internalServerError(res);
  }
}

/**
 * Activates the appropriate middleware function to extract and validate authentication based on
 * the type of credentials provided.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @param next - The next function to run in the middleware chain.
 * @returns The result of the next middleware, or a fulfilled error response.
 */
export async function verifyAPIAuthentication(req: Request, res: Response, next: NextFunction): AsyncMiddlewareResult {
  if (checkAuthCookies(req)) {
    return verifyTokenAuthentication(req, res, next);
  }
  if (req.headers.authorization) {
    return verifyBasicAuthorization(req, res, next);
  }
  return errors.unauthorized(res, undefined, 'LibreOne API');
}

/**
 * Returns an asynchronous validation middleware given a Joi schema and a request portion to validate.
 *
 * @param schema - The schema to use for validation.
 * @param part - The portion of the request object to run validation against.
 * @returns The validation middleware.
 */
export function validate(schema: Joi.Schema, part: 'body' | 'query' | 'params'): AsyncMiddleware {
  if (!schema) {
    throw (new Error(`Schema not provided!`));
  }
  
  return async function(req: Request, res: Response, next: NextFunction): AsyncMiddlewareResult {
    try {
      const validated = await schema.validateAsync(req[part]);
      req[part] = validated;
      return next();
    } catch (e) {
      if (e instanceof Joi.ValidationError && e.isJoi) {
        return errors.badRequest(res);
      }
      console.error(e);
      return errors.internalServerError(res);
    }
  }
}

/**
 * Asserts that the actor of an incoming API request is an API User, not an individual LibreOne User.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @param next - The next function to run in the middleware chain.
 * @returns The result of the next middleware, or a fulfilled 403 Forbidden error response.
 */
export function ensureActorIsAPIUser(req: Request, res: Response, next: NextFunction): MiddlewareResult {
  if (!req.isAPIUser) {
    return errors.forbidden(res);
  }
  return next();
}
