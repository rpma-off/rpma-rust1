# TEST_HEALTH_REPORT.md — Diagnostic & Priorities

> Generated: 2026-02-22
> Project: RPMA v2 (Tauri + Next.js)

---

## Executive Summary

Overall test health is **good** for the core business logic (tasks, auth, interventions, materials). The main issues are:

1. **18 trivial/placeholder tests** across domain test suites that only verify debug output or Arc pointer equality
2. **2 domains with zero test coverage** (Analytics, Notifications)
3. **1 duplicate frontend IPC contract test file** (inventory)
4. **3 backup/leftover files** that should be cleaned up

No tests were found to be **obsolete** (referencing deleted symbols). The codebase has strong migration test coverage and good property-based testing.

---

## 🔴 Priority 1 — Tests That Test Nothing

These tests pass but provide no value. They only verify `format!("{:?}", facade).contains("TypeName")` or `Arc::ptr_eq()`.

### Inventory Domain — 4 identical placeholder tests

All four files contain the **exact same code** — only the function name differs:

| File | Function | Issue |
|------|----------|-------|
| `inventory/tests/unit_inventory.rs` | `unit_inventory_facade_smoke()` | Tests `debug.contains("InventoryFacade")` only |
| `inventory/tests/integration_inventory.rs` | `integration_inventory_facade_smoke()` | Identical to unit test |
| `inventory/tests/validation_inventory.rs` | `validation_inventory_facade_smoke()` | Identical to unit test |
| `inventory/tests/permission_inventory.rs` | `permission_inventory_facade_smoke()` | Identical to unit test |

**Recommendation:** Replace with meaningful tests:
- `unit_inventory.rs` → test `list_materials()` returns empty list on clean DB
- `integration_inventory.rs` → test create + list materials round-trip
- `validation_inventory.rs` → test stock validation edge cases (negative, zero, overflow)
- `permission_inventory.rs` → test that operations fail without valid session

### Other Domains — Debug Output / Arc Pointer Tests

| File | Function | Issue |
|------|----------|-------|
| `tasks/tests/permission_tasks.rs` | `tasks_facade_debug_output()` | Debug output only |
| `tasks/tests/permission_tasks.rs` | `tasks_facade_service_is_shared_reference()` | Arc::ptr_eq only |
| `interventions/tests/permission_interventions.rs` | `interventions_facade_debug_output()` | Debug output only |
| `interventions/tests/permission_interventions.rs` | `interventions_facade_service_is_shared_reference()` | Arc::ptr_eq only |
| `quotes/tests/permission_quotes.rs` | `quotes_facade_debug_output()` | Debug output only |
| `quotes/tests/permission_quotes.rs` | `quotes_facade_service_is_shared_reference()` | Arc::ptr_eq only |
| `clients/tests/permission_clients.rs` | `clients_facade_service_is_shared_reference()` | Arc::ptr_eq only |
| `audit/tests/unit_audit.rs` | `audit_facade_exposes_service()` | Arc::ptr_eq only |
| `sync/tests/permission_sync.rs` | `sync_facade_background_is_shared_reference()` | Arc::ptr_eq only |

**Recommendation:** Replace debug-output tests with behavioral tests. Keep Arc pointer tests only if shared-reference semantics are part of the public contract (unlikely).

---

## 🔴 Priority 2 — Missing Test Coverage

### Analytics Domain (`src-tauri/src/domains/analytics/tests/mod.rs`)

**Status:** File contains only a comment — no test functions.

**Production code available:**
- `AnalyticsFacade` with dashboard and KPI methods
- `AnalyticsService` with data aggregation
- IPC commands: `get_analytics_dashboard`, `get_analytics_kpis`

**Impact:** Analytics is a reporting feature. Missing tests mean regressions in KPI calculations could go undetected.

**Recommendation:** Add at least:
- `test_analytics_facade_creation` — facade initializes correctly
- `test_get_dashboard_empty_db` — dashboard returns defaults on empty DB
- `test_get_kpis_empty_db` — KPIs return zeroed metrics on empty DB

### Notifications Domain (`src-tauri/src/domains/notifications/tests/mod.rs`)

**Status:** File contains only a comment — no test functions.

**Production code available:**
- `NotificationsFacade` with notification CRUD
- `NotificationService` with delivery logic
- IPC commands: `get_notifications`, `mark_notification_read`

**Impact:** Notifications are a secondary feature. Lower priority than analytics.

**Recommendation:** Add at least:
- `test_notifications_facade_creation` — facade initializes correctly

---

## ⚠️ Priority 3 — Duplicate / Inconsistent Tests

### Duplicate Frontend Inventory IPC Contract

| File | Status |
|------|--------|
| `frontend/src/lib/ipc/__tests__/inventory-ipc-contract.test.ts` | Original — tests IPC shapes correctly |
| `frontend/src/lib/ipc/__tests__/inventory-ipc-contract-new.test.ts` | Duplicate — same commands, different import paths |

**Issue:** The "new" file imports from `@/domains/inventory/server` instead of `../client`, and uses inconsistent parameter naming (`sessionToken` vs `user_id`).

**Recommendation:** Consolidate into a single file or ensure both test distinct aspects.

---

## ⚠️ Priority 4 — Cleanup

### Backup Files

These files should be removed or added to `.gitignore`:

| File | Action |
|------|--------|
| `src-tauri/src/bin/export-types.rs.bak` | Remove — backup of type export utility |
| `src-tauri/src/tests/unit/inventory_transaction_tests.rs.bak` | Remove — backup of transaction tests |
| `src-tauri/src/tests/unit/inventory_transaction_tests.rs.windows` | Remove — Windows-specific backup |

---

## ✅ Healthy Areas (No Action Needed)

### Strong Coverage

| Area | Details |
|------|---------|
| **Migration tests** | 20 migration tests covering all critical schema changes |
| **Task domain** | Comprehensive unit, integration, property, and command tests |
| **Auth domain** | Full lifecycle tests including 2FA |
| **Material/Inventory service** | Strong unit + integration + property coverage |
| **Workflow validation** | Tests for state machine transitions |
| **Cross-domain integration** | Tests for client→task→intervention→material flow |
| **Frontend IPC contracts** | All critical commands covered |
| **E2E tests** | Full user journeys for core features |

### Test Infrastructure

| Component | Status |
|-----------|--------|
| `TestDatabase` helper | ✅ Well-implemented with in-memory SQLite |
| `test_utils` | ✅ Shared factories and builders |
| Migration test framework | ✅ Reusable test harness |
| Property-based testing (proptest) | ✅ Good coverage of validation rules |

---

## Risk Assessment — Modules Without Adequate Tests

| Module | Last Modified | Test Coverage | Risk |
|--------|-------------|---------------|------|
| `inventory/facade.rs` | Recent | ⚠️ Only debug output tests | **Medium** |
| `analytics/` | Recent | 🔴 Zero domain tests | **Medium** |
| `notifications/` | Recent | 🔴 Zero domain tests | **Low** |
| `sync/facade.rs` | Stable | ⚠️ Only structural tests | **Low** |
| `reports/facade.rs` | Stable | ⚠️ Minimal tests | **Low** |

---

## Action Plan (Ordered by Priority)

1. **Replace 4 identical inventory placeholder tests** with behavioral tests
2. **Replace debug-output tests** in tasks, interventions, quotes permission files with behavioral tests
3. **Add analytics domain tests** (at least facade creation + empty DB queries)
4. **Add notifications domain tests** (facade creation)
5. **Remove 3 backup files** (.bak, .windows)
6. **Review duplicate inventory IPC contract** on frontend

---

## Test Commands Reference

```bash
# Backend (Rust)
cd src-tauri && cargo test --lib                    # All unit tests
cd src-tauri && cargo test --lib -- migrations      # Migration tests only
cd src-tauri && cargo test --lib -- performance     # Performance tests only
cd src-tauri && cargo test --lib -- proptests        # Property tests only

# Specific domain tests
cd src-tauri && cargo test --lib -- domains::inventory
cd src-tauri && cargo test --lib -- domains::analytics

# Command integration tests
make test-auth-commands
make test-client-commands
make test-user-commands
make test-intervention-cmds
make test-task-commands

# Frontend
cd frontend && npm test                             # All frontend tests
cd frontend && npm run test:e2e                     # Playwright E2E tests
cd frontend && npm run test:coverage                # Coverage report

# Full quality gate
npm run quality:check
```
