# Change history

Newest first. Entry format: date, summary, files/modules touched, verify result, follow-ups.

## 2026-11-10 — Demo Step 0: clean baseline, per-feature live flags, contract decisions

- **Summary:** Step 0 of the Demo Readiness Plan.
  - Rebased local `main` onto `origin/main`. The duplicate frontend commit `c4bb12c` was dropped as already applied. Pushed `main` (`35a6431`).
  - Regenerated `package-lock.json`, which was missing the optional `@emnapi/core`, `@emnapi/runtime` and `@emnapi/wasi-threads` entries, so `npm ci` failed. `npm ci` and `npm ls --all` are now clean.
  - Added `.gitattributes`.
  - Deleted the dead `apps/web/src/lib/cart-context.tsx` and the unused `ListingPage` type.
  - Replaced `NEXT_PUBLIC_DEMO_MODE` with per-feature flags (`NEXT_PUBLIC_LIVE_AUTH`, `_MARKETPLACE`, `_CREATOR`, `_CHECKOUT`, `_GENERATION`), read through `apps/web/src/lib/features.ts`. All default to `false`, so behaviour is unchanged until a slice is turned on.
  - Narrowed `ListingCardData.currency` to `USD` (C-8).
  - Recorded the demo scope, the per-feature flags and contract decisions C-1 to C-9 in DECISIONS, and updated the frontend contract and backend plan to match.
  - Removed the `db:indexes` and `purge:workspaces` root scripts, which pointed at files that do not exist. Step 2 adds a real `db:indexes`.
- **Files touched:** `.gitattributes` (new), `package.json`, `package-lock.json`, `README.md`, `apps/web/.env.example`, `apps/web/src/lib/features.ts` (new), `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth-context.tsx`, `apps/web/src/lib/types.ts`, `apps/web/src/lib/cart-context.tsx` (deleted), `apps/web/src/app/page.tsx`, `apps/web/src/app/checkout/page.tsx`, `apps/web/src/app/creators/[handle]/page.tsx`, `apps/web/src/app/creator/onboarding/page.tsx`, `apps/web/src/app/creator/listings/new/page.tsx`, `docs/DECISIONS.md`, `docs/frontend-api-contract.md`, `docs/02-phase1-backend-plan.md`, `docs/ai-usage-log.md`, this history.
- **Decisions:** "Demo scope: real code on the demo path, sandboxed money and external accounts"; "Per-feature live flags replace NEXT_PUBLIC_DEMO_MODE"; "Frontend–backend contract decisions (C-1 to C-9)".
- **Verify result:** `npm run verify` passed in 77 s: install check, build (including the Next.js production build), typecheck, lint, 61/61 tests in 12 files, and smoke (API 200, in-memory MongoDB, Redis stub). `npm run health` passed: knip clean, lockfile in sync, 0 high or critical findings (the same 10 moderate findings in ESLint tooling).
- **Not done here:**
  - The project context PDF and Claude Doc still describe NestJS + PostgreSQL + Prisma, and need editing at the source. The amendments to `02-phase1-backend-plan.md` also need copying back to the Claude Doc.
  - The webhook path differs between documents: the backend plan has `POST /webhooks/payments/:gateway` and the Demo Plan Step 4 says `POST /payments/webhook`. Pick one in Step 4.
  - The `{ data }` unwrap fallback and token refresh in `api.ts` are deferred to Step 1, as the plan says.
- **Follow-ups:** answer the Demo Plan's open questions (demo date, AI provider, hosting, Docker, commission rate, PKR rate). Next is Step 1 (auth, users, workspaces, wallet) on `demo/step-1-auth`.

## 2026-11-10 — Status review: frontend done, backend has no feature endpoints yet (integration baseline)

- **Summary:** Read-only review of the whole repo after the Phase 2 frontend merge, as the starting point for wiring frontend to backend. No code changed. The web app is built against `docs/frontend-api-contract.md` and runs on fixtures (`NEXT_PUBLIC_DEMO_MODE=true`). The API still serves only health and docs, so no frontend call has a live endpoint yet.
- **Files touched:** this history entry only.
- **Repo state:**
  - Local `main` (`c4bb12c`) and `origin/main` (`a4a15be`) have diverged by 2 and 1 commits. Both hold the same frontend; the only difference is 2 lines in `docs/HISTORY.md` (`92fbac1`). Reconcile before any new branch: rebase or merge, then push.
  - `phase1/sprint-1-auth` (`e83ed28`) is already in `main`. It added auth groundwork only: `lib/crypto`, `lib/object-id`, `lib/transaction`, the `audit` module (model and service, no routes), `packages/oauth-providers` (Google and a fake), and the auth/user/workspace schemas in `shared-types`. **No `auth`, `users` or `workspaces` modules or routes exist.**
  - `phase1/setup` (PR #1) is merged into `main`.
  - Root `package.json` defines `db:indexes` and `purge:workspaces`, which point to `apps/api/dist/scripts/*.js`. Those scripts do not exist yet.
  - `knip.json` ignores `@node-rs/argon2` and `@prompt-engine/oauth-providers` until the auth module uses them. Knip does not cover `apps/web`.
- **Backend (`apps/api`) live routes:** `GET /api/v1/health`, `/api/v1/openapi.json`, `/api/v1/docs`. Ready to use: `requireAuth` (HS256 JWT, 15-minute access token, iss `prompt-engine`, aud `prompt-engine-api`, `token_expired` code), `requireRole`, `allowAnonymous`, rate limiting, idempotency, sanitize, validate, the `{ error: { code, message, details } }` error shape, and CORS from `CORS_ORIGINS` (`.env.example` already lists `http://localhost:3001`).
- **Frontend (`apps/web`, Next.js 16.4.6, port 3001):** pages for home, explore, `listing/[id]`, `creators/[handle]`, checkout, library, sign-in and sign-up, creator onboarding, creator dashboard, and new listing. All API access goes through `src/lib/api.ts`. Auth runs through the same-origin proxy `src/app/api/auth/session/route.ts`, which keeps the refresh token in an HTTP-only cookie and the access token in memory. `AuthUser` (`id, email, name, avatarUrl, roles`) is a subset of `shared-types` `UserResponseSchema`, so it matches.
- **Endpoint gap (frontend call → backend status → planned sprint):**

  | Frontend call | Backend | Plan sprint |
  | --- | --- | --- |
  | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Missing (schemas exist in `shared-types`) | 1 |
  | `GET /listings`, `GET /listings/:id` | Missing | 3 |
  | `GET /creators/:handle` | Missing | 3 |
  | `GET /creators/featured` | Missing and **not in the backend plan**: add to the plan or drop from the UI | 3 |
  | `POST /creator/profile`, `POST /creator/listings`, `GET /creator/stats` | Missing | 3 |
  | `POST /checkout`, `GET /entitlements` | Missing (`payment-adapters` fake exists) | 4 |
  | `POST /generations` | Missing (`ai-adapters` fake exists) | 5 |

- **Contract mismatches to settle before or during integration:**
  1. Search: the frontend uses `GET /listings?q=&category=&sort=`, while the plan lists a separate `/search`. Pick one.
  2. Reviews: the frontend expects `reviews` inline in `GET /listings/:id`, while the plan has `/listings/:id/reviews`.
  3. Idempotency on checkout: `startCheckout` creates a new `Idempotency-Key` on every click, so a retry can create a second order. Keep one key per checkout attempt.
  4. Idempotency on generations: `startGeneration` sends no `Idempotency-Key`, but the plan requires one on `/generations`.
  5. Expired tokens: `request()` in `api.ts` does not catch `401 token_expired` and refresh through the proxy, so with live auth every session breaks after 15 minutes.
  6. Response wrappers: `api.ts` accepts responses both with and without a `{ data }` wrapper. The backend should return bare objects, per the contract, and the unwrap fallback should then go.
  7. Public listing responses need denormalised `rating`, `reviewCount`, `sampleCount`, `creator.followers` and `verified`. Plan these fields in the listing and creator models. They must still never include the prompt body.
  8. Currency: `ListingCardData.currency` allows `USD | PKR`, but licenses and the dashboard are `USD` only. Fix one currency rule.
- **Client-side business logic to remove or move server-side:**
  - `src/lib/cart-context.tsx` is not imported anywhere. It is dead code containing hard-coded promo codes, credits and a USD→PKR rate. Delete it.
  - `checkout/page.tsx` hard-codes the `LAUNCH10` promo. Promo checks and prices must come from the server, as the contract says.
  - The cart (`src/lib/cart.ts`) keeps whole listing objects in `localStorage`. The server must re-price them at checkout.
- **Verify result:** `npm run verify:quick` **failed** at typecheck with `TS2688: Cannot find type definition file for 'react'`. This is an environment problem, not a code defect: this checkout's `node_modules` was installed before the web workspace was added, so `next`, `react` and `@types/react` are missing, though `package-lock.json` lists them. Run `npm ci`, then `npm run verify`. The previous entry's results (61/61 tests, web build) were measured on the frontend author's machine.
- **Suggested integration order (follows the backend sprints):**
  1. Reconcile `main` with `origin/main` and run `npm ci` and `npm run verify`.
  2. Sprint 1: auth, users and workspaces modules matching `AuthTokensResponseSchema`. Add token-expiry refresh to `api.ts`. Turn off demo mode for auth only, then test sign-up, sign-in, refresh and logout end to end.
  3. Sprint 3: listings, creators, creator tools and reviews against the contract shapes. Add the public-response prompt-body leak test. Set `MEDIA_IMAGE_HOSTS`.
  4. Sprint 4: checkout (fake payment adapter), orders and entitlements. Fix checkout idempotency and remove the client-side promo.
  5. Sprint 5: generations with an idempotency key and status polling or SSE.
  6. Replace the single global `NEXT_PUBLIC_DEMO_MODE` with per-feature flags (or remove it) so finished slices can go live one at a time. Add a web smoke test against the live API to `verify`.
- **Follow-ups:** the items above, plus the existing ones: 10 moderate dev-tool audit findings, `docker-compose.yml` never run locally, no `.gitattributes`, and the npm optional-dependency report after `npm ci`.

## 2026-11-10 — Phase 2 frontend: marketplace, storefront, and creator onboarding

- **Summary:** Built the responsive Next.js marketplace UI from `Prompt Engine Marketplace.pdf`, including creator storefronts and a four-step creator onboarding flow. Connected the UI to the frontend API contract without inspecting the in-progress backend. Demo mode is clearly non-submitting; following, bundles, subscriptions, uploads, and payouts remain disabled until their APIs exist. Added a configurable HTTPS media-host allow-list and corrected the listing rating keys, first-gallery image preload, and Next.js scroll warning.
- **Files touched:** `apps/web/src/app/**`, `apps/web/src/components/**`, `apps/web/src/lib/**`, `apps/web/next.config.ts`, `apps/web/.env.example`, web/root package manifests and lockfile, `knip.json`, `README.md`, `docs/frontend-api-contract.md`, this history, and `docs/ai-usage-log.md`.
- **Verify result:** Production web build passed; full typecheck passed; lint passed; full unit suite passed (61/61); smoke passed (API 200, in-memory MongoDB, Redis protocol stub); health passed (knip and lockfile checks clean; 10 moderate audit findings remain in ESLint tooling). `npm run verify` passed once before a clean dependency reinstall. After `npm ci`, its initial `npm ls --all` gate reports two platform-optional Sharp/WASM entries as extraneous and a missing optional `@emnapi/runtime`; the independent `verify:quick`, production web build, full test suite, smoke, and health checks all passed after the reinstall.
- **Browser checks:** Preview storefront rendered at mobile width; follow and storefront tab interactions worked. Creator onboarding completed its preview flow without creating a profile. Listing-to-cart-to-checkout reached the explicit demo state, which confirms no payment or entitlement was created. Library, dashboard, listing draft, and sign-in error states rendered.
- **Follow-ups:** Live backend compatibility remains unverified. Align the backend to `docs/frontend-api-contract.md`, configure `MEDIA_IMAGE_HOSTS`, then set `NEXT_PUBLIC_DEMO_MODE=false` and smoke-test authenticated flows against the live API. Revisit the npm optional-dependency install-check report and the 10 moderate development-tool audit findings.

## 2026-11-10 — Phase 1 setup, Part A: close setup follow-ups

- **Summary:** Moved the runtime target from Node 22 to Node 24 LTS to match the dev machine. Made smoke report the mode of every dependency (real, in-memory or stub), so a stubbed Redis can no longer show as "ok", and made CI smoke-test against real MongoDB and Redis with `SMOKE_REQUIRE_REAL=1`. Added `docs/judge-checks.md`, which README and SUBMISSION already linked to. Pushed `phase1/setup` and opened PR #1; no feature code.
- **Files touched:**
  - Runtime: `.nvmrc`, `engines` + `@types/node` in all `package.json` files, `package-lock.json`.
  - Smoke and CI: `scripts/smoke.mjs`, `.github/workflows/ci.yml`.
  - Docs: `docs/judge-checks.md` (new), `docs/DECISIONS.md`, `docs/README.md`, `docs/testing.md`, `docs/02-phase1-backend-plan.md`, `docs/requirements.md`, `docs/design.md`, `CLAUDE.md`, `README.md`.
- **Decisions:** "Node.js 24 LTS replaces Node.js 22"; "Smoke reports the mode of every dependency; CI requires real services"; open item O-1 (guest-to-account linking).
- **Verify result:**
  - Local (Windows 11, Node 24.21.0, clean build): install check pass; build pass; typecheck pass (0 errors); lint pass (0 warnings); test 56/56 pass (11 files); smoke pass with api `ok` (real), mongodb `ok` (in-memory), redis `stub`; `SMOKE_REQUIRE_REAL=1` correctly fails locally. `npm run health` pass: 0 high/critical (10 moderate), knip clean, lockfile in sync.
  - CI (Node 24.22.2) — push run [42767817504](https://github.com/syedrazi134/se-mex-compitition-prompt-engine-web/actions/runs/42767817504): verify pass, test 56/56, smoke pass with **api, mongodb and redis all `ok` from real services**, health pass. Pull-request run [42769898926](https://github.com/syedrazi134/se-mex-compitition-prompt-engine-web/actions/runs/42769898926): pass. PR: [#1](https://github.com/syedrazi134/se-mex-compitition-prompt-engine-web/pull/1) (not merged; awaiting review).
- **Resolved from previous entry:** local smoke used a Redis stub (now labelled, and CI checks real Redis); Node 24 vs 22 mismatch; missing `docs/judge-checks.md`; first smoke against a real Redis (CI run above).
- **Follow-ups:**
  - 10 moderate `npm audit` findings in lint tooling only (`minimatch` via eslint / typescript-eslint).
  - `docker-compose.yml` not run on the dev machine (no Docker); MinIO quay.io tag unverified.
  - Add `.gitattributes` (`* text=auto eol=lf`) to stop CRLF conversion warnings on Windows.
  - BullMQ, Sentry, `sharp`, `migrate-mongo` and a Dockerfile land with their first user.
  - Next: Part B, Sprint 1 (auth, users, workspaces, roles) on `phase1/sprint-1-auth`, after approval.

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
/////////////////////////////////////////////////////////////////////////////
