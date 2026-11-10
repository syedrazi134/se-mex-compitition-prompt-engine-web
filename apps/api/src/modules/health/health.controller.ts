import type { RequestHandler } from 'express';
import type { HealthService } from './health.service.js';

export function createHealthController(service: HealthService): { get: RequestHandler } {
  return {
    get: async (_req, res) => {
      const result = await service.check();
      res.set('Cache-Control', 'no-store');
      res.status(result.status === 'ok' ? 200 : 503).json(result);
    },
  };
}
