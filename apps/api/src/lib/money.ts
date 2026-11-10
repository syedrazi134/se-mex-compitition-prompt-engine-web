import { z } from 'zod';

/**
 * Money is an integer number of minor units (paisa, cents) with an ISO 4217 currency code beside
 * it. Never use floats for money. Field names in models end in `Minor`.
 */
export interface Money {
  amountMinor: number;
  currency: string;
}

const CURRENCY = /^[A-Z]{3}$/;

export const MoneySchema = z.object({
  amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(CURRENCY, 'must be an ISO 4217 code like PKR or USD'),
});

export function money(amountMinor: number, currency: string): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('amountMinor must be a safe integer (minor units)');
  }
  if (!CURRENCY.test(currency)) throw new RangeError(`invalid currency code: ${currency}`);
  return { amountMinor, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new RangeError(`currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

/**
 * Splits an amount by a rate in basis points (2000 = 20%). The share is rounded down and the
 * remainder goes to `rest`, so `share + rest` always equals the original amount exactly.
 */
export function splitByBasisPoints(
  total: Money,
  basisPoints: number,
): { share: Money; rest: Money } {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new RangeError('basisPoints must be an integer from 0 to 10000');
  }
  if (total.amountMinor < 0) throw new RangeError('cannot split a negative amount');
  const product = total.amountMinor * basisPoints;
  if (!Number.isSafeInteger(product)) throw new RangeError('amount too large to split safely');
  const share = Math.floor(product / 10_000);
  return {
    share: money(share, total.currency),
    rest: money(total.amountMinor - share, total.currency),
  };
}
