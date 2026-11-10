import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { allowAnonymous } from '../middleware/auth.js';

/**
 * Each module exports one of these to add its paths to the contract. Schemas become named
 * components through Zod's `.meta({ id })`, so modules never patch Zod with `.openapi()`.
 */
export type OpenApiRegistrar = (registry: OpenAPIRegistry) => void;

export type OpenApiDocument = ReturnType<OpenApiGeneratorV31['generateDocument']>;

export function buildOpenApiDocument(registrars: OpenApiRegistrar[]): OpenApiDocument {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });
  registrars.forEach((register) => register(registry));
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Prompt Engine API',
      version: '0.1.0',
      description: 'Shared backend for the Prompt Engine mobile app, web app and integrations.',
    },
  });
}

/** Serves the contract as JSON and as Swagger UI. Mounted under /api/v1. */
export function createDocsRouter(document: OpenApiDocument): Router {
  const router = Router();
  router.get('/openapi.json', allowAnonymous, (_req, res) => {
    res.json(document);
  });
  router.use('/docs', allowAnonymous, swaggerUi.serve, swaggerUi.setup(document));
  return router;
}
