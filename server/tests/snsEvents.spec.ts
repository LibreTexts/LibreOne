import { after, afterEach, before, describe, it } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import MessageValidator from 'sns-validator';
import { server } from '..';
import { EmailEvent, MarketingConsentEvent, User } from '../models';

const WEBHOOK_PATH = '/api/v1/sns/ses-events';
const ALLOWED_TOPIC = 'arn:aws:sns:us-east-1:000000000000:dev-libreone-ses';

function bouncePayload(opts: {
  email: string;
  messageId?: string;
  bounceType?: 'Permanent' | 'Transient';
}) {
  return {
    notificationType: 'Bounce' as const,
    mail: {
      messageId: opts.messageId ?? `msg-${uuidv4()}`,
      timestamp: new Date().toISOString(),
    },
    bounce: {
      bounceType: opts.bounceType ?? 'Permanent',
      bounceSubType: 'General',
      feedbackId: `fb-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      bouncedRecipients: [{
        emailAddress: opts.email,
        diagnosticCode: '550 5.1.1 user unknown',
      }],
    },
  };
}

function complaintPayload(opts: { email: string; messageId?: string }) {
  return {
    notificationType: 'Complaint' as const,
    mail: {
      messageId: opts.messageId ?? `msg-${uuidv4()}`,
      timestamp: new Date().toISOString(),
    },
    complaint: {
      feedbackId: `fb-${uuidv4()}`,
      complaintFeedbackType: 'abuse',
      timestamp: new Date().toISOString(),
      complainedRecipients: [{ emailAddress: opts.email }],
    },
  };
}

function envelope(opts: {
  type?: 'Notification' | 'SubscriptionConfirmation';
  topicArn?: string;
  message?: object;
  subscribeUrl?: string;
}) {
  return {
    Type: opts.type ?? 'Notification',
    TopicArn: opts.topicArn ?? ALLOWED_TOPIC,
    MessageId: uuidv4(),
    Message: opts.message ? JSON.stringify(opts.message) : '',
    SubscribeURL: opts.subscribeUrl,
  };
}

describe('SNS Event Webhook', () => {
  let validateStub: sinon.SinonStub;
  let originalFetch: typeof globalThis.fetch;

  before(() => {
    process.env.SES_SNS_TOPIC_ARNS = ALLOWED_TOPIC;
    validateStub = sinon.stub(MessageValidator.prototype, 'validate');
    validateStub.callsFake((_msg, cb) => cb(null, _msg));
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    validateStub.resetHistory();
    validateStub.callsFake((_msg, cb) => cb(null, _msg));
    globalThis.fetch = originalFetch;
    await MarketingConsentEvent.destroy({ where: {} });
    await EmailEvent.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  after(async () => {
    validateStub.restore();
    if (server?.listening) server.close();
  });

  it('rejects messages whose signature fails validation', async () => {
    validateStub.callsFake((_msg, cb) => cb(new Error('bad signature')));
    const res = await request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({ message: bouncePayload({ email: 'x@example.com' }) }));
    expect(res.status).to.equal(401);
    expect(await EmailEvent.count()).to.equal(0);
  });

  it('rejects notifications from disallowed TopicArns', async () => {
    const res = await request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({
        topicArn: 'arn:aws:sns:us-east-1:999999999999:attacker',
        message: bouncePayload({ email: 'x@example.com' }),
      }));
    expect(res.status).to.equal(403);
    expect(await EmailEvent.count()).to.equal(0);
  });

  it('auto-confirms SubscriptionConfirmation messages by GETing SubscribeURL', async () => {
    const fetchStub = sinon.stub().resolves({ ok: true } as Response);
    globalThis.fetch = fetchStub as unknown as typeof globalThis.fetch;
    const subscribeUrl = 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&Token=abc';
    const res = await request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({ type: 'SubscriptionConfirmation', subscribeUrl }));
    expect(res.status).to.equal(200);
    expect(res.body.confirmed).to.equal(true);
    expect(fetchStub.calledOnceWith(subscribeUrl)).to.equal(true);
    expect(await EmailEvent.count()).to.equal(0);
  });

  it('records a hard bounce and suppresses the user', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'bouncer@example.com',
      mktg_email_opt_in: true,
    });
    const res = await request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({ message: bouncePayload({ email: 'bouncer@example.com' }) }));
    expect(res.status).to.equal(200);
    expect(res.body.processed).to.equal(1);

    const events = await EmailEvent.findAll();
    expect(events).to.have.length(1);
    expect(events[0].event_type).to.equal('HARD_BOUNCE');
    expect(events[0].user_uuid).to.equal(user.uuid);

    const reloaded = await User.findOne({ where: { uuid: user.uuid } });
    expect(reloaded?.email_deliverability_status).to.equal('SUPPRESSED');
    expect(reloaded?.mktg_email_opt_in).to.equal(false);

    const ledger = await MarketingConsentEvent.findAll({ where: { user_uuid: user.uuid } });
    expect(ledger).to.have.length(1);
    expect(ledger[0].reason).to.equal('HARD_BOUNCE');
    expect(ledger[0].source).to.equal('SES_EVENT');
    expect(ledger[0].email_event_id).to.equal(events[0].id);
  });

  it('records a complaint and suppresses the user', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'complainer@example.com',
      mktg_email_opt_in: true,
    });
    const res = await request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({ message: complaintPayload({ email: 'complainer@example.com' }) }));
    expect(res.status).to.equal(200);

    const reloaded = await User.findOne({ where: { uuid: user.uuid } });
    expect(reloaded?.email_deliverability_status).to.equal('SUPPRESSED');
    expect(reloaded?.mktg_suppression_reason).to.equal('COMPLAINT');
  });

  it('records a soft bounce without suppressing the user', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'soft@example.com',
      mktg_email_opt_in: true,
    });
    const res = await request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({
        message: bouncePayload({ email: 'soft@example.com', bounceType: 'Transient' }),
      }));
    expect(res.status).to.equal(200);

    expect(await EmailEvent.count()).to.equal(1);
    const reloaded = await User.findOne({ where: { uuid: user.uuid } });
    expect(reloaded?.mktg_email_opt_in).to.equal(true);
    expect(reloaded?.email_deliverability_status).to.equal('DELIVERABLE');
    expect(await MarketingConsentEvent.count()).to.equal(0);
  });

  it('is idempotent on duplicate SES messageId redelivery', async () => {
    const user = await User.create({
      uuid: uuidv4(),
      email: 'dupe@example.com',
      mktg_email_opt_in: true,
    });
    const payload = bouncePayload({ email: 'dupe@example.com', messageId: 'fixed-msg-1' });
    const send = () => request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({ message: payload }));

    await send();
    const second = await send();
    expect(second.status).to.equal(200);

    expect(await EmailEvent.count()).to.equal(1);
    expect(await MarketingConsentEvent.count({ where: { user_uuid: user.uuid } })).to.equal(1);
  });

  it('stores events for unknown emails without a ledger row', async () => {
    const res = await request(server)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send(envelope({ message: bouncePayload({ email: 'ghost@example.com' }) }));
    expect(res.status).to.equal(200);

    const events = await EmailEvent.findAll();
    expect(events).to.have.length(1);
    expect(events[0].user_uuid).to.equal(null);
    expect(await MarketingConsentEvent.count()).to.equal(0);
  });
});
