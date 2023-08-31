import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export type SendEmailParams = {
  destination: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
  };
  subject: string;
  htmlContent: string;
};

export class MailController {
  public adminNotificationEmailAddress: string;
  private mailClient: SESv2Client | null;

  constructor() {
    const region = process.env.AWS_SES_REGION;
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
    const secretAccessKey = process.env.AWS_SES_SECRET_KEY;
    if (!region || !accessKeyId || !secretAccessKey) {
      console.error('Missing AWS SES initialization parameters!');
      return;
    }
    this.adminNotificationEmailAddress = process.env.ADMIN_NOTIFICATION_EMAIL_ADDRESS || 'info@libretexts.org';
    this.mailClient = new SESv2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Verifies that the mail service client has been initialized.
   *
   * @returns True if initialized, false otherwise.
   */
  public isReady() {
    return !!this.mailClient;
  }

  /**
   * Destroys the mail service client. This method is not necessary to call, but can be used
   * to close unused sockets, especially when there are multiple MailController instances in
   * a single runtime.
   */
  public destroy() {
    this.mailClient?.destroy();
    this.mailClient = null;
  }

  /**
   * Send an email message using the mail service client.
   *
   * @param params - Email message configuration
   * @returns True if message successfully sent, false otherwise.
   */
  public async send(params: SendEmailParams): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      if (process.env.NODE_ENV !== 'test') {
        console.debug('[MailController] Simulate send:', params);
      }
      return true;
    }

    const { destination, subject, htmlContent } = params;
    if (!this.mailClient) {
      return false;
    }

    const response = await this.mailClient.send(
      new SendEmailCommand({
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: {
              Html: { Data: htmlContent },
            },
          },
        },
        Destination: {
          ...(destination.to && { ToAddresses: destination.to }),
          ...(destination.cc && { CcAddresses: destination.cc }),
          ...(destination.bcc && { BccAddresses: destination.bcc }),
        },
        FromEmailAddress: process.env.AWS_SES_FROM_ADDR || 'no-reply@one.libretexts.org',
      }),
    );

    if (response.$metadata.httpStatusCode !== 200) {
      console.warn('[MailController] Error sending email!', response.$metadata);
      return false;
    }
    return true;
  }

}
