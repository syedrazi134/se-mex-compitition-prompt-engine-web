import { PlatformRoleSchema, type PlatformRole } from '@prompt-engine/shared-types';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

/** Platform roles. Workspace roles (owner, editor, viewer) use `requireWorkspaceRole`. */
export const RoleSchema = PlatformRoleSchema;
export type Role = PlatformRole;

/** Use after `requireAuth`. Passes when the user holds at least one of `roles`. */
export function requireRole(...roles: [Role, ...Role[]]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      return next(new AppError(401, 'unauthorized', 'Missing or invalid access token'));
    }
    const allowed = req.auth.roles.some((role) => roles.includes(role));
    if (!allowed) return next(new AppError(403, 'forbidden', 'You do not have access to this'));
    next();
  };
}
