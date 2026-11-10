import { createHash } from 'node:crypto';
import type { AuthorizationRequest, CodeExchange, OAuthProfile, OAuthProvider } from './types.js';

/**
 * In-memory provider for tests and local development. `issueCode` plays the provider's login
 * screen: it returns a code that `exchangeCode` accepts once, with the matching verifier only.
 */
export class FakeOAuthProvider implements OAuthProvider {
  private readonly codes = new Map<string, { profile: OAuthProfile; codeChallenge: string }>();
  private next = 1;
  /** The last authorization request, so tests can read the state and challenge we sent. */
  lastRequest: AuthorizationRequest | undefined;

  constructor(readonly id: string = 'fake') {}

  authorizationUrl(request: AuthorizationRequest): string {
    this.lastRequest = request;
    const url = new URL('https://fake-oauth.invalid/authorize');
    url.search = new URLSearchParams({
      state: request.state,
      code_challenge: request.codeChallenge,
      redirect_uri: request.redirectUri,
    }).toString();
    return url.toString();
  }

  /** Simulates the user signing in at the provider for the last authorization request. */
  issueCode(profile: Omit<OAuthProfile, 'provider'>): string {
    if (!this.lastRequest) throw new Error('fake oauth: no authorization request yet');
    const code = `fake-code-${this.next++}`;
    this.codes.set(code, {
      profile: { ...profile, provider: this.id },
      codeChallenge: this.lastRequest.codeChallenge,
    });
    return code;
  }

  async exchangeCode({ code, codeVerifier }: CodeExchange): Promise<OAuthProfile> {
    const entry = this.codes.get(code);
    this.codes.delete(code);
    if (!entry) throw new Error('fake oauth: unknown or used code');
    const challenge = createHash('sha256').update(codeVerifier).digest('base64url');
    if (challenge !== entry.codeChallenge) throw new Error('fake oauth: PKCE mismatch');
    return entry.profile;
  }
}
