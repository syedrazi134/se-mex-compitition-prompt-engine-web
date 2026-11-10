import type { Request, RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import { RateLimiterRedis, RateLimiterRes, type RateLimiterAbstract } from 'rate-limiter-flexible';
import { AppError } from '../lib/errors.js';

export interface LimiterOptions {
  /** Distinguishes limiters in Redis, e.g. `login`, `checkout`, `generation`, `prompt-api`. */
  keyPrefix: string;
  points: number;
  durationSeconds: number;
}

export function createRedisLimiter(redis: Redis, options: LimiterOptions): RateLimiterAbstract {
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `rl:${options.keyPrefix}`,
    points: options.points,
    duration: options.durationSeconds,
  });
}

const byIp = (req: Request): string => req.ip ?? 'unknown';

/**
 * Consumes one point per request. Over the limit → 429 `rate_limited` with `Retry-After`.
 * A limiter store failure (Redis down) is passed on as a 500, never silently allowed.
 */
export function rateLimit(
  limiter: RateLimiterAbstract,
  keyOf: (req: Request) => string = byIp,
): RequestHandler {
  return async (req, res, next) => {
    try {
      await limiter.consume(keyOf(req));
      next();
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        res.set('Retry-After', String(Math.max(1, Math.ceil(err.msBeforeNext / 1000))));
        return next(new AppError(429, 'rate_limited', 'Too many requests, try again later'));
      }
      next(err);
    }
  };
}
