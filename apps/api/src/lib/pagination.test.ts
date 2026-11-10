import { describe, expect, it } from 'vitest';
import { AppError } from './errors.js';
import { decodeCursor, encodeCursor, PaginationQuerySchema } from './pagination.js';

describe('pagination', () => {
  it('round-trips a cursor', () => {
    const value = { createdAt: '2026-11-10T00:00:00.000Z', id: 'abc', n: 3 };
    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it('rejects tampered cursors with 400 invalid_cursor', () => {
    for (const bad of [
      '%%%',
      encodeCursor({}).slice(0, -1) + '!',
      Buffer.from('[1]').toString('base64url'),
    ]) {
      try {
        decodeCursor(bad);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('invalid_cursor');
      }
    }
    const nested = Buffer.from(JSON.stringify({ a: { $gt: '' } })).toString('base64url');
    expect(() => decodeCursor(nested)).toThrow(AppError);
  });

  it('defaults and caps the page size', () => {
    expect(PaginationQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(PaginationQuerySchema.parse({ limit: '50' }).limit).toBe(50);
    expect(PaginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });
});
