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

## Backend Testing (Rust)

Backend tests are located in `src-tauri/src/domains/*/tests/` or as integration tests in `src-tauri/tests/`.

### Mandatory Scenarios per Change
| Change | Required Tests |
| --- | --- |
| **New Feature** | Success path + Validation failure + Permission failure |
| **Bug Fix** | Regression test proving the fix |
| **New IPC Command** | Success + Auth failure + Validation failure |
| **New RBAC Rule** | Authorized success + Unauthorized failure |

### The Test Harness
Always use `TestApp::new()` or `TestApp::seeded()` from the integration harness. **Never bypass the harness.**

```rust
#[tokio::test]
async fn test_create_task_success() {
    let app = TestApp::seeded().await;
    let ctx = app.admin_ctx();
    let result = app.services.task.create(request, &ctx).await;
    assert!(result.is_ok());
}
```

### Commands
- `cd src-tauri && cargo test <domain>`: Test a specific domain.
- `cd src-tauri && cargo test --test integration`: Run full integration suite.
- `make test`: Run all tests in the project.

## Frontend Testing (TypeScript)

### 1. Unit & Component Tests
Located in `frontend/src/__tests__/` or alongside components.
- Tool: **Jest** + **React Testing Library**.
- Command: `cd frontend && npm run test`.

### 2. E2E Tests
Located in `frontend/tests/e2e/`.
- Tool: **Playwright**.
- Command: `cd frontend && npm run test:e2e`.

## Validation Tests
Target the Application layer directly with invalid inputs to ensure business rules are enforced.

## CI Enforcement
The CI pipeline fails if:
- Tests fail.
- Coverage drops (on monitored paths).
- Linting or type-checking fails.
- Schema drift is detected.
