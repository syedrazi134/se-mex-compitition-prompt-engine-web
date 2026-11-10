import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from './helpers.js';

describe('app', () => {
  it('returns the standard error shape for unknown routes', async () => {
    const res = await request(testApp()).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'not_found', message: 'No route for GET /api/v1/nope' },
    });
  });

  it('rejects malformed JSON with 400 invalid_json', async () => {
    const res = await request(testApp())
      .post('/api/v1/health')
      .set('content-type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });

  it('rejects bodies over 100kb with 413', async () => {
    const res = await request(testApp())
      .post('/api/v1/anything')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ big: 'x'.repeat(110 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('request_too_large');
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(testApp()).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('echoes a valid X-Request-Id and generates one otherwise', async () => {
    const given = await request(testApp())
      .get('/api/v1/health')
      .set('x-request-id', 'abc-12345678');
    expect(given.headers['x-request-id']).toBe('abc-12345678');
    const generated = await request(testApp()).get('/api/v1/health').set('x-request-id', 'bad id!');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('allows listed browser origins and refuses others', async () => {
    const app = testApp({}, ['https://app.example.com']);
    const allowed = await request(app)
      .get('/api/v1/health')
      .set('origin', 'https://app.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com');
    const refused = await request(app).get('/api/v1/health').set('origin', 'https://evil.example');
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe('origin_not_allowed');
  });

  it('serves no mobile legacy routes in this service', async () => {
    const res = await request(testApp()).post('/v1/generate').send({});
    expect(res.status).toBe(404);
  });
});
