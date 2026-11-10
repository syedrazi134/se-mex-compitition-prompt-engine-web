import { ErrorResponseSchema, HealthResponseSchema } from '@prompt-engine/shared-types';
import type { OpenApiRegistrar } from '../../lib/openapi.js';

export const registerHealthOpenApi: OpenApiRegistrar = (registry) => {
  registry.registerPath({
    method: 'get',
    path: '/api/v1/health',
    operationId: 'getHealth',
    tags: ['Platform'],
    summary: 'API, MongoDB and Redis status',
    description:
      'Public, for uptime checks. 200 when every dependency is ok, 503 otherwise. MongoDB counts as ok only when it is a replica set.',
    security: [],
    responses: {
      200: {
        description: 'All dependencies ok',
        content: { 'application/json': { schema: HealthResponseSchema } },
      },
      503: {
        description: 'At least one dependency is down',
        content: { 'application/json': { schema: HealthResponseSchema } },
      },
      500: {
        description: 'Unexpected error',
        content: { 'application/json': { schema: ErrorResponseSchema } },
      },
    },
  });
};
