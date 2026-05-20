const REQUIRED_SECRETS = [
  'SESSION_SECRET',
  'CAS_JWT_SIGN_SECRET',
  'CAS_JWT_ENCRYPT_SECRET',
] as const;

const missing = REQUIRED_SECRETS.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(
    `FATAL: Missing required secret environment variables: ${missing.join(', ')}. ` +
    'The server cannot start without these. Check your .env file.',
  );
  process.exit(1);
}
