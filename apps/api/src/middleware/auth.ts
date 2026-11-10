import type { RequestHandler } from 'express';
import { errors, jwtVerify } from 'jose';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { RoleSchema, type Role } from './roles.js';

export interface AuthContext {
  userId: string;
  roles: Role[];
}

/** Access tokens are issued by the auth module with these claims and checked here. */
export const ACCESS_TOKEN_ISSUER = 'prompt-engine';
export const ACCESS_TOKEN_AUDIENCE = 'prompt-engine-api';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const AccessClaimsSchema = z.object({
  sub: z.string().min(1),
  roles: z.array(RoleSchema).default([]),
});

const BEARER = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/;

const unauthorized = () => new AppError(401, 'unauthorized', 'Missing or invalid access token');

/**
 * Verifies the HS256 access token in `Authorization: Bearer <jwt>` (signature, expiry, issuer,
 * audience) and sets `req.auth`. An expired token gets `token_expired`, so clients know to
 * refresh rather than sign in again.
 */
export function requireAuth(secret: string): RequestHandler {
  const key = new TextEncoder().encode(secret);
  return async (req, _res, next) => {
    const match = BEARER.exec(req.get('authorization') ?? '');
    if (!match?.[1]) return next(unauthorized());
    try {
      const { payload } = await jwtVerify(match[1], key, {
        algorithms: ['HS256'],
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      });
      const claims = AccessClaimsSchema.safeParse(payload);
      if (!claims.success) return next(unauthorized());
      req.auth = { userId: claims.data.sub, roles: claims.data.roles };
      next();
    } catch (err) {
      if (err instanceof errors.JWTExpired) {
        return next(new AppError(401, 'token_expired', 'Access token has expired'));
      }
      next(unauthorized());
    }
  };
}

/**
 * Explicit marker for routes that are deliberately public (health, docs, marketplace browse).
 * Every route carries either `requireAuth` or `allowAnonymous`, so a missing guard stands out.
 */
export const allowAnonymous: RequestHandler = (_req, _res, next) => next();
