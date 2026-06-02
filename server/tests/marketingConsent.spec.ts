import { after, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { server } from '..';
import { MarketingConsentEvent, User } from '../models';
import { recordConsentChange } from '../services/marketingConsent';

describe('marketingConsent service', () => {
  afterEach(async () => {
    await MarketingConsentEvent.destroy({ where: {} });
    await User.destroy({ where: {} });
  });
  after(async () => {
    if (server?.listening) server.close();
  });

  it('records a user self-service opt-out', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'a@example.com',
      mktg_email_opt_in: true,
    });
    const { changed, event } = await recordConsentChange({
      user,
      newValue: false,
      source: 'USER_SELF_SERVICE',
      reason: 'USER_UNSUBSCRIBE',
      actorUserUuid: user.uuid,
    });
    expect(changed).to.equal(true);
    expect(event).to.exist;

    const reloaded = await User.findOne({ where: { uuid: user.uuid } });
    expect(reloaded?.mktg_email_opt_in).to.equal(false);
    expect(reloaded?.mktg_suppressed_at).to.exist;
    expect(reloaded?.mktg_suppression_reason).to.equal('USER_UNSUBSCRIBE');
    expect(reloaded?.email_deliverability_status).to.equal('DELIVERABLE');

    const ledger = await MarketingConsentEvent.findAll({ where: { user_uuid: user.uuid } });
    expect(ledger).to.have.length(1);
    expect(ledger[0].source).to.equal('USER_SELF_SERVICE');
    expect(ledger[0].reason).to.equal('USER_UNSUBSCRIBE');
    expect(ledger[0].previous_value).to.equal(true);
    expect(ledger[0].new_value).to.equal(false);
  });

  it('records a self-service opt-in and clears suppression', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'b@example.com',
      mktg_email_opt_in: false,
      mktg_suppressed_at: new Date(),
      mktg_suppression_reason: 'USER_UNSUBSCRIBE',
    });
    const { changed } = await recordConsentChange({
      user,
      newValue: true,
      source: 'USER_SELF_SERVICE',
      reason: 'USER_OPT_IN',
      actorUserUuid: user.uuid,
    });
    expect(changed).to.equal(true);
    const reloaded = await User.findOne({ where: { uuid: user.uuid } });
    expect(reloaded?.mktg_email_opt_in).to.equal(true);
    expect(reloaded?.mktg_opt_in_at).to.exist;
    expect(reloaded?.mktg_opt_in_source).to.equal('USER_SELF_SERVICE');
    expect(reloaded?.mktg_suppressed_at).to.equal(null);
    expect(reloaded?.mktg_suppression_reason).to.equal(null);
    expect(reloaded?.email_deliverability_status).to.equal('DELIVERABLE');
  });

  it('marks user SUPPRESSED on HARD_BOUNCE', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'c@example.com',
      mktg_email_opt_in: true,
    });
    await recordConsentChange({
      user,
      newValue: false,
      source: 'SES_EVENT',
      reason: 'HARD_BOUNCE',
    });
    const reloaded = await User.findOne({ where: { uuid: user.uuid } });
    expect(reloaded?.email_deliverability_status).to.equal('SUPPRESSED');
    expect(reloaded?.mktg_suppression_reason).to.equal('HARD_BOUNCE');
    expect(reloaded?.mktg_email_opt_in).to.equal(false);
  });

  it('is a no-op when value unchanged and no suppression delta', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'd@example.com',
      mktg_email_opt_in: false,
    });
    const { changed, event } = await recordConsentChange({
      user,
      newValue: false,
      source: 'USER_SELF_SERVICE',
      reason: 'USER_UNSUBSCRIBE',
      actorUserUuid: user.uuid,
    });
    expect(changed).to.equal(false);
    expect(event).to.equal(null);
    const ledger = await MarketingConsentEvent.findAll({ where: { user_uuid: user.uuid } });
    expect(ledger).to.have.length(0);
  });
});
