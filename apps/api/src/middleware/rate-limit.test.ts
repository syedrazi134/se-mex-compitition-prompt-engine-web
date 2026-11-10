import express from 'express';
import { RateLimiterMemory, type RateLimiterAbstract } from 'rate-limiter-flexible';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { silentLogger } from '../../test/helpers.js';
import { errorHandler } from '../lib/errors.js';
import { rateLimit } from './rate-limit.js';

function app(limiter: RateLimiterAbstract) {
  const a = express();
  a.post(
    '/login',
    rateLimit(limiter, (req) => req.get('x-user') ?? 'anon'),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  a.use(errorHandler(silentLogger));
  return a;
}

describe('rateLimit', () => {
  it('returns 429 with Retry-After once the limit is used, per key', async () => {
    const a = app(new RateLimiterMemory({ points: 2, duration: 60 }));
    expect((await request(a).post('/login').set('x-user', 'a')).status).toBe(200);
    expect((await request(a).post('/login').set('x-user', 'a')).status).toBe(200);
    const limited = await request(a).post('/login').set('x-user', 'a');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('rate_limited');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect((await request(a).post('/login').set('x-user', 'b')).status).toBe(200);
  });

  it('fails closed with 500 when the limiter store errors', async () => {
    const broken = new RateLimiterMemory({ points: 1, duration: 1 });
    broken.consume = () => Promise.reject(new Error('redis down'));
    const res = await request(app(broken)).post('/login');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
  });
});
