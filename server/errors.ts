import { Response } from 'express';

type ErrorObject = {
  status: string,
  code: string,
  title: string,
  detail: string,
  additional?: Record<string, any>,
};

/**
 * Completes a request by responding with a desired status code and a description of the
 * encountered error in JSON API format.
 *
 * @param res - Outgoing API response.
 * @param error - An object describing the error encountered.
 * @returns The fulfilled API response.
 */
function sendErrorResponse(res: Response, error: ErrorObject): Response {
  return res.status(Number(error.status)).send({
    errors: [error],
  });
}

/**
 * Completes an API request with a standard 400 Bad Request response.
 *
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @returns The fulfilled API response.
 */
function badRequest(res: Response, detail?: string): Response {
  return sendErrorResponse(res, {
    status: '400',
    code: 'bad_request',
    title: 'Bad Request',
    detail: detail || 'Oops, required fields may be missing or invalid.',
  });
}

/**
 * Completes an API request with a standard 401 Unauthorized response.
 *
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @param realm - A custom "realm" message; activates the "WWW-Authenticate" header.
 * @returns The fulfilled API response.
 */
function unauthorized(res: Response, detail?: string, realm?: string, addtlFields?: Record<string, any>): Response {
  if (realm) {
    res.set('WWW-Authenticate', `Basic realm="${realm}"`);
  }
  return sendErrorResponse(res, {
    status: '401',
    code: 'unauthorized',
    title: 'Unauthorized',
    detail: detail || 'Authorization is required to access this resource.',
    additional: addtlFields,
  });
}

/**
 * Completes an API request with a standard 403 Forbidden response.
 *
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @returns The fulfilled API response.
 */
function forbidden(res: Response, detail?: string): Response {
  return sendErrorResponse(res, {
    status: '403',
    code: 'forbidden',
    title: 'Forbidden',
    detail: detail || 'Provided authorization is insufficient for this resource.',
  });
}

/**
 * Completes an API request with a standard 404 Not Found response.
 *
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @returns The fulfilled API response.
 */
function notFound(res: Response, detail?: string): Response {
  return sendErrorResponse(res, {
    status: '404',
    code: 'not_found',
    title: 'Not Found',
    detail: detail || 'Sorry, we couldn\'t find a resource with that identifier.',
  });
}

/**
 * Completes an API request with a standard 409 Conflict response.
 *
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @returns The fulfilled API response.
 */
function conflict(res: Response, detail?: string, addtlFields?: Record<string, any>): Response {
  return sendErrorResponse(res, {
    status: '409',
    code: 'resource_conflict',
    title: 'Conflict',
    detail: detail || 'Sorry, a resource with that identifier already exists.',
    additional: addtlFields,
  });
}

/**
 * Completes an API request with a standard 413 Content Too Large response.
 *
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @returns The fulfilled API response.
 */
function contentTooLarge(res: Response, detail?: string): Response {
  return sendErrorResponse(res, {
    status: '413',
    code: 'content_too_large',
    title: 'Content Too Large',
    detail: detail || 'Sorry, the provided file or payload is too large.',
  });
}

/**
 * Completes an API request with a standard 500 Internal Server Error response.
 *
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @returns The fulfilled API response.
 */
function internalServerError(res: Response, detail?: string): Response {
  return sendErrorResponse(res, {
    status: '500',
    code: 'internal_error',
    title: 'Internal Server Error',
    detail: detail || 'Sorry, we encountered an unknown error. Try again soon.',
  });
}

/**
 * Completes an API request with a standard 501 Not Implemented response.
 * 
 * @param res - The response to hydrate.
 * @param detail - A custom detailed error message.
 * @return The fulfilled API response.
 */
function notImplemented(res: Response, detail?: string): Response {
  return sendErrorResponse(res, {
    status: '501',
    code: 'not_implemented',
    title: 'Not Implemented',
    detail: detail || 'Sorry, this feature is not yet implemented.',
  });
}


export default {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  contentTooLarge,
  internalServerError,
  notImplemented,
};
