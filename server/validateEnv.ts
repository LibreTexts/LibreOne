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
