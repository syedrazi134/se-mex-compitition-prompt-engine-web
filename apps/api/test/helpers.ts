import type { DependencyStatus } from '@prompt-engine/shared-types';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { createHealthService } from '../src/modules/health/health.service.js';

export const silentLogger = createLogger('silent');

export function testApp(
  checks: {
    mongo?: () => Promise<DependencyStatus>;
    redis?: () => Promise<DependencyStatus>;
  } = {},
  corsOrigins: string[] = [],
) {
  return createApp({
    logger: silentLogger,
    corsOrigins,
    health: createHealthService({
      checkMongo: checks.mongo ?? (async () => 'ok'),
      checkRedis: checks.redis ?? (async () => 'ok'),
    }),
  });
}
