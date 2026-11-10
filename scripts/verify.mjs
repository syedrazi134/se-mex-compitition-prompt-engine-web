// Full gate: install check -> build -> typecheck -> lint -> test -> smoke. Stops at the first failure.
import { run, runSteps } from './lib/run.mjs';

const step = (name, command) => ({ name, run: () => run(command).ok });

const installCheck = {
  name: 'install check',
  run: () => {
    // Fails when node_modules is missing, extraneous or doesn't match package.json + lockfile.
    const result = run('npm ls --all', { quiet: true });
    if (!result.ok) {
      console.error(
        result.output
          .split('\n')
          .filter((l) => /ERR|invalid|missing|extraneous/i.test(l))
          .join('\n'),
      );
      console.error('Run `npm ci` and try again.');
    }
    return result.ok;
  },
};

process.exit(
  runSteps('verify', [
    installCheck,
    step('build', 'npm run build'),
    step('typecheck', 'npm run typecheck'),
    step('lint', 'npm run lint'),
    step('test', 'npm run test'),
    step('smoke', 'npm run smoke'),
  ]),
);
