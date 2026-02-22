# GitHub Copilot Instructions for RPMA v2

## Project Overview

RPMA v2 is an **offline-first desktop application** built with Tauri (Rust + system webview) for managing Paint Protection Film (PPF) interventions. The application handles tasks, interventions, workflow steps, photo management, inventory tracking, reporting, and user management with role-based access control.


## 📁 Project Structure

```
rpma-rust1/
├── frontend/                    # Next.js 14 App
│   ├── src/
│   │   ├── app/                 # App Router pages (~38 pages)
│   │   ├── components/          # Shared React components (179+)
│   │   ├── domains/             # Feature domains (auth, interventions, inventory, tasks)
│   │   │   └── [domain]/
│   │   │       ├── api/         # Public API surface for the domain
│   │   │       ├── components/  # Domain-specific components
│   │   │       ├── hooks/       # Domain-specific hooks
│   │   │       ├── ipc/         # IPC call wrappers
│   │   │       └── services/    # Frontend business logic
│   │   ├── hooks/               # Shared custom hooks (63+)
│   │   ├── lib/                 # Utilities and IPC client (20 domain modules)
│   │   ├── shared/              # Shared utils, types, UI primitives
│   │   └── types/               # ⚠️ AUTO-GENERATED — DO NOT EDIT MANUALLY
│   └── package.json
│
├── src-tauri/                   # Rust/Tauri backend
│   ├── src/
│   │   ├── commands/            # 65 IPC command handlers
│   │   ├── domains/             # Bounded contexts (DDD)
│   │   │   └── [domain]/
│   │   │       ├── application/ # Use cases / application services
│   │   │       ├── domain/      # Domain models, value objects, rules
│   │   │       ├── infrastructure/ # SQL repositories, external adapters
│   │   │       ├── ipc/         # Tauri command entry points
│   │   │       └── tests/       # Domain tests
│   │   ├── models/              # 21 data models (ts-rs exports)
│   │   ├── repositories/        # 20 repository files
│   │   ├── services/            # 88 service files
│   │   ├── shared/              # Shared backend utilities, errors
│   │   └── db/                  # Database init, pool, migrations
│   ├── migrations/              # Embedded SQLite migrations
│   ├── benches/                 # Criterion benchmarks
│   ├── tests/                   # Integration test suites
│   │   ├── auth_commands_test.rs
│   │   ├── client_commands_test.rs
│   │   ├── intervention_commands_test.rs
│   │   ├── task_commands_test.rs
│   │   └── user_commands_test.rs
│   └── Cargo.toml
│
├── migrations/                  # Root-level SQL migration files (6 files)
├── migration-tests/             # Migration validation tests
├── scripts/                     # Build, validation, and utility scripts
├── docs/                        # Project documentation
│   ├── adr/                     # Architectural Decision Records
│   └── agent-pack/              # Agent documentation pack
├── Makefile                     # Shorthand commands (see below)
├── package.json                 # Root package.json (npm workspaces)
├── Cargo.toml                   # Workspace root
├── deny.toml                    # cargo-deny security config
├── commitlint.config.js         # Conventional commit rules
└── tsconfig.json
```

---

## 🏗️ Architecture — The 4-Layer Rule

**This is the most important rule. Never break it.**

```
┌─────────────────────────────────────────┐
│  Frontend (Next.js / React / TypeScript) │
│  Pages → Domain Hooks → IPC wrappers    │
└───────────────┬─────────────────────────┘
                │ invoke() — Tauri IPC
┌───────────────▼─────────────────────────┐
│  IPC Commands  (src-tauri/src/commands) │
│  Thin handlers — validate input only   │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  Services / Application Layer           │
│  Business logic, use cases, RBAC        │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  Repositories (infrastructure/)         │
│  All SQL queries live here — nowhere else│
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  SQLite (WAL mode, via sqlx)            │
└─────────────────────────────────────────┘
```
## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Backend**: Rust with Tauri framework
- **Database**: SQLite with WAL mode
- **State Management**: React hooks, Context API, Zustand
- **Authentication**: JWT tokens with 2FA support
- **Type Safety**: Automatic TypeScript generation from Rust models using `ts-rs`
- **Testing**: Vitest (frontend), Rust built-in tests (backend)

### Bounded Contexts (DDD)

Each domain under `src-tauri/src/domains/` is a **self-contained bounded context**:

| Domain | Responsibility |
|---|---|
| `documents` | Document storage and retrieval |
| `interventions` | PPF intervention lifecycle |
| `inventory` | Materials, stock, tracking |
| `quotes` | Quote creation and management |
| `tasks` | Task and work order management |
| `users` | Auth, sessions, RBAC |

Cross-domain access is **forbidden** except via the public `api/index.ts` (frontend) or a dedicated application service (backend).

---

## ⚡ Essential Commands

### Development

```bash
npm run dev                    # Start full app (frontend + backend)
npm run frontend:dev           # Frontend only (Next.js on localhost:3000)
```

### Build

```bash
npm run build                  # Full production build
npm run frontend:build         # Build Next.js frontend
npm run backend:build          # cargo build (debug)
npm run backend:build:release  # cargo build --release
```

### Quality Gate 

Individual checks:

```bash
# Frontend
npm run frontend:lint          # ESLint
npm run frontend:type-check    # tsc --noEmit

# Backend
npm run backend:check          # cargo check
npm run backend:clippy         # cargo clippy -- -D warnings
npm run backend:fmt            # cargo fmt --check

# Architecture
npm run validate:bounded-contexts   # Validate DDD boundaries
npm run architecture:check          # Architecture rules check

# Types (Rust → TypeScript)
npm run types:sync             # Regenerate TS types from Rust models
npm run types:validate         # Validate generated types
npm run types:drift-check      # Detect type drift

# Security
npm run security:audit         # cargo-deny + npm audit
```

### Tests

# Backend (Rust)
cd src-tauri && cargo test --lib           # Unit tests
cd src-tauri && cargo test migration       # Migration tests
cd src-tauri && cargo test performance     # Perf tests

# By domain (via Makefile)
make test-auth-commands
make test-client-commands
make test-user-commands
make test-intervention-cmds
make test-task-commands

# Frontend
cd frontend && npm test                  # Unit + component tests
cd frontend && npm run test:e2e          # Playwright E2E tests
cd frontend && npm run test:coverage     # With coverage report

# Migration validation
node scripts/validate-migration-system.js
```

### Benchmarks

```bash
cd src-tauri && cargo bench              # Run Criterion benchmarks
```

---

## 🔴 Strict Rules — Never Violate

### Architecture

- ✅ Always follow the 4-layer architecture
- ❌ Never skip layers (e.g., no direct DB from application layer)
- ❌ Never put business logic in IPC command handlers (commands = thin wrappers)
- ❌ Never import across domain boundaries — use the domain's public API only
- ❌ Never write SQL outside `infrastructure/` files
- ✅ Always place new backend features inside the correct bounded context under `src-tauri/src/domains/`
- ✅ Always run `npm run validate:bounded-contexts` after any structural change

### Type Safety

- ❌ **NEVER** manually edit any file under `frontend/src/types/` — they are **auto-generated by ts-rs**
- ✅ Always run `npm run types:sync` after modifying any Rust model with `#[derive(TS)]`
- ✅ Always run `npm run types:drift-check` before committing

### Security

- ✅ Always validate `session_token` in every protected IPC command
- ✅ Always enforce RBAC before executing protected operations
- ❌ Never commit secrets, tokens, or credentials — use `.env.local` (gitignored)
- ❌ Never bypass auth or authorization checks
- ✅ Always run `npm run security:audit` before submitting

### Database

- ✅ Always use numbered migration files (e.g., `0007_add_column.sql`)
- ✅ Always make migrations idempotent: use `IF NOT EXISTS`, `IF EXISTS`
- ❌ Never modify schema outside of migration files
- ✅ Always validate: `node scripts/validate-migration-system.js`
- **Migration order**: add migration → run `types:sync` → run all tests

### Code Quality

- ✅ Use UTF-8 encoding for all source files
- ✅ Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `security:`
- ❌ Never push directly to `main` (enforced by Husky `git:guard-main` hook)
- ❌ Never disable linting, type-checking, or architecture validation

### Testing

- ✅ Always write a regression test for every bug fix
- ✅ Always test new features: success path + validation failure + permission failure
- ❌ Never write flaky or time-dependent tests
- ❌ Never delete or weaken existing tests to make a build pass

---

## 🧠 Agent Workflow — How to Work on This Codebase

Follow this workflow for **every** task:

### 1. Understand Before Acting
- Read the relevant domain docs in `docs/agent-pack/` and `docs/adr/`
- Identify which bounded context(s) the change belongs to
- Check if a migration is needed

### 2. Plan the Change
- Map the change to the 4 layers: what changes in commands / services / repositories / frontend?
- If crossing domains, define the integration point explicitly

### 3. Implement
- Backend first (Rust): domain model → repository → service → IPC command
- Run `npm run types:sync` if any Rust model changed
- Frontend: IPC wrapper → domain service → hook → component/page
- **Never** mix layers in a single file

### 4. Verify
```bash
node scripts/validate-migration-system.js  # If migrations changed
```

### 5. Test
```bash
cd src-tauri && cargo test --lib
cd frontend && npm test
```

### 6. Commit
```bash
git add .
git commit -m "feat(interventions): add step photo upload command"
# Format: type(scope): description
# Scopes: interventions, inventory, tasks, users, quotes, documents, auth, db, ui

---

## 📐 Key Patterns and Conventions

### Rust IPC Command Pattern
```rust
// src-tauri/src/domains/[domain]/ipc/[command].rs
#[tauri::command]
pub async fn my_command(
    state: tauri::State<'_, AppState>,
    session_token: String,           // Always validate first
    payload: MyInputDto,
) -> Result<MyOutputDto, AppError> {
    // 1. Validate session
    let user = state.auth_service.validate_session(&session_token).await?;
    // 2. Check RBAC
    state.auth_service.check_permission(&user, Permission::MyPermission)?;
    // 3. Delegate to service — NO business logic here
    state.my_service.execute(payload).await
}
```

### Frontend IPC Call Pattern
```typescript
// frontend/src/domains/[domain]/ipc/[command].ts
import { invoke } from "@tauri-apps/api/core";
import type { MyOutputDto } from "@/types"; // auto-generated

export async function myCommand(payload: MyInputDto): Promise<MyOutputDto> {
  return invoke("my_command", { sessionToken: getToken(), ...payload });
}
```

### Rust Model with ts-rs
```rust
// src-tauri/src/models/my_model.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct MyModel {
    pub id: i64,
    pub name: String,
}
// After editing: run `npm run types:sync`
```

### SQLite Migration File
```sql
-- migrations/0007_my_change.sql
-- Always idempotent
CREATE TABLE IF NOT EXISTS my_table (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚨 Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Editing `frontend/src/types/*.ts` | Run `npm run types:sync` instead |
| SQL in a service file | Move SQL to `infrastructure/` repository |
| Business logic in an IPC command | Delegate to service layer |
| Importing directly from another domain's internals | Use `domains/[name]/api/index.ts` |
| Committing directly to `main` | Always use a feature branch + PR |
| Writing a migration without idempotency | Always use `IF NOT EXISTS` / `IF EXISTS` |
| Skipping `quality:check` before commit | It is mandatory — Husky enforces it |
| Hardcoding session tokens or credentials | Use `AppState` injection + env vars |

---

## 📚 Documentation

- **Full docs**: `docs/agent-pack/README.md`
- **Architecture decisions**: `docs/adr/`
- **Migration validation**: `node scripts/validate-migration-system.js`
