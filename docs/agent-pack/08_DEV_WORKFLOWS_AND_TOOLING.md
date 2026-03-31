# 08 — Dev Workflows and Tooling

## Core Dev Commands

```bash
# Run full app (hot reload)
npm run dev

# Run app with type sync first (prefer when IPC structs changed)
npm run dev:types

# Run app with type sync + drift check (strictest)
npm run dev:strict

# Frontend only (browser, no Tauri)
npm run frontend:dev

# Backend tests (all)
make test

# Backend tests (specific domain)
cd src-tauri && cargo test interventions -- --nocapture

# Integration tests
cd src-tauri && cargo test --test integration

# Backend compile check
npm run backend:check   # or: cd src-tauri && cargo check

# Frontend type check
npm run frontend:type-check   # or: cd frontend && npx tsc --noEmit

# Frontend lint
npm run frontend:lint
```

## The Doctor Command (Use Before Declaring Done)

```bash
npm run doctor                  # Fast checks: cargo check, tsc, lint, architecture, schema drift
npm run doctor -- --serial      # Sequential (safer on Windows — prevents Cargo lock contention)
npm run doctor -- --fix         # Auto-fix fixable issues (e.g., types:sync)
npm run doctor -- --fix --serial  # Fix + sequential
npm run doctor -- --full        # Include slow checks (cargo test, frontend tests)
npm run doctor -- --full --serial # Full + sequential
npm run doctor -- --quick --serial # Lightweight loop check
npm run doctor -- --json        # JSON output (auto for non-TTY/CI)
```

Exit codes: `0` = all passed, `1` = failures, `2` = warnings only.

## Type Sync

```bash
npm run types:sync          # Export ts-rs types + record timestamp
npm run types:export        # Raw export (no timestamp)
npm run types:drift-check   # Fast: detect if types are out of sync
npm run types:ci-drift-check # CI-specific drift check
npm run types:validate      # Validate type correctness
npm run types:watch         # Watch mode (auto-sync on change)
```

## Architecture Validation Scripts

```bash
npm run backend:architecture-check    # ADR-001: 4-layer boundary violations
npm run backend:validate-migrations   # ADR-010: naming, numbering, idempotency
npm run backend:detect-schema-drift   # ADR-012: *_at = INTEGER, domain tables
npm run backend:soft-delete-check     # ADR-011: deleted_at filter consistency
npm run backend:ts-rs-coverage        # Verify TS coverage for IPC-facing structs
npm run backend:migration:fresh-db-test  # Smoke test: apply all migrations to fresh DB
npm run backend:check-transaction-boundaries  # Transaction boundary validation
npm run adr:guard                     # ADR compliance check
npm run adr:guard:strict              # Strict ADR check
```

## Scaffolding a New Domain

```bash
npx ts-node scripts/scaffold-domain.ts <DomainName> [flags]
```

Flags:
- `--crud` — generate full CRUD boilerplate
- `--no-frontend` — backend only
- `--no-tests` — skip test files
- `--admin-only` — admin-only RBAC
- `--with-events` — include EventBus wiring
- `--dry-run` — preview without writing

Generates: `ipc/`, `application/`, `domain/`, `infrastructure/`, `tests/` with boilerplate for all layers.

## Git Workflow Scripts

```bash
npm run git:start-feature    # Create feature branch from main
npm run git:sync-feature     # Rebase/sync feature with main
npm run git:finish-feature   # Merge feature back
npm run git:cleanup-feature  # Delete merged branch
npm run git:guard-main       # Block direct pushes to main
```

## Frontend-Specific Commands

```bash
cd frontend && npm run test:ci      # Jest with coverage
cd frontend && npm run test:e2e     # Playwright E2E
cd frontend && npm run prod:gate    # lint + type-check + arch-check + test:ci
```

## "If You Change X, Run Y" Checklist

| Change | Required Actions |
|--------|----------------|
| Rust struct with `#[derive(TS)]` | `npm run types:sync` |
| Any `#[tauri::command]` change | `npm run types:sync` + register in `main.rs` |
| Add/modify SQL migration | `npm run backend:validate-migrations` + `npm run backend:detect-schema-drift` |
| Modify domain business logic | `cargo check` + `make test` |
| Modify frontend component | `npm run frontend:lint` + `npm run frontend:type-check` |
| Modify IPC wrapper | `npm run frontend:type-check` |
| Before merging / declaring done | `npm run doctor -- --serial` |
| High-risk / auth / migration | `npm run doctor -- --full --serial` |

## CI Pipeline

The CI runs (`.github/workflows/ci.yml`):
1. `cargo check`
2. `npm run frontend:type-check`
3. `npm run frontend:lint`
4. `npm run backend:architecture-check`
5. `npm run backend:detect-schema-drift` (blocking — `|| true` removed)
6. `cd frontend && npm run test:ci` (required — not skippable)

Known CI notes:
- `architecture-check.js --strict`: `documents/` domain has intentional cross-domain references via `cross_domain.rs`; `|| true` kept with comment.
- `ci-type-drift-check.js` requires `--features="export-types"` flag; `|| true` retained with comment.

## Build

```bash
npm run build    # types:sync + Tauri production build
```
