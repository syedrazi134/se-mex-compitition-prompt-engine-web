import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { checkMongo, connectMongo, disconnectMongo } from './lib/db.js';
import { createLogger } from './lib/logger.js';
import { checkRedis, connectRedis } from './lib/redis.js';
import { createHealthService } from './modules/health/health.service.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

try {
  await connectMongo(env.MONGODB_URI);
  const redis = await connectRedis(env.REDIS_URL);

  const app = createApp({
    logger,
    corsOrigins: env.CORS_ORIGINS,
    health: createHealthService({
      checkMongo: () => checkMongo(),
      checkRedis: () => checkRedis(redis),
    }),
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'api listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void Promise.allSettled([redis.quit(), disconnectMongo()]).then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
} catch (err) {
  logger.fatal({ err }, 'api failed to start');
  process.exit(1);
}
