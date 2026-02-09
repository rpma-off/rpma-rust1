# RPMA v2 Test Map

This document provides a comprehensive mapping of test files to their corresponding production code files, indicating the type of test and current status.

## Legend

- **Test Type**: unit, integration, contract/IPC, DB, migration, frontend-unit, e2e
- **Status**: 
  - OK: Test is up-to-date and properly testing the intended functionality
  - suspect: Test may have issues or needs review
  - obsolete: Test is outdated and no longer relevant
  - missing: Critical functionality lacks test coverage

## Critical Business Logic Tests

### Authentication Module

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `src-tauri/src/tests/unit/auth_service_tests.rs` | `src-tauri/src/services/auth.rs` | Login validation, token generation, password hashing, session management | unit | ✅ OK | Comprehensive coverage, includes rate limiting, password changes |
| `src-tauri/tests/commands/auth_commands_test.rs` | `src-tauri/src/commands/auth.rs` | IPC command handlers for auth flows | contract/IPC | ⚠️ suspect | Uses outdated import paths, needs review |
| `frontend/src/lib/ipc/__tests__/security-arg-shape.test.ts` | `frontend/src/lib/ipc/domains/auth.ts` | Frontend auth IPC client integration | contract/IPC | ✅ OK | Tests argument shapes for security commands |
| `frontend/src/components/auth/**/__tests__/` | `frontend/src/components/auth/` | Auth UI components (Login, 2FA forms) | frontend-unit | 🚫 missing | No auth component tests found |
| `src-tauri/src/tests/integration/session_repository_test.rs` | `src-tauri/src/repositories/session_repository.rs` | Session storage and retrieval | integration | ✅ OK | Tests session CRUD operations |

### Task Management Module

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `src-tauri/src/tests/unit/task_validation_service_tests.rs` | `src-tauri/src/services/task.rs` | Task validation rules, business logic | unit | ✅ OK | Comprehensive validation testing including status transitions |
| `src-tauri/tests/commands/task_commands_test.rs` | `src-tauri/src/commands/task/` | Task CRUD IPC commands | contract/IPC | ⚠️ suspect | Tests need to match current model structure |
| `src-tauri/src/tests/integration/task_repository_test.rs` | `src-tauri/src/repositories/task_repository.rs` | Task data access layer | integration | ✅ OK | Tests CRUD operations at repository level |
| `frontend/src/lib/ipc/__tests__/tasks.test.ts` | `frontend/src/lib/ipc/domains/tasks.ts` | Frontend task IPC client integration | contract/IPC | 🚫 missing | No task IPC client tests found |
| `frontend/src/components/tasks/__tests__/TaskManager.test.tsx` | `frontend/src/components/tasks/TaskManager.tsx` | Task management component | frontend-unit | ✅ OK | Tests task list functionality |
| `frontend/src/components/tasks/__tests__/TaskDetails.test.tsx` | `frontend/src/components/tasks/TaskDetails.tsx` | Task detail view component | frontend-unit | ✅ OK | Tests task detail display |

### Intervention Workflow Module

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `src-tauri/src/tests/integration/intervention_repository_test.rs` | `src-tauri/src/repositories/intervention_repository.rs` | Intervention data access patterns | integration | ✅ OK | Tests intervention CRUD operations |
| `src-tauri/tests/commands/intervention_commands_test.rs` | `src-tauri/src/commands/intervention/` | Intervention workflow IPC commands | contract/IPC | ⚠️ suspect | Tests need model structure updates |
| `src-tauri/src/tests/unit/intervention_workflow_tests.rs` | `src-tauri/src/services/intervention_workflow.rs` | Workflow state transitions | unit | ✅ OK | Comprehensive workflow testing |
| `frontend/src/components/intervention/**/__tests__/` | `frontend/src/components/intervention/` | Intervention UI components | frontend-unit | 🚫 missing | No intervention UI tests found |
| `frontend/src/lib/ipc/__tests__/interventions.test.ts` | `frontend/src/lib/ipc/domains/interventions.ts` | Frontend intervention IPC client | contract/IPC | 🚫 missing | No intervention IPC tests found |

## Database Layer Tests

### Migration Tests

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `src-tauri/src/tests/migrations/migration_test.rs` | `src-tauri/migrations/` | Migration application, rollback | migration | TBD | To be audited |
| `src-tauri/src/tests/migrations/schema_validation_test.rs` | `src-tauri/migrations/` | Schema integrity checks | migration | TBD | To be audited |
| `src-tauri/src/tests/integration/session_repository_test.rs` | `src-tauri/migrations/` | Foreign key constraints | migration | TBD | To be audited |

### Repository Tests

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `src-tauri/src/tests/integration/task_repository_test.rs` | `src-tauri/src/repositories/task_repository.rs` | Task CRUD operations | integration | TBD | To be audited |
| `src-tauri/src/tests/intervention_repository_test.rs` | `src-tauri/src/repositories/intervention_repository.rs` | Intervention CRUD operations | integration | TBD | To be audited |
| `src-tauri/src/tests/integration/session_repository_test.rs` | `src-tauri/src/repositories/session_repository.rs` | Session management | integration | TBD | To be audited |
| `src-tauri/src/tests/integration/audit_repository_test.rs` | `src-tauri/src/repositories/audit_repository.rs` | Audit logging | integration | TBD | To be audited |

## Frontend Tests

### Component Tests

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `frontend/src/components/ui/**/__tests__/` | `frontend/src/components/ui/` | shadcn/ui component usage | frontend-unit | TBD | To be audited |
| `frontend/src/components/auth/**/__tests__/` | `frontend/src/components/auth/` | Authentication forms and flows | frontend-unit | TBD | To be audited |
| `frontend/src/components/tasks/**/__tests__/` | `frontend/src/components/tasks/` | Task management UI | frontend-unit | TBD | To be audited |
| `frontend/src/components/intervention/**/__tests__/` | `frontend/src/components/intervention/` | Intervention workflow UI | frontend-unit | TBD | To be audited |

### Hook Tests

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `frontend/src/hooks/__tests__/useAuth.test.ts` | `frontend/src/hooks/useAuth.ts` | Authentication state management | frontend-unit | TBD | To be audited |
| `frontend/src/hooks/__tests__/useTasks.test.ts` | `frontend/src/hooks/useTasks.ts` | Task data fetching and caching | frontend-unit | TBD | To be audited |
| `frontend/src/hooks/__tests__/useIntervention.test.ts` | `frontend/src/hooks/useIntervention.ts` | Intervention state management | frontend-unit | TBD | To be audited |

### IPC Client Tests

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `frontend/src/lib/ipc/__tests__/client.test.ts` | `frontend/src/lib/ipc/client.ts` | Base IPC client implementation | contract/IPC | TBD | To be audited |
| `frontend/src/lib/ipc/__tests__/auth.test.ts` | `frontend/src/lib/ipc/domains/auth.ts` | Auth IPC integration | contract/IPC | TBD | To be audited |
| `frontend/src/lib/ipc/__tests__/tasks.test.ts` | `frontend/src/lib/ipc/domains/tasks.ts` | Tasks IPC integration | contract/IPC | TBD | To be audited |
| `frontend/src/lib/ipc/__tests__/interventions.test.ts` | `frontend/src/lib/ipc/domains/interventions.ts` | Intervention IPC integration | contract/IPC | TBD | To be audited |

## End-to-End Tests

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `frontend/tests/e2e/auth.spec.ts` | Full auth flow | Login, 2FA, logout | e2e | TBD | To be audited |
| `frontend/tests/e2e/task-management.spec.ts` | Task CRUD | Create, update, delete tasks | e2e | TBD | To be audited |
| `frontend/tests/e2e/intervention-workflow.spec.ts` | Intervention flow | Start intervention, complete steps | e2e | TBD | To be audited |
| `frontend/tests/e2e/calendar.spec.ts` | Calendar functionality | Schedule, reschedule tasks | e2e | TBD | To be audited |

## Property-Based Tests

| Test File | Target Files | Functionality Covered | Type | Status | Notes |
|-----------|--------------|---------------------|------|--------|-------|
| `src-tauri/src/tests/proptests/task_validation_proptests.rs` | `src-tauri/src/services/task.rs` | Edge cases in task validation | property | TBD | To be audited |
| `src-tauri/src/tests/proptests/auth_service_proptests.rs` | `src-tauri/src/services/auth.rs` | Edge cases in auth logic | property | TBD | To be audited |

## Missing Tests

### Critical Missing Test Coverage

| Area | Missing Tests | Impact | Priority |
|------|---------------|--------|----------|
| IPC Command Error Handling | Tests for Validation/NotFound/Authorization errors | High | Critical business rules not tested |
| Client Management IPC | Tests for client CRUD commands | High | Client data operations untested |
| Material Management IPC | Tests for inventory and consumption commands | High | Inventory tracking untested |
| Reporting IPC | Tests for report generation and metrics | High | Business insights unverified |
| Migration Rollbacks | Tests for migration failure scenarios | High | Database integrity at risk |
| Sync Queue | Tests for offline-first sync logic | High | Core functionality untested |
| Photo Processing | Tests for photo upload and processing | Medium | Feature quality at risk |
| Settings Management | Tests for settings get/update commands | Medium | User preferences untested |

### Potentially Obsolete Tests

| Test File | Reason for Obsolescence | Action Required |
|-----------|------------------------|-----------------|
| To be identified during audit | To be determined during audit | Review and update or remove |

## Test Execution Commands

### Backend Tests
```bash
# Run all backend tests
cd src-tauri && cargo test

# Run specific test modules
cd src-tauri && cargo test auth_service
cd src-tauri && cargo test task_validation
cd src-tauri && cargo test intervention_workflow
```

### Frontend Tests
```bash
# Run all frontend tests
cd frontend && npm run test

# Run specific test patterns
cd frontend && npm run test -- --testNamePattern="auth"
cd frontend && npm run test -- --testNamePattern="tasks"
cd frontend && npm run test -- --testNamePattern="intervention"
```

### E2E Tests
```bash
# Run all e2e tests
cd frontend && npm run test:e2e

# Run specific e2e tests
cd frontend && npm run test:e2e -- --grep="Authentication"
cd frontend && npm run test:e2e -- --grep="Task Management"
```

### Coverage Reports
```bash
# Backend coverage (if configured)
cd src-tauri && cargo llvm-cov

# Frontend coverage
cd frontend && npm run test:coverage
```

## Next Steps

1. Audit critical business logic tests first (auth, tasks, interventions)
2. Update status column for each test after review
3. Create TEST_HEALTH_REPORT.md with findings
4. Implement fixes for high-priority issues
5. Expand audit to remaining test areas

This map will be continuously updated during the audit process.