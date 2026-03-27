## 1. Project Identity

RPMA v2 (Resource Planning & Management Application) is an offline-first desktop application for planning, executing, and auditing PPF (Paint Protection Film) field interventions.

**Primary users:**
- Field technicians executing interventions
- Supervisors coordinating planning and quality
- Administrators managing users, security, and system configuration

The app is distributed as a **Tauri desktop client** with a **Rust backend**, **Next.js frontend**, and **SQLite persistence in WAL mode**.

## Core Development Commands

Use the real command surfaces below; do not invent shortcuts.

- **Run App (Dev)**: `npm run dev` (Starts Tauri dev environment with hot reloading). **Does NOT run type sync automatically.**
- **Run App (Dev, with type sync)**: `npm run dev:types` (runs `types:sync` then starts Tauri). Prefer this when IPC structs changed.
- **Run App (Dev, strict)**: `npm run dev:strict` (runs `types:sync` + drift check then starts Tauri).
- **Frontend Only**: `npm run frontend:dev` (Runs Next.js in the browser).
- **Type Sync**: `npm run types:sync` (Exports Rust models to TS). **Mandatory after any change to a `#[derive(TS)]` struct or IPC-facing model. Frontend type-check will fail without it.**

## Verification & Testing

- **Full Backend Suite**: `make test` (Runs all Rust unit and integration tests).
- **Frontend Lint**: `npm run frontend:lint`.
- **Frontend Type Check**: `npm run frontend:type-check`.
- **Frontend Unit Tests**: `cd frontend && npm run test:ci`.
- **Integration Tests (Harness)**: `cd src-tauri && cargo test --test integration`.
- **Backend tests (domain)**: `cd src-tauri && cargo test <domain> -- --nocapture`

### Doctor Command (Comprehensive Health Check)

`npm run doctor` runs all verification checks in one command. Use this before declaring a task complete.

| Command | Purpose |
|---------|---------|
| `npm run doctor` | Run fast checks (cargo check, tsc, lint, architecture, schema drift) |
| `npm run doctor -- --serial` | Run the same checks sequentially. Prefer this on Windows or when parallel checks contend for Cargo/build locks. |
| `npm run doctor -- --quick --serial` | Lightweight sequential check for active development loops. |
| `npm run doctor -- --fix` | Auto-fix fixable issues (e.g., `types:sync`) |
| `npm run doctor -- --full` | Include slow checks (cargo test, frontend tests) |
| `npm run doctor -- --json` | JSON output (auto-detected for non-TTY/agents) |

**Exit codes:**
- `0`: All checks passed
- `1`: One or more failures
- `2`: Warnings only (no failures)

**For AI agents:** Prefer targeted checks while iterating:
- `cargo check` for backend-only changes
- `npm run frontend:type-check` for frontend-only changes
- `npm run types:sync` when `#[derive(TS)]` structs or IPC-facing Rust models change

Before declaring a task complete, run `npm run doctor -- --serial`. If fixable failures occur, run `npm run doctor -- --fix --serial` and re-verify. Use `npm run doctor -- --full --serial` for high-risk changes, auth/security work, migrations, or before major merges.

## Useful Scripts (`scripts/`)

- `validate-migration-system.js`: Ensures migrations are consistent and applied correctly.
- `detect-schema-drift.js`: Compares local DB schema with migrations.
- `backend-architecture-check.js`: Validates the four-layer rule in Rust source.
- `generate-docs-index.js`: Rebuilds the documentation TOC.
- `scaffold-domain.ts`: **Domain scaffolder** - generates all boilerplate for a new bounded context.

### Tech Stack (source of truth: `/package.json`, `/frontend/package.json`, `/src-tauri/Cargo.toml`)

| Layer | Technology | Version / Mode | Notes |
|---|---|---:|---|
| Desktop shell | Tauri | `2.1` (`tauri = { version = "2.1" }`) | Native desktop runtime and IPC transport |
| Backend language | Rust | Edition `2021`, rust-version `1.85` | Domain-driven backend under `src-tauri/src` |
| Frontend framework | Next.js | `^14.2.35` | App Router architecture |
| UI runtime | React | `^18.3.1` | `react` + `react-dom` |
| Frontend language | TypeScript | `^5.3.0` | Strict type-safe UI and contracts |
| Database | SQLite | WAL mode (ADR-009) | Offline-first local persistence |
| Server state | TanStack Query | `^5.90.2` | Backend/server state caching and invalidation |
| UI local state | Zustand | `^5.0.8` | Local client/UI state only |
| Styling | Tailwind CSS | `^3.4.0` | Utility-first styling with shadcn/ui components |
| Contract generation | ts-rs | `10.1` | Rust types exported to TS (`npm run types:sync`) |

## 2. Mandatory Reading Before Any Code Change

Before writing any code, the agent **MUST** read the relevant ADR(s) listed below.

### Architecture

| ADR | Title |
|---|---|
| ADR-001 | Four-Layer Architecture Pattern |
| ADR-002 | Bounded Context Domains |
| ADR-003 | Cross-Domain Communication Channels |
| ADR-004 | Centralized Service Builder Pattern |
| ADR-005 | Repository Pattern for Data Access |

### Auth & Security

| ADR | Title |
|---|---|
| ADR-006 | RequestContext Pattern for Authentication Flow |
| ADR-007 | Role-Based Access Control Hierarchy |

### Validation & Data

| ADR | Title |
|---|---|
| ADR-008 | Centralized Validation Service |
| ADR-009 | SQLite with WAL Mode for Persistence |
| ADR-010 | Numbered SQL Migrations with Rust Data Migrations |
| ADR-011 | Soft Delete Pattern |
| ADR-012 | Timestamp as Milliseconds |

### Frontend

| ADR | Title |
|---|---|
| ADR-013 | IPC Wrapper Pattern for Frontend |
| ADR-014 | TanStack Query for Server State |
| ADR-015 | Type Generation via ts-rs |

### Events & Tracing

| ADR | Title |
|---|---|
| ADR-016 | In-Memory Event Bus for Decoupled Coordination |
| ADR-017 | Domain Event Types and Factory Pattern |
| ADR-020 | Correlation IDs for Distributed Tracing |

### IPC & Errors

| ADR | Title |
|---|---|
| ADR-018 | Tauri Command Handlers (Thin IPC Layer) |
| ADR-019 | Error Handling at Boundary with thiserror and anyhow |

## 3. Repository Layout

```text
rpma-rust/
|- README.md                          # Project overview
|- Makefile                           # Canonical backend build/test/lint command aliases
|- package.json                       # Root task runner (frontend/backend/types scripts)
|- Cargo.toml                         # Workspace manifest
|- docs/                              # Architecture + ADR documentation
|  |- README.md                       # Generated docs index and ADR quick links
|  |- adr/                            # Formal Architecture Decision Records (001-020)
|  `- agent-pack/                     # Deep architecture guides for engineers/agents
|- scripts/                           # Validation, architecture checks, type sync, automation
|- frontend/                          # Next.js 14 frontend app
|  |- package.json                    # Frontend toolchain/test scripts
|  `- src/
|     |- app/                         # App Router pages/layouts
|     |- components/                  # Shared UI components
|     |- domains/                     # Frontend bounded contexts/features
|     |  |- admin/
|     |  |- auth/
|     |  |- bootstrap/
|     |  |- calendar/
|     |  |- clients/
|     |  |- dashboard/
|     |  |- interventions/
|     |  |- inventory/
|     |  |- notifications/
|     |  |- performance/
|     |  |- quotes/
|     |  |- reports/
|     |  |- settings/
|     |  |- tasks/
|     |  |- trash/
|     |  `- users/
|     |- lib/
|     |  |- ipc/                      # IPC client abstractions, adapters, command maps, tests
|     |  `- query-keys.ts             # Centralized TanStack query key factories
|     |- shared/                      # Shared frontend contracts/utilities
|     `- types/                       # AUTO-GENERATED TS types (never hand edit)
`- src-tauri/                         # Rust backend + Tauri app host
   |- Cargo.toml                      # Backend dependencies, bins, integration test targets
   |- migrations/                     # Numbered SQL migrations (ADR-010)
   |- src/
   |  |- main.rs                      # Tauri app bootstrap, command registration, shutdown hooks
   |  |- lib.rs                       # Library entry point
   |  |- commands/                    # Cross-domain/system command modules
   |  |- db/                          # DB bootstrap, pragmas, migration plumbing
   |  |- domains/                     # Backend bounded contexts (core business code)
   |  |  |- auth/                     # Full 4-layer domain: ipc/application/domain/infrastructure/tests
   |  |  |- calendar/                 # Hybrid domain shape (calendar_handler + infrastructure/tests)
   |  |  |- clients/                  # Full domain plus client_handler
   |  |  |- documents/                # Report/document domain modules
   |  |  |- interventions/            # Core intervention workflow domain
   |  |  |- inventory/                # Inventory + material lifecycle domain
   |  |  |- notifications/            # Notifications + notification_handler
   |  |  |- quotes/                   # Quotes/devis bounded context
   |  |  |- settings/                 # Settings and security policies
   |  |  |- tasks/                    # Task lifecycle bounded context
   |  |  |- trash/                    # Soft-delete recycle/trash context
   |  |  `- users/                    # User management + RBAC context
   |  |- shared/                      # Cross-domain shared kernel
   |  |  |- context/                  # RequestContext + session resolution helpers
   |  |  |- contracts/                # Shared enums/contracts (roles, statuses, etc.)
   |  |  |- db/                       # Shared DB-level contracts/helpers
   |  |  |- error/                    # Shared error types
   |  |  |- event_bus/                # In-memory event bus primitives
   |  |  |- ipc/                      # IPC boundary result/error adapters
   |  |  |- logging/                  # Tracing + correlation ID propagation
   |  |  |- policies/                 # Shared policy definitions
   |  |  |- repositories/             # Shared repository abstractions
   |  |  |- services/                 # Shared services (incl. centralized validation)
   |  |  `- utils/                    # Shared backend utilities
   |  `- bin/
   |     `- export-types.rs           # ts-rs type export binary used by `npm run types:sync`
   `- tests/
      |- commands/                    # Command-level integration suites
      |- harness/                     # Test harness infrastructure (TestApp, fixtures, auth ctx)
      |- integration.rs               # Harness test entrypoint
      |- domain_invariants.rs         # Domain invariant suites
      `- *_e2e_test.rs                # End-to-end workflow tests
```

### Critical sub-layout contracts

| Path | Contract |
|---|---|
| `src-tauri/src/domains/*` | Backend bounded contexts. Prefer strict `ipc/`, `application/`, `domain/`, `infrastructure/`, `tests/` layering where present. |
| `src-tauri/src/shared/*` | Shared kernel; place cross-domain concerns here, not inside another domain. |
| `src-tauri/tests/harness/*` | Mandatory backend integration harness; do not bypass with ad-hoc DB/context setup in tests. |
| `frontend/src/domains/*` | Frontend feature boundaries matching backend domains. |
| `frontend/src/lib/ipc/*` | IPC wrappers/adapters. UI code should call typed wrappers, not raw invoke. |
| `frontend/src/lib/query-keys.ts` | Single source of truth for query key factories and invalidation scope. |

## Agent Execution Protocol (MANDATORY)

For ANY task:

1. Identify impacted domain(s)
2. Read corresponding ADR(s)
3. Locate exact files in domain structure
4. Implement changes ONLY in correct layer
5. Run:
   - `cargo check`
   - `npm run frontend:type-check`
6. Run types sync if Rust structs changed
7. Run tests
8. Validate no forbidden patterns introduced
9. Before declaring completion, run `npm run doctor -- --serial`

## Definition of Done (STRICT)

A task is complete ONLY if:

* OK Rust compiles (`cargo check`)
* OK TypeScript compiles
* OK Tests pass (unit + integration)
* OK No architecture violations
* OK Types synced (`types:sync`)
* OK No business logic outside domain
* OK Errors follow `AppError` contract

---

## Forbidden Patterns (CRITICAL)

- Business logic in repositories
- Validation inside IPC
- Direct DB access from application layer
- Cross-domain imports
- Manual TypeScript edits
- Skipping transaction boundaries
- Returning raw SQL errors to frontend
