/**
 * Payment gateway adapter contract (docs/02-phase1-backend-plan.md, "Payments, ledger and
 * entitlements"). Hosted checkout only: no card data ever reaches our servers.
 * All amounts are integers in minor units with an ISO 4217 currency code.
 */

export interface CheckoutLineItem {
  reference: string;
  description: string;
  amountMinor: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  currency: string;
  items: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  /** Passed through to the gateway so retries never create a second session. */
  idempotencyKey: string;
}

export interface CheckoutSession {
  gatewayRef: string;
  redirectUrl: string;
}

export type PaymentEventType = 'payment.succeeded' | 'payment.failed' | 'refund.succeeded';

export interface PaymentEvent {
  eventId: string;
  type: PaymentEventType;
  gatewayRef: string;
  amountMinor: number;
  currency: string;
}

export interface WebhookRequest {
  rawBody: string;
  headers: Record<string, string | undefined>;
}

export interface RefundInput {
  gatewayRef: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}

export interface RefundResult {
  refundRef: string;
  status: 'pending' | 'succeeded' | 'failed';
}

export interface CreatePayoutInput {
  payoutId: string;
  amountMinor: number;
  currency: string;
  /** Destination as stored (decrypted) in the creator profile; shape depends on the gateway. */
  destination: Record<string, string>;
  idempotencyKey: string;
}

export interface PayoutResult {
  gatewayRef: string;
  status: 'pending' | 'succeeded' | 'failed';
}

export interface PaymentAdapter {
  readonly id: string;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  /** Verifies the signature and parses the event. Returns null when the signature is invalid. */
  verifyWebhook(request: WebhookRequest): PaymentEvent | null;
  refund(input: RefundInput): Promise<RefundResult>;
  createPayout(input: CreatePayoutInput): Promise<PayoutResult>;
}
