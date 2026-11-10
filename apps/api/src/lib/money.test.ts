import { describe, expect, it } from 'vitest';
import { addMoney, money, MoneySchema, splitByBasisPoints, subtractMoney } from './money.js';

describe('money', () => {
  it('only accepts safe integers and ISO currency codes', () => {
    expect(money(1000, 'PKR')).toEqual({ amountMinor: 1000, currency: 'PKR' });
    expect(() => money(10.5, 'PKR')).toThrow('safe integer');
    expect(() => money(1, 'pkr')).toThrow('invalid currency');
    expect(() => money(Number.MAX_SAFE_INTEGER + 1, 'USD')).toThrow('safe integer');
  });

  it('adds and subtracts in the same currency only', () => {
    expect(addMoney(money(700, 'USD'), money(300, 'USD'))).toEqual(money(1000, 'USD'));
    expect(subtractMoney(money(700, 'USD'), money(300, 'USD'))).toEqual(money(400, 'USD'));
    expect(() => addMoney(money(1, 'USD'), money(1, 'PKR'))).toThrow('currency mismatch');
  });

  it('splits 20% commission the way the ledger example does', () => {
    const { share, rest } = splitByBasisPoints(money(1000, 'PKR'), 2000);
    expect(share).toEqual(money(200, 'PKR'));
    expect(rest).toEqual(money(800, 'PKR'));
  });

  it('never loses a minor unit when rounding', () => {
    for (const amount of [1, 3, 7, 999, 1001, 123457]) {
      const { share, rest } = splitByBasisPoints(money(amount, 'PKR'), 1750);
      expect(share.amountMinor + rest.amountMinor).toBe(amount);
      expect(Number.isInteger(share.amountMinor)).toBe(true);
    }
  });

  it('rejects invalid rates and negative amounts', () => {
    expect(() => splitByBasisPoints(money(100, 'PKR'), 10_001)).toThrow('basisPoints');
    expect(() => splitByBasisPoints(money(100, 'PKR'), 12.5)).toThrow('basisPoints');
    expect(() => splitByBasisPoints(money(-1, 'PKR'), 100)).toThrow('negative');
  });

  it('validates money in requests', () => {
    expect(MoneySchema.safeParse({ amountMinor: 100, currency: 'USD' }).success).toBe(true);
    expect(MoneySchema.safeParse({ amountMinor: 1.5, currency: 'USD' }).success).toBe(false);
    expect(MoneySchema.safeParse({ amountMinor: -1, currency: 'USD' }).success).toBe(false);
  });
});
