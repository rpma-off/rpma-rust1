# Test Map for RPMA Project

## Overview
This document maps all test files to their corresponding production code, functionality covered, test type, and current status.

## Backend Test Files

### Unit Tests (`src-tauri/src/tests/unit/`)

| Test File | Target Code | Functionality | Type | Status |
|------------|-------------|---------------|------|---------|
| `auth_service_tests.rs` | `src-tauri/src/services/auth.rs` | Authentication logic, session management | Unit | OK |
| `client_service_tests.rs` | `src-tauri/src/services/client.rs` | Client CRUD operations, validation | Unit | OK |
| `intervention_workflow_tests.rs` | `src-tauri/src/services/intervention.rs` | Intervention workflow state transitions | Unit | OK |
| `inventory_transaction_tests.rs` | `src-tauri/src/services/inventory.rs` | Stock movement, transaction logic | Unit | OK |
| `material_repository_tests.rs` | `src-tauri/src/repositories/material.rs` | Material data access operations | Unit | OK |
| `material_service_tests.rs` | `src-tauri/src/services/material.rs` | Material business logic, stock levels | Unit | OK |
| `security_monitor_service_tests.rs` | `src-tauri/src/services/security.rs` | Security event monitoring, alerts | Unit | OK |
| `task_creation_service_tests.rs` | `src-tauri/src/services/task_creation.rs` | Task creation validation, workflow | Unit | OK |
| `task_creation_tests.rs` | `src-tauri/src/models/task.rs` | Task model creation, validation | Unit | OK |
| `task_crud_tests.rs` | `src-tauri/src/repositories/task.rs` | Task CRUD database operations | Unit | OK |
| `task_deletion_tests.rs` | `src-tauri/src/services/task_deletion.rs` | Task deletion logic, constraints | Unit | OK |
| `task_update_tests.rs` | `src-tauri/src/services/task_update.rs` | Task update validation, business rules | Unit | OK |
| `task_validation_service_tests.rs` | `src-tauri/src/services/task_validation.rs` | Task validation rules, business logic | Unit | OK |
| `task_validation_tests.rs` | `src-tauri/src/models/task.rs` | Task model validation, constraints | Unit | OK |
| `two_factor_service_tests.rs` | `src-tauri/src/services/two_factor.rs` | 2FA generation, validation | Unit | OK |
| `workflow_validation_service_tests.rs` | `src-tauri/src/services/workflow_validation.rs` | Workflow state validation | Unit | OK |

### Integration Tests (`src-tauri/src/tests/integration/`)

| Test File | Target Code | Functionality | Type | Status |
|------------|-------------|---------------|------|---------|
| `audit_repository_test.rs` | `src-tauri/src/repositories/audit.rs` | Audit logging, retrieval | Integration | OK |
| `client_task_intervention_material_flow.rs` | Multiple services | Cross-domain data flow, dependencies | Integration | OK |
| `cross_domain_integration_tests.rs` | Multiple services | Service interaction, data consistency | Integration | OK |
| `intervention_material_tracking.rs` | `src-tauri/src/services/intervention.rs` | Material consumption in interventions | Integration | OK |
| `intervention_repository_test.rs` | `src-tauri/src/repositories/intervention.rs` | Intervention CRUD operations | Integration | OK |
| `material_integration_tests.rs` | `src-tauri/src/services/material.rs` | Material management, stock updates | Integration | OK |
| `network_resilience_tests.rs` | Various services | Behavior under network failures | Integration | OK |
| `performance_integration_tests.rs` | Critical paths | Performance benchmarks, bottlenecks | Integration | OK |
| `session_repository_test.rs` | `src-tauri/src/repositories/session.rs` | Session persistence, cleanup | Integration | OK |
| `task_lifecycle_tests.rs` | `src-tauri/src/services/task.rs` | Task state transitions, workflow | Integration | OK |
| `task_material_consumption_integration.rs` | Task/Material services | Material consumption tracking | Integration | OK |
| `task_repository_test.rs` | `src-tauri/src/repositories/task.rs` | Task persistence, queries | Integration | OK |
| `workflow_tests.rs` | `src-tauri/src/services/workflow.rs` | Workflow execution, state management | Integration | OK |

### Migration Tests (`src-tauri/src/tests/migrations/`)

| Test File | Target Migration | Functionality | Type | Status |
|------------|------------------|---------------|------|---------|
| `test_008_workflow_constraints.rs` | 008_workflow_constraints.sql | Workflow constraint creation | Migration | OK |
| `test_011_duplicate_interventions.rs` | 011_duplicate_interventions.sql | Duplicate prevention logic | Migration | OK |
| `test_012_material_tables.rs` | 012_material_tables.sql | Material table structure | Migration | OK |
| `test_019_enhanced_performance_indexes.rs` | 019_enhanced_performance_indexes.sql | Performance index creation | Migration | OK |
| `test_020_cache_metadata.rs` | 020_cache_metadata.sql | Cache table structure | Migration | OK |
| `test_027_task_constraints.rs` | 027_task_constraints.sql | Task constraint validation | Migration | OK |
| `test_framework.rs` | All migrations | Migration testing utilities | Migration | OK |

### Property-Based Tests (`src-tauri/src/tests/proptests/`)

| Test File | Target Code | Functionality | Type | Status |
|------------|-------------|---------------|------|---------|
| `auth_service_proptests.rs` | `src-tauri/src/services/auth.rs` | Auth with random inputs, edge cases | Property-based | OK |
| `audit_service_proptests.rs` | `src-tauri/src/services/audit.rs` | Audit with random events | Property-based | OK |
| `client_validation_proptests.rs` | `src-tauri/src/services/client.rs` | Client validation with random data | Property-based | OK |
| `task_validation_proptests.rs` | `src-tauri/src/models/task.rs` | Task validation edge cases | Property-based | OK |
| `task_validation_service_proptests.rs` | `src-tauri/src/services/task_validation.rs` | Validation service robustness | Property-based | OK |

### Command Tests (`src-tauri/tests/commands/`)

| Test File | Target Commands | Functionality | Type | Status |
|------------|-----------------|---------------|------|---------|
| `auth_commands_test.rs` | `src-tauri/src/commands/auth.rs` | Auth IPC endpoints, error handling | Contract | SUSPECT |
| `client_commands_test.rs` | `src-tauri/src/commands/client.rs` | Client IPC operations | Contract | SUSPECT |
| `intervention_commands_test.rs` | `src-tauri/src/commands/intervention.rs` | Intervention IPC endpoints | Contract | SUSPECT |
| `task_commands_test.rs` | `src-tauri/src/commands/task.rs` | Task IPC commands | Contract | SUSPECT |
| `user_commands_test.rs` | `src-tauri/src/commands/user.rs` | User management IPC | Contract | SUSPECT |

### Performance Tests (`src-tauri/src/tests/performance/`)

| Test File | Target Code | Functionality | Type | Status |
|------------|-------------|---------------|------|---------|
| `repository_performance_tests.rs` | All repositories | Database query performance | Performance | OK |

## Frontend Test Files

### IPC Contract Tests (`frontend/src/lib/ipc/__tests__/`)

| Test File | Target IPC | Functionality | Type | Status |
|------------|------------|---------------|------|---------|
| `clients-ipc-contract.test.ts` | client commands | Client data structure validation | Contract | OK |
| `interventions-ipc-contract.test.ts` | intervention commands | Intervention data contracts | Contract | OK |
| `inventory-ipc-contract.test.ts` | inventory commands | Inventory data validation | Contract | OK |
| `inventory-ipc-contract-new.test.ts` | new inventory commands | Updated inventory contracts | Contract | OK |
| `tasks-ipc-contract.test.ts` | task commands | Task data structure validation | Contract | OK |
| `settings-arg-shape.test.ts` | settings commands | Settings argument validation | Contract | OK |
| `security-arg-shape.test.ts` | security commands | Security argument shapes | Contract | OK |

### Component Tests (`frontend/src/components/`)

| Test File | Target Component | Functionality | Type | Status |
|------------|------------------|---------------|------|---------|
| `InventoryManager.test.tsx` | InventoryManager | Inventory management UI | Unit | OK |
| `MaterialForm.test.tsx` | MaterialForm | Material creation/editing | Unit | OK |
| `StockLevelIndicator.test.tsx` | StockLevelIndicator | Stock level visualization | Unit | OK |
| `UserForm.test.tsx` | UserForm | User creation/editing | Unit | OK |
| `error-boundary.test.tsx` | ErrorBoundary | Error handling UI | Unit | OK |
| `inventory/InventoryManager.test.tsx` | Inventory components | Inventory-specific UI | Unit | OK |
| `inventory/StockLevelIndicator.test.tsx` | StockLevelIndicator | Stock visualization | Unit | OK |
| `tasks/TaskManager.test.tsx` | TaskManager | Task management interface | Unit | OK |
| `tasks/TaskDetails.test.tsx` | TaskDetails | Task detail view | Unit | OK |
| `tasks/WorkflowProgressCard.test.tsx` | WorkflowProgressCard | Workflow visualization | Unit | OK |
| `settings/SecurityTab.contract.test.tsx` | SecurityTab | Security settings UI | Contract | OK |
| `settings/PreferencesTab.payload.test.tsx` | PreferencesTab | Preference settings | Contract | OK |
| `settings/PerformanceTab.payload.test.tsx` | PerformanceTab | Performance settings | Contract | OK |

### Hook Tests (`frontend/src/hooks/`)

| Test File | Target Hook | Functionality | Type | Status |
|------------|-------------|---------------|------|---------|
| `useInventory.test.ts` | useInventory | Inventory state management | Unit | OK |
| `useAutoSave.test.ts` | useAutoSave | Auto-save functionality | Unit | OK |
| `hooks/useTasks.integration.test.ts` | useTasks | Task state management | Integration | OK |
| `hooks/useSearchRecords.test.ts` | useSearchRecords | Search functionality | Unit | OK |
| `hooks/useTaskState.test.ts` | useTaskState | Task state transitions | Unit | OK |

### Integration Tests (`frontend/src/__tests__/`)
- **components/data-explorer/** - Data explorer components
- **components/reports/** - Report components
- **hooks/** - Hook integration tests

### E2E Tests (`frontend/tests/e2e/`)

| Test File | Target Flow | Functionality | Type | Status |
|------------|-------------|---------------|------|---------|
| `client-lifecycle.spec.ts` | Client management | Full client CRUD flow | E2E | OK |
| `inventory-management.spec.ts` | Inventory management | Stock management workflow | E2E | OK |
| `intervention-management.spec.ts` | Intervention management | Intervention lifecycle | E2E | OK |
| `report-generation.spec.ts` | Report generation | Report creation and export | E2E | OK |
| `tasks-creation.spec.ts` | Task creation | Task creation workflow | E2E | OK |
| `user-authentication.spec.ts` | Authentication | Login/logout/2FA flows | E2E | OK |

## Test Utilities

### Backend Test Utilities
- **src-tauri/src/test_utils.rs** - Common test utilities and fixtures

## Missing Tests (High Priority)

| Module | Missing Tests | Impact |
|--------|---------------|---------|
| Analytics service (023) | All analytics functionality | HIGH |
| User settings (024) | Settings persistence, validation | HIGH |
| Inventory management (025) | New inventory features | HIGH |
| Messaging system (026) | Message queue, notifications | HIGH |
| Sync queue service | Offline sync, conflict resolution | MEDIUM |
| Event bus system | Event handling, subscriptions | MEDIUM |
| Cache management | Cache invalidation, performance | MEDIUM |

## Status Legend
- **OK**: Test is up-to-date and properly validates behavior
- **SUSPECT**: Test may have issues (needs review)
- **OBSOLETE**: Test is outdated or non-functional
- **MISSING**: Critical code without corresponding tests

## Test Coverage Areas

### Well Covered Areas
1. **Authentication** - Comprehensive unit, integration, and property tests
2. **Task Management** - Extensive CRUD and validation testing
3. **Material Management** - Good coverage of material operations
4. **Workflow Management** - Workflow orchestration tested

### Partially Covered Areas
1. **Client Management** - Basic tests present but missing edge cases
2. **Inventory Management** - Core operations tested but missing some scenarios
3. **Audit System** - Basic functionality tested but missing comprehensive scenarios

### Poorly Covered Areas
1. **Analytics Dashboard** (migration 025) - No tests found
2. **Messaging System** (migration 023) - No tests found
3. **Two-Factor Authentication** (migration 015) - Limited tests
4. **User Settings** (migrations 026, 027) - No specific tests
5. **Performance Monitoring** - Limited performance tests

## Missing Test Areas

### Recent Features Without Tests
1. **User Settings and Preferences** (migrations 025-027)
2. **Cache Metadata System** (migration 020)
3. **Task History Tracking** (migration 022)
4. **Client Statistics Views** (migration 021)
5. **Enhanced Performance Indexes** (migration 019)

### Frontend Missing Tests
1. **Settings Components** - Limited tests for settings UI
2. **Security Components** - No tests for security features
3. **Performance Monitoring UI** - No tests for performance components
4. **Cache Management** - No tests for cache components
5. **Messaging UI** - No tests for messaging interface

## Test Health Notes

### Test Patterns
1. **Backend** - Uses a mix of unit, integration, and property-based tests
2. **Frontend** - Focused on IPC contract validation and component testing
3. **Test Utilities** - Good shared utilities for backend tests

### Test Quality
1. **Good** - Authentication and task management tests
2. **Needs Improvement** - Client, inventory, and workflow tests
3. **Missing** - Recent features and frontend components

## Recommendations

1. Add tests for recent migrations (025-027)
2. Expand frontend test coverage for new components
3. Add property-based tests for critical operations
4. Improve integration test coverage for cross-domain scenarios
5. Add performance tests for database operations
6. Implement end-to-end tests for critical workflows
