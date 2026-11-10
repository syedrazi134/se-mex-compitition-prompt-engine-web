# Prompt Engine Web — backend

Before any change, read docs/README.md and follow docs/WORKFLOW.md. No task is finished until the Safe Close step passes.

@docs/WORKFLOW.md
@docs/02-phase1-backend-plan.md
@docs/DECISIONS.md

## What this is
Shared backend (Phase 1) for the Prompt Engine mobile app, the Phase 2 Next.js web app and outside integrations. Stack: Node.js 24 LTS, TypeScript strict, Express 5, MongoDB replica set + Mongoose, Zod + OpenAPI 3.1, Redis + BullMQ, Docker, GitHub Actions. Next.js is only for the Phase 2 web app.

## Commands (repo root)
- Install: `npm ci`
- Local services: `docker compose up -d` (MongoDB replica set, Redis, MinIO)
- Dev: `npm run dev`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint` (zero warnings)
- Test: `npm run test`
- Smoke: `npm run smoke`
- Verify (full gate): `npm run verify`
- Verify quick (hook): `npm run verify:quick`
- Health (deps): `npm run health`

## Non-negotiable rules
- Modules own their collections and talk only through services. Never import another module's model.
- AI providers, payment gateways and social platforms exist only as adapters in packages/. No special cases in core code.
- Every endpoint has Zod validation, an auth guard, an OpenAPI entry and a test.
- Money is an integer in minor units (`*Minor` fields) with a currency code beside it.
- Secrets come only from env. Never in code, logs or commits.
- Prompt text is never returned by public or listing endpoints (listings, search, creator pages).
- Never break existing mobile routes. The live one is `POST /v1/generate` on the Cloudflare Worker in the Flutter repo.
- New endpoints go under /api/v1.
- Pin exact versions of any dependency you add.

## Module shape
`modules/<name>/` holds `<name>.model.ts`, `.schemas.ts`, `.service.ts`, `.controller.ts`, `.routes.ts`, `.jobs.ts` (if any) and `__tests__/`. Controllers hold no logic; services never touch `req`/`res`.

## When in doubt
Stop and ask when code conflicts with the docs, or before anything touching data, auth or mobile routes.
