import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Runs a shell command from the repo root. `quiet` captures output and returns it instead of
 * streaming it, so callers can show it only on failure.
 */
export function run(command, { quiet = false, env } = {}) {
  const result = spawnSync(command, {
    cwd: repoRoot,
    shell: true,
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: env ? { ...process.env, ...env } : process.env,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/** Runs named steps in order and stops at the first failure. Returns the process exit code. */
export function runSteps(title, steps) {
  const started = Date.now();
  for (const [index, step] of steps.entries()) {
    const label = `[${index + 1}/${steps.length}] ${step.name}`;
    console.log(`\n=== ${label} ===`);
    const t = Date.now();
    const ok = step.run();
    const seconds = ((Date.now() - t) / 1000).toFixed(1);
    if (!ok) {
      console.error(`\n${title} FAILED at ${label} (${seconds}s)`);
      return 1;
    }
    console.log(`--- ${step.name}: pass (${seconds}s)`);
  }
  console.log(`\n${title} PASSED (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return 0;
}
