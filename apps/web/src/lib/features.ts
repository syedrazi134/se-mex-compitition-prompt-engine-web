/**
 * Per-feature live switches. Each slice of the UI goes live (calls the API) once its backend
 * endpoints exist; until then it uses clearly labelled sample data or a non-submitting preview.
 *
 * Next.js inlines `NEXT_PUBLIC_*` variables only when they are read by their full literal name,
 * so every flag is listed explicitly here (no dynamic `process.env[name]` lookups).
 */
const LIVE_FLAGS = {
  auth: process.env.NEXT_PUBLIC_LIVE_AUTH,
  marketplace: process.env.NEXT_PUBLIC_LIVE_MARKETPLACE,
  creator: process.env.NEXT_PUBLIC_LIVE_CREATOR,
  checkout: process.env.NEXT_PUBLIC_LIVE_CHECKOUT,
  generation: process.env.NEXT_PUBLIC_LIVE_GENERATION,
} as const;

export type Feature = keyof typeof LIVE_FLAGS;

/** True when the feature talks to the live API. Defaults to false (preview) when unset. */
export function isLive(feature: Feature): boolean {
  return LIVE_FLAGS[feature] === 'true';
}
