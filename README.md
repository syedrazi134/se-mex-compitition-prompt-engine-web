# Prompt Engine Web

> AI-Powered SE-MAX · CUI Tech Fest FA'26 · Team: <Team Name>

## What it does

Prompt Engine Web is the web version of the Prompt Engine mobile app. It adds a **prompt marketplace** where creators sell image and video prompts with protected delivery and payouts, and **integrations** that run a prompt in an AI tool and publish the result to social media. One shared backend serves the web app, the mobile app and outside developers.

## Problem and user

Creators on Instagram and TikTok sell prompts through DMs, link-in-bio pages and file downloads, with no storefront, no protection and no payouts. Buyers (content creators, marketers, designers) can't preview, trust or run what they buy. Prompt engineers and teams need a versioned, testable prompt library with an API. Prompt Engine Web gives creators a storefront and gives buyers previews, reviews and one-click generation.

## Live deployment

- **URL / install link:**
- **Platform:** Web API (Phase 1); web app in Phase 2

## Judge quick start (under 5 minutes)

<!-- Exact steps a judge follows to use the product without your laptop. -->

1.
2.
3.

## Test accounts

| Role | Username / email | Password |
|------|------------------|----------|
|      |                  |          |

<!-- Test accounts only. Never real credentials. -->

## Run locally

### Prerequisites

- Node.js 24 LTS (see `.nvmrc`) and npm
- Docker for local MongoDB replica set, Redis and MinIO. Optional: without it, tests and `npm run smoke` start an in-memory MongoDB replica set themselves.

### Setup

```sh
npm ci
cp .env.example .env      # fill in local values
docker compose up -d      # MongoDB replica set, Redis, MinIO
```

### Environment variables

<!-- List variable names only. Values go in a local .env file (see .env.example). -->

See `.env.example` for the full list (names only, no values).

### Run

```sh
npm run dev               # API on http://localhost:<PORT>/api/v1
```

API docs: `/api/v1/docs`. Health: `/api/v1/health`.

### Run tests

```sh
npm run test
npm run verify            # full check: build, typecheck, lint, test, smoke
```

## Known limitations

- Phase 1 is backend only; the web UI comes in Phase 2.
- Payment gateway and AI tools are not chosen yet; fake adapters stand in.
- The mobile app's free-prompt endpoint still runs on its own Cloudflare Worker.

## Documentation

Start with [docs/README.md](docs/README.md) for the reading order.

- [Project context](docs/01-project-context.pdf)
- [Phase 1 backend plan](docs/02-phase1-backend-plan.md)
- [Working sequence](docs/WORKFLOW.md)
- [Decisions](docs/DECISIONS.md)
- [History](docs/HISTORY.md)
- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Testing](docs/testing.md)
- [AI usage log](docs/ai-usage-log.md)
- [Judge checks](docs/judge-checks.md)

## Team

| Name | Role |
|------|------|
| Syed Razi |      |
