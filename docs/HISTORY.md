# Change history

Newest first. Entry format: date, summary, files/modules touched, verify result, follow-ups.

## 2026-11-10 — Phase 1 setup Steps 3–6: monorepo scaffold, quality gates, Stop hook

- **Summary:** Scaffolded the npm-workspaces monorepo on branch `phase1/setup`. Built `apps/api` fresh (Express 5, TypeScript strict) with Zod-validated config, `lib/` (db, redis, logger, errors, money, pagination, openapi, timeout), `middleware/` (auth, roles, rate limit, validate, idempotency, sanitize), the example `health` module, `GET /api/v1/health`, and the OpenAPI 3.1 contract at `/api/v1/openapi.json` and `/api/v1/docs`. Added package skeletons with interfaces + one fake each: `shared-types`, `ai-adapters` (`AiAdapter`, `FakeAiAdapter`), `payment-adapters` (`PaymentAdapter`, `FakePaymentAdapter`). Added build/typecheck/lint/test/health/smoke/verify scripts, Docker Compose, CI and a Claude Code Stop hook. No feature endpoints. The mobile Worker is untouched.
- **Files touched:** `package.json`, `package-lock.json`, `tsconfig.base.json`, `.nvmrc`, `.editorconfig`, `.prettierrc.json`, `.prettierignore`, `eslint.config.js`, `vitest.config.ts`, `knip.json`, `.env.example`, `.gitignore`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.claude/settings.json`, `.claude/hooks/verify-before-stop.mjs`, `scripts/` (verify, verify-quick, smoke, health, test.sh, lib/), `apps/api/**`, `packages/**`, `CLAUDE.md`, `README.md`, `docs/DECISIONS.md`, `docs/testing.md`, `docs/requirements.md`, `docs/ai-usage-log.md`.
- **Verify result:** `npm run verify` from a clean build: PASS in 29.9 s. Install check pass; build pass; typecheck pass (0 errors); lint pass (0 warnings); test 56/56 (11 files); smoke pass (`/api/v1/health` 200 with api, mongodb, redis ok). `npm run health`: PASS — 0 high/critical (10 moderate, dev-only, see follow-ups); knip clean; lockfile in sync. Stop hook checked: exit 0 when `stop_hook_active`, exit 0 on clean code, exit 2 with the TypeScript error on a deliberate type error.
- **Follow-ups:**
  - 10 moderate `npm audit` findings, all in lint tooling (`minimatch` via eslint and typescript-eslint). Not shipped at runtime; recheck when typescript-eslint releases a fix.
  - Local smoke used the in-process Redis stub (no Docker). First CI run will be the first smoke against a real Redis.
  - `docker-compose.yml` not run here; the MinIO tag on quay.io could not be verified.
  - Node 24 on this machine; CI and `.nvmrc` use 22.
  - BullMQ, Sentry, `sharp`, `migrate-mongo` and a Dockerfile are not added yet; each lands with the first code that needs it.
  - `docs/judge-checks.md` (linked from README and SUBMISSION) still does not exist.
  - Next: sprint 1 (auth, users, workspaces, roles), then port the free-prompt flow from the Worker.

## 2026-11-10 — Project docs filled in; Phase 1 setup Steps 1–2 (audit + guidance files)

- **Summary:** Filled the competition template docs with the Prompt Engine Web project data. Added the project context PDF and the Phase 1 backend plan (exported from the Claude Doc). Created the docs index, working sequence, decision log, this history file and `CLAUDE.md`. Audited the existing mobile backend (read-only). No code written; scaffold (Step 3) is waiting for approval.
- **Files touched:** `README.md`, `CLAUDE.md` (new), `docs/README.md` (new), `docs/WORKFLOW.md` (new), `docs/DECISIONS.md` (new), `docs/HISTORY.md` (new), `docs/01-project-context.pdf` (new), `docs/02-phase1-backend-plan.md` (new), `docs/architecture/.gitkeep` (new), `docs/requirements.md`, `docs/design.md`, `docs/testing.md`, `docs/ai-usage-log.md`.
- **Audit findings:**
  - This repo is the SE-MAX competition template: no application code, no `package.json`, CI expects `scripts/test.sh`.
  - The mobile backend lives in the Flutter repo (`syedrazi134/prompt_engine`, folder `backend/`). It is a Cloudflare Worker + D1 (SQLite), TypeScript strict, npm, Vitest with `@cloudflare/vitest-pool-workers`, Wrangler. One route: `POST /v1/generate` (install-ID header, no user accounts), plus a daily cron that deletes counter rows. No Express, no MongoDB, no lint/format config.
  - The Phase 1 plan assumed a Node + Express + MongoDB mobile backend to move into `apps/api`. That premise does not hold; see DECISIONS.md P-1.
  - Toolchain on this machine: Node 24.21 (plan targets 22 LTS), npm 11.19, no pnpm, no Docker.
- **Verify result:** not applicable — no code or scripts exist yet.
- **Follow-ups:** approve P-1, P-2, P-3 in DECISIONS.md; install Docker (or provide a MongoDB replica set + Redis) so `smoke` can pass; `docs/judge-checks.md` is linked from README and SUBMISSION but does not exist; CI must be rewritten to run `npm run verify` in Step 3.
