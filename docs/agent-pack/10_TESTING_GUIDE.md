---
title: "Testing Guide"
summary: "Mandatory testing standards, strategies, and commands for all layers."
read_when:
  - "Writing new code"
  - "Fixing bugs"
  - "Adding new features"
---

# 10. TESTING GUIDE

Every change in RPMA v2 requires verification. No exceptions.

## Test Harness Architecture

The test harness lives in `src-tauri/tests/harness/` and provides isolated, reproducible test environments.

### Directory Structure

```
src-tauri/tests/
├── integration.rs              # Main harness entry point
├── harness_smoke_test.rs      # Harness self-tests
├── domain_invariants.rs        # Business rule validation
├── harness/
│   ├── mod.rs                 # Public re-exports
│   ├── app.rs                 # TestApp struct
│   ├── auth.rs                # RequestContext builders
│   ├── db.rs                  # In-memory database setup
│   ├── fixtures.rs            # Test data factories
│   └── event_capture.rs       # Domain event capture
├── commands/                  # IPC command handler tests
│   ├── auth_commands_test.rs
│   ├── client_commands_test.rs
│   └── ...                    # Per-domain tests
├── intervention_lifecycle_e2e_test.rs
└── session_rbac_expiry_e2e_test.rs
```

## Test Harness API

### TestApp

```rust
pub struct TestApp {
    pub state: AppStateType,  // Full application state
    pub db: Arc<Database>,    // Direct DB handle for assertions
}

impl TestApp {
    // Constructors
    pub async fn new() -> Self;      // Empty DB, all migrations
    pub async fn seeded() -> Self;   // Pre-seeded with fixtures

    // RequestContext shortcuts (no session injection needed)
    pub fn admin_ctx(&self) -> RequestContext;
    pub fn technician_ctx(&self) -> RequestContext;
    pub fn supervisor_ctx(&self) -> RequestContext;
    pub fn viewer_ctx(&self) -> RequestContext;
    pub fn ctx_for_role(&self, role: UserRole) -> RequestContext;

    // Session store helpers (for IPC-layer tests)
    pub fn inject_session(&self, role: UserRole);
    pub fn clear_session(&self);
}
```

### Fixtures

| Function | Purpose |
|----------|---------|
| `unique_id()` | Generate random UUID string |
| `client_fixture(name)` | Minimal valid `CreateClientRequest` |
| `task_fixture(plate)` | Minimal valid `CreateTaskRequest` |

### Event Capture

```rust
let capture = EventCapture::new();
app.state.event_bus.register_handler(capture.clone());
// Perform operation...
let events = capture.drain();
assert!(events.iter().any(|e| matches!(e, DomainEvent::TaskCreated { .. })));
```

## Test Patterns

### 1. Service-Layer Test (Preferred)

```rust
mod harness;

#[tokio::test]
async fn test_create_task_valid_request_succeeds() {
    let app = harness::app::TestApp::new().await;
    let ctx = app.admin_ctx();

    let result = app.state.task_service
        .create_task_async(request, "test-user")
        .await;

    assert!(result.is_ok());
}
```

### 2. With Seeded Data

```rust
#[tokio::test]
async fn test_with_existing_entities() {
    let app = TestApp::seeded().await;
    // Client "Seeded Client" and Task "SEED-001" already exist

    let result = app.state.quote_service.create_quote(...);
}
```

### 3. IPC-Layer Test (requires session injection)

```rust
#[tokio::test]
async fn test_ipc_command() {
    let app = TestApp::new().await;
    app.inject_session(UserRole::Admin);  // Required for resolve_context!

    let result = some_ipc_command_handler(&app.state, request).await;
    assert!(result.is_ok());
}
```

### 4. Database Isolation Assertion

```rust
#[tokio::test]
async fn test_failed_operation_leaves_db_unchanged() {
    let app = TestApp::new().await;

    let count_before: i64 = app.db
        .query_single_value("SELECT COUNT(*) FROM tasks", [])
        .expect("count");

    let _ = app.state.task_service
        .create_task_async(invalid_request, "test")
        .await;

    let count_after: i64 = app.db
        .query_single_value("SELECT COUNT(*) FROM tasks", [])
        .expect("count");

    assert_eq!(count_before, count_after);
}
```

### 5. Validation Test

```rust
#[tokio::test]
async fn test_create_task_empty_title_returns_validation_error() {
    let app = TestApp::new().await;
    let request = CreateTaskRequest { title: "".into(), ..Default::default() };

    let result = app.state.task_service
        .create_task_async(request, app.admin_ctx())
        .await;

    assert!(matches!(result.unwrap_err(), AppError::Validation(_)));
}
```

## Mandatory Scenarios per Change

| Change Type | Required Tests |
|-------------|-----------------|
| New feature | Success path + Validation failure + Permission failure |
| Bug fix | Regression test (proves bug existed + fix works) |
| New IPC command | Success + Auth failure + Validation failure |
| New RBAC rule | Authorized success + Unauthorized failure per role |
| Migration added | `npm run backend:migration:fresh-db-test` + `cargo test --test integration` |

## Backend Test Commands

| Command | Purpose |
|---------|---------|
| `cargo test <domain>` | Test specific domain |
| `cargo test --test integration` | Run full integration suite |
| `cargo test --test domain_invariants` | Domain invariant tests |
| `cargo test --test auth_commands_test` | Auth command tests |
| `make test` | Run all backend tests |

## Frontend Tests

### Unit & Component Tests
- **Location**: `frontend/src/__tests__/` or alongside components
- **Tool**: Jest + React Testing Library
- **Command**: `cd frontend && npm run test`

### E2E Tests
- **Location**: `frontend/tests/e2e/`
- **Tool**: Playwright
- **Commands**:
  | Command | Purpose |
  |---------|---------|
  | `npm run test:e2e` | Run all E2E tests |
  | `npm run test:e2e:ui` | Run with UI |
  | `npm run test:e2e:debug` | Debug mode |

## Test File Naming

| Pattern | Meaning |
|---------|---------|
| `test_<function>_<scenario>_<expected_result>` | Standard naming |
| `*_commands_test.rs` | IPC command handler tests |
| `*_e2e_test.rs` | End-to-end flow tests |
| `*_integration.rs` | Domain integration tests |
| `domain_invariants.rs` | Business rule tests |

## Test Harness Constraints

| Constraint | Reason |
|------------|--------|
| Tests run without Tauri UI | No `AppHandle`, no event loop |
| Each `TestApp` gets isolated in-memory SQLite | No shared state between tests |
| WAL mode disabled for in-memory | SQLite incompatibility |
| `foreign_keys = ON` applied | Match production PRAGMAs |
| Deterministic fixture IDs | Stable assertions |
| All timestamps use `chrono::Utc::now().timestamp_millis()` |ADR-012 |

## Cargo.toml Test Targets

```toml
[[test]]
name = "integration"
path = "tests/integration.rs"

[[test]]
name = "auth_commands_test"
path = "tests/commands/auth_commands_test.rs"

# ... per-command tests
```

## CI Enforcement

The CI pipeline fails if:
- Tests fail
- Coverage drops (on monitored paths)
- Linting or type-checking fails
- Schema drift is detected
- Architecture checks fail (`backend-architecture-check.js`)

## When Tests Are NOT Complete

A task is **NOT complete** if:
- Any test fails
- A new feature has no tests covering required scenarios
- The harness panics or fails to compile
- A failing test was suppressed, commented out, or deleted instead of fixed

If a test failure cannot be resolved within the current task scope, you **must** add:
```rust
// TODO(issue-XXX): <reason>
```