import { HealthResponseSchema } from '@prompt-engine/shared-types';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testApp } from '../../../../test/helpers.js';
import { checkMongo } from '../../../lib/db.js';
import { checkRedis } from '../../../lib/redis.js';
import { createHealthService } from '../health.service.js';

describe('health service', () => {
  it('reports ok only when every dependency is ok', async () => {
    const start = new Date('2026-11-10T00:00:00Z');
    const service = createHealthService({
      checkMongo: async () => 'ok',
      checkRedis: async () => 'ok',
      startedAt: start,
      now: () => new Date(start.getTime() + 61_500),
    });
    expect(await service.check()).toEqual({
      status: 'ok',
      dependencies: { api: 'ok', mongodb: 'ok', redis: 'ok' },
      uptimeSeconds: 61,
      timestamp: '2026-11-10T00:01:01.500Z',
    });
  });

  it('treats a throwing check as down', async () => {
    const service = createHealthService({
      checkMongo: async () => {
        throw new Error('boom');
      },
      checkRedis: async () => 'ok',
    });
    const result = await service.check();
    expect(result.status).toBe('down');
    expect(result.dependencies.mongodb).toBe('down');
  });
});

describe('GET /api/v1/health', () => {
  it('returns 200 and a contract-valid body when all ok', async () => {
    const res = await request(testApp()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(HealthResponseSchema.parse(res.body).dependencies).toEqual({
      api: 'ok',
      mongodb: 'ok',
      redis: 'ok',
    });
  });

  it('returns 503 when redis is down', async () => {
    const res = await request(testApp({ redis: async () => 'down' })).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('down');
    expect(res.body.dependencies.redis).toBe('down');
  });

  it('returns 503 when mongodb is down', async () => {
    const res = await request(testApp({ mongo: async () => 'down' })).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body.dependencies.mongodb).toBe('down');
  });

  it('is documented in the OpenAPI contract and served by Swagger UI', async () => {
    const app = testApp();
    const spec = await request(app).get('/api/v1/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.1.0');
    expect(spec.body.paths['/api/v1/health'].get.responses).toHaveProperty('200');
    expect(spec.body.components.schemas).toHaveProperty('HealthResponse');
    expect(spec.body.components.schemas).toHaveProperty('ErrorResponse');
    const docs = await request(app).get('/api/v1/docs/');
    expect(docs.status).toBe(200);
    expect(docs.text).toContain('swagger-ui');
  });
});

describe('checkMongo', () => {
  let replSet: MongoMemoryReplSet;
  let standalone: MongoMemoryServer;

  beforeAll(async () => {
    [replSet, standalone] = await Promise.all([
      MongoMemoryReplSet.create({ replSet: { count: 1 } }),
      MongoMemoryServer.create(),
    ]);
  });

  afterAll(async () => {
    await Promise.all([replSet?.stop(), standalone?.stop()]);
  });

  it('is ok on a replica set', async () => {
    const conn = await mongoose.createConnection(replSet.getUri()).asPromise();
    try {
      expect(await checkMongo(conn)).toBe('ok');
    } finally {
      await conn.close();
    }
  });

  it('is down on a standalone server (no transactions)', async () => {
    const conn = await mongoose.createConnection(standalone.getUri()).asPromise();
    try {
      expect(await checkMongo(conn)).toBe('down');
    } finally {
      await conn.close();
    }
  });

  it('is down when not connected', async () => {
    const conn = mongoose.createConnection();
    expect(await checkMongo(conn)).toBe('down');
  });
});

describe('checkRedis', () => {
  it('is ok only on PONG', async () => {
    expect(await checkRedis({ ping: async () => 'PONG' })).toBe('ok');
    expect(await checkRedis({ ping: async () => 'LOADING' })).toBe('down');
    expect(await checkRedis({ ping: () => Promise.reject(new Error('ECONNREFUSED')) })).toBe(
      'down',
    );
  });

  it('is down when ping hangs', async () => {
    const started = Date.now();
    expect(await checkRedis({ ping: () => new Promise<string>(() => {}) })).toBe('down');
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});
