import type { RequestHandler } from 'express';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isDangerousKey(key: string): boolean {
  return key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key);
}

/** Removes MongoDB operator keys (`$where`, `a.b`) and prototype keys at any depth, in place. */
export function stripDangerousKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(stripDangerousKeys);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const key of Object.keys(value)) {
    if (isDangerousKey(key)) {
      Reflect.deleteProperty(value, key);
    } else {
      stripDangerousKeys((value as Record<string, unknown>)[key]);
    }
  }
}

/**
 * Global NoSQL-injection guard for JSON bodies. Query strings are covered by `validate`, whose
 * `z.object` schemas drop unknown keys.
 */
export const sanitizeBody: RequestHandler = (req, _res, next) => {
  stripDangerousKeys(req.body);
  next();
};
