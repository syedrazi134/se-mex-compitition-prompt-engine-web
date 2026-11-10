import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { AuthorizationRequest, CodeExchange, OAuthProfile, OAuthProvider } from './types.js';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  /** Overridable for tests; defaults are Google's documented endpoints. */
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUri?: string;
  fetch?: typeof fetch;
}

const DEFAULTS = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
};

const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export class OAuthProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthProviderError';
  }
}

/** Google sign-in: authorization code flow with PKCE; identity from the verified ID token. */
export class GoogleOAuthProvider implements OAuthProvider {
  readonly id = 'google';
  private readonly endpoints: typeof DEFAULTS;
  private readonly jwks: JWTVerifyGetKey;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly config: GoogleConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('google: clientId and clientSecret are required');
    }
    this.endpoints = {
      authorizationEndpoint: config.authorizationEndpoint ?? DEFAULTS.authorizationEndpoint,
      tokenEndpoint: config.tokenEndpoint ?? DEFAULTS.tokenEndpoint,
      jwksUri: config.jwksUri ?? DEFAULTS.jwksUri,
    };
    this.jwks = createRemoteJWKSet(new URL(this.endpoints.jwksUri));
    this.fetchFn = config.fetch ?? fetch;
  }

  authorizationUrl({ state, codeChallenge, redirectUri }: AuthorizationRequest): string {
    const url = new URL(this.endpoints.authorizationEndpoint);
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async exchangeCode({ code, codeVerifier, redirectUri }: CodeExchange): Promise<OAuthProfile> {
    const res = await this.fetchFn(this.endpoints.tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new OAuthProviderError(`google token endpoint returned ${res.status}`);
    const body = (await res.json()) as { id_token?: unknown };
    if (typeof body.id_token !== 'string') throw new OAuthProviderError('google: no id_token');

    let payload;
    try {
      ({ payload } = await jwtVerify(body.id_token, this.jwks, {
        issuer: ISSUERS,
        audience: this.config.clientId,
      }));
    } catch {
      throw new OAuthProviderError('google: id_token failed verification');
    }
    const { sub, email, email_verified: emailVerified, name, picture } = payload;
    if (typeof sub !== 'string' || typeof email !== 'string') {
      throw new OAuthProviderError('google: id_token missing sub or email');
    }
    const profile: OAuthProfile = {
      provider: this.id,
      providerId: sub,
      email,
      emailVerified: emailVerified === true,
    };
    if (typeof name === 'string') profile.name = name;
    if (typeof picture === 'string') profile.avatarUrl = picture;
    return profile;
  }
}
