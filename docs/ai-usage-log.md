# AI Usage Log

Required by the event rules. Log every meaningful use of AI tools during the build.

## Tools used

| Tool | Used for |
|------|----------|
| Claude (claude.ai) | Project context doc, Phase 1 backend plan, web application proposal |
| Claude Code (Opus 5.5, VS Code) | Repo audit, filling project docs, Phase 1 backend setup |

## Log

| Time | Member | Tool | What it was asked | What was accepted / changed / rejected | How it was verified |
|------|--------|------|-------------------|----------------------------------------|---------------------|
| 2026-11-10 | Syed Razi | Claude Code | Phase 1 setup prompt: read docs, fill the template docs from the project context and Phase 1 plan, audit the existing backend, create workflow/decision/history docs and CLAUDE.md | Pending review. Audit found the mobile backend is a Cloudflare Worker + D1, not Node + MongoDB as the plan assumed; team chose to leave the Worker and build `apps/api` fresh (npm workspaces, Vitest, in-memory smoke fallback) | Docs checked against `01-project-context.pdf` and the Phase 1 plan |
| 2026-11-10 | Syed Razi | Claude Code | Phase 1 setup Steps 3–6: monorepo scaffold, health module, OpenAPI, adapters, quality scripts, CI, Stop hook | Pending review on branch `phase1/setup` (uncommitted) | `npm run verify` from a clean build: 56/56 tests, smoke 200 all ok; `npm run health` pass; hook tested for exit 0 and exit 2 |

## Reflection

### Where AI helped most

### Where AI was wrong or misleading

- The Phase 1 plan assumed the mobile backend was Node + Express + MongoDB. The Step 1 audit showed it is a Cloudflare Worker + D1, so the plan's "move the existing backend into apps/api" step needs a decision.

### What we did not delegate to AI

- Choice of payment gateway, commission rate, pricing currency and launch AI tools (open questions in [requirements.md](requirements.md)).
