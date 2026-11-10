# Judge checks

How a reviewer verifies the project from a clean machine. Each check says what to run and what you should see. Allow about 10 minutes; the first test run downloads a MongoDB binary (about 100 MB).

## Before you start

- [ ] Node.js 24 LTS and npm installed (`node -v` prints `v24.x`). The version is pinned in `.nvmrc`.
- [ ] Git installed.
- [ ] Optional: Docker, to run against real MongoDB and Redis. Without it, every check still runs (see "Smoke modes" below).

## 1. Get the code

- [ ] `git clone https://github.com/syedrazi134/se-mex-compitition-prompt-engine-web.git`
- [ ] `cd se-mex-compitition-prompt-engine-web`
- [ ] `npm ci` finishes without errors. It installs exactly what `package-lock.json` lists.

## 2. Full quality gate

- [ ] `npm run verify`

Expected: six steps, each ending in `pass`, then `verify PASSED`.

| Step | What it checks | Expected |
|------|----------------|----------|
| install check | `node_modules` matches `package.json` + lockfile | pass |
| build | TypeScript compiles every workspace | pass |
| typecheck | `tsc --noEmit` on every workspace, tests included | 0 errors |
| lint | ESLint, zero warnings allowed | 0 problems |
| test | Vitest unit + API tests (in-memory MongoDB replica set) | all tests pass, 0 failed |
| smoke | Starts the built API and calls `GET /api/v1/health` | 200, every dependency listed with its mode |

## 3. Dependency health

- [ ] `npm run health`

Expected: `health PASSED`. It runs four checks:

- Security audit: no high or critical vulnerabilities. Moderate ones may be listed; they are recorded in [HISTORY.md](HISTORY.md).
- Outdated report: information only, never fails.
- Unused or missing dependencies (knip): no findings.
- Lockfile in sync: `package-lock.json matches every package.json`.

## 4. Smoke on its own, and smoke modes

- [ ] `npm run build` then `npm run smoke`

Smoke prints a table with one row per dependency: its result and the mode it ran in.

| Mode | Meaning |
|------|---------|
| `real service` | `MONGODB_URI` / `REDIS_URL` were set, so smoke used them |
| `in-memory mongod` | No `MONGODB_URI`: a real MongoDB binary started as a throwaway replica set |
| `stub` | No `REDIS_URL`: an in-process stand-in that answers PING only. Shown as `stub`, never `ok` |

To smoke-test real services locally: `docker compose up -d`, copy `.env.example` to `.env`, then run smoke with `MONGODB_URI` and `REDIS_URL` set, or `SMOKE_REQUIRE_REAL=1 npm run smoke` to fail on anything that isn't real. CI always does this; see the latest run on the pull request's Checks tab.

## 5. API contract and health endpoint

- [ ] Start the API: `docker compose up -d`, `cp .env.example .env` (set a 32+ character `JWT_ACCESS_SECRET`), then `npm run dev`.
- [ ] `GET http://localhost:3000/api/v1/health` returns `200` with `{"status":"ok","dependencies":{"api":"ok","mongodb":"ok","redis":"ok"},...}`. It returns `503` if MongoDB or Redis is down, or if MongoDB is not a replica set.
- [ ] Swagger UI: http://localhost:3000/api/v1/docs
- [ ] Raw OpenAPI 3.1 contract: http://localhost:3000/api/v1/openapi.json

## 6. Continuous integration

- [ ] The pull request's Checks tab shows the `CI / verify` job green. It runs `npm ci`, `npm run verify` with smoke against real MongoDB and Redis (`SMOKE_REQUIRE_REAL=1`), then `npm run health`, on Node 24.

## 7. Where the reasoning lives

| Question | Where |
|----------|-------|
| What is the product and who is it for? | [01-project-context.pdf](01-project-context.pdf), [requirements.md](requirements.md) |
| How is it built? | [02-phase1-backend-plan.md](02-phase1-backend-plan.md), [design.md](design.md) |
| Why was each choice made? | [DECISIONS.md](DECISIONS.md) (decision log, newest first, with open items) |
| What changed, and did checks pass each time? | [HISTORY.md](HISTORY.md) (newest first) |
| How is it tested, and what isn't? | [testing.md](testing.md) |
| How is every change made? | [WORKFLOW.md](WORKFLOW.md) |
| How was AI used? | [ai-usage-log.md](ai-usage-log.md) |
