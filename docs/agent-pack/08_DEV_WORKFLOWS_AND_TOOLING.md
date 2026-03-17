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

| Command | Purpose |
|---------|---------|
| `npm run dev` | Full app development (Tauri + Next.js) |
| `npm run dev:types` | App dev with automatic type watch |
| `npm run dev:strict` | Full type check before Tauri dev |
| `npm run build` | Production build (syncs types first) |
| `npm run frontend:dev` | Next.js only (browser mode) |

### Type Sync & Validation

| Command | Purpose |
|---------|---------|
| `npm run types:sync` | Export Rust types to TypeScript |
| `npm run types:validate` | Check for duplicate type definitions |
| `npm run types:drift-check` | Full type drift verification |

### Backend

| Command | Purpose |
|---------|---------|
| `npm run backend:build` | Build Rust backend |
| `npm run backend:check` | Cargo check |
| `npm run backend:clippy` | Run Clippy linter |
| `npm run backend:fmt` | Format Rust code |
| `npm run backend:architecture-check` | Enforce ADR-001/002/005|

### Frontend

| Command | Purpose |
|---------|---------|
| `npm run frontend:lint` | Run ESLint |
| `npm run frontend:type-check` | TypeScript type check |
| `npm run frontend:guard` | Run TypeScript + ESLint + Jest |
| `npm run frontend:test:ci` | Run Jest tests for CI |

### Database

| Command | Purpose |
|---------|---------|
| `npm run backend:migration:fresh-db-test` | Test migrations on fresh DB |
| `node scripts/detect-schema-drift.js` | Check schema drift |

### Domain Scaffolding

```bash
npx tsx scripts/scaffold-domain.ts <domain_name> [flags]
```

| Flag | Effect |
|------|--------|
| `--crud` | Add CRUD handlers + request structs |
| `--admin-only` | Wrap IPC handlers with Admin enforcement |
| `--no-frontend` | Skip frontend scaffolding |
| `--no-tests` | Skip test stub generation |
| `--dry-run` | Preview without writing |

## Makefile Targets

| Target | Command | Purpose |
|--------|---------|---------|
| `make build` | `cargo build` | Build the project |
| `make test` | `cargo test` | Run all backend tests |
| `make test-commands` | Specific command tests | Run all command tests |
| `make lint` | `cargo clippy -- -D warnings` | Run Clippy |
| `make format` | `cargo fmt` | Format Rust code |
| `make clean` | `cargo clean` | Clean build artifacts |

## Test Commands

### Backend Tests

| Command | Purpose |
|---------|---------|
| `cd src-tauri && cargo test <domain>` | Test specific domain |
| `cd src-tauri && cargo test --test integration` | Run integration harness |
| `cd src-tauri && cargo test --test domain_invariants` | Domain invariant tests |
| `cd src-tauri && cargo test --test auth_commands_test` | Auth command tests |
| `make test` | Run all backend tests |

### Frontend Tests

| Command | Purpose |
|---------|---------|
| `cd frontend && npm run test` | Run Jest tests |
| `cd frontend && npm run test:ci` | Run tests for CI |
| `cd frontend && npm run test:e2e` | Run Playwright E2E |
| `cd frontend && npm run test:e2e:ui` | Playwright with UI |

## Verification Gate (Before Commit)

```bash
# 1. Backend checks
npm run backend:check
npm run backend:clippy
make test

# 2. Frontend checks
npm run frontend:lint
npm run frontend:type-check
cd frontend && npm run test:ci

# 3. Type sync
npm run types:sync
npm run types:drift-check
```

## Scripts Directory

| Script | Purpose |
|--------|---------|
| `scaffold-domain.ts` | Generate new domain boilerplate |
| `write-types.js` | Write Rust types to `backend.ts` |
| `record-types-sync.js` | Record sync timestamp |
| `validate-types.js` | Check for duplicate types |
| `backend-architecture-check.js` | Enforce ADR-001/002/005 |
| `adr-lint.js` | Full ADR compliance lint |
| `audit-adrs.ts` | Audit ADRs for stale references |
| `generate-docs-index.js` | Rebuild docs/README.md |
| `git-workflow.js` | Git workflow helpers |

## CI/CD Pipeline

GitHub Actions (`.github/workflows/`) handles:

| Stage | Checks |
|-------|--------|
| CI | Linting, typing, all tests |
| Build | Production installers for Windows |

## If You Change X, Run Y

| Change | Run |
|--------|-----|
| Rust struct with `#[derive(TS)]` | `npm run types:sync` |
| New domain | `npx tsx scripts/scaffold-domain.ts <name>` |
| Database schema | `npm run backend:migration:fresh-db-test` |
| IPC command | `npm run backend:check && npm run frontend:type-check` |
| Any backend code | `make test` |
| Any frontend code | `npm run frontend:guard` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Type errors | `npm run types:sync` |
| Database locked | Restart dev process; check orphans |
| Next.js issues | Clear `.next` folder and restart |
| Slow Rust compile | Exclude `target/` from antivirus |
| Drift detected | Run `node scripts/detect-schema-drift.js` |

## Key Files

| File | Purpose |
|------|---------|
| `package.json` | Root npm scripts |
| `frontend/package.json` | Frontend npm scripts |
| `Makefile` | Build/test targets |
| `scripts/` | Automation utilities |
| `src-tauri/Cargo.toml` | Rust dependencies |