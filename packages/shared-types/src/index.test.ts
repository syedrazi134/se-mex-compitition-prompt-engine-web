import { describe, expect, it } from 'vitest';
import { ErrorResponseSchema, HealthResponseSchema } from './index.js';

describe('shared-types', () => {
  it('accepts a healthy health response', () => {
    const parsed = HealthResponseSchema.safeParse({
      status: 'ok',
      dependencies: { api: 'ok', mongodb: 'ok', redis: 'ok' },
      uptimeSeconds: 3,
      timestamp: new Date().toISOString(),
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown dependency status', () => {
    const parsed = HealthResponseSchema.safeParse({
      status: 'degraded',
      dependencies: { api: 'ok', mongodb: 'ok', redis: 'ok' },
      uptimeSeconds: 3,
      timestamp: new Date().toISOString(),
    });
    expect(parsed.success).toBe(false);
  });

  it('requires code and message on errors', () => {
    expect(ErrorResponseSchema.safeParse({ error: { code: 'x' } }).success).toBe(false);
    expect(ErrorResponseSchema.safeParse({ error: { code: 'x', message: 'y' } }).success).toBe(
      true,
    );
  });
});
