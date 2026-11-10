# Requirements

Sources: [01-project-context.pdf](01-project-context.pdf) and [02-phase1-backend-plan.md](02-phase1-backend-plan.md). This file is the requirements view of those docs; when they disagree, the Phase 1 plan wins for stack choices and the context doc wins for product scope.

## Problem statement

Many creators on Instagram and TikTok promote and sell image and video prompts through reels and ads, but sell them through DMs, link-in-bio pages and file downloads. Buyers get no preview, no protection against fakes and no way to run a prompt in their AI tool directly. The Prompt Engine mobile app helps people write prompts, but has no marketplace, no accounts shared with a web app, and no integrations with AI generation tools or social platforms.

Prompt Engine Web adds a **prompt marketplace** (storefronts, protected delivery, payouts) and **integrations** (run a prompt in an AI tool, publish the result to social media). It is built backend first: one shared backend serves the web app, the existing mobile app and outside integrations.

## Users

One account can hold several roles: a creator who sells prompts is also a buyer.

| Role | Who they are | Main things they do |
|------|--------------|---------------------|
| Buyer | Content creators, marketers, designers, hobbyists | Browse, preview, buy prompts; generate with AI tools; post to social media |
| Creator (seller) | Prompt sellers, often already promoting on Instagram | Build a storefront, list prompts with sample outputs, set prices, track sales, get paid |
| Prompt engineer | Developers and product teams | Use the library, playground, versions, test sets and Prompt API |
| Team member | Staff inside a workspace | Work on shared prompts with owner, editor or viewer rights |
| Admin / moderator | Our staff | Approve creators and listings, handle reports and refunds, manage payouts and fees |

## Functional requirements

Priority: **Must** = Phase 1 backend scope. **Should** = Phase 1 if time allows. **Stretch** = later phases (listed so the API leaves room for them).

| ID | Requirement | Priority (Must / Should / Stretch) | Status |
|----|-------------|------------------------------------|--------|
| FR-01 | Users register and log in with email/password; JWT access token (15 min) + rotating refresh token; logout revokes the refresh token family | Must | Not started |
| FR-02 | Social sign-in with Google, Apple and Facebook (OAuth) | Should | Not started |
| FR-03 | Users read and update their profile (`/me`); one account holds several roles | Must | Not started |
| FR-04 | Workspaces with members as owner, editor or viewer; workspace data never visible outside the workspace | Must | Not started |
| FR-05 | Prompt library: create, list, search, tag and organise prompts owned by a user or a workspace | Must | Not started |
| FR-06 | Prompt versions are immutable; users view history, diff two versions and roll back | Must | Not started |
| FR-07 | Media prompt fields (subject, style, camera, lighting, aspect ratio, duration, negative prompt, seed) and per-tool variants on a version | Must | Not started |
| FR-08 | Test sets: store inputs and expected outputs, run them against a version, store scores | Must | Not started |
| FR-09 | Public Prompt API: `POST /run/:promptId` with variables, authenticated by a per-workspace API key and rate limited | Must | Not started |
| FR-10 | Creator profile with unique shop handle, bio, social links and encrypted payout details | Must | Not started |
| FR-11 | Listings: title, category (image, video, text), target tools, sample outputs, price in minor units + currency, licence, status; admin approval before going live | Must | Not started |
| FR-12 | Bundles of listings at one price | Must | Not started |
| FR-13 | Marketplace browse and search with filters by tool, category and style; trending and new | Must | Not started |
| FR-14 | Checkout through a hosted payment gateway; server-side pricing; `Idempotency-Key` required | Must | Not started |
| FR-15 | Gateway webhook: verify signature, ignore repeats, and in one transaction mark the order paid, grant entitlements, write balanced ledger entries and an audit entry | Must | Not started |
| FR-16 | Protected delivery: prompt text returned only to its owner, its workspace or a buyer with an unrevoked entitlement | Must | Not started |
| FR-17 | Refunds revoke the entitlement and reverse the ledger entries in the same transaction | Must | Not started |
| FR-18 | Creator balance derived from the double-entry ledger; payout requests; nightly reconciliation | Must | Not started |
| FR-19 | Reviews from verified buyers only; reports on listings; moderation queue | Must | Not started |
| FR-20 | Wallet and credits for AI generation; top-up | Must | Not started |
| FR-21 | AI generation framework: adapter interface, queued jobs with status by polling and server-sent events, one or two image tools and one video tool | Must | Not started |
| FR-22 | Tool connections: platform credits or bring-your-own API key (encrypted at rest) | Should | Not started |
| FR-23 | Admin APIs: users, listing approval, payouts, reports, fees | Must | Not started |
| FR-24 | OpenAPI 3.1 contract generated from Zod schemas, served at `/api/v1/docs` | Must | Done (framework; grows per endpoint) |
| FR-25 | Health endpoint `GET /api/v1/health` reporting API, MongoDB and Redis status | Must | Done |
| FR-26 | Existing mobile app endpoint (`POST /v1/generate`, free daily prompts) keeps working throughout Phase 1 | Must | In place (Cloudflare Worker) |
| FR-27 | Mobile app connected to the new marketplace endpoints | Should | Not started |
| FR-28 | Creator subscriptions | Stretch | Not started |
| FR-29 | Social account connection, publish and schedule, listing share, link tracking (Phase 3) | Stretch | Not started |
| FR-30 | Creator promo kit: reel covers, captions, short links (Phase 3) | Stretch | Not started |
| FR-31 | Web app UI, creator storefront and dashboard, admin panel (Phase 2) | Stretch | Not started |

## Non-functional requirements

<!-- Every NFR needs a measurable target and a way to measure it. -->

| ID | Category | Requirement | Target | How measured | Result |
|----|----------|-------------|--------|--------------|--------|
| NFR-01 | Performance | Read endpoints respond quickly | p95 < 300 ms | Load test of key reads (sprint 5) | Not measured |
| NFR-02 | Performance | Generation jobs report status changes promptly | Status visible ≤ 2 s after change | Job timing test with fake adapter | Not measured |
| NFR-03 | Security | Prompt text never appears in listing, search or creator-page responses | 0 occurrences | CI test scans every public endpoint response for prompt bodies | Not measured |
| NFR-04 | Security | Third-party API keys, social tokens and payout details encrypted at rest and never returned after saving | AES-256-GCM; 0 leaks | Unit test on encryption; response-shape tests | Not measured |
| NFR-05 | Security | Role-based access check on every endpoint; no cross-workspace reads | 100% of routes guarded | Route audit test + cross-workspace API tests | Not measured |
| NFR-06 | Security | Rate limits on login, checkout, generation and the public Prompt API | Limit enforced, 429 returned | API tests | Not measured |
| NFR-07 | Correctness | Ledger balances for every transaction | Sum of entries per `txnId` = 0 | Scenario tests + nightly reconciliation job | Not measured |
| NFR-08 | Reliability | Payment webhooks are idempotent | Duplicate webhook → no double entitlement or ledger entry | Scenario test | Not measured |
| NFR-09 | Data | Money stored as integers in minor units with a currency code | 100% of money fields | Schema review + lint on `*Minor` fields | Not measured |
| NFR-10 | Quality | Every endpoint has Zod validation, auth guard, OpenAPI entry and a test | 100% | `verify` script in CI | Not measured |
| NFR-11 | Quality | Clean build and lint | 0 type errors, 0 lint warnings | `npm run verify` in CI on every PR | Not measured |
| NFR-12 | Security | No high or critical dependency vulnerabilities | 0 high/critical | `npm run health` (audit) | Not measured |
| NFR-13 | Compatibility | Existing mobile route keeps working | 0 breaking changes to `POST /v1/generate` | Existing Worker test suite stays green | Not measured |

## Constraints

- Stack (decided 2026-11-10): Node.js 24 LTS, TypeScript strict, Express 5, MongoDB replica set + Mongoose, Zod + OpenAPI 3.1, Redis + BullMQ, Docker, GitHub Actions. See [DECISIONS.md](DECISIONS.md).
- MongoDB must run as a replica set; orders, ledger and payouts need multi-document transactions.
- Payment gateway must work for a Pakistan-based business and support international buyers. Stripe does not onboard Pakistan-registered businesses.
- Never store card details; hosted checkout only.
- Only official, documented APIs for AI tools and social platforms. No scraping or unofficial automation.
- Secrets only from environment variables.
- The existing mobile app must keep working throughout.

## Assumptions

- Phase 1 takes about 10 weeks with 2 backend developers.
- MongoDB Atlas hosts staging and production.
- A fake payment adapter is enough to build checkout until the gateway is chosen (by sprint 4).
- 20% commission is a placeholder until the rate is decided.

## Open questions

- Payment gateway(s) for PKR and international buyers (shortlist: JazzCash, Easypaisa, PayFast + an international processor).
- Commission rate, payout schedule and minimum.
- Pricing currency: PKR, USD or both.
- First image and video AI tools (official API + commercial use confirmed).
- Generation billing at launch: credits, bring-your-own-key, or both.
- Who can sell at launch: open sign-up or approved creators.
- Licence types on listings (personal, commercial, extended).

## Out of scope

- Phase 1: web frontend, admin panel UI (Phase 2); social posting and scheduling, more AI tools, promo kit (Phase 3); analytics, prompt optimizer, recommendations, affiliate links, featured placements (Phase 4).
- Storing card data.
- Any AI tool or social platform without an official API.
