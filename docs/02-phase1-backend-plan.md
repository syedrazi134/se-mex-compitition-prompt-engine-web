# Prompt Engine — Phase 1 Backend Plan

Nov 10, 2026 · @Syed Razi

> Exported from the Claude Doc "Prompt Engine — Phase 1 Backend Plan" (https://claude.ai/artifact/Ctgm5ehHJC9pSoJQPafKL7) on 2026-11-10. The doc is the source of truth; re-export when it changes. The sprint-plan diagram did not survive export; see "Sprint plan" for a text version.
>
> **Local amendments (2026-11-10, Demo Readiness Plan):** this copy has been changed to match the frontend contract decisions C-1 to C-9 and the demo scope in [DECISIONS.md](DECISIONS.md). Changes: `/search` dropped in favour of `GET /listings?q=`, `GET /creators/featured` added, reviews embedded in the listing response and also paginated, a sandbox hosted-checkout page added, storage adapters added, and a demo-ordered build sequence. Copy these amendments back into the Claude Doc.

## Summary

Phase 1 delivers the shared backend in an estimated 10 weeks: one versioned REST API (`/api/v1`) that the mobile app uses now and the Next.js web app uses in Phase 2. It ends at the **API contract frozen** gate.

Decisions taken on 10 Nov 2026, replacing the context doc's defaults:

| Area | Context doc said | Decided |
| --- | --- | --- |
| Backend framework | NestJS | **Node.js + Express** (TypeScript) |
| Database | PostgreSQL + Prisma | **MongoDB** + Mongoose |
| Starting point | Open question | **Extend the mobile app's existing Node + MongoDB backend**, not a new service |
| Next.js | Web frontend, Phase 2 | Unchanged: web frontend only, calls the same API |

What this means in practice:

- Express gives no module structure out of the box, so we impose one (section 3). Every feature area is a self-contained module, as the doc's rules require.
- MongoDB must run as a **replica set** (MongoDB Atlas does this by default). Multi-document transactions, which orders, ledger and payouts depend on, do not work on a standalone instance.
- The mobile app keeps working throughout. New endpoints go under `/api/v1`; existing mobile endpoints stay until the app is moved over.
- The context doc should be updated with these choices so the team and AI assistants read the same stack.

## Tech stack

One Node.js process type serves the API; a second runs background workers from the same codebase.

| Layer | Choice | Why |
| --- | --- | --- |
| Runtime | Node.js 24 LTS, TypeScript (strict) | Shared types with web and mobile |
| HTTP framework | Express 5 | Matches the mobile backend; async errors handled natively |
| Database | MongoDB 7+ (Atlas, replica set) + Mongoose | Matches mobile; transactions need a replica set |
| Validation | Zod schemas per endpoint | One schema validates input and generates OpenAPI |
| API docs | OpenAPI 3.1 via `zod-to-openapi`, served with Swagger UI | Contract web and mobile build against |
| Auth | JWT access (15 min) + rotating refresh tokens; Passport or direct OAuth for Google, Apple, Facebook | Doc requirement |
| Queue and cache | Redis + BullMQ | Generation, payouts, emails, webhooks |
| Media storage | `StorageAdapter` in `packages/storage-adapters`: local disk in dev (served at `/media/*`), S3-compatible (S3 or Cloudflare R2) in deploy, picked by `STORAGE_DRIVER` | Samples and outputs; signed upload URLs later |
| Image processing | `sharp` in a worker | Resize on upload |
| Logging and errors | Pino logs, Sentry | Request ids across API and workers |
| Testing | Jest or Vitest, Supertest, `mongodb-memory-server` (replica-set mode) | Real transactions in tests |
| DevOps | Docker, GitHub Actions, staging + production | Doc requirement |

If the mobile backend is JavaScript rather than TypeScript, we add TypeScript to new modules only and convert old code as it is touched.

## Architecture and repo layout

The backend is a modular monolith on Express: one deployable API, split into feature modules that own their collections and talk to each other only through service functions.

Repo layout (monorepo, pnpm workspaces):

```
apps/
  api/                    Express backend (existing mobile backend moved here)
    src/
      app.ts              Express app, global middleware, /api/v1 router
      server.ts           HTTP entry point
      worker.ts           BullMQ worker entry point
      config/             env loading and validation (Zod)
      lib/                db, redis, logger, errors, money, pagination
      middleware/         auth, roles, rate limit, validate, idempotency
      modules/
        auth/  users/  workspaces/  wallet/
        prompts/  tests/  public-api/
        creators/  listings/  bundles/
        orders/  entitlements/  ledger/  payouts/  reviews/
        generation/  admin/  notifications/  media/
  web/                    Next.js web app (Phase 2)
  admin/                  Admin panel (Phase 2)
packages/
  shared-types/           Zod schemas + inferred types for web and mobile
  ai-adapters/            One adapter per AI provider
  payment-adapters/       One adapter per payment gateway
  storage-adapters/       Local disk (dev) and S3-compatible (deploy) media storage
  social-adapters/        Phase 3
docs/
```

Every module has the same shape:

```
modules/listings/
  listing.model.ts        Mongoose schema + indexes
  listing.schemas.ts      Zod request/response schemas (also feed OpenAPI)
  listing.service.ts      Business logic; the only thing other modules import
  listing.controller.ts   Thin HTTP handlers
  listing.routes.ts       Router with guards and validation
  listing.jobs.ts         Queue producers/consumers (if any)
  __tests__/
```

Rules that keep it modular:

- A module never imports another module's model. It calls that module's service.
- Controllers hold no logic; services hold no `req`/`res`.
- AI providers and payment gateways are added only as adapters in `packages/`, never as special cases in a service.

## Data model (MongoDB)

The doc's entities map to 20 collections. Rule of thumb: embed what is small, bounded and always read with its parent; reference anything that grows without limit or is queried on its own.

| Collection | Key fields | Embed / reference | Key indexes | Module |
| --- | --- | --- | --- | --- |
| users | email, name, avatar, roles[], authProviders[], locale, status | Embeds auth providers | email (unique), authProviders.providerId | Platform |
| refreshTokens | userId, tokenHash, family, expiresAt, revokedAt | Ref user | tokenHash (unique), TTL on expiresAt | Auth |
| workspaces | name, ownerId, members[{userId, role}], plan | Embeds members (bounded) | members.userId | Platform |
| prompts | ownerId or workspaceId, title, type, visibility, tags[], latestVersionId | Ref versions | workspaceId + updatedAt, text index on title + tags | Core |
| promptVersions | promptId, number, body, variables[], mediaFields{}, toolVariants[], modelSettings, createdBy | Embeds tool variants | promptId + number (unique) | Core |
| testSets / testRuns | promptId, cases[] / versionId, results[], score | Embeds cases and results | promptId | Core |
| generations | userId, promptVersionId, tool, params, status, outputMedia[], costMinor | Ref version | userId + createdAt, status | AI |
| toolConnections | userId, provider, mode, encryptedKey, status | Ref user | userId + provider (unique) | AI |
| creatorProfiles | userId, handle, bio, socialLinks[], verification, payoutDetails (encrypted) | Ref user | handle (unique), userId (unique) | Marketplace |
| listings | creatorId, promptVersionId, title, category, targetTools[], priceMinor, currency, licence, status, stats{} | Embeds sample media refs | status + category + createdAt, Atlas Search index | Marketplace |
| listingMedia | listingId, url, tool, order | Ref listing | listingId + order | Marketplace |
| bundles | creatorId, listingIds[], priceMinor, currency | References listings | creatorId | Marketplace |
| orders | buyerId, items[{listingId or bundleId, priceMinor, commissionMinor}], totalMinor, currency, status, gatewayRef, idempotencyKey | Embeds items | buyerId + createdAt, gatewayRef (unique), idempotencyKey (unique) | Marketplace |
| entitlements | buyerId, listingId, promptVersionId, sourceOrderId, grantedAt, revokedAt | Ref order | buyerId + listingId (unique) | Marketplace |
| reviews / reports | authorId, listingId, rating or reason, text, moderationStatus | Ref listing | listingId + authorId (unique for reviews) | Marketplace |
| ledgerEntries | txnId, account, direction, amountMinor, currency, refType, refId | Ref order / payout | txnId, account + createdAt | Marketplace |
| payouts | creatorId, amountMinor, currency, status, method, gatewayRef | Ref creator | creatorId + status | Marketplace |
| wallets / creditTransactions | userId, balanceMinor / amountMinor, type, refId | Ref user | userId (unique) / userId + createdAt | Platform |
| notifications | userId, type, payload, readAt | Ref user | userId + readAt, TTL after 90 days | Platform |
| auditLogs | actorId, action, target, meta, at | Ref actor | target + at | Platform |

Schema rules:

- `promptVersions` are immutable once saved. Edits create a new version; rollback points `latestVersionId` back.
- Prompt `body` lives only in `promptVersions`. Listings reference the version and never copy its text, so listing queries cannot leak it.
- Money fields end in `Minor` (integer, smallest unit) with a `currency` code beside them, as the doc requires.
- Every collection has `createdAt` / `updatedAt` and Mongoose `strict` mode on. Schema changes ship as migration scripts (`migrate-mongo`) in the repo.

## Payments, ledger and entitlements

Money is the riskiest part of a MongoDB build, so every balance change runs inside a MongoDB transaction and every external event is idempotent.

Checkout flow:

1. `POST /checkout` validates the cart, prices it server-side, and creates an `orders` document with status `pending` and a client-supplied `Idempotency-Key`.
2. The payment adapter creates a hosted checkout session; the client is redirected. No card data touches our servers. For the demo, `FakePaymentAdapter` serves a sandbox hosted page at `/sandbox/checkout/:sessionId`, labelled TEST MODE, with Approve and Decline buttons. It calls the webhook with a signature, just as a real gateway would.
3. The gateway calls our webhook. We verify its signature, look up the order by `gatewayRef`, and ignore repeats.
4. In **one transaction**: mark the order `paid`, insert `entitlements`, write the balanced ledger entries, and add an audit log entry.
5. A queued job sends receipts and notifies the creator.

Double-entry ledger: each sale writes entries that sum to zero per `txnId`.

| Event | Debit | Credit |
| --- | --- | --- |
| Sale of 1,000 (minor units), 20% commission | gateway_clearing 1,000 | creator:{id} 800, platform_revenue 200 |
| Refund of that sale | creator:{id} 800, platform_revenue 200 | gateway_clearing 1,000 |
| Payout of 800 | creator:{id} 800 | payouts_outstanding 800 |

The 20% figure is a placeholder; the commission rate is still an open question. A creator's balance is the sum of their ledger account, never a stored number that code edits directly. A nightly job re-sums every account and flags any `txnId` that does not balance.

Entitlements: the prompt text endpoint returns `body` only when the requester owns the prompt, is in its workspace, or holds an unrevoked entitlement. A refund revokes the entitlement in the same transaction.

Payment gateway: the adapter interface (`createCheckout`, `verifyWebhook`, `refund`, `createPayout`) is built in week 1 with a fake provider, so work is not blocked while the gateway is chosen. Stripe does not onboard Pakistan-registered businesses, so the shortlist is local options for PKR (for example JazzCash, Easypaisa, PayFast) plus an international processor for USD; this needs confirming against each provider's current terms.

## API surface (Phase 1)

All Phase 1 groups from the context doc ship under `/api/v1`; Social is Phase 3 and is left out.

| Group | Endpoints | Guard | Sprint |
| --- | --- | --- | --- |
| Auth | POST /auth/register, /auth/login, /auth/refresh, /auth/logout, /auth/oauth/:provider | Public + rate limit | 1 |
| Users and workspaces | GET/PATCH /me, /workspaces, /workspaces/:id/members | User; workspace role | 1 |
| Wallet | GET /wallet, POST /wallet/top-up | User | 4 |
| Prompts | /prompts, /prompts/:id/versions, /prompts/:id/diff, /prompts/:id/rollback | Owner or workspace role | 2 |
| Tests | /test-sets, POST /test-sets/:id/run | Owner or workspace role | 2 |
| Prompt API (public) | POST /run/:promptId | Workspace API key + rate limit | 2 |
| Marketplace browse | GET /listings (search via `q` and filters; no `/search`), /listings/:id (embeds latest 3 reviews and `ratingBreakdown`), /listings/:id/reviews, /creators/:handle, /creators/featured | Public | 3 |
| Creator tools | /creator/profile, /creator/listings, /creator/bundles, /creator/stats | Creator role | 3 |
| Orders and payments | POST /checkout, GET /orders, GET /entitlements, POST /webhooks/payments/:gateway | Buyer; webhook signature | 4 |
| Payouts | GET /creator/balance, POST /creator/payouts | Creator role | 4 |
| Reviews and reports | /listings/:id/reviews, POST /reports | Verified buyer for reviews | 3 |
| Generation | POST /generations, GET /generations/:id, /tool-connections | User + rate limit | 5 |
| Admin | /admin/users, /admin/listings/:id/approve, /admin/payouts, /admin/reports | Admin role | 4 |

Conventions for every endpoint:

- Errors use one shape: `{ error: { code, message, details } }` with correct HTTP status.
- Successful responses are bare objects; lists are `{ items, nextCursor }` with cursor pagination (`?cursor=&limit=`), not page numbers.
- Money is integer USD cents; PKR appears only as server-computed `displayPrices.PKR` (rate from `PKR_PER_USD`).
- Writes that cost money (`/checkout`, `/creator/payouts`, `/wallet/top-up`, `/generations`) require an `Idempotency-Key` header.
- Generation status reaches clients through polling and server-sent events; outside apps get webhooks.

## Background jobs and AI adapters

Anything slow or external runs in a BullMQ worker, never in the request.

| Queue | Job | Retries |
| --- | --- | --- |
| generation | Call the AI provider, poll async video jobs, store output, charge credits | 3, exponential backoff |
| media | Resize uploads with `sharp`, write CDN variants | 3 |
| payments | Process gateway webhooks after the fast 200 response | 5 |
| payouts | Send approved payouts through the payment adapter | Manual retry only |
| notifications | Email and mobile push | 5 |
| maintenance | Nightly ledger reconciliation, expired-token cleanup | 1 |

AI adapter interface in `packages/ai-adapters`:

```ts
interface AiAdapter {
  id: string;                       // 'openai-image', 'video-x', ...
  kinds: ('text' | 'image' | 'video')[];
  formatPrompt(version: PromptVersion): ProviderPayload; // applies tool variant
  start(payload, creds): Promise<{ jobRef: string; done: boolean; output?: Output }>;
  poll(jobRef, creds): Promise<{ status: JobStatus; output?: Output }>;
  estimateCost(payload): number;    // minor units, for credit checks
}
```

- `creds` come from platform keys (credits mode) or the user's decrypted `toolConnections` key (bring-your-own-key).
- Phase 1 ships one or two image tools and one video tool, as the doc says. Which ones is still open; each must have an official API that allows commercial use.
- Tools with no API use copy-out mode: `formatPrompt` only, no `start`.

## Security and prompt protection

The context doc's security rules carry over unchanged; these are the Express and MongoDB specifics that enforce them.

- **Secrets at rest:** API keys, social tokens and payout details are encrypted with AES-256-GCM (key from env or a KMS) before saving, and Mongoose `select: false` keeps them out of every query unless asked for.
- **Access checks:** an `authorize(role, resourceLoader)` middleware on every route; workspace-scoped queries always filter by `workspaceId` in the service layer, so a missing check fails closed.
- **NoSQL injection:** Zod validation on every input plus `express-mongo-sanitize`-style stripping of `$` and `.` keys; never pass `req.body` straight into a query.
- **Rate limits:** `rate-limiter-flexible` on Redis for login, checkout, generation and the public Prompt API.
- **Headers and CORS:** `helmet`, CORS allow-list for the web app, admin panel and known origins.
- **Prompt text:** listing, search and creator-page responses use explicit projections that exclude `body`. A test in CI fails if any public endpoint's response contains a prompt body.
- **Leak tracing:** when an entitled buyer fetches a prompt, the response embeds a hidden buyer marker (for example zero-width characters) tied to the entitlement id.
- **Audit:** admin actions, payouts, refunds and role changes write to `auditLogs`.

## Sprint plan (10 weeks)

The work runs in five two-week sprints, ordered so each one unblocks the next: accounts first, then prompts, then what is sold, then the money, then generation.

Text version of the sprint diagram (reconstructed from the API table's sprint column; check against the doc's diagram):

| Sprint | Weeks | Scope |
| --- | --- | --- |
| 1 | 1–2 | Setup and audit, auth, users, workspaces, roles; payment adapter interface + fake provider |
| 2 | 3–4 | Prompts, versions, diff, rollback, test sets, public Prompt API |
| 3 | 5–6 | Creators, listings, bundles, search, reviews and reports |
| 4 | 7–8 | Checkout, orders, entitlements, ledger, payouts, wallet, admin |
| 5 | 9–10 | Generation framework + first AI tools, load test, **API contract frozen** gate |

Money flows sit in sprint 4 so the payment gateway decision has eight weeks to land; until then checkout builds against the fake adapter.

**Demo build order (supersedes the sprint order for the event):** Step 0 baseline and decisions → Step 1 auth, users, workspaces and wallet (100 free credits) → Step 2 seed data and storage adapters → Step 3 marketplace, creator tools, reviews and minimal admin approve or reject → Step 4 checkout, orders, entitlements and ledger → Step 5 generation with one real image provider → Step 6 Playwright e2e of the demo path and polish → Step 7 deploy to staging. Sprint 2 (prompts, versions, tests and the public Prompt API) moves after the event.

## Testing, DevOps and conventions

No endpoint is done until it has validation, an auth guard, an OpenAPI entry and a passing test.

- **Tests:** unit tests per service; API tests per endpoint group with Supertest against `mongodb-memory-server` in replica-set mode, so transactions run for real. Money flows get scenario tests: purchase, duplicate webhook, refund, payout.
- **CI (GitHub Actions):** lint, type-check, tests, OpenAPI diff on every pull request. A breaking change to the published contract fails the build after the freeze gate.
- **Environments:** local (Docker Compose: Mongo replica set, Redis, MinIO for S3), staging, production. Atlas for staging and production Mongo.
- **Deploy:** one Docker image, run as two services (`api` and `worker`). Migrations run before the new version starts.
- **Observability:** request id on every log line and job; Sentry for errors; health endpoints for API, Mongo and Redis.
- **Performance targets** from the doc: reads under 300 ms p95; generation status updates within 2 seconds. Load-test key reads in sprint 5.
- **Conventions:** secrets only from env; money in minor units with currency; Conventional Commits; one pull request per endpoint group.

## Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Existing mobile backend has no module structure or tests | Sprint 1 audit; wrap old routes, build new code in modules, add tests before touching old code |
| Mongo runs standalone, so transactions fail | Confirm replica set (Atlas) in week 1; CI tests use replica-set mode |
| Ledger drift from a missed transaction | Balances derived from ledger only; nightly reconciliation job |
| Payment gateway not chosen by sprint 4 | Adapter with a fake provider from week 1; checkout built against the interface |
| Prompt text leaks through a public endpoint | Projections exclude `body`; CI test scans public responses |

To answer before kick-off:

- [ ] Share the mobile backend repo: Express version, JS or TS, Mongo version and hosting, current auth method
- [ ] Payment gateway(s) for PKR and international buyers
- [ ] Commission rate, payout schedule and minimum
- [ ] Pricing currency: PKR, USD or both
- [ ] First image and video tools (official API + commercial use confirmed)
- [ ] Generation billing at launch: credits, bring-your-own-key, or both
- [ ] Who can sell at launch: open sign-up or approved creators
- [ ] Licence types on listings
- [ ] Backend team size for Phase 1 (the 10-week estimate assumes 2 backend developers)
