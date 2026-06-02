import { Request, Response } from 'express';
import MessageValidator from 'sns-validator';
import errors from '@server/errors';
import { EmailEvent, EmailEventType } from '@server/models/EmailEvent';
import { User } from '@server/models/User';
import { recordConsentChange } from '@server/services/marketingConsent';
import { sesEventIngestSchema, SesMessage } from '@server/validators/sesEvents';

type SnsEnvelope = {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  TopicArn: string;
  Message: string;
  SubscribeURL?: string;
  MessageId?: string;
};

function allowedTopicArns(): Set<string> {
  return new Set(
    (process.env.SES_SNS_TOPIC_ARNS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function classify(msg: SesMessage): EmailEventType | null {
  if (msg.notificationType === 'Bounce' && msg.bounce) {
    if (msg.bounce.bounceType === 'Permanent') return 'HARD_BOUNCE';
    if (msg.bounce.bounceType === 'Transient') return 'SOFT_BOUNCE';
    return null;
  }
  if (msg.notificationType === 'Complaint' && msg.complaint) {
    return 'COMPLAINT';
  }
  return null;
}

type RecipientRecord = { email: string; diagnosticCode?: string | null };

function extractRecipients(msg: SesMessage, type: EmailEventType): RecipientRecord[] {
  if (type === 'COMPLAINT' && msg.complaint) {
    return msg.complaint.complainedRecipients.map((r) => ({ email: r.emailAddress }));
  }
  if (msg.bounce) {
    return msg.bounce.bouncedRecipients.map((r) => ({
      email: r.emailAddress,
      diagnosticCode: r.diagnosticCode ?? null,
    }));
  }
  return [];
}

export class SnsEventController {
  private validator: MessageValidator;

  constructor(validator?: MessageValidator) {
    this.validator = validator ?? new MessageValidator();
  }

  private validateSignature(body: Record<string, unknown>): Promise<void> {
    if (
      process.env.NODE_ENV !== 'production'
      && (Boolean(process.env.SES_SNS_SKIP_SIGNATURE) === true || process.env.SES_SNS_SKIP_SIGNATURE === 'true')
    ) {
      console.warn('[SnsEventController] SES_SNS_SKIP_SIGNATURE is enabled — skipping signature validation. DEV ONLY.');
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.validator.validate(body, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * SNS hostname allowlist — matches the same pattern AWS's own `sns-validator`
   * uses to validate signing-cert URLs. Pinning to `sns.<region>.amazonaws.com`
   * is tighter than a generic `*.amazonaws.com` suffix check.
   */
  private static readonly SNS_HOST_PATTERN = /^sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?$/;

  private async confirmSubscription(url: string): Promise<void> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('SubscribeURL is not a valid URL');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('SubscribeURL must use https');
    }
    if (parsed.username || parsed.password) {
      throw new Error('SubscribeURL must not contain credentials');
    }
    if (parsed.port && parsed.port !== '443') {
      throw new Error('SubscribeURL must use the default https port');
    }
    if (!SnsEventController.SNS_HOST_PATTERN.test(parsed.hostname)) {
      throw new Error(`SubscribeURL host not in SNS allowlist: ${parsed.hostname}`);
    }

    // Rebuild the URL from validated parts. The string passed to fetch() is
    // now constructed from a hostname that matched a strict allowlist regex,
    // not from the raw user-supplied URL — this also serves as the CodeQL
    // sanitizer barrier for js/server-side-request-forgery.
    const safeUrl = `https://${parsed.hostname}${parsed.pathname}${parsed.search}`;

    const response = await fetch(safeUrl, { method: 'GET', redirect: 'error' });
    if (!response.ok) {
      throw new Error(`SubscribeURL returned ${response.status}`);
    }
  }

  public async ingest(req: Request, res: Response): Promise<Response> {
    const envelope = req.body as SnsEnvelope | undefined;
    if (!envelope || typeof envelope !== 'object' || !envelope.Type) {
      return errors.badRequest(res, 'Missing SNS envelope.');
    }

    try {
      await this.validateSignature(envelope as unknown as Record<string, unknown>);
    } catch (e) {
      console.warn('[SnsEventController] Signature validation failed:', (e as Error).message);
      return errors.unauthorized(res, 'Invalid SNS signature.');
    }

    const allowed = allowedTopicArns();
    if (allowed.size === 0 || !allowed.has(envelope.TopicArn)) {
      console.warn('[SnsEventController] Rejecting message from disallowed TopicArn:', envelope.TopicArn);
      return errors.forbidden(res, 'TopicArn not allowed.');
    }

    if (envelope.Type === 'SubscriptionConfirmation' || envelope.Type === 'UnsubscribeConfirmation') {
      if (!envelope.SubscribeURL) {
        return errors.badRequest(res, 'Missing SubscribeURL.');
      }
      try {
        await this.confirmSubscription(envelope.SubscribeURL);
      } catch (e) {
        console.error('[SnsEventController] Subscription confirmation failed:', e);
        return errors.badRequest(res, 'Subscription confirmation failed.');
      }
      return res.send({ confirmed: true });
    }

    if (envelope.Type !== 'Notification') {
      return errors.badRequest(res, `Unsupported SNS message type: ${envelope.Type}`);
    }

    let sesPayload: unknown;
    try {
      sesPayload = JSON.parse(envelope.Message);
    } catch {
      return errors.badRequest(res, 'SNS Message field is not valid JSON.');
    }

    const { error, value } = sesEventIngestSchema.validate(sesPayload, { abortEarly: false });
    if (error) {
      return errors.badRequest(res, error.message);
    }

    const messages: SesMessage[] = Array.isArray(value) ? value : [value];

    let processed = 0;
    let skipped = 0;

    for (const msg of messages) {
      const type = classify(msg);
      if (!type) {
        skipped += 1;
        continue;
      }
      const recipients = extractRecipients(msg, type);
      const receivedAt = msg.bounce?.timestamp || msg.complaint?.timestamp || msg.mail.timestamp;
      const receivedDate = receivedAt ? new Date(receivedAt) : new Date();
      const feedbackId = msg.bounce?.feedbackId ?? msg.complaint?.feedbackId ?? null;
      const bounceSubtype = msg.bounce?.bounceSubType ?? null;
      const complaintFeedbackType = msg.complaint?.complaintFeedbackType ?? null;

      for (const rcpt of recipients) {
        try {
          const email = rcpt.email.toLowerCase();
          const user = await User.findOne({ where: { email } });
          
          /**
           * Note: a user match is not a requirement here. We explicitly allow recording events for emails that do not correspond to any user,
           * as this can be useful for monitoring and analytics purposes (e.g. tracking bounces/complaints for non-user emails, identifying potential issues with email deliverability, etc.).
           * Moreover, if the email is later used to create a user, having historical event data can provide valuable context for that user's email history and deliverability status.
          */ 
          const [event, created] = await EmailEvent.findOrCreate({
            where: {
              ses_message_id: msg.mail.messageId,
              event_type: type,
              email,
            },
            defaults: {
              email,
              user_uuid: user?.uuid ?? null,
              event_type: type,
              ses_message_id: msg.mail.messageId,
              ses_feedback_id: feedbackId,
              bounce_subtype: bounceSubtype,
              complaint_feedback_type: complaintFeedbackType,
              diagnostic_code: rcpt.diagnosticCode ?? null,
              received_at: receivedDate,
              raw_payload: msg as unknown as Record<string, unknown>,
            },
          });

          if (!created) {
            skipped += 1;
            continue;
          }

          if (user && (type === 'HARD_BOUNCE' || type === 'COMPLAINT')) {
            await recordConsentChange({
              user,
              newValue: false,
              source: 'SES_EVENT',
              reason: type,
              emailEventId: event.id,
            });
          }

          processed += 1;
        } catch (e) {
          console.error('[SnsEventController] Error processing recipient', rcpt.email, e);
          skipped += 1;
        }
      }
    }

    return res.send({ processed, skipped });
  }
}
