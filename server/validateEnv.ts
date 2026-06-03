const REQUIRED_SECRETS = [
  'SESSION_SECRET',
  'CAS_JWT_SIGN_SECRET',
  'CAS_JWT_ENCRYPT_SECRET',
  'SES_SNS_TOPIC_ARNS', // comma-separated list of ARNs for SNS topics to accept SES notifications from
] as const;

const missing = REQUIRED_SECRETS.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(
    `FATAL: Missing required secret environment variables: ${missing.join(', ')}. ` +
    'The server cannot start without these. Check your .env file.',
  );
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && (Boolean(process.env.SES_SNS_SKIP_SIGNATURE) === true || process.env.SES_SNS_SKIP_SIGNATURE === 'true')) {
  console.error(
    'FATAL: SES_SNS_SKIP_SIGNATURE=true is not permitted in production. ' +
    'This flag bypasses SNS signature verification and is dev-only.',
  );
  process.exit(1);
}

function parseNonNegativeInt(name: string, raw: string | undefined, defaultValue: number): number {
  if (raw === undefined || raw.trim() === '') {
    return defaultValue;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    console.error(`FATAL: ${name}="${raw}" is invalid. Must be a non-negative integer.`);
    process.exit(1);
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) {
    console.error(`FATAL: ${name}="${raw}" is invalid. Must be a non-negative integer (>= 0).`);
    process.exit(1);
  }
  return n;
}

function parsePositiveInt(name: string, raw: string | undefined, defaultValue: number): number {
  const n = parseNonNegativeInt(name, raw, defaultValue);
  if (n < 1) {
    console.error(`FATAL: ${name}="${raw}" is invalid. Must be a positive integer (>= 1).`);
    process.exit(1);
  }
  return n;
}

// 0 disables proxy trust (Express uses socket.remoteAddress). 1+ is the number of trusted proxy hops.
export const TRUST_PROXY_HOPS = parseNonNegativeInt('TRUST_PROXY_HOPS', process.env.TRUST_PROXY_HOPS, 1);

export const RATE_LIMIT_FLOOD_PER_MIN = parsePositiveInt('RATE_LIMIT_FLOOD_PER_MIN', process.env.RATE_LIMIT_FLOOD_PER_MIN, 2000);
export const RATE_LIMIT_UNAUTH_PER_MIN = parsePositiveInt('RATE_LIMIT_UNAUTH_PER_MIN', process.env.RATE_LIMIT_UNAUTH_PER_MIN, 60);
export const RATE_LIMIT_AUTH_USER_PER_MIN = parsePositiveInt('RATE_LIMIT_AUTH_USER_PER_MIN', process.env.RATE_LIMIT_AUTH_USER_PER_MIN, 300);
export const RATE_LIMIT_API_USER_PER_MIN = parsePositiveInt('RATE_LIMIT_API_USER_PER_MIN', process.env.RATE_LIMIT_API_USER_PER_MIN, 1200);

if (!(RATE_LIMIT_FLOOD_PER_MIN >= RATE_LIMIT_API_USER_PER_MIN
  && RATE_LIMIT_API_USER_PER_MIN >= RATE_LIMIT_AUTH_USER_PER_MIN
  && RATE_LIMIT_AUTH_USER_PER_MIN >= RATE_LIMIT_UNAUTH_PER_MIN)) {
  console.error(
    'FATAL: Rate limit tiers are out of order. Required: ' +
    'RATE_LIMIT_FLOOD_PER_MIN >= RATE_LIMIT_API_USER_PER_MIN >= RATE_LIMIT_AUTH_USER_PER_MIN >= RATE_LIMIT_UNAUTH_PER_MIN. ' +
    `Got flood=${RATE_LIMIT_FLOOD_PER_MIN}, api=${RATE_LIMIT_API_USER_PER_MIN}, auth=${RATE_LIMIT_AUTH_USER_PER_MIN}, unauth=${RATE_LIMIT_UNAUTH_PER_MIN}.`,
  );
  process.exit(1);
}
