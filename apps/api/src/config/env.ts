import { z } from 'zod';

const commaList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),
  REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must be a redis:// or rediss:// URL'),
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  /** Comma-separated allow-list of browser origins (web app, admin panel). */
  CORS_ORIGINS: commaList,
  /** Public base URL of this API; OAuth callback URLs are built from it. */
  PUBLIC_API_URL: z.url().default('http://localhost:3000'),
  /** Exact client redirect URIs the OAuth callback may send users back to. */
  OAUTH_ALLOWED_REDIRECTS: commaList.pipe(z.array(z.url())),
  /** Google sign-in is enabled only when both are set. */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  /** Set when running behind a reverse proxy so rate limits see the real client IP. */
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates the environment once at startup. The error names each bad variable and the rule it
 * broke, never the value, so secrets don't end up in logs.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${problems}`);
  }
  if (Boolean(result.data.GOOGLE_CLIENT_ID) !== Boolean(result.data.GOOGLE_CLIENT_SECRET)) {
    throw new Error('Invalid environment: set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither');
  }
  return result.data;
}
