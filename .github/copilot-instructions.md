## Stack

* Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui.
* Backend: Rust + Tauri.
* Database: SQLite with WAL mode.
* Types: Rust models exported to TypeScript via ts-rs.

---

## Project structure

```
rpma-rust/
├── frontend/                  # Next.js App Router app
│   ├── src/
│   │   ├── app/               # Route pages and layouts
│   │   ├── components/        # Shared UI components
│   │   ├── domains/           # Frontend feature domains
│   │   │   └── [domain]/
│   │   │       ├── api/       # React Query public API surface
│   │   │       ├── components/ # Domain UI
│   │   │       ├── hooks/     # Domain hooks
│   │   │       ├── ipc/       # Domain IPC wrappers
│   │   │       ├── services/  # Frontend business logic
│   │   │       └── stores/    # Zustand stores when needed
│   │   ├── hooks/             # Shared custom hooks
│   │   ├── lib/               # IPC client, utilities, query keys
│   │   ├── shared/            # Shared contracts and helpers
│   │   └── types/             # AUTO-GENERATED — DO NOT EDIT
│   └── package.json
│
├── src-tauri/
│   ├── src/
│   │   ├── commands/          # Cross-domain/system command modules
│   │   ├── domains/           # Backend bounded contexts
│   │   │   └── [domain]/
│   │   │       ├── ipc/           # Tauri command entry points, thin only
│   │   │       ├── application/   # Use cases, orchestration, auth enforcement
│   │   │       ├── domain/        # Pure business rules, entities, validation
│   │   │       ├── infrastructure/# Repositories, SQL, adapters
│   │   │       └── tests/         # unit, integration, permission, validation
│   │   ├── shared/                # Errors, auth middleware, event bus, utilities
│   │   ├── db/                    # DB connection, pool, pragmas, migrations
│   │   ├── main.rs                # Tauri builder and command registration
│   │   └── bin/                   # Type export binary
│   ├── migrations/                # Embedded SQLite migrations
│   └── Cargo.toml
│
├── scripts/                       # Validation, architecture, IPC, type scripts
├── docs/                          # Project docs and ADRs
├── Makefile
├── package.json
└── Cargo.toml
```

---

## Core Development Commands

Use the real command surfaces below; do not invent shortcuts.


- **Run App (Dev)**: `npm run dev` (Starts Tauri dev environment with hot reloading).
- **Frontend Only**: `npm run frontend:dev` (Runs Next.js in the browser).
- **Type Sync**: `npm run types:sync` (Exports Rust models to TS). **Run this after changing any Rust struct used in IPC.**

## Verification & Testing

- **Full Backend Suite**: `make test` (Runs all Rust unit and integration tests).
- **Frontend Lint**: `npm run frontend:lint`.
- **Frontend Type Check**: `npm run frontend:type-check`.
- **Frontend Unit Tests**: `cd frontend && npm run test:ci`.
- **Integration Tests (Harness)**: `cd src-tauri && cargo test --test integration`.
* **Backend tests (domain):** `cd src-tauri && cargo test <domain> -- --nocapture`

## Useful Scripts (`scripts/`)
- `validate-migration-system.js`: Ensures migrations are consistent and applied correctly.
- `detect-schema-drift.js`: Compares local DB schema with migrations.
- `backend-architecture-check.js`: Validates the four-layer rule in Rust source.
- `generate-docs-index.js`: Rebuilds the documentation TOC.

---

## Mindset

Make it work → Make it right → Make it fast.
Correctness first. Clarity second. Performance third.
Write boring, predictable, deletable code. The best solution is often less code, not more.

---

## Architecture — Non-Negotiable

Four-layer rule (`src-tauri/src/domains/*/`):
```
IPC → Application → Domain → Infrastructure
```
- **Domain layer has zero dependencies** on any other layer — pure business logic only
- Frontend mirrors backend: every domain has `api/ components/ hooks/ ipc/ services/` under `frontend/src/domains/<name>/`

Cross-domain communication uses **exactly three channels**:
1. `shared/contracts/` — shared types only
2. `shared/services/cross_domain.rs` — concrete services at composition layer only
3. `shared/services/event_bus.rs` — reactive/decoupled coordination

Direct imports from another domain's internals are **forbidden**.


---

## Testing — Mandatory

## "If You Change X, You Must Run Y" Checklist
- **Change Rust IPC Model** → `npm run types:sync`.
- **Add DB Migration** → `npm run backend:migration:fresh-db-test`.
- **Modify IPC Signature** → Update both `src-tauri/src/domains/*/ipc/` and `frontend/src/domains/*/ipc/`.
- **Change Tailwind Config** → The dev server should reload automatically.

Every change requires tests. No exceptions.

| Change | Required tests |
|---|---|
| New feature | Success path + validation failure + permission failure |
| Bug fix | Regression test (proves bug existed + fix works) |
| New IPC command | Success + auth failure + validation failure |
| New RBAC rule | Authorized success + unauthorized failure per affected role |

Test files per domain: `unit_*.rs` · `integration_*.rs` · `validation_*.rs` · `permission_*.rs`
Naming convention: `test_<function>_<scenario>_<expected_result>`

### Required test runs per change scope

| Scope of change | Command to run before declaring done |
|---|---|
| Single domain touched | `cd src-tauri && cargo test <domain> -- --nocapture` |
| Shared / cross-domain change | `cd src-tauri && cargo test --test integration -- --nocapture` |
| Migration added | `npm run backend:migration:fresh-db-test` then `cargo test --test integration` |
| RBAC / auth change | `cd src-tauri && cargo test permission -- --nocapture` |
| Any backend change | `make test` as final check before task is complete |

### A task is NOT complete if

- Any test fails
- A new feature has no tests covering the required scenarios above
- The harness panics or fails to compile
- A failing test was suppressed, commented out, or deleted instead of fixed

If a test failure cannot be resolved within the current task scope,
you **must** explicitly say so and add a `// TODO(issue-XXX): <reason>` marker.

### Test harness — Usage rules

All backend integration tests use the shared harness in `src-tauri/tests/harness/`.

**Never** instantiate a raw database or build a fake `RequestContext` directly in a test body —
always go through `TestApp::new()` or `TestApp::seeded()`.

```rust
// ✅ Correct
let app = TestApp::seeded().await;
let ctx = app.admin_ctx();
let result = some_service.create(request, &ctx).await;
assert!(result.is_ok());

// ❌ Wrong — never bypass the harness
let db = Arc::new(Database::new_in_memory().unwrap());
let ctx = RequestContext { auth: fake_auth(), correlation_id: "x".into() };
```

### Validation tests — pattern

Validation tests target the application layer directly with invalid inputs —
never through IPC. They must cover: empty fields, type violations, and business
rule violations (e.g. invalid status transitions).

```rust
#[tokio::test]
async fn test_create_task_empty_title_returns_validation_error() {
    let app = TestApp::new().await;
    let request = CreateTaskRequest { title: "".into(), ..Default::default() };
    let result = app.services.task.create(request, app.admin_ctx()).await;
    assert!(matches!(result.unwrap_err(), AppError::Validation(_)));
}
```

---

## Test Harness — Architecture

The harness lives in `src-tauri/tests/harness/` and exposes:

```
tests/
├── integration.rs         — cargo [[test]] entry point (required by Cargo.toml)
└── harness/
    ├── mod.rs             — public re-exports
    ├── app.rs             — TestApp struct and constructors
    ├── db.rs              — in-memory SQLite with migrations applied
    ├── auth.rs            — RequestContext builders per role
    └── fixtures.rs        — deterministic seed data (users, client, task)
```

**Required in `src-tauri/Cargo.toml`:**
```toml
[[test]]
name = "integration"
path = "tests/integration.rs"

[dev-dependencies]
tokio = { version = "1", features = ["test-util"] }
pretty_assertions = "1"
```

**Public API:**

| Symbol | Description |
|---|---|
| `TestApp::new()` | Empty DB with all migrations applied |
| `TestApp::seeded()` | DB with fixtures pre-seeded (admin, technician, client, task) — default choice for most tests |
| `app.admin_ctx()` | `RequestContext` for Admin role |
| `app.technician_ctx()` | `RequestContext` for Technician role |
| `app.supervisor_ctx()` | `RequestContext` for Supervisor role |
| `app.viewer_ctx()` | `RequestContext` for Viewer role |
| `app.ctx_for_role(role)` | `RequestContext` for any arbitrary role |
| `app.inject_session(role)` | Inject session into store (required before calling IPC handlers) |
| `app.clear_session()` | Remove session from store (simulate unauthenticated caller) |
| `app.db` | `Arc<Database>` for direct SQL assertions |
| `fixtures::client_fixture(name)` | Minimal valid `CreateClientRequest` |
| `fixtures::task_fixture(plate)` | Minimal valid `CreateTaskRequest` |
| `fixtures::unique_id()` | Random UUID string for stable test IDs |

**Hard constraints:**

- Tests run without Tauri UI startup — no `AppHandle`, no event loop
- Each `TestApp` instance gets its own isolated in-memory SQLite — no shared state between tests
- `RequestContext` is always used in service-layer tests — never raw session tokens (ADR-006)
- WAL mode is **not** enabled for in-memory databases (SQLite incompatibility)
- `foreign_keys = ON` and other production-compatible PRAGMAs are applied
- Fixture IDs are deterministic UUIDs — assertions remain stable across runs
- All timestamps use `chrono::Utc::now().timestamp_millis()` (ADR-012)

---

## Universal Rules

- No `TODO`/`FIXME`/`HACK` without a linked issue: `// TODO(issue-123): description`
- No abstraction until 3 real use cases exist in this codebase
- No optimization without profiling (`cargo flamegraph`, `criterion`, React DevTools Profiler)
- Every file touched must be left cleaner: remove dead code, improve naming, simplify logic

---

## When unsure

If a requirement is ambiguous or conflicts with architecture rules, choose the most conservative compliant option and explicitly say so.

When unsure, check docs:

* `docs/`
* `docs/adr/`
```

