## Stack

* Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui.
* Backend: Rust + Tauri.
* Database: SQLite with WAL mode.
* Types: Rust models exported to TypeScript via ts-rs. Generated files live in `frontend/src/types/` and must not be edited manually.

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

## Commands

Use the real command surfaces below; do not invent shortcuts.

* **App / dev:** `npm run dev`, `npm run dev:types`, `npm run frontend:dev`
* **Frontend checks:** `npm run frontend:lint`, `npm run frontend:type-check`, `cd frontend && npm run test:ci`, `cd frontend && npm run test:e2e`
* **Backend checks:** `npm run backend:check`, `npm run backend:clippy`, `npm run backend:fmt`
* **Backend tests (all):** `make test`
* **Backend tests (harness):** `cd src-tauri && cargo test --test integration -- --nocapture`
* **Backend tests (domain):** `cd src-tauri && cargo test <domain> -- --nocapture`
* **Backend tests (permissions):** `cd src-tauri && cargo test permission -- --nocapture`
* **Backend tests (full gate):** `npm run backend:check && cd src-tauri && cargo test --test integration`
* **Types:** `npm run types:sync`, `npm run types:validate`, `npm run types:drift-check`, `npm run types:watch`
* **Database / migrations:** `node scripts/validate-migration-system.js`, `node scripts/detect-schema-drift.js`, `npm run backend:migration:fresh-db-test`

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

## Rust Rules

- **Never** use `unwrap()` / `expect()` / `panic!()` in production — only in `#[cfg(test)]` or `test_utils.rs`
- Use `?`, `map_err`, typed errors (`thiserror` for domain errors, `anyhow` at IPC boundary only)
- Every IPC command **must** call `resolve_context!` as its first line:
  ```rust
  let ctx = resolve_context!(&state, &correlation_id);                   // authenticated
  let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);  // role-gated
  ```
- **No raw session token** may ever reach a service or repository — pass `RequestContext` only
- All input validation goes through `shared/services/validation/` — never inline ad-hoc validation
- All database access uses the repository pattern — no raw SQL in domain or application layers
- New migrations: numbered `.sql` file in `src-tauri/migrations/`, must pass `npm run backend:migration:fresh-db-test`
- All IPC payload types must derive `#[derive(TS)]` + `#[ts(export)]`; run `npm run types:sync` after

Use newtypes to communicate intent:
```rust
// Bad:  fn process(id: u64, active: bool) -> String
// Good: fn process(user_id: UserId, status: UserStatus) -> Result<Report, ProcessError>
```

---

## Frontend Rules

- `tsconfig.json` must keep `"strict": true` and `"noUncheckedIndexedAccess": true` — no exceptions
- **Never call `invoke` directly** — use typed domain IPC wrappers in `domains/*/ipc/`
- Components receive data as **props only** — no fetching inside components
- `useEffect` is for external sync only (Tauri events, DOM, APIs) — no business logic inside
- **TanStack Query** for all backend state; **Zustand** for UI-only state — never `useState + useEffect` for server data
- Import only from a domain's `index.ts` public API — never from internal paths
- **Never edit** `frontend/src/types/` — auto-generated by `ts-rs`; edit the Rust source instead
- Every mutation must invalidate cache: `invalidatePattern('domain:')` + `signalMutation('domain')`

---

## Testing — Mandatory

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

---

## Test Harness — Architecture

The harness lives in `src-tauri/tests/harness/` and exposes:

```
tests/
└── harness/
    ├── mod.rs        — public re-exports
    ├── app.rs        — TestApp struct and constructors
    ├── db.rs         — in-memory SQLite with migrations applied
    ├── auth.rs       — RequestContext builders per role
    └── fixtures.rs   — deterministic seed data (users, client, task)
```

**Public API:**

| Symbol | Description |
|---|---|
| `TestApp::new()` | Empty DB with all migrations applied |
| `TestApp::seeded()` | DB with one seeded client + task; use when a test needs pre-existing data |
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

* `docs/README.md`
* `docs/adr/`
```

