import { z } from 'zod';

/** Every API error uses this shape, with the correct HTTP status. Clients branch on `code`. */
export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: 'ErrorResponse' });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const DependencyStatusSchema = z.enum(['ok', 'down']);
export type DependencyStatus = z.infer<typeof DependencyStatusSchema>;

/** GET /api/v1/health */
export const HealthResponseSchema = z
  .object({
    status: DependencyStatusSchema,
    dependencies: z.object({
      api: DependencyStatusSchema,
      mongodb: DependencyStatusSchema,
      redis: DependencyStatusSchema,
    }),
    uptimeSeconds: z.number().int().nonnegative(),
    timestamp: z.iso.datetime(),
  })
  .meta({ id: 'HealthResponse' });
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/** Platform roles on an account. One account can hold several. */
export const PlatformRoleSchema = z.enum(['buyer', 'creator', 'prompt_engineer', 'admin']);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

/** A user's own profile. Never contains password hashes, tokens or provider secrets. */
export const UserResponseSchema = z
  .object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
    avatarUrl: z.url().nullable(),
    locale: z.string(),
    roles: z.array(PlatformRoleSchema),
    /** Sign-in methods linked to the account, e.g. `password`, `google`. */
    signInMethods: z.array(z.string()),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });
export type UserResponse = z.infer<typeof UserResponseSchema>;

/** Returned by register, login, refresh and the OAuth code exchange. */
export const AuthTokensResponseSchema = z
  .object({
    tokenType: z.literal('Bearer'),
    accessToken: z.string(),
    /** Seconds until the access token expires (900). */
    expiresIn: z.number().int().positive(),
    /** Opaque, single-use: every refresh returns a new one. */
    refreshToken: z.string(),
    refreshTokenExpiresAt: z.iso.datetime(),
    user: UserResponseSchema,
  })
  .meta({ id: 'AuthTokens' });
export type AuthTokensResponse = z.infer<typeof AuthTokensResponseSchema>;

export const WorkspaceRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const WorkspaceResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    plan: z.string(),
    /** The caller's role in this workspace. */
    role: WorkspaceRoleSchema,
    memberCount: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'Workspace' });
export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

export const WorkspaceListResponseSchema = z
  .object({
    items: z.array(WorkspaceResponseSchema),
    nextCursor: z.string().nullable(),
  })
  .meta({ id: 'WorkspaceList' });
export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>;

export const WorkspaceMemberSchema = z
  .object({
    userId: z.string(),
    email: z.email(),
    name: z.string(),
    role: WorkspaceRoleSchema,
    addedAt: z.iso.datetime(),
  })
  .meta({ id: 'WorkspaceMember' });
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const WorkspaceMemberListSchema = z
  .object({ items: z.array(WorkspaceMemberSchema) })
  .meta({ id: 'WorkspaceMemberList' });
export type WorkspaceMemberList = z.infer<typeof WorkspaceMemberListSchema>;
