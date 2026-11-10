# Decision log

Newest first. Never undo a decision here without adding a new entry that replaces it. Format: date, decision, reason, alternatives rejected.

## 2026-11-10 — Dependencies added only with the code that needs them
- **Decision:** the setup adds no BullMQ, Sentry, `sharp`, `migrate-mongo` or AWS SDK yet. `worker.ts` connects MongoDB and Redis and registers no queues. Each dependency lands with its first user (BullMQ with the first queue, `migrate-mongo` with the first model). Exact versions are pinned, picked from releases at least two weeks old.
- **Reason:** setup rule "add only the dependencies this setup needs"; knip fails on unused dependencies.
- **Alternatives rejected:** installing the whole planned stack up front.

## 2026-11-10 — OpenAPI component names via Zod `.meta({ id })`
- **Decision:** shared schemas name themselves with Zod 4's `.meta({ id })`; modules add paths through an `OpenApiRegistrar`. We do not call `extendZodWithOpenApi`.
- **Reason:** no global patch of Zod; schemas in `packages/shared-types` stay plain Zod for web and mobile.
- **Alternatives rejected:** `extendZodWithOpenApi(z)` + `.openapi()` (patches Zod process-wide; `registry.register` requires it).

## 2026-11-10 — Existing mobile backend stays a separate Cloudflare Worker; apps/api built fresh
- **Decision:** the free-prompt Worker (`POST /v1/generate`, Cloudflare Worker + D1, in the Flutter repo `syedrazi134/prompt_engine`) stays deployed and untouched. `apps/api` is built fresh in this repo. The free-prompt flow is ported to `/api/v1` in a later sprint, then the mobile app switches over. Replaces the plan's "move the existing backend into apps/api".
- **Reason:** the Step 1 audit found the mobile backend is not Node + Express + MongoDB, and `git mv` cannot move files across repos. This keeps the live mobile route at zero risk.
- **Alternatives rejected:** copying the Worker into `apps/edge-worker/` (no history, two copies to sync); porting `/v1/generate` to Express during setup (D1 and the Workers AI binding do not exist in Node).

## 2026-11-10 — npm workspaces
- **Decision:** npm workspaces (`apps/*`, `packages/*`), one root `package-lock.json`.
- **Reason:** npm is installed and used by the mobile backend; the setup prompt keeps npm in that case.
- **Alternatives rejected:** pnpm workspaces (the plan's layout; not installed).

## 2026-11-10 — Vitest as the test runner
- **Decision:** Vitest + Supertest + `mongodb-memory-server`. Settles the plan's "Jest or Vitest".
- **Reason:** already used by the mobile backend; native ESM and TypeScript; `vitest related` powers `verify:quick`.
- **Alternatives rejected:** Jest (extra ESM/TS transform setup).

## 2026-11-10 — Smoke uses real services when configured, in-memory otherwise
- **Decision:** `npm run smoke` uses `MONGODB_URI` / `REDIS_URL` when set (CI service containers, Docker Compose locally). When unset, it starts an in-memory MongoDB replica set and an in-memory Redis, then runs the built API against them. `docker-compose.yml` is still provided for full local development.
- **Reason:** Docker is not installed on the development machine; the gate must still run end to end.
- **Alternatives rejected:** requiring Docker for every check; hosted Atlas + Redis for local checks.

## 2026-11-10 — Express 5 instead of NestJS
- **Decision:** the backend is Node.js + Express 5 in TypeScript, with an imposed module structure (model, schemas, service, controller, routes, jobs, tests per module).
- **Reason:** the Phase 1 plan chose it to match the mobile backend; Express 5 handles async errors natively.
- **Alternatives rejected:** NestJS (the context doc's default).

## 2026-11-10 — MongoDB + Mongoose instead of PostgreSQL + Prisma
- **Decision:** MongoDB 7+ running as a replica set (Atlas in staging and production), with Mongoose in strict mode and `migrate-mongo` for schema changes.
- **Reason:** the Phase 1 plan chose it to match the mobile backend. A replica set is required because orders, ledger and payouts need multi-document transactions.
- **Alternatives rejected:** PostgreSQL + Prisma (the context doc's default); standalone MongoDB (no transactions).

## 2026-11-10 — Runtime: Node.js 22 LTS, TypeScript strict
- **Decision:** Node.js 22 LTS (`.nvmrc`), TypeScript with `strict` on everywhere.
- **Reason:** LTS support; shared types with web and mobile.
- **Alternatives rejected:** plain JavaScript.

## 2026-11-10 — Zod validation and OpenAPI 3.1 from Zod
- **Decision:** every endpoint validates input with a Zod schema; the OpenAPI 3.1 contract is generated from the same schemas (`zod-to-openapi`) and served with Swagger UI at `/api/v1/docs`.
- **Reason:** one schema for validation, types and the contract web and mobile build against.
- **Alternatives rejected:** hand-written OpenAPI; separate validation library.

## 2026-11-10 — Redis + BullMQ for background work
- **Decision:** generation, media, payments webhooks, payouts, notifications and maintenance run as BullMQ jobs in a separate worker process from the same codebase. Redis also backs rate limits.
- **Reason:** slow or external work never runs in the request.
- **Alternatives rejected:** in-process work; a separate job service.

## 2026-11-10 — Testing stack
- **Decision:** Jest or Vitest (final choice in P-3) + Supertest + `mongodb-memory-server` in replica-set mode.
- **Reason:** transactions run for real in tests.
- **Alternatives rejected:** mocking the database.

## 2026-11-10 — DevOps: Docker and GitHub Actions
- **Decision:** one Docker image run as two services (`api`, `worker`); Docker Compose locally (MongoDB replica set, Redis, MinIO); GitHub Actions runs verify on every pull request; staging and production environments.
- **Reason:** context doc requirement.
- **Alternatives rejected:** none considered.

## 2026-11-10 — Modular monolith in a monorepo
- **Decision:** `apps/api` (API + worker), `apps/web` and `apps/admin` (Phase 2), `packages/shared-types`, `packages/ai-adapters`, `packages/payment-adapters`, `packages/social-adapters` (Phase 3). Modules own their collections and talk only through services.
- **Reason:** one deploy and simple operations, with boundaries that allow splitting later.
- **Alternatives rejected:** microservices.

## 2026-11-10 — Next.js only for the Phase 2 web app
- **Decision:** Next.js (React, TypeScript, Tailwind) is the web frontend and calls the same API. It hosts no backend logic.
- **Reason:** one backend for every client.
- **Alternatives rejected:** Next.js API routes as a second backend.

## 2026-11-10 — Money in integer minor units
- **Decision:** money fields end in `Minor` (integer, smallest currency unit) with a `currency` code beside them. Creator balances are derived from a double-entry ledger, never stored and edited.
- **Reason:** no floating-point errors; every balance traceable.
- **Alternatives rejected:** decimal or float amounts; stored balances.

## 2026-11-10 — Payment gateway behind an adapter, fake provider first
- **Decision:** `packages/payment-adapters` defines `createCheckout`, `verifyWebhook`, `refund`, `createPayout`; a fake provider is built first; the real gateway lands by sprint 4.
- **Reason:** Stripe does not onboard Pakistan-registered businesses; the gateway choice must not block work.
- **Alternatives rejected:** waiting for the gateway decision; Stripe.

## 2026-11-10 — Prompt body only in promptVersions
- **Decision:** prompt text lives only in immutable `promptVersions`; listings reference the version; public responses use projections that exclude `body`; a CI test scans public responses.
- **Reason:** protected delivery; listing queries cannot leak text.
- **Alternatives rejected:** copying text into listings.
