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
