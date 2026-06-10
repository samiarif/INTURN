import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifySpy = vi.fn();
vi.mock('svix', () => ({
  Webhook: class {
    constructor(public secret: string) {}
    verify(payload: string, h: Record<string, string>) {
      return verifySpy(payload, h);
    }
  },
}));
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ users: {} }));
vi.mock('@/modules/events/service', () => ({ recordEvent: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      'svix-id': 'msg_1',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,sig',
      'x-forwarded-for': '1.2.3.4',
    }),
}));

import { POST } from './route';

describe('clerk webhook signature payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';
  });

  it('passes the exact raw body bytes to svix verify (no JSON round-trip)', async () => {
    // float 1.0, \u-escaped non-ASCII, and key order are all destroyed by
    // JSON.parse → JSON.stringify; the HMAC is over the raw bytes.
    const raw =
      '{"type":"user.unknown","data":{"weight":1.0,"name":"caf\\u00e9","b":1,"a":2}}';
    verifySpy.mockImplementation((payload: string) => JSON.parse(payload));
    const res = await POST(
      new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: raw }),
    );
    expect(verifySpy).toHaveBeenCalledTimes(1);
    expect(verifySpy.mock.calls[0][0]).toBe(raw);
    expect(res.status).toBe(200); // unknown type falls through the switch to 200 OK
  });

  it('returns 400 when signature verification throws', async () => {
    verifySpy.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await POST(
      new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: '{}' }),
    );
    expect(res.status).toBe(400);
  });
});
