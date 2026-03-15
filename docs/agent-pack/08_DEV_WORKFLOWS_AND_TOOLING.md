---
title: "Development Workflows and Tooling"
summary: "Essential commands, scripts, and verification steps for developers."
read_when:
  - "Setting up the development environment"
  - "Preparing a pull request"
  - "Automating repetitive tasks"
---

# 08. DEV WORKFLOWS AND TOOLING

RPMA v2 provides a robust set of tools for development and verification.

## Core Commands

### Application
- `npm run dev`: Full app development (Tauri + Next.js).
- `npm run dev:types`: App dev with automatic type watch/sync.
- `npm run frontend:dev`: Next.js only (browser mode).

### Types & Contracts
- `npm run types:sync`: Manual sync of Rust types to TS.
- `npm run types:validate`: Check for drift between Rust and TS.

### Database
- `npm run backend:migration:fresh-db-test`: Test migrations on a fresh DB.
- `node scripts/detect-schema-drift.js`: Check if code matches DB schema.

## Verification Gate (Before Commit)

Always run these checks to ensure quality:

1. **Rust**: `npm run backend:check` and `npm run backend:clippy`.
2. **Frontend**: `npm run frontend:lint` and `npm run frontend:type-check`.
3. **Tests**: `make test` (backend) and `cd frontend && npm run test:ci`.

## Makefile
Centralized task runner for common operations:
- `make test`: Run all tests.
- `make build`: Full production build.
- `make clean`: Clear target and node_modules.

## CI/CD Pipeline
GitHub Actions (`.github/workflows/`) handles:
- **CI**: Runs all linting, typing, and tests on every PR.
- **Build**: Creates production installers for Windows on release.

## Troubleshooting
- **Type errors?** Run `npm run types:sync`.
- **Database locked?** Restart the dev process; check for orphaned processes.
- **Next.js issues?** Clear `.next` folder and restart.
- **Rust compile slow?** Ensure `target` folder is excluded from antivirus.
