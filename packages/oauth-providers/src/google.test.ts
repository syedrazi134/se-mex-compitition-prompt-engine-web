import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWK } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GoogleOAuthProvider, OAuthProviderError } from './index.js';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';

let server: Server;
let base: string;
let privateKey: CryptoKey;
let jwk: JWK;
let nextIdToken = '';
let lastTokenRequest: URLSearchParams | undefined;

async function idToken(claims: Record<string, unknown>, opts: { aud?: string; iss?: string } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(opts.iss ?? 'https://accounts.google.com')
    .setAudience(opts.aud ?? CLIENT_ID)
    .setSubject(String(claims.sub ?? 'google-sub-1'))
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

beforeAll(async () => {
  // Stand-in for Google's signing key: tokens are signed with the private half, and the fake
  // JWKS endpoint publishes the public half.
  const pair = await generateKeyPair('RS256', { extractable: true });
  privateKey = pair.privateKey;
  jwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };

  server = createServer((req, res) => {
    if (req.url === '/certs') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    if (req.url === '/token' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        lastTokenRequest = new URLSearchParams(body);
        if (lastTokenRequest.get('code') === 'bad') {
          res.statusCode = 400;
          res.end('{"error":"invalid_grant"}');
          return;
        }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ id_token: nextIdToken, access_token: 'x' }));
      });
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

function provider() {
  return new GoogleOAuthProvider({
    clientId: CLIENT_ID,
    clientSecret: 'secret',
    tokenEndpoint: `${base}/token`,
    jwksUri: `${base}/certs`,
  });
}

const exchange = { code: 'good', codeVerifier: 'v'.repeat(43), redirectUri: 'https://api.example/cb' };

describe('GoogleOAuthProvider', () => {
  it('builds an authorization URL with PKCE, state and OpenID scopes', () => {
    const url = new URL(
      provider().authorizationUrl({ state: 's1', codeChallenge: 'c1', redirectUri: 'https://api.example/cb' }),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: CLIENT_ID,
      response_type: 'code',
      scope: 'openid email profile',
      state: 's1',
      code_challenge: 'c1',
      code_challenge_method: 'S256',
      redirect_uri: 'https://api.example/cb',
    });
  });

  it('exchanges the code with the verifier and returns the verified profile', async () => {
    nextIdToken = await idToken({
      sub: 'google-sub-1',
      email: 'ana@example.com',
      email_verified: true,
      name: 'Ana',
      picture: 'https://img.example/a.png',
    });
    const profile = await provider().exchangeCode(exchange);
    expect(profile).toEqual({
      provider: 'google',
      providerId: 'google-sub-1',
      email: 'ana@example.com',
      emailVerified: true,
      name: 'Ana',
      avatarUrl: 'https://img.example/a.png',
    });
    expect(lastTokenRequest?.get('code_verifier')).toBe(exchange.codeVerifier);
    expect(lastTokenRequest?.get('grant_type')).toBe('authorization_code');
  });

  it('rejects an ID token for another client or issuer', async () => {
    nextIdToken = await idToken({ sub: 'x', email: 'a@b.c' }, { aud: 'someone-else' });
    await expect(provider().exchangeCode(exchange)).rejects.toThrow(OAuthProviderError);
    nextIdToken = await idToken({ sub: 'x', email: 'a@b.c' }, { iss: 'https://evil.example' });
    await expect(provider().exchangeCode(exchange)).rejects.toThrow(OAuthProviderError);
  });

  it('rejects a failed token exchange', async () => {
    await expect(provider().exchangeCode({ ...exchange, code: 'bad' })).rejects.toThrow('400');
  });

  it('requires client credentials', () => {
    expect(() => new GoogleOAuthProvider({ clientId: '', clientSecret: 'x' })).toThrow();
  });
});
