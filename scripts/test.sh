#!/usr/bin/env bash
# Entry point the competition template's CI expects. Installs exactly from the lockfile and runs
# the full verify gate (install check, build, typecheck, lint, test, smoke).
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm run verify
