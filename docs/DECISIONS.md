# Decision log

Newest first. Never undo a decision here without adding a new entry that replaces it. Format: date, decision, reason, alternatives rejected.

## 2026-11-10 — Local start without Docker
- **Decision:** `npm run start:local` (`scripts/start-local.mjs`) runs the built API with the repo-root `.env`. For each of `MONGODB_URI` and `REDIS_URL` that is unset, it substitutes the in-memory MongoDB replica set or the Redis protocol stub that smoke already uses, and prints a warning naming each substitute. `npm start` in `apps/api` loads `../../.env` when the file exists, and hosts still set variables directly.
- **Reason:** the dev machine has no Docker and no Redis, and its MongoDB service runs standalone. Without this, the API could not start locally at all.
- **Limits:** the stub only answers PING and INFO. A real `REDIS_URL` is required before BullMQ lands (Step 5), and production and CI never use substitutes.
- **Alternatives rejected:** a fallback inside the API (would risk a stub reaching production); requiring Docker or WSL (neither available on the dev machine).

## 2026-11-10 — Demo scope: real code on the demo path, sandboxed money and external accounts
- **Decision:** Every step of the scripted demo path (sign up → browse/search → listing → checkout → library → generate → creator onboarding and listing → admin approve → creator dashboard) runs against the live API and database. Payments use `FakePaymentAdapter` behind a simulated hosted checkout labelled Test mode. Generation uses one real image provider behind `AiAdapter`, with `FakeAiAdapter` as fallback. Media goes through a `StorageAdapter`. The admin surface is listing approve and reject only. Payout requests return "Coming soon". The prompt core (editor, playground, versions, tests) and social posting are not on the demo path. Every feature is either fully live or visibly marked "Coming soon"; no half-wired screens.
- **Reason:** The committee judges a working end-to-end product. Sandboxing only the money and external accounts keeps the demo safe and repeatable without faking the core flows.
- **Alternatives rejected:** A fixture-backed UI demo (not "fully functional"); a real payment gateway before the event (gateway still undecided, onboarding takes too long).

## 2026-11-10 — Per-feature live flags replace NEXT_PUBLIC_DEMO_MODE
- **Decision:** The web app has one switch per slice: `NEXT_PUBLIC_LIVE_AUTH`, `NEXT_PUBLIC_LIVE_MARKETPLACE`, `NEXT_PUBLIC_LIVE_CREATOR`, `NEXT_PUBLIC_LIVE_CHECKOUT` (also covers the library, which reads `/entitlements`) and `NEXT_PUBLIC_LIVE_GENERATION`. Each defaults to `false`, which shows labelled sample data or a non-submitting preview. `apps/web/src/lib/features.ts` reads them by literal name, because Next.js only inlines `NEXT_PUBLIC_*` variables that way.
- **Reason:** Backend slices land one at a time. A single global switch made it all-or-nothing, so a finished slice could not go live until every other slice was done.
- **Alternatives rejected:** Keep `NEXT_PUBLIC_DEMO_MODE`; fall back to fixtures automatically when the API fails (hides real errors).

## 2026-11-10 — Frontend–backend contract decisions (C-1 to C-9)
Settled before the backend slices are built. The finished frontend is kept as-is wherever possible. [frontend-api-contract.md](frontend-api-contract.md) and [02-phase1-backend-plan.md](02-phase1-backend-plan.md) are updated to match.
- **C-1 Search:** `GET /listings?q=&category=&tool=&minPrice=&maxPrice=&rating=&licence=&sort=&cursor=&limit=` is the only search endpoint. `/search` is dropped from the plan. *Rejected:* a separate `/search` route, which would duplicate the listing query and DTO.
- **C-2 Reviews:** `GET /listings/:id` embeds the latest 3 reviews and a `ratingBreakdown`. `GET /listings/:id/reviews` paginates the rest with `{ items, nextCursor }`. *Rejected:* only inline (unbounded payload); only separate (extra round trip on the most visited page).
- **C-3 Checkout idempotency:** the web app creates one `Idempotency-Key` when a checkout attempt starts, keeps it in component state and `sessionStorage`, and reuses it on every retry until the attempt succeeds or is cancelled. *Rejected:* one key per click, which lets a retry create a second order.
- **C-4 Generation idempotency:** `POST /generations` requires `Idempotency-Key`, with one key per Generate click. *Rejected:* no key, which lets a network retry charge credits twice.
- **C-5 Token refresh:** on `401` with code `token_expired`, `request()` refreshes once through `/api/auth/session`. Concurrent requests share one in-flight refresh promise. The original request is retried once, and a second failure signs the user out. *Rejected:* a timer-based refresh (breaks across sleep and tabs); forcing sign-in every 15 minutes.
- **C-6 Response envelope:** the backend returns bare objects, and lists use `{ items, nextCursor }` (plus an optional `total`). The `{ data }` unwrap fallback in `api.ts` is removed in Step 1. *Rejected:* a `{ data }` envelope, which adds nothing over HTTP status and the error shape.
- **C-7 Denormalised public fields:** `Listing` stores `rating`, `reviewCount`, `sampleCount` and `salesCount`; `CreatorProfile` stores `followers` and `verified`. These are updated on write. Public DTOs come from an allow-list mapper that never includes the prompt body, and a leak test covers every public route. *Rejected:* aggregating on every read (too slow for `GET /listings`); spreading documents into responses (risks leaking the body).
- **C-8 Currency:** prices are stored as integer USD cents with `currency: "USD"`. PKR is display-only: the server returns `displayPrices.PKR`, computed from a configured rate (`PKR_PER_USD`, default 280). `ListingCardData.currency` narrows to `"USD"`. *Rejected:* storing prices in both currencies, which drift apart and complicate the ledger.
- **C-9 Featured creators:** `GET /creators/featured` is kept and added to the plan. It returns verified creators sorted by `salesCount`, limit 6. *Rejected:* dropping it, which would change the finished home page.

## 2026-11-10 — Start the web frontend against a documented API contract
- **Decision:** Build the Next.js web app while backend feature work proceeds independently. The frontend consumes the planned `/api/v1` routes and response shapes in [frontend-api-contract.md](frontend-api-contract.md); it does not depend on reading or changing backend implementation. Local fixture data is available only through an explicit preview flag.
- **Reason:** Frontend and backend work can proceed in parallel without inventing opaque client-side assumptions. A written contract gives both workstreams a concrete integration target.
- **Alternatives rejected:** Wait for backend routes to land before starting the UI; silently replace API failures with sample content.

## Open items (not decided)

### O-1. Linking anonymous mobile users to accounts
- **Context:** mobile users today are anonymous (random install ID, free daily prompts on the Cloudflare Worker). Phase 1 adds accounts.
- **Open:** whether and how an install ID's history is linked to an account on sign-up (guest-to-account linking). Not built in Sprint 1.

## 2026-11-10 — Smoke reports the mode of every dependency; CI requires real services
- **Decision:** `npm run smoke` prints each dependency with its mode: `real`, `in-memory` (real mongod binary, throwaway data) or `stub` (in-process Redis protocol stub). A stubbed dependency is reported as `stub`, never `ok`. `SMOKE_REQUIRE_REAL=1` fails smoke unless every dependency is real; CI sets it and runs MongoDB (replica set via `docker run`) and Redis (service container) for real. `/api/v1/health` is unchanged and only ever reports real connection status; stubs never enter a production code path.
- **Reason:** the first local smoke reported "redis ok" while talking to a stub, which overstated what was checked.
- **Alternatives rejected:** dropping the local fallback (smoke would be unusable without Docker); a test-mode flag in the API (puts stub logic into production code).
- **Amends:** "Smoke uses real services when configured, in-memory otherwise" (below).

## 2026-11-10 — Node.js 24 LTS replaces Node.js 22
- **Decision:** target Node.js 24 LTS everywhere: `.nvmrc` = 24, `engines.node` `>=24.0.0` in every `package.json`, CI on 24, `@types/node` 24.
- **Reason:** Node 24 is the current LTS and is what the development machine runs, so local checks and CI use the same runtime.
- **Alternatives rejected:** staying on Node 22 (dev and CI would differ).
- **Replaces:** "Runtime: Node.js 22 LTS, TypeScript strict" (below); the TypeScript strict part still stands.

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
