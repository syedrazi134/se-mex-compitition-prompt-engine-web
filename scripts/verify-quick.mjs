// Fast gate used by the Claude Code Stop hook: typecheck -> lint -> tests related to changed files.
import { run, runSteps } from './lib/run.mjs';

function changedSourceFiles() {
  const tracked = run('git diff --name-only HEAD', { quiet: true });
  const untracked = run('git ls-files --others --exclude-standard', { quiet: true });
  const files = `${tracked.ok ? tracked.output : ''}\n${untracked.output}`
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter((f) => /^(apps|packages)\/.+\.(ts|mts|js|mjs)$/.test(f));
  return [...new Set(files)];
}

const files = changedSourceFiles();

process.exit(
  runSteps('verify:quick', [
    { name: 'typecheck', run: () => run('npm run typecheck').ok },
    { name: 'lint', run: () => run('npm run lint').ok },
    {
      name: `tests related to ${files.length} changed file(s)`,
      run: () => {
        if (files.length === 0) {
          console.log('No changed source files under apps/ or packages/; skipping tests.');
          return true;
        }
        const quoted = files.map((f) => `"${f}"`).join(' ');
        return run(`npx vitest related --run --passWithNoTests ${quoted}`).ok;
      },
    },
  ]),
);
