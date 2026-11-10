import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CheckoutSession,
  CreateCheckoutInput,
  CreatePayoutInput,
  PaymentAdapter,
  PaymentEvent,
  PayoutResult,
  RefundInput,
  RefundResult,
  WebhookRequest,
} from './types.js';

export const FAKE_SIGNATURE_HEADER = 'x-fake-signature';

const EVENT_TYPES = new Set(['payment.succeeded', 'payment.failed', 'refund.succeeded']);

function assertAmount(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('amountMinor must be a positive integer');
  }
}

function isPaymentEvent(value: unknown): value is PaymentEvent {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.eventId === 'string' &&
    typeof e.type === 'string' &&
    EVENT_TYPES.has(e.type) &&
    typeof e.gatewayRef === 'string' &&
    typeof e.amountMinor === 'number' &&
    Number.isSafeInteger(e.amountMinor) &&
    typeof e.currency === 'string'
  );
}

/**
 * In-memory gateway for tests and local development, so checkout can be built before the real
 * gateway is chosen. Webhooks are signed with HMAC-SHA256 over the raw body.
 */
export class FakePaymentAdapter implements PaymentAdapter {
  readonly id = 'fake';
  private sessions = 0;
  private refunds = 0;
  private payouts = 0;

  constructor(private readonly webhookSecret: string) {
    if (!webhookSecret) throw new Error('fake payment adapter: webhook secret required');
  }

  /** Signs a body the way the fake gateway would; tests use it to build webhook calls. */
  sign(rawBody: string): string {
    return createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    if (input.items.length === 0) throw new Error('checkout needs at least one item');
    input.items.forEach((item) => assertAmount(item.amountMinor));
    const gatewayRef = `fake_cs_${++this.sessions}`;
    return { gatewayRef, redirectUrl: `https://fake-gateway.invalid/checkout/${gatewayRef}` };
  }

  verifyWebhook(request: WebhookRequest): PaymentEvent | null {
    const given = request.headers[FAKE_SIGNATURE_HEADER];
    if (!given) return null;
    const expected = Buffer.from(this.sign(request.rawBody), 'hex');
    const actual = Buffer.from(given, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(request.rawBody);
    } catch {
      return null;
    }
    return isPaymentEvent(parsed) ? parsed : null;
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    assertAmount(input.amountMinor);
    return { refundRef: `fake_re_${++this.refunds}`, status: 'succeeded' };
  }

  async createPayout(input: CreatePayoutInput): Promise<PayoutResult> {
    assertAmount(input.amountMinor);
    return { gatewayRef: `fake_po_${++this.payouts}`, status: 'pending' };
  }
}
