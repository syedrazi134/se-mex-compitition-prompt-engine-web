# Testing

## Test strategy

No endpoint is done until it has Zod validation, an auth guard, an OpenAPI entry and a passing test. Every change follows [WORKFLOW.md](WORKFLOW.md), which runs build, typecheck, lint, tests, smoke and health checks before a task is closed.

| Level | What | Tools |
|-------|------|-------|
| Unit | Each module's service; money helpers; adapters (fake providers) | Vitest or Jest (chosen in Phase 1 setup) |
| API | Every endpoint group over HTTP, against a real in-memory MongoDB **in replica-set mode** so transactions run for real | Supertest + `mongodb-memory-server` |
| Scenario | Money flows end to end: purchase, duplicate webhook, refund, payout; ledger sums to zero | Supertest + fake payment adapter |
| Contract | OpenAPI generated from Zod; diff on every pull request; breaking change fails after the freeze gate | `zod-to-openapi` + diff in CI |
| Security | Public endpoints never return a prompt body; cross-workspace access refused; rate limits return 429 | API tests |
| Smoke | Built API starts and `/api/v1/health` returns 200 with MongoDB and Redis `ok` | `npm run smoke` |
| Load | Key reads p95 < 300 ms | Load test in sprint 5 |
| Regression (mobile) | Existing `POST /v1/generate` Worker suite stays green | Vitest in the Workers runtime (mobile repo) |

## How to run tests

From the repo root:

```
npm ci
npm run test          # unit + API tests
npm run smoke         # start built API, check /api/v1/health
npm run verify        # install check -> build -> typecheck -> lint -> test -> smoke
npm run verify:quick  # typecheck -> lint -> tests related to changed files
npm run health        # audit, outdated, unused/missing deps, lockfile in sync
```

Local MongoDB (replica set), Redis and MinIO: `docker compose up -d`. Without them, tests use an in-memory MongoDB replica set, and `smoke` uses that plus an in-process Redis protocol stub (PING/INFO only) and reports each dependency with its mode (`real`, `in-memory` or `stub`; a stub is never shown as `ok`). CI runs smoke against real MongoDB and Redis with `SMOKE_REQUIRE_REAL=1`.

## Results summary

Last run: 2026-11-10, `npm run verify` from a clean build on Windows 11, Node 24.21 (Phase 1 setup).

| Type | Total | Passed | Failed |
|------|-------|--------|--------|
| Unit (packages, config, money, pagination, health service, Redis check) | 31 | 31 | 0 |
| Integration / API (Supertest app, middleware, health route, MongoDB replica set vs standalone) | 25 | 25 | 0 |
| Smoke (built API, `/api/v1/health` 200 all ok, `/api/v1/openapi.json` 200) | 1 | 1 | 0 |
| End-to-end / manual | 0 | 0 | 0 |

## Edge cases covered

Planned; each gets a test when its endpoint group is built.

| ID | Edge case | Expected behaviour | Test / evidence | Result |
|----|-----------|--------------------|-----------------|--------|
| EC-01 | Payment gateway sends the same webhook twice | Second call is a no-op: one entitlement, one set of ledger entries | Scenario test (sprint 4) | Not run |
| EC-02 | Refund after purchase | Entitlement revoked and ledger reversed in the same transaction; prompt text no longer returned | Scenario test (sprint 4) | Not run |
| EC-03 | Client retries checkout with the same `Idempotency-Key` | Same order returned; no second order | API test (sprint 4) | Not run |
| EC-04 | Public listing, search or creator page for a paid prompt | Response contains no prompt body | CI scan test (sprint 3) | Not run |
| EC-05 | Member of workspace A requests a prompt in workspace B | 404 or 403; no data returned | API test (sprint 2) | Not run |
| EC-06 | Request body with `$`-prefixed, dotted or `__proto__` keys | Stripped at any depth; unknown query keys dropped by validation | `apps/api/src/middleware/request.test.ts` | Pass |
| EC-07 | Refresh token reused after rotation | Whole token family revoked; 401 | API test (sprint 1) | Not run |
| EC-08 | Generation started with too few credits | 402-style error; no job queued | API test (sprint 5) | Not run |
| EC-09 | AI provider fails after all retries | Job marked failed; credits refunded | Worker test (sprint 5) | Not run |
| EC-10 | MongoDB down or not a replica set | `/api/v1/health` returns 503 with `mongodb: down`; standalone counts as down | `health.test.ts` (real in-memory replica set and standalone) | Pass |
| EC-11 | Redis down, wrong reply or hanging | `/api/v1/health` returns 503 with `redis: down` within the 2 s check timeout | `health.test.ts` | Pass |
| EC-13 | Expired, wrongly signed, malformed or role-less JWT | 401 `unauthorized`; missing role → 403 `forbidden` | `apps/api/src/middleware/auth.test.ts` | Pass |
| EC-14 | Rate limiter store (Redis) fails | 500, never silently allowed | `rate-limit.test.ts` | Pass |
| EC-15 | Commission split rounding | Share + rest always equals the original amount, integers only | `apps/api/src/lib/money.test.ts` | Pass |
| EC-16 | Tampered pagination cursor (incl. `$gt` payload) | 400 `invalid_cursor` | `pagination.test.ts` | Pass |
| EC-12 | Ledger entries for a `txnId` do not sum to zero | Nightly reconciliation flags it | Job test (sprint 4) | Not run |

## Measured metrics

<!-- Accuracy, response times or other NFR measurements. Report honestly, including weak results. -->

| Metric | Method | Result |
|--------|--------|--------|
| Read p95 latency (NFR-01) | Load test of key reads, sprint 5 | Not measured |
| Generation status delay (NFR-02) | Timed job transitions with fake adapter | Not measured |

## Defect log

| ID | Description | Found by / how | Severity | Status | Fix commit |
|----|-------------|----------------|----------|--------|------------|
| — | None yet | — | — | — | — |

## Known untested areas

- All feature endpoints (none exist yet; sprint 1 starts with auth).
- `createRedisLimiter` against a real Redis (rate limiting is tested with the in-memory limiter).
- Smoke against a real Redis on the development machine (no Docker); CI covers it.
- `docker-compose.yml` has not been run (no Docker on the development machine).
- Real payment gateway and real AI providers (fake adapters only until they are chosen).
- Load and performance targets until sprint 5.
