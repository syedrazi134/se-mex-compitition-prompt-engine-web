import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors.js';

export interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

type Part = keyof RequestSchemas;
const PARTS: Part[] = ['params', 'query', 'body'];

/**
 * Validates request parts with Zod and stores the parsed values on `req.validated`.
 * Use `z.object` schemas: they drop unknown keys, so nothing unvalidated reaches a query.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const validated: NonNullable<typeof req.validated> = {};
    const issues: { location: Part; path: string; message: string }[] = [];
    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ location: part, path: issue.path.join('.'), message: issue.message });
        }
      }
    }
    if (issues.length > 0) {
      return next(new AppError(400, 'invalid_request', 'Request validation failed', issues));
    }
    req.validated = validated;
    next();
  };
}
