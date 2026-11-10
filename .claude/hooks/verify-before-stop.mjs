// Claude Code Stop hook: before Claude may stop, run `npm run verify:quick` when code under
// apps/ or packages/ has changed. On failure, exit 2 with the trimmed output on stderr so
// Claude keeps working. Node, so it runs the same on Windows, macOS and Linux.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAX_OUTPUT = 4000;

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function sh(command) {
  return spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

let input = {};
try {
  input = JSON.parse((await readStdin()) || '{}');
} catch {
  // Unreadable input: fall through and verify anyway.
}

// Already continuing because of this hook: don't loop.
if (input.stop_hook_active) process.exit(0);

// Staged, unstaged and untracked changes under apps/ or packages/.
const status = sh('git status --porcelain --untracked-files=all -- apps packages');
if (status.status !== 0) {
  console.error('verify-before-stop: git status failed; skipping verify:quick.');
  process.exit(0);
}
if (!status.stdout.trim()) process.exit(0);

const result = sh('npm run verify:quick');
if (result.status === 0) process.exit(0);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
const trimmed = output.length > MAX_OUTPUT ? `...\n${output.slice(-MAX_OUTPUT)}` : output;
console.error(`verify:quick failed. Fix these before finishing (docs/WORKFLOW.md):\n\n${trimmed}`);
process.exit(2);
