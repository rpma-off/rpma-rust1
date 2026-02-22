# TESTING_GUIDELINES.md — Test Conventions & Anti-Patterns

> Project: RPMA v2 (Tauri + Next.js)
> Last updated: 2026-02-22

---

## 1. When to Update Tests

| Trigger | Required Action |
|---------|----------------|
| **New feature** | Write tests for: happy path + validation failure + permission failure |
| **Bug fix** | Write a regression test that fails before the fix and passes after |
| **Migration added** | Write migration test verifying schema change + integrity |
| **IPC command added** | Write IPC contract test (backend) + arg-shape test (frontend) |
| **Field/enum renamed** | Update all tests referencing the old name |
| **Business rule changed** | Update affected unit tests to reflect the new rule |
| **Model change with `#[derive(TS)]`** | Run `npm run types:sync`, then verify frontend IPC contract tests |

---

## 2. Test Types & Where They Live

| Type | Location (Backend) | Location (Frontend) | Purpose |
|------|-------------------|---------------------|---------|
| **Unit** | `domains/*/tests/unit_*.rs` or `tests/unit/` | `domains/*/__.test.ts` | Test a single function/method in isolation |
| **Integration** | `domains/*/tests/integration_*.rs` or `tests/integration/` | `__tests__/*.integration.test.ts` | Test multiple components with a real DB |
| **Validation** | `domains/*/tests/validation_*.rs` | `domains/*/validation.test.ts` | Test input validation rules specifically |
| **Permission** | `domains/*/tests/permission_*.rs` | — | Test RBAC / authorization enforcement |
| **Property** | `tests/proptests/` | — | Fuzz-test with random inputs (proptest) |
| **Migration** | `tests/migrations/test_NNN_*.rs` | — | Verify schema changes apply correctly |
| **IPC Contract** | `tests/commands/*_test.rs` | `lib/ipc/__tests__/*-ipc-contract.test.ts` | Verify command shapes and error codes |
| **E2E** | — | `tests/e2e/*.spec.ts` | Full user journey through the UI |

---

## 3. Naming Conventions

### Backend (Rust)

```
# Test file names
unit_<domain>.rs           # e.g., unit_inventory.rs
integration_<domain>.rs    # e.g., integration_clients.rs
validation_<domain>.rs     # e.g., validation_tasks.rs
permission_<domain>.rs     # e.g., permission_auth.rs

# Test function names
#[test]
fn <action>_<condition>_<expected_result>() { }

# Examples:
fn create_material_with_valid_data_succeeds()
fn create_material_with_empty_sku_returns_validation_error()
fn delete_material_without_admin_role_returns_forbidden()
fn stock_update_below_zero_returns_error()
```

### Frontend (TypeScript)

```
# Test file names
<ComponentName>.test.tsx
<hook-name>.test.ts
<domain>-ipc-contract.test.ts

# Test descriptions (describe/it)
describe('<ComponentName>')
  it('renders correctly with valid props')
  it('shows error message when validation fails')
  it('disables submit button when form is invalid')
```

---

## 4. Anti-Patterns — What NOT to Do

### ❌ Debug Output Tests

```rust
// BAD — tests implementation detail, not behavior
#[test]
fn facade_debug_output() {
    let facade = MyFacade::new(service);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("MyFacade"));
}
```

**Why it's bad:** If the struct name changes or Debug impl changes, the test fails for the wrong reason. It doesn't test any behavior.

**Fix:** Test actual behavior instead:

```rust
// GOOD — tests business behavior
#[tokio::test]
async fn list_materials_returns_empty_on_clean_db() {
    let db = Arc::new(Database::new_in_memory().await.unwrap());
    let service = Arc::new(MaterialService::new((*db).clone()));
    let facade = InventoryFacade::new(db, service);
    let result = facade.list_materials(None, None).await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_empty());
}
```

### ❌ Arc Pointer Equality Tests

```rust
// BAD — tests internal implementation detail
#[test]
fn service_is_shared_reference() {
    let facade = MyFacade::new(service);
    let svc1 = facade.service();
    let svc2 = facade.service();
    assert!(Arc::ptr_eq(svc1, svc2));
}
```

**Why it's bad:** This tests that Arc sharing works (which is a Rust stdlib guarantee, not your code). It doesn't test any domain behavior.

### ❌ Duplicate Tests Across Files

```rust
// BAD — exact same test in unit_foo.rs, integration_foo.rs, validation_foo.rs, permission_foo.rs
// Each file only has a debug output smoke test
```

**Why it's bad:** Creates maintenance burden with no coverage value. Replace each file with tests appropriate to its category.

### ❌ Tests Without Assertions

```rust
// BAD — runs code but doesn't verify anything
#[test]
fn create_service() {
    let service = MyService::new(db);
    // no assertions!
}
```

### ❌ Over-Mocking

```typescript
// BAD — mocks so much that the test doesn't exercise real logic
jest.mock('@/lib/ipc/client');
jest.mock('@/domains/tasks/hooks');
jest.mock('@/domains/auth/hooks');
// ... 10 more mocks
it('renders', () => { render(<Component />); }); // What is this testing?
```

### ❌ Flaky / Non-Deterministic Tests

```rust
// BAD — depends on timing
#[test]
fn operation_completes_within_timeout() {
    let start = Instant::now();
    do_operation();
    assert!(start.elapsed() < Duration::from_millis(100)); // Flaky on CI
}
```

---

## 5. Good Patterns — What TO Do

### ✅ Test Behavior, Not Implementation

```rust
// Test what the function DOES, not HOW it does it
#[tokio::test]
async fn update_stock_rejects_negative_result() {
    // Setup: create material with stock = 5
    let material = create_test_material(&db, 5.0).await;

    // Act: try to remove 10 (would result in -5)
    let result = service.update_stock(UpdateStockRequest {
        material_id: material.id,
        quantity_change: -10.0,
        reason: "test".into(),
        recorded_by: Some("test_user".into()),
    });

    // Assert: operation should fail
    assert!(result.is_err());
}
```

### ✅ Test the Error Cases

```rust
// Always test that errors are correct and informative
#[tokio::test]
async fn create_task_with_empty_title_returns_validation_error() {
    let result = service.create_task(CreateTaskRequest {
        title: "".to_string(),
        ..default_request()
    });

    match result {
        Err(AppError::Validation(msg)) => assert!(msg.contains("title")),
        other => panic!("Expected Validation error, got {:?}", other),
    }
}
```

### ✅ Use Test Helpers / Factories

```rust
// Use TestDatabase and factory functions
fn create_test_material(db: &Database, initial_stock: f64) -> Material {
    // Shared helper to create a material with known state
}
```

### ✅ One Assertion Theme Per Test

```rust
// GOOD — focused test
#[test]
fn stock_cannot_go_negative() {
    let result = validate_stock_change(5.0, -10.0);
    assert!(result.is_err());
}
```

---

## 6. Test File Template (Backend Domain)

When creating tests for a new domain, use this structure:

```rust
// domains/my_domain/tests/mod.rs
pub mod unit_my_domain;
pub mod integration_my_domain;
pub mod validation_my_domain;
pub mod permission_my_domain;

// domains/my_domain/tests/unit_my_domain.rs
use std::sync::Arc;
use crate::db::Database;
use crate::domains::my_domain::MyDomainFacade;

#[tokio::test]
async fn facade_creates_successfully() {
    let db = Arc::new(Database::new_in_memory().await.unwrap());
    let facade = MyDomainFacade::new(db);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn list_items_returns_empty_on_clean_db() {
    let db = Arc::new(Database::new_in_memory().await.unwrap());
    let facade = MyDomainFacade::new(db);
    let items = facade.list_items().await.unwrap();
    assert!(items.is_empty());
}
```

---

## 7. Quick Reference — Running Tests

```bash
# Run all backend tests
cd src-tauri && cargo test --lib

# Run tests for a specific domain
cd src-tauri && cargo test --lib -- domains::inventory
cd src-tauri && cargo test --lib -- domains::tasks

# Run a specific test by name
cd src-tauri && cargo test --lib -- stock_cannot_go_negative

# Run frontend tests
cd frontend && npm test

# Run E2E tests
cd frontend && npm run test:e2e

# Run full quality gate
npm run quality:check
```
