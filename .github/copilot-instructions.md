# Copilot Coding Agent Instructions for RPMA v2

## Project Overview

RPMA v2 is an **offline-first desktop application** for managing Paint Protection Film (PPF) interventions, built with **Tauri 2 (Rust backend) + Next.js 14 (React frontend) + SQLite**. It follows Domain-Driven Design with strict bounded contexts.

## Repository Layout

```
rpma-rust1/
├── frontend/                # Next.js 14 app (TypeScript, Tailwind, shadcn/ui)
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # Shared UI components
│       ├── domains/         # Feature domains (auth, interventions, inventory, tasks, sync, …)
│       ├── hooks/           # Shared React hooks
│       ├── lib/             # Utilities and IPC client
│       ├── shared/          # Shared utils, types, UI primitives
│       └── types/           # ⚠️ AUTO-GENERATED from Rust — NEVER edit manually
├── src-tauri/               # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/        # Legacy IPC handlers (prefer domains/*/ipc/)
│   │   ├── domains/         # DDD bounded contexts (15 domains)
│   │   │   └── <domain>/
│   │   │       ├── application/     # Use cases / app services
│   │   │       ├── domain/          # Models, value objects, business rules
│   │   │       ├── infrastructure/  # SQL repositories, external adapters
│   │   │       ├── ipc/             # Tauri command entry points
│   │   │       └── tests/           # Domain-specific tests
│   │   ├── models/          # Data models with ts-rs exports
│   │   ├── repositories/    # Repository implementations
│   │   ├── services/        # Service implementations
│   │   ├── shared/          # Shared utilities, error types, event bus
│   │   └── db/              # Database init, pool, migrations, schema
│   ├── migrations/          # Embedded SQLite migration files
│   └── tests/               # Integration tests
│       └── commands/        # Command integration tests + test_utils.rs
├── scripts/                 # 30+ validation, audit, and utility scripts
├── docs/
│   ├── adr/                 # 8 Architectural Decision Records
│   └── agent-pack/          # 10 comprehensive developer guides
├── Makefile                 # Backend build/test shortcuts
└── package.json             # Root workspace with all npm scripts
```

### Backend Domains (src-tauri/src/domains/)

analytics, audit, auth, calendar, clients, documents, interventions, inventory, notifications, quotes, reports, settings, sync, tasks, users

## Environment Setup

The `copilot-setup-steps.yml` workflow handles environment setup:
- **OS**: Ubuntu (Linux)
- **Rust**: stable toolchain with rustfmt + clippy
- **Node.js**: v20
- **System libs**: libwebkit2gtk-4.1-dev, libssl-dev, libgtk-3-dev, libayatana-appindicator3-dev, librsvg2-dev

Dependencies are installed via `npm ci` (root) and `npm ci` (frontend/).

## Build & Test Commands

### Quick Reference

| Task | Command |
|------|---------|
| Frontend lint | `npm run frontend:lint` |
| Frontend type-check | `npm run frontend:type-check` |
| Backend check (fast compile check) | `npm run backend:check` |
| Backend clippy (linting) | `npm run backend:clippy` |
| Backend format check | `cd src-tauri && cargo fmt --check` |
| Backend unit tests | `cd src-tauri && cargo test --lib` |
| Frontend tests | `cd frontend && npm test` |
| Full quality gate | `npm run quality:check` |

### Backend Tests by Domain

```bash
make test-auth-commands          # Auth domain
make test-client-commands        # Client domain
make test-user-commands          # User domain
make test-intervention-cmds      # Intervention domain
make test-task-commands          # Task domain
cd src-tauri && cargo test --lib # All unit tests
```

### Frontend Tests

```bash
cd frontend && npm test              # Unit + component tests (Jest)
cd frontend && npm run test:coverage # With coverage
```

### Validation Scripts (run after structural changes)

```bash
npm run validate:bounded-contexts   # DDD boundary validation
npm run architecture:check          # Architecture rules
npm run types:drift-check           # Type sync validation
npm run migration:audit             # Migration health
node scripts/validate-migration-system.js  # Migration system check
```

## Known Build Issues & Workarounds

### 1. `frontend/.next` Directory Required for Backend Check

The `backend:check` and `backend:clippy` commands require the `frontend/.next` directory to exist (Tauri build looks for it). The npm scripts handle this automatically by creating the directory:
```bash
node -e "require('fs').mkdirSync('frontend/.next', { recursive: true })"
```
If running `cargo check` or `cargo clippy` directly from `src-tauri/`, first ensure `frontend/.next/` exists.

### 2. EntitySyncIndicator Import Error

There is a known frontend build error: `frontend/src/components/ui/index.ts` line 57 imports from `'../sync/EntitySyncIndicator'` which does not exist at that relative path. The actual component is at `frontend/src/domains/sync/components/EntitySyncIndicator.tsx`. This causes `npm run frontend:build` (Next.js build) to fail with a module-not-found error. This is a pre-existing issue — do not attempt to fix it unless specifically asked, as it may have dependencies on other in-progress work.

### 3. Frontend Build vs. Type-Check

Use `npm run frontend:type-check` (runs `tsc --noEmit`) instead of `npm run frontend:build` for validating TypeScript. The Next.js build has the EntitySyncIndicator issue above, but type-checking works independently.

## Architecture Rules (MUST Follow)

### 4-Layer Architecture
```
Frontend → IPC Command Handlers → Application Services → Repositories/Infrastructure → SQLite
```
- **IPC handlers** (`domains/*/ipc/`): Thin wrappers only — authenticate, validate input, delegate to services, map errors. No business logic or SQL.
- **Application services** (`domains/*/application/`): Business logic, orchestration, transaction boundaries.
- **Repositories** (`domains/*/infrastructure/`): SQL queries, data access. All SQL lives here.
- **Domain models** (`domains/*/domain/`): Pure domain logic, value objects, business rules.

### Bounded Context Isolation
- **No cross-domain imports.** Each domain is self-contained.
- Frontend domains expose public API via `domains/<name>/api/index.ts`.
- Backend cross-domain communication uses the event bus (`shared/event_bus/`).

### Type Safety (Rust → TypeScript)
- Files in `frontend/src/types/` are **auto-generated** by `ts-rs`. Never edit them manually.
- After modifying any Rust model with `#[derive(TS)]`, run: `npm run types:sync`
- Before committing type-related changes: `npm run types:drift-check`

### Security & Auth
- Every protected IPC command must validate `session_token`.
- Use the `authenticate!` macro for auth checks.
- Enforce RBAC roles: admin, supervisor, technician, viewer.
- Role enum is defined in `src-tauri/src/domains/auth/domain/models/auth.rs`.
- Never commit secrets — use `.env.local`.

### Database Migrations
- Migration files go in `src-tauri/migrations/` with numeric prefix (e.g., `038_feature.sql`).
- Always make migrations **idempotent**: use `IF NOT EXISTS`, `IF EXISTS`.
- Schema is in `src-tauri/src/db/schema.sql`; migrations run sequentially on top.
- After adding a migration:
  1. Run `npm run types:sync` (if schema affects exported types)
  2. Run `node scripts/validate-migration-system.js`
  3. Run `npm run migration:audit`
  4. Test the affected domain

### Error Handling
- Domain-specific errors are mapped to `AppError` variants (see ADR-003).
- Never leak internal error details to the frontend — use `internal_sanitized` helper.

### Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `security:`
- Max 100 chars in header, no trailing period, lowercase.

## What to Validate After Changes

| You changed… | Must run… |
|---|---|
| Rust models with `#[derive(TS)]` | `npm run types:sync && npm run types:drift-check` |
| IPC command signatures | `npm run frontend:type-check` + domain tests |
| SQL schema / migrations | `node scripts/validate-migration-system.js && npm run migration:audit` |
| Domain boundaries / modules | `npm run validate:bounded-contexts && npm run architecture:check` |
| Auth / RBAC / security | `npm run security:audit` + auth domain tests |
| Frontend components | `npm run frontend:lint && npm run frontend:type-check` |
| Backend Rust code | `npm run backend:clippy && cd src-tauri && cargo test --lib` |

## Documentation & References

- **Architecture decisions**: `docs/adr/` (8 ADRs covering module boundaries, transactions, errors, events, IPC mapping, RBAC, logging, offline-first)
- **Comprehensive guides**: `docs/agent-pack/` (10 guides covering project overview, domain model, architecture, frontend, backend, IPC contracts, security, database, dev workflows, UX flows)
- **PR template**: `.github/PULL_REQUEST_TEMPLATE.md`

## Testing Patterns

### Backend (Rust)
- Integration tests use `#[tokio::test]` async macro.
- Test utilities in `src-tauri/tests/commands/test_utils.rs` provide `TestContext` with a temporary database, pre-seeded test user, and initialized services.
- Run targeted domain tests with Makefile commands (e.g., `make test-auth-commands`).

### Frontend (TypeScript)
- Tests use Jest with Testing Library.
- Test files are co-located or in `__tests__` directories.
- E2E tests use Playwright (`npm run test:e2e` in frontend/).

## Tips for Efficient Development

1. **Start with `backend:check`** (fast compile check) before running full tests.
2. **Use domain-specific test commands** (via Makefile) instead of running all tests.
3. **Read the relevant ADR** before modifying architecture-sensitive code.
4. **Check `docs/agent-pack/`** for detailed guides on any subsystem.
5. **The `quality:check` script** runs all quality gates in sequence — use it before finalizing.
6. **Rust edition is 2021** (set in workspace Cargo.toml) with MSRV 1.85.0.
