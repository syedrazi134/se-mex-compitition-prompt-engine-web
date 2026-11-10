// Dependency health: security audit (fail on high/critical), outdated report (info only),
// unused/missing dependencies (knip), lockfile in sync with every package.json.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot, run, runSteps } from './lib/run.mjs';

const readJson = (path) => JSON.parse(readFileSync(join(repoRoot, path), 'utf8'));

function lockfileInSync() {
  const root = readJson('package.json');
  const lock = readJson('package-lock.json');
  const problems = [];
  for (const dir of ['', ...root.workspaces]) {
    const manifest = readJson(dir ? `${dir}/package.json` : 'package.json');
    const locked = lock.packages?.[dir];
    if (!locked) {
      problems.push(`${dir || '(root)'}: missing from package-lock.json`);
      continue;
    }
    for (const field of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      const want = manifest[field] ?? {};
      const have = locked[field] ?? {};
      for (const name of new Set([...Object.keys(want), ...Object.keys(have)])) {
        if (want[name] !== have[name]) {
          problems.push(
            `${dir || '(root)'} ${field}.${name}: package.json=${want[name]} lock=${have[name]}`,
          );
        }
      }
    }
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    console.error('Run `npm install` and commit package-lock.json.');
  } else {
    console.log('package-lock.json matches every package.json');
  }
  return problems.length === 0;
}

process.exit(
  runSteps('health', [
    {
      name: 'security audit (high/critical fail)',
      run: () => run('npm audit --audit-level=high').ok,
    },
    {
      name: 'outdated report (info only)',
      run: () => {
        const result = run('npm outdated --workspaces --include-workspace-root', { quiet: true });
        console.log(result.output.trim() || 'Everything is up to date.');
        return true;
      },
    },
    { name: 'unused / missing dependencies (knip)', run: () => run('npx knip').ok },
    { name: 'lockfile in sync', run: lockfileInSync },
  ]),
);
