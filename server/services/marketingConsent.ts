import { Transaction } from 'sequelize';
import { sequelize } from '@server/models';
import { User } from '@server/models/User';
import {
  MarketingConsentEvent,
  type MarketingConsentReason,
  type MarketingConsentSource,
} from '@server/models/MarketingConsentEvent';

export type RecordConsentChangeParams = {
  user: User;
  newValue: boolean;
  source: MarketingConsentSource;
  reason: MarketingConsentReason;
  actorUserUuid?: string | null;
  emailEventId?: number | null;
  note?: string | null;
  transaction?: Transaction;
};

export type RecordConsentChangeResult = {
  changed: boolean;
  user: User;
  event: MarketingConsentEvent | null;
};

const SUPPRESSION_REASONS: MarketingConsentReason[] = ['HARD_BOUNCE', 'COMPLAINT'];

export async function recordConsentChange(
  params: RecordConsentChangeParams,
): Promise<RecordConsentChangeResult> {
  const {
    user,
    newValue,
    source,
    reason,
    actorUserUuid = null,
    emailEventId = null,
    note = null,
    transaction: outerTx,
  } = params;

  const run = async (tx: Transaction): Promise<RecordConsentChangeResult> => {
    const fresh = await User.findOne({ where: { uuid: user.uuid }, transaction: tx });
    if (!fresh) {
      throw new Error(`recordConsentChange: user ${user.uuid} not found`);
    }

    const previous = fresh.mktg_email_opt_in ?? false;
    const isSuppression = SUPPRESSION_REASONS.includes(reason);
    const wasAlreadySuppressed = fresh.email_deliverability_status === 'SUPPRESSED';

    const valueChanged = previous !== newValue;
    const suppressionChanged = isSuppression && !wasAlreadySuppressed;
    if (!valueChanged && !suppressionChanged) {
      return { changed: false, user: fresh, event: null };
    }

    const event = await MarketingConsentEvent.create({
      user_uuid: fresh.uuid,
      previous_value: previous,
      new_value: newValue,
      source,
      reason,
      actor_user_uuid: actorUserUuid,
      email_event_id: emailEventId,
      note,
    }, { transaction: tx });

    const now = new Date();
    const updates: Record<string, unknown> = { mktg_email_opt_in: newValue };

    if (newValue) {
      updates.mktg_opt_in_at = now;
      updates.mktg_opt_in_source = source;
      updates.mktg_suppressed_at = null;
      updates.mktg_suppression_reason = null;
      updates.email_deliverability_status = 'DELIVERABLE';
    } else if (isSuppression) {
      updates.mktg_suppressed_at = now;
      updates.mktg_suppression_reason = reason;
      updates.email_deliverability_status = 'SUPPRESSED';
    } else {
      updates.mktg_suppressed_at = now;
      updates.mktg_suppression_reason = reason;
    }

    await fresh.update(updates, { transaction: tx });

    return { changed: true, user: fresh, event };
  };

  if (outerTx) {
    return run(outerTx);
  }
  return sequelize.transaction(run);
}
