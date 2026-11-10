import { Router } from 'express';
import { allowAnonymous } from '../../middleware/auth.js';
import { createHealthController } from './health.controller.js';
import type { HealthService } from './health.service.js';

/** Mounted under /api/v1. Public by design: uptime monitors call it without a token. */
export function createHealthRouter(service: HealthService): Router {
  const controller = createHealthController(service);
  const router = Router();
  router.get('/health', allowAnonymous, controller.get);
  return router;
}
