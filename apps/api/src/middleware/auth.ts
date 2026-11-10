import type { RequestHandler } from 'express';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { RoleSchema, type Role } from './roles.js';

export interface AuthContext {
  userId: string;
  roles: Role[];
}

const AccessClaimsSchema = z.object({
  sub: z.string().min(1),
  roles: z.array(RoleSchema).default([]),
});

const BEARER = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/;

const unauthorized = () => new AppError(401, 'unauthorized', 'Missing or invalid access token');

/**
 * Verifies the HS256 access token in `Authorization: Bearer <jwt>` and sets `req.auth`.
 * Tokens are issued by the auth module (sprint 1); this guard only checks them.
 */
export function requireAuth(secret: string): RequestHandler {
  const key = new TextEncoder().encode(secret);
  return async (req, _res, next) => {
    const match = BEARER.exec(req.get('authorization') ?? '');
    if (!match?.[1]) return next(unauthorized());
    try {
      const { payload } = await jwtVerify(match[1], key, { algorithms: ['HS256'] });
      const claims = AccessClaimsSchema.safeParse(payload);
      if (!claims.success) return next(unauthorized());
      req.auth = { userId: claims.data.sub, roles: claims.data.roles };
      next();
    } catch {
      next(unauthorized());
    }
  };
}

/**
 * Explicit marker for routes that are deliberately public (health, docs, marketplace browse).
 * Every route carries either `requireAuth` or `allowAnonymous`, so a missing guard stands out.
 */
export const allowAnonymous: RequestHandler = (_req, _res, next) => next();
