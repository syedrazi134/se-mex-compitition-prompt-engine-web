# Working sequence (mandatory for every change)

Every task follows these five steps in order. A step that fails sends you back to step 1 for that problem. After 3 failed loops on the same problem, stop and report what is failing, what you tried and what you suggest.

## 0. Prepare
- Read docs/README.md and the docs it points to that relate to the task.
- Check docs/DECISIONS.md so you don't undo an earlier decision.
- State the plan in a few lines and the files you expect to touch.

## 1. Implement
- Change only what the task needs. Follow the module shape and rules in CLAUDE.md.
- Every new endpoint: Zod schema, auth guard, OpenAPI entry, test.
- New dependency? Say why, pin the version, check its licence and last release date.

## 2. Build
- Run: build, then typecheck.
- Pass condition: zero errors.

## 3. Test
- Run: test (all), then smoke.
- New or changed behaviour must have a test that would fail without the change.
- Pass condition: all tests green; /api/v1/health returns 200 with all dependencies ok.

## 4. Analyze
- Run: lint (zero warnings) and health.
- Review your own diff: dead code, leftover logs, secrets, missing error handling, prompt text in public responses, money not in minor units, a module reading another module's collection.
- Pass condition: lint clean; no high/critical vulnerabilities; no unused or missing dependencies; diff review finds nothing.

## 5. Safe Close
- Run verify once more from a clean state. It must pass end to end.
- Add an entry to docs/HISTORY.md. Add to docs/DECISIONS.md if a decision changed, and update the affected doc.
- Report to the user:
  - What changed (files/modules)
  - Results of build, typecheck, lint, test, smoke, health (pass/fail + counts)
  - Anything skipped, any warning left, any follow-up needed
- Never report a task as done while any check is failing.
