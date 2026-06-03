import 'dotenv/config';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import type { Request } from 'express';
import { resolveLimitKey } from '../rateLimiters';

function makeReq(opts: {
  authorization?: string;
  cookies?: Record<string, string>;
  ip?: string;
}): Request {
  return {
    headers: opts.authorization ? { authorization: opts.authorization } : {},
    cookies: opts.cookies ?? {},
    ip: opts.ip ?? '203.0.113.10',
    socket: { remoteAddress: opts.ip ?? '203.0.113.10' },
  } as unknown as Request;
}

describe('resolveLimitKey', () => {
  it('keys by client ID when a valid Basic auth header is present', () => {
    const basic = Buffer.from('client-abc:secret-xyz').toString('base64');
    const { tier, key } = resolveLimitKey(makeReq({ authorization: `Basic ${basic}` }));
    expect(tier).to.equal('api');
    expect(key).to.equal('api:client-abc');
  });

  it('keys by signed cookie when both session cookies are present', () => {
    const { tier, key } = resolveLimitKey(makeReq({
      cookies: { one_access: 'header.payload', one_signed: 'signature-value' },
    }));
    expect(tier).to.equal('usr');
    expect(key).to.equal('usr:signature-value');
  });

  it('falls back to IP when only one session cookie is present', () => {
    const { tier, key } = resolveLimitKey(makeReq({
      cookies: { one_access: 'header.payload' },
      ip: '198.51.100.7',
    }));
    expect(tier).to.equal('ip');
    expect(key).to.equal('ip:198.51.100.7');
  });

  it('falls back to IP when no identifying material is present', () => {
    const { tier, key } = resolveLimitKey(makeReq({ ip: '192.0.2.5' }));
    expect(tier).to.equal('ip');
    expect(key).to.equal('ip:192.0.2.5');
  });

  it('falls back to IP when the Basic auth header is malformed', () => {
    const { tier, key } = resolveLimitKey(makeReq({
      authorization: 'Basic not-base64-and-no-colon',
      ip: '192.0.2.6',
    }));
    expect(tier).to.equal('ip');
    expect(key).to.equal('ip:192.0.2.6');
  });

  it('falls back to IP when the Basic auth header has no client ID', () => {
    const empty = Buffer.from(':secret-only').toString('base64');
    const { tier, key } = resolveLimitKey(makeReq({
      authorization: `Basic ${empty}`,
      ip: '192.0.2.7',
    }));
    expect(tier).to.equal('ip');
    expect(key).to.equal('ip:192.0.2.7');
  });

  it('ignores non-Basic Authorization schemes and falls through', () => {
    const { tier, key } = resolveLimitKey(makeReq({
      authorization: 'Bearer some-jwt',
      ip: '192.0.2.8',
    }));
    expect(tier).to.equal('ip');
    expect(key).to.equal('ip:192.0.2.8');
  });

  it('prefers API tier over cookie tier when both are present', () => {
    const basic = Buffer.from('client-xyz:secret').toString('base64');
    const { tier, key } = resolveLimitKey(makeReq({
      authorization: `Basic ${basic}`,
      cookies: { one_access: 'a', one_signed: 'b' },
    }));
    expect(tier).to.equal('api');
    expect(key).to.equal('api:client-xyz');
  });
});
