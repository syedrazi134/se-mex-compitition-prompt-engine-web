import { describe, expect, it } from 'vitest';
import { FAKE_SIGNATURE_HEADER, FakePaymentAdapter } from './index.js';

const event = {
  eventId: 'evt_1',
  type: 'payment.succeeded',
  gatewayRef: 'fake_cs_1',
  amountMinor: 1000,
  currency: 'PKR',
};

describe('FakePaymentAdapter', () => {
  it('creates a hosted checkout session', async () => {
    const adapter = new FakePaymentAdapter('secret');
    const session = await adapter.createCheckout({
      orderId: 'o1',
      currency: 'PKR',
      items: [{ reference: 'l1', description: 'Prompt', amountMinor: 1000 }],
      successUrl: 'https://example.invalid/ok',
      cancelUrl: 'https://example.invalid/cancel',
      idempotencyKey: 'key-1',
    });
    expect(session.gatewayRef).toBe('fake_cs_1');
    expect(session.redirectUrl).toContain(session.gatewayRef);
  });

  it('rejects non-integer and non-positive amounts', async () => {
    const adapter = new FakePaymentAdapter('secret');
    const base = {
      orderId: 'o1',
      currency: 'PKR',
      successUrl: 'https://example.invalid/ok',
      cancelUrl: 'https://example.invalid/cancel',
      idempotencyKey: 'key-1',
    };
    await expect(
      adapter.createCheckout({
        ...base,
        items: [{ reference: 'l1', description: 'x', amountMinor: 10.5 }],
      }),
    ).rejects.toThrow('positive integer');
    await expect(
      adapter.refund({ gatewayRef: 'g', amountMinor: 0, currency: 'PKR', idempotencyKey: 'k' }),
    ).rejects.toThrow('positive integer');
  });

  it('accepts a correctly signed webhook', () => {
    const adapter = new FakePaymentAdapter('secret');
    const rawBody = JSON.stringify(event);
    const parsed = adapter.verifyWebhook({
      rawBody,
      headers: { [FAKE_SIGNATURE_HEADER]: adapter.sign(rawBody) },
    });
    expect(parsed).toEqual(event);
  });

  it('rejects a webhook signed with another secret, a tampered body, or no signature', () => {
    const adapter = new FakePaymentAdapter('secret');
    const other = new FakePaymentAdapter('other');
    const rawBody = JSON.stringify(event);
    expect(
      adapter.verifyWebhook({ rawBody, headers: { [FAKE_SIGNATURE_HEADER]: other.sign(rawBody) } }),
    ).toBeNull();
    expect(
      adapter.verifyWebhook({
        rawBody: rawBody.replace('1000', '9999'),
        headers: { [FAKE_SIGNATURE_HEADER]: adapter.sign(rawBody) },
      }),
    ).toBeNull();
    expect(adapter.verifyWebhook({ rawBody, headers: {} })).toBeNull();
  });

  it('rejects a signed body that is not a valid event', () => {
    const adapter = new FakePaymentAdapter('secret');
    const rawBody = JSON.stringify({ ...event, amountMinor: 1.5 });
    expect(
      adapter.verifyWebhook({
        rawBody,
        headers: { [FAKE_SIGNATURE_HEADER]: adapter.sign(rawBody) },
      }),
    ).toBeNull();
  });

  it('requires a webhook secret', () => {
    expect(() => new FakePaymentAdapter('')).toThrow('webhook secret required');
  });
});
