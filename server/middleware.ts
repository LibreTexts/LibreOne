import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { AuthController } from './controllers/AuthController';
import { APIUserController } from './controllers/APIUserController';
import errors from './errors';
import { APIUserPermission } from './types/apiusers';
import { UserUUIDParams } from './types/users';
import { UserController } from './controllers/UserController';

type RequestPart = 'body' | 'query' | 'params';
type MiddlewareResult = Response | void;
type Middleware = (request: Request, response: Response, next: NextFunction) => MiddlewareResult;
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
  const { expired, sessionInvalid, isAuthenticated, userUUID } = await AuthController.extractUserFromToken(req);
  if (isAuthenticated && userUUID) {
    req.isAuthenticated = true;
    req.userUUID = userUUID;
    return next();
  }
  if (expired || sessionInvalid) {
    return errors.unauthorized(res, undefined, undefined, { expired, sessionInvalid });
  }
  return errors.unauthorized(res); // Fallback to generic unauthorized error.
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
    const { isAuthorized, permissions } = await APIUserController.verifyAPIUserAuth(authParts[0], authParts[1], req.ip);
    if (!isAuthorized) {
      return errors.unauthorized(res, undefined, 'LibreOne API');
    }
    req.isAPIUser = true;
    req.apiUserPermissions = permissions;
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
  if (AuthController.checkAuthCookies(req)) {
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
export function validate(schema: Joi.Schema, part: RequestPart): AsyncMiddleware {
  if (!schema) {
    throw (new Error('Schema not provided!'));
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
  };
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

/**
 * Asserts that the current API User has all of the permissions requested.
 *
 * @param requestedPermissions - Permissions needed to successfully fulfill a request.
 * @returns The permissions assertion middleware.
 */
export function ensureAPIUserHasPermission(requestedPermissions: APIUserPermission[]): Middleware {
  if (!requestedPermissions) {
    throw (new Error('Requested permissions not provided!'));
  }

  return function(req: Request, res: Response, next: NextFunction): MiddlewareResult {
    const hasAllRequested = requestedPermissions.every((perm) => req.apiUserPermissions?.includes(perm));
    if (!hasAllRequested) {
      return errors.forbidden(res);
    }
    return next();
  };
}

/**
 * Asserts that either the current API User has permissions to read or modify a user, or that the
 * current user is only attempting to read or modify themselves.
 * The UUID of the user to read or modify is expected to be in the request parameters as either `uuid` or `user_id`.
 *
 * @param write - If write permissions should be asserted.
 * @returns The permission assertion middleware.
 */
export function ensureUserResourcePermission(write = false): Middleware {
  return function(req: Request, res: Response, next: NextFunction): MiddlewareResult {
    let userUUID = 'uuid' in req.params ? req.params.uuid : req.params.user_id;
    if (!userUUID) {
      throw (new Error('uuid or user_id not provided in route parameters!'));
    }

    let authorized = false;
    if (req.isAPIUser) {
      const requestedPermissions: APIUserPermission[] = ['users:read'];
      if (write) {
        requestedPermissions.push('users:write');
      }
      authorized = requestedPermissions.every((perm) => req.apiUserPermissions?.includes(perm));
    } else {
      authorized = (!!req.isAuthenticated && req.userUUID === userUUID);
    }
    if (!authorized) {
      return errors.forbidden(res);
    }
    return next();
  };
}

/**
 * Asserts that the current user has the is_developer flag set to true.
 * This should only be called after the user has been authenticated (e.g., via verifyTokenAuthentication).
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @param next - The next function to run in the middleware chain.
 * @returns The result of the next middleware, or a fulfilled 403 Forbidden error response.
 */
export async function ensureIsDeveloperUser(req: Request, res: Response, next: NextFunction): AsyncMiddlewareResult {
  if(!req.userUUID){
    return errors.unauthorized(res); // Fallback to generic unauthorized error.
  }

  const userController = new UserController();
  const user = await userController.getUserInternal(req.userUUID);
  if(!user || !user.is_developer){
    return errors.forbidden(res); // Fallback to generic forbidden error.
  }

  return next();
}

/**
 * Extracts the X-User-ID header from the request and sets it on the request object. Does not verify the
 * authentication of the request, but does check that the request is from an API User.
 * This middleware should ONLY be used following the `ensureActorIsAPIUser` middleware.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @param next - The next function to run in the middleware chain.
 * @returns The result of the next middleware, or a fulfilled 403 Forbidden error response.
 * @example  router.route('/test').post(
   verifyAPIAuthentication,
   ensureActorIsAPIUser,
   ensureAPIUserHasPermission(['users:write']),
   extract_X_User_ID,
   catchInternal((req, res) => {
     console.log("X-User-ID: ", req.XUserID)
     res.status(200).json({ message: 'Success', XUserID: req.XUserID });
   }),
 )
*/
export async function extract_X_User_ID(req: Request, res: Response, next: NextFunction): AsyncMiddlewareResult {
  try {
    if(!req.isAPIUser){
      return errors.forbidden(res, 'X-User-ID is only available for API users.');
    }
    const XUserID = req.headers['x-user-id'] as string;
     if (!XUserID) {
      return errors.badRequest(res, 'Missing required X-User-ID header');
    }

    req.XUserID = XUserID;
    return next();
  } catch (e) {
    return errors.internalServerError(res);
  }
}

/**
 * Sets the 'Access-Control-Allow-Origin' header if the request origin is a LibreTexts site/application.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @param next - The next function to run in the middleware chain.
 * @returns The result of the next middleware with the 'Access-Control-Allow-Origin' header set if
 * the necessary conditions were met.
 */
export function useLibreTextsCORS(req: Request, res: Response, next: NextFunction): MiddlewareResult {
  if (/\.libretexts\.org$/.test(req.headers?.origin || '')) {
    res.set('Access-Control-Allow-Origin', req.headers.origin);
    res.set('Vary', 'Origin');
  }
  return next();
}
