// Starts the BUILT API, requires GET /api/v1/health -> 200 with every dependency "ok", then stops it.
// Uses MONGODB_URI / REDIS_URL when set; otherwise an in-memory MongoDB replica set and an
// in-process Redis protocol stub (docs/DECISIONS.md, 2026-11-10).
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { repoRoot } from './lib/run.mjs';
import { startRedisStub } from './lib/redis-stub.mjs';

const entry = join(repoRoot, 'apps', 'api', 'dist', 'server.js');
const TIMEOUT_MS = 30_000;

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

async function main() {
  if (!existsSync(entry))
    throw new Error('apps/api/dist/server.js not found. Run `npm run build` first.');

  const cleanups = [];
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn',
  };
  env.JWT_ACCESS_SECRET ||= randomBytes(32).toString('hex');
  env.PORT = String(await freePort());

  try {
    if (env.MONGODB_URI) {
      console.log('MongoDB: using MONGODB_URI');
    } else {
      const { MongoMemoryReplSet } = await import('mongodb-memory-server');
      const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      cleanups.push(() => replSet.stop());
      env.MONGODB_URI = replSet.getUri('prompt_engine_smoke');
      console.log('MongoDB: in-memory replica set');
    }
    if (env.REDIS_URL) {
      console.log('Redis: using REDIS_URL');
    } else {
      const stub = await startRedisStub();
      cleanups.push(() => stub.stop());
      env.REDIS_URL = `redis://127.0.0.1:${stub.port}`;
      console.warn(
        'Redis: WARNING in-process protocol stub (PING/INFO only). Set REDIS_URL to smoke-test a real Redis.',
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
    const deps = body?.dependencies ?? {};
    const bad = Object.entries(deps).filter(([, status]) => status !== 'ok');
    if (
      body?.status !== 'ok' ||
      bad.length > 0 ||
      !['api', 'mongodb', 'redis'].every((d) => d in deps)
    ) {
      throw new Error(`health not ok: ${JSON.stringify(body)}`);
    }
    console.log(`GET /api/v1/health -> 200 ${JSON.stringify(deps)}`);

    const spec = await fetch(`${base}/openapi.json`);
    if (spec.status !== 200) throw new Error(`GET /api/v1/openapi.json -> ${spec.status}`);
    console.log('GET /api/v1/openapi.json -> 200');
    console.log('smoke: pass');
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
