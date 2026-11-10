import type { AuthContext } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. */
      auth?: AuthContext;
      /** Parsed, validated input set by `validate`. Read from here, never from raw `req.query`. */
      validated?: { body?: unknown; query?: unknown; params?: unknown };
      /** Set by `requireIdempotencyKey`. */
      idempotencyKey?: string;
    }
  }
}

export {};
