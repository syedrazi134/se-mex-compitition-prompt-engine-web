// Starts the BUILT API for local use on a machine without Docker (docs/DECISIONS.md, 2026-11-10,
// "Local start without Docker"). Reads the repo-root .env, then fills only what is missing:
//   - MONGODB_URI unset -> in-memory MongoDB replica set (real mongod binary, data lost on exit)
//   - REDIS_URL unset   -> in-process Redis protocol stub (PING/INFO only, NOT a real Redis)
// Every substitute is announced. Never used in CI or production; set real URLs there.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './lib/run.mjs';
import { startRedisStub } from './lib/redis-stub.mjs';

const entry = join(repoRoot, 'apps', 'api', 'dist', 'server.js');
const envFile = join(repoRoot, '.env');

if (!existsSync(entry)) {
  console.error('apps/api/dist/server.js not found. Run `npm run build` first.');
  process.exit(1);
}
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
} else {
  console.warn('No .env at the repo root; copy .env.example to .env and fill it in.');
}

const env = { ...process.env };
const cleanups = [];

if (!env.MONGODB_URI) {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  cleanups.push(() => replSet.stop());
  env.MONGODB_URI = replSet.getUri('prompt_engine_local');
  console.warn('start:local: MONGODB_URI not set -> in-memory MongoDB (data is lost on exit).');
}
if (!env.REDIS_URL) {
  const stub = await startRedisStub();
  cleanups.push(() => stub.stop());
  env.REDIS_URL = `redis://127.0.0.1:${stub.port}`;
  console.warn(
    'start:local: REDIS_URL not set -> Redis protocol STUB (PING/INFO only). ' +
      'Health shows redis "ok" but nothing else works; set REDIS_URL before queues land.',
  );
}

const child = spawn(process.execPath, [entry], { cwd: repoRoot, env, stdio: 'inherit' });

async function stop(code) {
  for (const cleanup of cleanups) await cleanup().catch(() => {});
  process.exit(code);
}
child.on('exit', (code) => void stop(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
