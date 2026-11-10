import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { silentLogger } from '../../test/helpers.js';
import { errorHandler } from '../lib/errors.js';
import { requireIdempotencyKey } from './idempotency.js';
import { sanitizeBody, stripDangerousKeys } from './sanitize.js';
import { validate } from './validate.js';

function app() {
  const a = express();
  a.use(express.json());
  a.use(sanitizeBody);
  a.post(
    '/items/:id',
    validate({
      params: z.object({ id: z.string().regex(/^\d+$/) }),
      query: z.object({ dry: z.enum(['true', 'false']).optional() }),
      body: z.object({ name: z.string().min(1) }),
    }),
    (req, res) => {
      res.json(req.validated);
    },
  );
  a.post('/echo', (req, res) => {
    res.json(req.body);
  });
  a.post('/pay', requireIdempotencyKey, (req, res) => {
    res.json({ key: req.idempotencyKey });
  });
  a.use(errorHandler(silentLogger));
  return a;
}

describe('validate', () => {
  it('passes parsed values and drops unknown keys', async () => {
    const res = await request(app())
      .post('/items/42?dry=true&$where=1')
      .send({ name: 'x', extra: 'dropped' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ params: { id: '42' }, query: { dry: 'true' }, body: { name: 'x' } });
  });

  it('reports every invalid part with its location', async () => {
    const res = await request(app()).post('/items/abc?dry=maybe').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_request');
    const locations = res.body.error.details.map((d: { location: string }) => d.location).sort();
    expect(locations).toEqual(['body', 'params', 'query']);
  });
});

describe('sanitizeBody', () => {
  it('strips operator, dotted and prototype keys at any depth', async () => {
    const res = await request(app())
      .post('/echo')
      .set('content-type', 'application/json')
      .send(
        '{"ok":1,"$gt":"","a.b":2,"__proto__":{"x":1},"nested":{"$ne":null,"keep":[{"$or":[]},{"v":3}]}}',
      );
    expect(res.body).toEqual({ ok: 1, nested: { keep: [{}, { v: 3 }] } });
  });

  it('ignores non-object bodies', () => {
    expect(() => stripDangerousKeys('text')).not.toThrow();
    expect(() => stripDangerousKeys(null)).not.toThrow();
  });
});

describe('requireIdempotencyKey', () => {
  it('requires a well-formed key', async () => {
    const missing = await request(app()).post('/pay');
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('idempotency_key_required');
    const bad = await request(app()).post('/pay').set('idempotency-key', 'short');
    expect(bad.body.error.code).toBe('invalid_idempotency_key');
    const ok = await request(app()).post('/pay').set('idempotency-key', 'order_2026-11-10_abc');
    expect(ok.status).toBe(200);
    expect(ok.body.key).toBe('order_2026-11-10_abc');
  });
});
