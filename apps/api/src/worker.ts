import { loadEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './lib/db.js';
import { createLogger } from './lib/logger.js';
import { connectRedis } from './lib/redis.js';

/**
 * Background worker entry point: same codebase and image as the API, run as a second service.
 * BullMQ queues (generation, media, payments, payouts, notifications, maintenance) register here
 * as their modules are built; none exist yet, so BullMQ is not a dependency until the first one.
 */
const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

try {
  await connectMongo(env.MONGODB_URI);
  const redis = await connectRedis(env.REDIS_URL);
  logger.info({ queues: [] }, 'worker ready');

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'worker shutting down');
    void Promise.allSettled([redis.quit(), disconnectMongo()]).then(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
} catch (err) {
  logger.fatal({ err }, 'worker failed to start');
  process.exit(1);
}
