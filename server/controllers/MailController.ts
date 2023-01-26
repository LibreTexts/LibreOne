import { SESv2Client } from '@aws-sdk/client-sesv2';

let mailSender: SESv2Client;

/**
 * Establishes an SES Client for use in the API.
 *
 * @returns True if client initiated successfully, false otherwise.
 */
export async function initMailSender(): Promise<boolean> {
  const region = process.env.AWS_SES_REGION;
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SES_SECRET_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    console.error('Missing AWS SES initialization parameters!');
    return false;
  }

  mailSender = new SESv2Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return true;
}

/**
 * Retrieves the active SES client, or attempts to initialize one on-the-fly.
 *
 * @returns An SES client, or null if unable to initialize one.
 */
export async function useMailSender(): Promise<SESv2Client | null> {
  if (mailSender) {
    return mailSender;
  }

  // Try to initialize on-the-fly
  const didInit = await initMailSender();
  if (didInit) {
    return mailSender;
  }

  return null;
}
