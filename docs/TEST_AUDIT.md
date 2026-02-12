# Test Audit & Coverage Report

**Date**: 2026-02-12
**Scope**: Full-stack test coverage analysis across frontend, backend, and E2E layers
**Goal**: Identify missing tests by flow and layer, propose a prioritized test plan, and suggest CI quality gates

---

## 1. Current Test Inventory

### 1.1 Frontend Tests (59 files)

| Category | Count | Examples |
|----------|-------|---------|
| Component tests | 26 | `TaskDetails.test.tsx`, `MaterialForm.test.tsx`, `ReportContent.test.tsx` |
| Hook tests | 8 | `useInventory.test.tsx`, `useTaskState.test.ts`, `useAutoSave.test.ts` |
| Integration tests | 4 | `WorkflowProgressCard.integration.test.tsx`, `useTasks.integration.test.tsx` |
| IPC contract tests | 12 | `tasks-ipc-contract.test.ts`, `interventions-ipc-contract.test.ts` |
| E2E tests (Playwright) | 6 | `user-authentication.spec.ts`, `tasks-creation.spec.ts` |
| Smoke/utility tests | 3 | `settings-routes.smoke.test.ts`, `mockData.test.ts` |

### 1.2 Backend Tests (80+ files)

| Category | Count | Examples |
|----------|-------|---------|
| Unit tests (`src/tests/unit/`) | 25 | `auth_service_tests.rs`, `task_crud_tests.rs` |
| Integration tests (`src/tests/integration/`) | 20 | `client_task_intervention_material_flow.rs`, `workflow_tests.rs` |
| Property-based tests (`src/tests/proptests/`) | 11 | `auth_service_proptests.rs`, `task_validation_proptests.rs` |
| Migration tests (`src/tests/migrations/`) | 10 | `test_008_workflow_constraints.rs` |
| Command integration tests (`tests/commands/`) | 7 | `auth_commands_test.rs`, `task_commands_test.rs` |
| Embedded `#[cfg(test)]` modules | 60+ | Inline tests across services, repositories, commands |
| Benchmarks | 3 | `task_benchmarks.rs`, `intervention_benchmarks.rs` |

### 1.3 CI Pipeline (`.github/workflows/ci.yml`)

| Job | What It Does | Status |
|-----|-------------|--------|
| `frontend` | Lint + build (no tests) | ⚠️ Tests not run |
| `rust` | fmt + clippy + `cargo test` | ✅ Active |
| `security` | cargo-audit + cargo-deny | ✅ Active |
| `coverage` | tarpaulin (Rust only) | ✅ Active |
| `build` | Multi-platform bundles | ✅ Active |

---

## 2. Missing Tests by Critical Flow

### 2.1 Login / Authentication Flow

```
Login Page → auth_login → AuthService.authenticate() → UserRepository → Session
```

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| Frontend component | — | ❌ `LoginForm.test.tsx` — form validation, error display, loading state |
| Frontend hook | — | ❌ `useAuth.test.ts` — signIn/signOut, session persistence, token refresh |
| IPC contract | — | ❌ `auth-ipc-contract.test.ts` — AUTH_LOGIN argument shape, response envelope |
| Backend service | `auth_service_tests.rs` ✅ | — |
| Backend commands | `auth_commands_test.rs` ✅ | — |
| E2E | `user-authentication.spec.ts` ✅ | — |

**Gap summary**: Frontend layer for authentication is completely untested.

### 2.2 Task Creation Flow

```
Task Form → TASK_CRUD (Create) → TaskCreationService → TaskRepository + validation
```

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| Frontend component | `TaskManager.test.tsx` ✅, `TaskDetails.test.tsx` ✅ | — |
| Frontend hook | `useTaskState.test.ts` ✅ | — |
| IPC contract | `tasks-ipc-contract.test.ts` ✅ | — |
| Backend service | `task_creation_service_tests.rs` ✅, `task_crud_tests.rs` ✅ | — |
| Backend commands | `task_commands_test.rs` ✅ | — |
| E2E | `tasks-creation.spec.ts` ✅ | — |

**Gap summary**: Well covered across all layers. ✅

### 2.3 Intervention Start Flow

```
Workflow Page → INTERVENTION_WORKFLOW (Start) → InterventionService.start_intervention()
```

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| Frontend component | `WorkflowProgressCard.test.tsx` ✅ | ❌ Workflow step components (Preparation, Installation, Inspection pages) |
| Frontend hook | `useInterventionData.test.tsx` ✅ | — |
| IPC contract | `interventions-ipc-contract.test.ts` ✅ | — |
| Backend service | `intervention_workflow_tests.rs` ✅ | — |
| Backend integration | `workflow_tests.rs` ✅ | — |
| E2E | `intervention-management.spec.ts` ✅ | — |

**Gap summary**: Frontend workflow step pages lack unit tests.

### 2.4 Intervention Finalization Flow

```
Finalization Step → INTERVENTION_MANAGEMENT (Finalize) → finalize_intervention()
```

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| Frontend component | `WorkflowProgressCard.integration.test.tsx` ✅ | ❌ Finalization step component test |
| Frontend hook | — | ❌ `useInterventionFinalization.test.ts` — finalize action, validation, error handling |
| IPC contract | `interventions-ipc-contract.test.ts` ✅ | — |
| Backend service | `intervention_workflow_tests.rs` ✅ | — |
| Backend integration | `client_task_intervention_material_flow.rs` ✅ | — |
| E2E | `intervention-management.spec.ts` ✅ | — |

**Gap summary**: Frontend finalization-specific tests missing.

### 2.5 Client Management Flow

```
Clients Page → CLIENT_CRUD → ClientService → ClientRepository
```

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| Frontend component | — | ❌ `ClientForm.test.tsx` — create/edit form, validation |
| Frontend hook | — | ❌ `useClients.test.ts` — CRUD operations, search, filtering |
| IPC contract | `clients-ipc-contract.test.ts` ✅ | — |
| Backend service | `client_service_tests.rs` ✅ | — |
| Backend commands | `client_commands_test.rs` ✅ | — |
| E2E | `client-lifecycle.spec.ts` ✅ | — |

**Gap summary**: Frontend component and hook tests missing for clients.

### 2.6 Inventory Management Flow

```
Inventory Page → material_* commands → MaterialService → MaterialRepository
```

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| Frontend component | `InventoryManager.test.tsx` ✅, `MaterialForm.test.tsx` ✅, `StockLevelIndicator.test.tsx` ✅ | — |
| Frontend hook | `useInventory.test.tsx` ✅ | — |
| IPC contract | `inventory-ipc-contract.test.ts` ✅ | — |
| Backend service | `material_service_tests.rs` ✅ | — |
| Backend integration | `inventory_integration_tests.rs` ✅ | — |
| E2E | `inventory-management.spec.ts` ✅ | — |

**Gap summary**: Well covered. ✅

### 2.7 Report Generation Flow

```
Reports Page → get_*_report commands → ReportService → PDF generation
```

| Layer | What Exists | What's Missing |
|-------|-------------|----------------|
| Frontend component | `ReportContent.test.tsx` ✅, `ExportControls.test.tsx` ✅ | — |
| Frontend integration | `ReportsPage.integration.test.tsx` ✅ | — |
| IPC contract | — | ❌ `reports-ipc-contract.test.ts` — report command argument shapes |
| Backend service | — | ❌ `pdf_report_service_tests.rs` — PDF generation, data formatting |
| Backend commands | — | ❌ Report command handler tests |
| E2E | `report-generation.spec.ts` ✅ | — |

**Gap summary**: Backend report service and command tests missing, no IPC contract test.

---

## 3. Missing Tests by Layer

### 3.1 Frontend — Components (Missing)

| Component | Flow | Priority |
|-----------|------|----------|
| `LoginForm` (login page) | Authentication | 🔴 High |
| `ClientForm` (client create/edit) | Client management | 🟠 Medium |
| Workflow step pages (Preparation, Installation, Inspection, Finalization) | Intervention workflow | 🟠 Medium |
| `DashboardPage` (dashboard) | Dashboard | 🟡 Low |
| `UserForm` — additional RBAC scenarios | User management | 🟡 Low |

### 3.2 Frontend — Hooks (Missing)

| Hook | Flow | Priority |
|------|------|----------|
| `useAuth` | Authentication | 🔴 High |
| `useClients` | Client management | 🟠 Medium |
| `useInterventionFinalization` or equivalent | Intervention finalization | 🟠 Medium |
| `useReports` | Report generation | 🟡 Low |
| `useCalendar` | Calendar | 🟡 Low |

### 3.3 Frontend — IPC Contracts (Missing)

| Contract | Flow | Priority |
|----------|------|----------|
| `auth-ipc-contract.test.ts` | Authentication | 🔴 High |
| `reports-ipc-contract.test.ts` | Reports | 🟠 Medium |
| `calendar-ipc-contract.test.ts` | Calendar | 🟡 Low |
| `user-ipc-contract.test.ts` | User management | 🟡 Low |

### 3.4 Backend — Services Without Dedicated Tests

| Service | Flow | Priority |
|---------|------|----------|
| `pdf_report.rs` / `pdf_generation.rs` | Report generation | 🔴 High |
| `dashboard.rs` | Dashboard data aggregation | 🟠 Medium |
| `calendar.rs` / `calendar_event_service.rs` | Calendar management | 🟡 Low |
| `geo.rs` | GPS/geolocation | 🟡 Low |
| `notification.rs` | Notifications | 🟡 Low |
| `document_storage.rs` | Document storage | 🟡 Low |
| `photo/*.rs` | Photo management | 🟡 Low |
| `prediction.rs` | Predictive analytics | 🟡 Low |
| `alerting.rs` | Alert service | 🟡 Low |

### 3.5 Backend — Repositories Without Dedicated Tests

| Repository | Flow | Priority |
|------------|------|----------|
| `intervention_repository.rs` | Intervention persistence | 🟠 Medium (tested indirectly via integration) |
| `calendar_event_repository.rs` | Calendar events | 🟡 Low |

### 3.6 CI Pipeline Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Frontend tests not run in CI | Unit/integration regressions slip through | 🔴 Critical |
| No frontend coverage tracking | No visibility into frontend quality trends | 🟠 High |
| Frontend lint commented out in CI | Style issues not caught | 🟠 High |
| No type drift check in CI | TS/Rust type mismatches possible | 🟠 High |

---

## 4. Test Plan — Top 10 Highest-Value Tests to Add

Prioritized by: **risk × blast radius × ease of implementation**

### Test 1: 🔴 CI Quality Gate — Run Frontend Tests in CI
**File**: `.github/workflows/ci.yml`
**What**: Add `npm run test:ci` step to the `frontend` CI job
**Why**: Currently zero frontend tests run in CI — all 59 test files are dead weight without it
**Impact**: Catches all frontend regressions automatically

### Test 2: 🔴 `useAuth` Hook Test
**File**: `frontend/src/hooks/__tests__/useAuth.test.ts`
**What**: Test `signIn()`, `signOut()`, session validation, token refresh, error handling
**Why**: Authentication is the gateway to the entire application — an untested auth hook is a critical gap
**Impact**: Covers login, logout, session persistence

### Test 3: 🔴 Auth IPC Contract Test
**File**: `frontend/src/lib/ipc/__tests__/auth-ipc-contract.test.ts`
**What**: Validate `AUTH_LOGIN`, `AUTH_LOGOUT`, `AUTH_VALIDATE_SESSION` argument shapes and response envelopes
**Why**: IPC contract mismatch between frontend/backend is a common source of runtime errors
**Impact**: Catches type mismatches before they reach production

### Test 4: 🔴 Login Form Component Test
**File**: `frontend/src/components/auth/__tests__/LoginForm.test.tsx`
**What**: Form validation (empty fields, invalid email), error display, loading state, successful submission
**Why**: Login is the first thing every user sees — broken login = broken app
**Impact**: Validates user-facing authentication experience

### Test 5: 🟠 PDF Report Service Test
**File**: `src-tauri/src/tests/unit/pdf_report_service_tests.rs`
**What**: Test report data formatting, PDF generation with valid/invalid inputs, edge cases (empty data sets)
**Why**: Report generation is a business-critical feature with no backend tests
**Impact**: Prevents broken report exports

### Test 6: 🟠 Client Form Component Test
**File**: `frontend/src/components/clients/__tests__/ClientForm.test.tsx`
**What**: Create form validation, edit mode pre-population, field constraints, submission
**Why**: Client management is a core CRUD flow; form component has no tests
**Impact**: Validates client data entry

### Test 7: 🟠 Reports IPC Contract Test
**File**: `frontend/src/lib/ipc/__tests__/reports-ipc-contract.test.ts`
**What**: Validate report command argument shapes and response types
**Why**: Report commands pass complex filter/date range parameters that must match backend expectations
**Impact**: Catches report API contract drift

### Test 8: 🟠 Dashboard Data Hook Test
**File**: `frontend/src/__tests__/hooks/useDashboardData.test.ts` (extend existing)
**What**: Test data aggregation, loading states, refresh logic, error recovery
**Why**: Dashboard is the landing page after login — data loading issues directly impact UX
**Impact**: Ensures reliable dashboard rendering

### Test 9: 🟠 Intervention Repository Test
**File**: `src-tauri/src/tests/unit/intervention_repository_tests.rs`
**What**: CRUD operations, state transitions, query filtering
**Why**: Only tested indirectly through integration tests — direct unit tests catch edge cases earlier
**Impact**: Strengthens the data layer for the core intervention workflow

### Test 10: 🟡 Workflow Step Component Tests
**File**: `frontend/src/app/tasks/[id]/workflow/ppf/steps/__tests__/`
**What**: Test each step page (Preparation, Installation, Inspection, Finalization) renders correctly with mock data
**Why**: Workflow steps are the core PPF feature — untested step pages risk breaking the main workflow
**Impact**: Validates the primary business workflow UI

---

## 5. CI "Quality Gate" Suggestion

### Current State

The CI pipeline runs frontend build but **skips all frontend tests**. The lint step is commented out. There is no type drift check in CI. Backend testing and coverage are solid.

### Proposed CI Quality Gate

Add these steps to the existing `frontend` job in `.github/workflows/ci.yml`:

```yaml
# In the existing 'frontend' job, after "Install deps":

- name: Lint
  working-directory: frontend
  run: npm run lint

- name: Type check
  working-directory: frontend
  run: npm run type-check

- name: Run tests
  working-directory: frontend
  run: npm run test:ci

- name: Type drift check
  run: npm run types:ci-drift-check
```

### Why These Steps

| Step | Rationale |
|------|-----------|
| `npm run lint` | Catch style/correctness issues (currently commented out) |
| `npm run type-check` | Catch TypeScript errors (not in CI today) |
| `npm run test:ci` | Run all frontend unit/integration tests with coverage (`--passWithNoTests` ensures no failure on zero tests) |
| `npm run types:ci-drift-check` | Verify TypeScript types match Rust models (script already exists, not in CI) |

### Coverage Thresholds

The `test:coverage:check` script already enforces 70% thresholds for branches, functions, lines, and statements. Once frontend test coverage is stable, upgrade the CI step from `test:ci` to `test:coverage:check` to enforce minimums.

### Migration Path

1. **Phase 1 (now)**: Add `lint`, `type-check`, `test:ci` to CI — these will pass with `--passWithNoTests`
2. **Phase 2 (after adding top-10 tests)**: Switch to `test:coverage:check` with 70% thresholds
3. **Phase 3 (mature)**: Add E2E test job for critical flows (requires running app in CI)

---

## 6. Summary

### Coverage Heatmap by Flow

| Flow | Frontend | IPC | Backend | E2E | Overall |
|------|----------|-----|---------|-----|---------|
| Authentication | ❌ 0% | ❌ 0% | ✅ 90% | ✅ Yes | 🟠 Partial |
| Task Creation | ✅ 80% | ✅ Yes | ✅ 95% | ✅ Yes | ✅ Strong |
| Intervention Start | ✅ 60% | ✅ Yes | ✅ 90% | ✅ Yes | ✅ Good |
| Intervention Finalize | 🟡 30% | ✅ Yes | ✅ 90% | ✅ Yes | 🟠 Partial |
| Client Management | ❌ 0% | ✅ Yes | ✅ 85% | ✅ Yes | 🟠 Partial |
| Inventory | ✅ 90% | ✅ Yes | ✅ 95% | ✅ Yes | ✅ Strong |
| Reports | ✅ 70% | ❌ 0% | ❌ 0% | ✅ Yes | 🟠 Partial |

### Key Takeaway

The backend is well-tested with 80+ test files covering unit, integration, property-based, and migration testing. The frontend has good component and hook test coverage for inventory and task flows, but **authentication, client management, and report backend layers have critical gaps**. The most impactful immediate action is **enabling frontend tests in CI** (Test 1) — this costs nothing and unlocks the value of all 59 existing test files.
