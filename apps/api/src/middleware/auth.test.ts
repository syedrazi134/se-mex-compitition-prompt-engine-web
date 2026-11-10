import express from 'express';
import { SignJWT } from 'jose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { silentLogger } from '../../test/helpers.js';
import { errorHandler } from '../lib/errors.js';
import { ACCESS_TOKEN_AUDIENCE, ACCESS_TOKEN_ISSUER, requireAuth } from './auth.js';
import { requireRole } from './roles.js';

const SECRET = 'test-secret-that-is-at-least-32-chars!!';

async function token(claims: Record<string, unknown>, secret = SECRET, expiresIn = '15m') {
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ACCESS_TOKEN_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE);
  if (typeof claims.sub === 'string') jwt.setSubject(claims.sub);
  return jwt.setExpirationTime(expiresIn).sign(new TextEncoder().encode(secret));
}

function app() {
  const a = express();
  a.get('/me', requireAuth(SECRET), (req, res) => {
    res.json(req.auth);
  });
  a.get('/admin', requireAuth(SECRET), requireRole('admin'), (_req, res) => {
    res.json({ ok: true });
  });
  a.get('/role-only', requireRole('creator'), (_req, res) => {
    res.json({ ok: true });
  });
  a.use(errorHandler(silentLogger));
  return a;
}

describe('requireAuth', () => {
  it('accepts a valid token and exposes user and roles', async () => {
    const res = await request(app())
      .get('/me')
      .set('authorization', `Bearer ${await token({ sub: 'u1', roles: ['creator'] })}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'u1', roles: ['creator'] });
  });

  it('refuses missing, malformed, wrongly signed and expired tokens', async () => {
    const unauthorizedCases = [
      undefined,
      'Bearer not-a-jwt',
      `Basic ${await token({ sub: 'u1' })}`,
      `Bearer ${await token({ sub: 'u1' }, 'another-secret-that-is-32-chars-long!')}`,
      `Bearer ${await token({ roles: ['admin'] })}`,
      `Bearer ${await token({ sub: 'u1', roles: ['superuser'] })}`,
    ];
    for (const header of unauthorizedCases) {
      const req = request(app()).get('/me');
      const res = await (header ? req.set('authorization', header) : req);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('unauthorized');
    }

    const expiredRes = await request(app())
      .get('/me')
      .set('authorization', `Bearer ${await token({ sub: 'u1' }, SECRET, '-1s')}`);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.error.code).toBe('token_expired');
  });
});

describe('requireRole', () => {
  it('allows a user holding the role', async () => {
    const res = await request(app())
      .get('/admin')
      .set('authorization', `Bearer ${await token({ sub: 'u1', roles: ['buyer', 'admin'] })}`);
    expect(res.status).toBe(200);
  });

  it('returns 403 without the role and 401 without auth', async () => {
    const forbidden = await request(app())
      .get('/admin')
      .set('authorization', `Bearer ${await token({ sub: 'u1', roles: ['buyer'] })}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('forbidden');
    const anonymous = await request(app()).get('/role-only');
    expect(anonymous.status).toBe(401);
  });
});
