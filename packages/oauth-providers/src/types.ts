/**
 * Social sign-in provider contract. Auth code only talks to this interface; each provider
 * (Google now; Apple and Facebook later) is one adapter, never a special case in auth code.
 */

export interface AuthorizationRequest {
  /** Opaque, single-use value the provider sends back to the callback (CSRF protection). */
  state: string;
  /** S256 PKCE challenge derived from the server's code verifier. */
  codeChallenge: string;
  /** Our callback URL, registered with the provider. */
  redirectUri: string;
}

export interface CodeExchange {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

/** The verified identity a provider returns. Only fields every provider can supply. */
export interface OAuthProfile {
  provider: string;
  /** Stable account id at the provider (`sub`), never the email. */
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

export interface OAuthProvider {
  readonly id: string;
  authorizationUrl(request: AuthorizationRequest): string;
  /** Exchanges the authorization code and returns a verified profile. Throws on any failure. */
  exchangeCode(exchange: CodeExchange): Promise<OAuthProfile>;
}
