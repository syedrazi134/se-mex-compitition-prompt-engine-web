import type { DependencyStatus, HealthResponse } from '@prompt-engine/shared-types';

export interface HealthDeps {
  checkMongo: () => Promise<DependencyStatus>;
  checkRedis: () => Promise<DependencyStatus>;
  /** Injected so tests control time. */
  now?: () => Date;
  startedAt?: Date;
}

export interface HealthService {
  check(): Promise<HealthResponse>;
}

async function safely(check: () => Promise<DependencyStatus>): Promise<DependencyStatus> {
  try {
    return await check();
  } catch {
    return 'down';
  }
}

export function createHealthService(deps: HealthDeps): HealthService {
  const now = deps.now ?? (() => new Date());
  const startedAt = deps.startedAt ?? now();
  return {
    async check() {
      const [mongodb, redis] = await Promise.all([
        safely(deps.checkMongo),
        safely(deps.checkRedis),
      ]);
      const at = now();
      const allOk = mongodb === 'ok' && redis === 'ok';
      return {
        status: allOk ? 'ok' : 'down',
        dependencies: { api: 'ok', mongodb, redis },
        uptimeSeconds: Math.max(0, Math.floor((at.getTime() - startedAt.getTime()) / 1000)),
        timestamp: at.toISOString(),
      };
    },
  };
}
