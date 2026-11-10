import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** URL-safe random secret (refresh tokens, OAuth state, one-time codes, PKCE verifiers). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Secrets are stored only as this hash, never in plain text. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** RFC 7636 S256 code challenge for a PKCE code verifier. */
export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
