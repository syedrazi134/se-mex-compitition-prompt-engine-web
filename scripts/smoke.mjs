// Starts the BUILT API, requires GET /api/v1/health -> 200 with every dependency "ok", then stops it.
// Uses MONGODB_URI / REDIS_URL when set (real services). Otherwise it starts an in-memory MongoDB
// replica set and an in-process Redis protocol stub (docs/DECISIONS.md, 2026-11-10).
//
// Honest reporting: each dependency is reported with the mode it ran in. A stubbed dependency is
// reported as "stub", never "ok". The API's /api/v1/health only ever reports real connection
// status; the stub exists only in this script, never in a production code path.
// Set SMOKE_REQUIRE_REAL=1 (CI does) to fail unless every dependency is a real service.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { repoRoot } from './lib/run.mjs';
import { startRedisStub } from './lib/redis-stub.mjs';

const entry = join(repoRoot, 'apps', 'api', 'dist', 'server.js');
const TIMEOUT_MS = 30_000;
const requireReal = process.env.SMOKE_REQUIRE_REAL === '1';

/** How each dependency was provided. Only `real` and `in-memory` run the actual server software. */
const MODE_LABEL = {
  real: 'real service',
  'in-memory': 'in-memory mongod (real server binary, throwaway data)',
  stub: 'in-process protocol stub (PING/INFO only, NOT a real Redis)',
};

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHealth(url, child) {
  const deadline = Date.now() + TIMEOUT_MS;
  let last = 'no response';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited early with code ${child.exitCode}`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      const body = await res.json();
      if (res.status === 200) return body;
      last = `${res.status} ${JSON.stringify(body)}`;
    } catch (err) {
      last = err.message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`health did not return 200 within ${TIMEOUT_MS / 1000}s (last: ${last})`);
}

/** The smoke verdict per dependency: the health status, except that a stub can never be "ok". */
function report(deps, modes) {
  const rows = Object.entries(modes).map(([name, mode]) => {
    const health = deps[name] ?? 'missing';
    const result = mode === 'stub' && health === 'ok' ? 'stub' : health;
    return { name, health, mode, result };
  });
  console.log('\ndependency  result  mode');
  for (const r of rows) {
    console.log(`${r.name.padEnd(11)} ${r.result.padEnd(7)} ${MODE_LABEL[r.mode]}`);
  }
  return rows;
}

async function main() {
  if (!existsSync(entry)) {
    throw new Error('apps/api/dist/server.js not found. Run `npm run build` first.');
  }

  const cleanups = [];
  const modes = { api: 'real', mongodb: 'real', redis: 'real' };
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn',
  };
  env.JWT_ACCESS_SECRET ||= randomBytes(32).toString('hex');
  env.PORT = String(await freePort());

  try {
    if (!env.MONGODB_URI) {
      const { MongoMemoryReplSet } = await import('mongodb-memory-server');
      const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      cleanups.push(() => replSet.stop());
      env.MONGODB_URI = replSet.getUri('prompt_engine_smoke');
      modes.mongodb = 'in-memory';
    }
    if (!env.REDIS_URL) {
      const stub = await startRedisStub();
      cleanups.push(() => stub.stop());
      env.REDIS_URL = `redis://127.0.0.1:${stub.port}`;
      modes.redis = 'stub';
    }

    const notReal = Object.entries(modes).filter(([, mode]) => mode !== 'real');
    if (requireReal && notReal.length > 0) {
      throw new Error(
        `SMOKE_REQUIRE_REAL=1 but not real: ${notReal.map(([n, m]) => `${n}=${m}`).join(', ')}. Set MONGODB_URI and REDIS_URL.`,
      );
    }

    const child = spawn(process.execPath, [entry], {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    cleanups.unshift(
      () =>
        new Promise((resolve) => {
          if (child.exitCode !== null) return resolve();
          child.once('exit', resolve);
          child.kill('SIGTERM');
        }),
    );

    const base = `http://127.0.0.1:${env.PORT}/api/v1`;
    const body = await waitForHealth(`${base}/health`, child);
    const rows = report(body?.dependencies ?? {}, modes);
    const failed = rows.filter((r) => r.health !== 'ok');
    if (body?.status !== 'ok' || failed.length > 0) {
      throw new Error(`health not ok: ${JSON.stringify(body)}`);
    }
    console.log('\nGET /api/v1/health -> 200');

    const spec = await fetch(`${base}/openapi.json`);
    if (spec.status !== 200) throw new Error(`GET /api/v1/openapi.json -> ${spec.status}`);
    console.log('GET /api/v1/openapi.json -> 200');

    const summary = rows.map((r) => `${r.name}=${r.result}(${r.mode})`).join(', ');
    console.log(`smoke: pass [${summary}]`);
    if (rows.some((r) => r.result === 'stub')) {
      console.warn(
        'smoke: WARNING a stubbed dependency was not really checked. CI checks it for real.',
      );
    }
  } finally {
    for (const cleanup of cleanups) await cleanup().catch(() => {});
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(`smoke: FAIL - ${err.message}`);
    process.exit(1);
  },
);
