import type { DependencyStatus } from '@prompt-engine/shared-types';
import { Redis } from 'ioredis';
import { withTimeout } from './timeout.js';

const CHECK_TIMEOUT_MS = 2_000;

/** Connects eagerly so startup fails fast when Redis is unreachable. */
export async function connectRedis(url: string): Promise<Redis> {
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await client.connect();
  return client;
}

/** The only part of the client the health check needs, so tests can pass a stub. */
export interface Pingable {
  ping(): Promise<string>;
}

export async function checkRedis(client: Pingable): Promise<DependencyStatus> {
  try {
    const reply = await withTimeout(client.ping(), CHECK_TIMEOUT_MS, 'redis ping');
    return reply === 'PONG' ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}
