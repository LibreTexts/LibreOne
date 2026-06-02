import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Op } from 'sequelize';
import { User } from '@server/models/User';

export type EmailKind = 'transactional' | 'marketing';

export type SendEmailParams = {
  destination: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
  };
  subject: string;
  htmlContent: string;
  kind?: EmailKind;
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
   * Filters a destination list against per-user deliverability + opt-in state.
   * Transactional sends drop only SUPPRESSED recipients (hard bounce / complaint).
   * Marketing sends additionally drop opted-out recipients.
   * Returns null if no recipients remain.
   */
  private async filterRecipients(
    destination: SendEmailParams['destination'],
    kind: EmailKind,
  ): Promise<SendEmailParams['destination'] | null> {
    const all = [
      ...(destination.to ?? []),
      ...(destination.cc ?? []),
      ...(destination.bcc ?? []),
    ];
    if (all.length === 0) return null;

    const lowered = all.map((e) => e.toLowerCase());
    const users = await User.findAll({
      where: { email: { [Op.in]: lowered } },
      attributes: ['email', 'mktg_email_opt_in', 'email_deliverability_status'],
    });
    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const allow = (addr: string): boolean => {
      const user = byEmail.get(addr.toLowerCase());
      if (!user) return true;
      if (user.email_deliverability_status === 'SUPPRESSED') return false;
      if (kind === 'marketing' && !user.mktg_email_opt_in) return false;
      return true;
    };

    const filterList = (list?: string[]) => {
      if (!list) return undefined;
      const out = list.filter(allow);
      return out.length ? out : undefined;
    };

    const result = {
      to: filterList(destination.to),
      cc: filterList(destination.cc),
      bcc: filterList(destination.bcc),
    };

    if (!result.to && !result.cc && !result.bcc) return null;
    return result;
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
    const kind: EmailKind = params.kind ?? 'transactional'; // fallback to transactional if not specified
    const filtered = await this.filterRecipients(params.destination, kind);
    if (!filtered) {
      console.warn('[MailController] All recipients filtered; skipping send.', {
        kind,
        subject: params.subject,
      });
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      if (process.env.NODE_ENV !== 'test') {
        console.debug('[MailController] Simulate send:', { ...params, destination: filtered });
      }
      return true;
    }

    const { subject, htmlContent } = params;
    const destination = filtered;
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
