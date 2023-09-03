import { Request, Response } from 'express';
import errors from './errors';

type APIFunction = (request: Request, response: Response) => Response | void;
type AsyncAPIFunction = (request: Request, response: Response) => Promise<Response | void>;

/**
 * Wraps an async API function in order to catch internal errors and return an HTTP
 * response appropriate for end-users.
 *
 * @param fn - The async Express-style function to wrap.
 * @returns A response fulfilled by the API function, or a HTTP 500 error.
 */
export function catchInternal(fn: APIFunction | AsyncAPIFunction): AsyncAPIFunction {
  return async function safeFunction(req: Request, res: Response): Promise<Response | void> {
    try {
      return await fn(req, res);
    } catch (e) {
      console.error(e);
      return errors.internalServerError(res);
    }
  }; 
}

/**
 * Returns the URL the server is currently running at.
 * @returns The URL of the server.
 */
export function getProductionURL(): string {
  if (process.env.PRODUCTION_DOMAIN) {
    return `https://${process.env.PRODUCTION_DOMAIN}`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
}

/**
 * Tries to parse a JSON string into an object.
 *
 * @param input - JSON string to parse/check.
 * @returns Parsed object if valid, falsy boolean otherwise.
 */
export function safeJSONParse(input: string): object | boolean {
  try {
    if (input) {
      const obj = JSON.parse(input);
      if (obj && typeof (obj) === 'object') {
        return true;
      }
    }
  } catch (e) {
    // fall-through to return false
  }
  return false;
}

export const DEFAULT_FIRST_NAME = 'LibreTexts';
export const DEFAULT_LAST_NAME = 'User';
