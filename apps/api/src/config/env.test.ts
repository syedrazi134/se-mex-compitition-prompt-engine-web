import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const valid = {
  MONGODB_URI: 'mongodb://localhost:27017/pe?replicaSet=rs0',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('applies defaults and parses CORS origins', () => {
    const env = loadEnv({ ...valid, CORS_ORIGINS: 'https://a.example, https://b.example,' });
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  it('names bad variables without echoing their values', () => {
    const secret = 'short-secret-value';
    expect(() => loadEnv({ ...valid, JWT_ACCESS_SECRET: secret, PORT: '99999' })).toThrow(
      /JWT_ACCESS_SECRET.*PORT|PORT.*JWT_ACCESS_SECRET/,
    );
    try {
      loadEnv({ ...valid, JWT_ACCESS_SECRET: secret });
    } catch (err) {
      expect(String(err)).not.toContain(secret);
    }
  });

  it('requires database and redis URLs', () => {
    expect(() => loadEnv({ JWT_ACCESS_SECRET: 'x'.repeat(32) })).toThrow(/MONGODB_URI/);
    expect(() => loadEnv({ ...valid, REDIS_URL: 'http://nope' })).toThrow(/REDIS_URL/);
  });
});
