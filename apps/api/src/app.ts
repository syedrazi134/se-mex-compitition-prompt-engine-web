import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { AppError, errorHandler, notFound } from './lib/errors.js';
import type { Logger } from './lib/logger.js';
import { buildOpenApiDocument, createDocsRouter } from './lib/openapi.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { registerHealthOpenApi } from './modules/health/health.schemas.js';
import type { HealthService } from './modules/health/health.service.js';

export interface AppDeps {
  logger: Logger;
  /** Browser origins allowed by CORS (web app, admin panel). Empty = no cross-origin access. */
  corsOrigins: string[];
  health: HealthService;
}

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Non-browser clients (mobile, server-to-server) send no Origin header.
        if (!origin || deps.corsOrigins.includes(origin)) return callback(null, true);
        callback(new AppError(403, 'origin_not_allowed', 'Origin not allowed'));
      },
      credentials: true,
    }),
  );
  app.use(
    pinoHttp({
      logger: deps.logger,
      genReqId: (req, res) => {
        const given = req.headers['x-request-id'];
        const id = typeof given === 'string' && REQUEST_ID.test(given) ? given : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeBody);

  const v1 = Router();
  v1.use(createHealthRouter(deps.health));
  v1.use(createDocsRouter(buildOpenApiDocument([registerHealthOpenApi])));
  app.use('/api/v1', v1);

  // Existing mobile routes: none live in this service. The mobile app's POST /v1/generate stays
  // on its Cloudflare Worker until it is ported here (docs/DECISIONS.md, 2026-11-10).

  app.use(notFound);
  app.use(errorHandler(deps.logger));
  return app;
}
