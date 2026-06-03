import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import errors from './errors';
import {
  RATE_LIMIT_FLOOD_PER_MIN,
  RATE_LIMIT_UNAUTH_PER_MIN,
  RATE_LIMIT_AUTH_USER_PER_MIN,
  RATE_LIMIT_API_USER_PER_MIN,
} from './validateEnv';

const WINDOW_SECONDS = 60;

const floodLimiter = new RateLimiterMemory({
  points: RATE_LIMIT_FLOOD_PER_MIN,
  duration: WINDOW_SECONDS,
});

const apiUserLimiter = new RateLimiterMemory({
  points: RATE_LIMIT_API_USER_PER_MIN,
  duration: WINDOW_SECONDS,
});

const authUserLimiter = new RateLimiterMemory({
  points: RATE_LIMIT_AUTH_USER_PER_MIN,
  duration: WINDOW_SECONDS,
});

const unauthLimiter = new RateLimiterMemory({
  points: RATE_LIMIT_UNAUTH_PER_MIN,
  duration: WINDOW_SECONDS,
});

type Tier = 'api' | 'usr' | 'ip';

export interface ResolvedLimit {
  tier: Tier;
  key: string;
  limiter: RateLimiterMemory;
}

function parseBasicAuthClientId(authHeader: string): string | null {
  if (!authHeader.startsWith('Basic ')) return null;
  const encoded = authHeader.slice(6).trim();
  if (!encoded) return null;
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const idx = decoded.indexOf(':');
    if (idx <= 0) return null;
    const clientId = decoded.slice(0, idx);
    if (!clientId) return null;
    return clientId;
  } catch {
    return null;
  }
}

export function resolveLimitKey(req: Request): ResolvedLimit {
  const ipKey = req.ip || req.socket?.remoteAddress || 'unknown';

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string') {
    const clientId = parseBasicAuthClientId(authHeader);
    if (clientId) {
      return { tier: 'api', key: `api:${clientId}`, limiter: apiUserLimiter };
    }
  }

  const cookies = req.cookies as Record<string, string> | undefined;
  if (cookies
    && Object.hasOwn(cookies, 'one_access')
    && Object.hasOwn(cookies, 'one_signed')
    && cookies.one_signed) {
    return { tier: 'usr', key: `usr:${cookies.one_signed}`, limiter: authUserLimiter };
  }

  return { tier: 'ip', key: `ip:${ipKey}`, limiter: unauthLimiter };
}

function applyHeaders(res: Response, limit: number, info: RateLimiterRes): void {
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(Math.max(0, info.remainingPoints)));
  res.set('X-RateLimit-Reset', String(Math.ceil(info.msBeforeNext / 1000)));
}

function rejectionRetryAfter(rejection: unknown): number {
  if (rejection instanceof RateLimiterRes) {
    return Math.ceil(rejection.msBeforeNext / 1000);
  }
  return WINDOW_SECONDS;
}

export async function floodLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  try {
    const info = await floodLimiter.consume(key);
    applyHeaders(res, RATE_LIMIT_FLOOD_PER_MIN, info);
    return next();
  } catch (rejection) {
    const retryAfter = rejectionRetryAfter(rejection);
    res.set('X-RateLimit-Limit', String(RATE_LIMIT_FLOOD_PER_MIN));
    res.set('X-RateLimit-Remaining', '0');
    return errors.tooManyRequests(res, retryAfter);
  }
}

export async function tieredLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  const { key, limiter } = resolveLimitKey(req);
  const limit = (limiter as unknown as { points: number }).points;
  try {
    const info = await limiter.consume(key);
    applyHeaders(res, limit, info);
    return next();
  } catch (rejection) {
    const retryAfter = rejectionRetryAfter(rejection);
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', '0');
    return errors.tooManyRequests(res, retryAfter);
  }
}
