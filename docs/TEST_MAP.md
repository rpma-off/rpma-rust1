# TEST_MAP.md — Test → Code Cartography

> Generated: 2026-02-22
> Project: RPMA v2 (Tauri + Next.js)

## Legend

| Status | Meaning |
|--------|---------|
| ✅ OK | Test is aligned with production code |
| ⚠️ Suspect | Test exists but has quality issues (trivial assertions, duplicate, etc.) |
| ❌ Obsolete | Test references symbols/behavior that no longer exist |
| 🔴 Missing | Critical production code has no test coverage |

---

## 1. Backend — Domain Tests (`src-tauri/src/domains/*/tests/`)

### Users Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `users/tests/unit_users.rs` | `users/facade.rs`, `users/infrastructure/user.rs` | User facade readiness, error mapping | Unit | ✅ OK |
| `users/tests/integration_users.rs` | `users/infrastructure/user.rs` | User CRUD operations | Integration | ✅ OK |
| `users/tests/validation_users.rs` | `users/domain/models/` | User input validation | Unit | ✅ OK |
| `users/tests/permission_users.rs` | `users/domain/policy.rs` | RBAC policies | Unit | ✅ OK |

### Auth Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `auth/tests/unit_auth.rs` | `auth/facade.rs`, `auth/infrastructure/` | Auth facade, session logic | Unit | ✅ OK |
| `auth/tests/integration_auth.rs` | `auth/infrastructure/session.rs` | Session lifecycle | Integration | ✅ OK |
| `auth/tests/validation_auth.rs` | `auth/domain/models/auth.rs` | Credential validation | Unit | ✅ OK |
| `auth/tests/permission_auth.rs` | `auth/domain/policy.rs` | Auth policies | Unit | ✅ OK |

### Tasks Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `tasks/tests/unit_tasks.rs` | `tasks/facade.rs`, `tasks/infrastructure/task.rs` | Task facade, CRUD | Unit | ✅ OK |
| `tasks/tests/integration_tasks.rs` | `tasks/infrastructure/task.rs` | Task lifecycle | Integration | ✅ OK |
| `tasks/tests/validation_tasks.rs` | `tasks/domain/models/` | Task input validation | Unit | ✅ OK |
| `tasks/tests/permission_tasks.rs` | `tasks/facade.rs` | Debug output, Arc pointer | Unit | ⚠️ Suspect — trivial assertions only |

### Clients Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `clients/tests/unit_clients.rs` | `clients/facade.rs` | Client facade | Unit | ✅ OK |
| `clients/tests/integration_clients.rs` | `clients/infrastructure/client.rs` | Client CRUD | Integration | ✅ OK |
| `clients/tests/validation_clients.rs` | `clients/domain/models/client.rs` | Client validation | Unit | ✅ OK |
| `clients/tests/permission_clients.rs` | `clients/facade.rs` | Error mapping + Arc pointer | Unit | ⚠️ Suspect — Arc pointer test is trivial |

### Interventions Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `interventions/tests/unit_interventions.rs` | `interventions/facade.rs` | Intervention facade | Unit | ✅ OK |
| `interventions/tests/integration_interventions.rs` | `interventions/infrastructure/intervention.rs` | Intervention lifecycle | Integration | ✅ OK |
| `interventions/tests/validation_interventions.rs` | `interventions/domain/models/` | Intervention validation | Unit | ✅ OK |
| `interventions/tests/permission_interventions.rs` | `interventions/facade.rs` | Debug output, Arc pointer | Unit | ⚠️ Suspect — trivial assertions only |

### Inventory Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `inventory/tests/mod.rs` | `inventory/domain/material.rs`, `inventory/application/` | Stock validation, invariants | Unit | ✅ OK |
| `inventory/tests/unit_inventory.rs` | `inventory/facade.rs` | Debug output only | Unit | ⚠️ Suspect — no real behavior tested |
| `inventory/tests/integration_inventory.rs` | `inventory/facade.rs` | Debug output only (duplicate of unit) | Integration | ⚠️ Suspect — identical to unit test |
| `inventory/tests/validation_inventory.rs` | `inventory/facade.rs` | Debug output only (duplicate) | Validation | ⚠️ Suspect — identical to unit test |
| `inventory/tests/permission_inventory.rs` | `inventory/facade.rs` | Debug output only (duplicate) | Permission | ⚠️ Suspect — identical to unit test |

### Quotes Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `quotes/tests/unit_quotes.rs` | `quotes/facade.rs` | Quote facade | Unit | ✅ OK |
| `quotes/tests/integration_quotes.rs` | `quotes/infrastructure/quote.rs` | Quote lifecycle | Integration | ✅ OK |
| `quotes/tests/validation_quotes.rs` | `quotes/domain/models/quote.rs` | Quote validation | Unit | ✅ OK |
| `quotes/tests/permission_quotes.rs` | `quotes/facade.rs` | Debug output, Arc pointer | Unit | ⚠️ Suspect — trivial assertions only |

### Audit Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `audit/tests/unit_audit.rs` | `audit/facade.rs` | Facade readiness, service exposure | Unit | ⚠️ Suspect — is_ready + Arc check |
| `audit/tests/validation_audit.rs` | `audit/facade.rs` | Error mapping | Unit | ✅ OK |
| `audit/tests/integration_audit.rs` | `audit/infrastructure/` | Debug output only | Integration | ⚠️ Suspect — trivial assertion |
| `audit/tests/permission_audit.rs` | `audit/facade.rs` | Debug output only | Permission | ⚠️ Suspect — trivial assertion |

### Settings Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `settings/tests/unit_settings.rs` | `settings/facade.rs` | Facade readiness, user ID validation | Unit | ✅ OK (partial) |
| `settings/tests/validation_settings.rs` | `settings/facade.rs` | User ID rejection rules | Unit | ✅ OK |
| `settings/tests/integration_settings.rs` | `settings/facade.rs` | Debug output only | Integration | ⚠️ Suspect — trivial assertion |
| `settings/tests/permission_settings.rs` | `settings/facade.rs` | Debug output only | Permission | ⚠️ Suspect — trivial assertion |

### Documents Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `documents/tests/unit_documents.rs` | `documents/facade.rs` | Facade readiness, extension validation | Unit | ✅ OK |
| `documents/tests/validation_documents.rs` | `documents/domain/` | Photo extension rejection | Unit | ✅ OK |
| `documents/tests/permission_documents.rs` | `documents/facade.rs` | Debug output only | Permission | ⚠️ Suspect — trivial assertion |

### Reports Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `reports/tests/unit_reports.rs` | `reports/facade.rs` | Facade readiness | Unit | ⚠️ Suspect — is_ready only |
| `reports/tests/validation_reports.rs` | `reports/facade.rs` | Report type validation | Unit | ✅ OK |
| `reports/tests/integration_reports.rs` | `reports/infrastructure/` | Debug output only | Integration | ⚠️ Suspect — trivial assertion |
| `reports/tests/permission_reports.rs` | `reports/facade.rs` | Debug output only | Permission | ⚠️ Suspect — trivial assertion |

### Calendar Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `calendar/tests/unit_calendar.rs` | `calendar/facade.rs` | Facade readiness, date range validation | Unit | ✅ OK |
| `calendar/tests/validation_calendar.rs` | `calendar/domain/` | Date range edge cases | Unit | ✅ OK |
| `calendar/tests/integration_calendar.rs` | `calendar/infrastructure/` | Debug output only | Integration | ⚠️ Suspect — trivial assertion |

### Sync Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `sync/tests/unit_sync.rs` | `sync/facade.rs` | Facade readiness, queue exposure | Unit | ⚠️ Suspect — is_ready + structural only |
| `sync/tests/integration_sync.rs` | `sync/infrastructure/` | Debug output only | Integration | ⚠️ Suspect — trivial assertion |
| `sync/tests/permission_sync.rs` | `sync/facade.rs` | Arc pointer equality | Permission | ⚠️ Suspect — trivial assertion |

### Analytics Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `analytics/tests/mod.rs` | — | Empty file (comment only) | — | 🔴 Missing — no tests |

### Notifications Domain

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `notifications/tests/mod.rs` | — | Empty file (comment only) | — | 🔴 Missing — no tests |

---

## 2. Backend — Unit Tests (`src-tauri/src/tests/unit/`)

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `audit_service_tests.rs` | `services/audit_service.rs` | Audit event logging | Unit | ✅ OK |
| `auth_service_tests.rs` | `services/auth_service.rs` | Authentication logic | Unit | ✅ OK |
| `client_service_tests.rs` | `services/client_service.rs` | Client CRUD service | Unit | ✅ OK |
| `intervention_workflow_tests.rs` | `services/intervention_service.rs` | Workflow state machine | Unit | ✅ OK |
| `inventory_management_tests.rs` | `services/material_service.rs` | Stock management | Unit | ✅ OK |
| `material_repository_tests.rs` | `repositories/material.rs` | Material SQL queries | Integration | ✅ OK |
| `material_service_tests.rs` | `services/material_service.rs` | Material CRUD | Unit | ✅ OK |
| `material_transaction_tests.rs` | `services/material_service.rs` | Inventory transactions | Unit | ✅ OK |
| `messaging_system_tests.rs` | `services/messaging_service.rs` | Messaging logic | Unit | ✅ OK |
| `security_monitor_service_tests.rs` | `services/security_monitor.rs` | Security event detection | Unit | ✅ OK |
| `task_creation_service_tests.rs` | `services/task_service.rs` | Task creation | Unit | ✅ OK |
| `task_creation_tests.rs` | `services/task_service.rs` | Task creation rules | Unit | ✅ OK |
| `task_crud_tests.rs` | `services/task_service.rs` | Task CRUD operations | Unit | ✅ OK |
| `task_deletion_tests.rs` | `services/task_service.rs` | Task soft-deletion | Unit | ✅ OK |
| `task_update_tests.rs` | `services/task_service.rs` | Task update rules | Unit | ✅ OK |
| `task_validation_service_tests.rs` | `services/task_service.rs` | Task validation rules | Unit | ✅ OK |
| `task_validation_tests.rs` | `services/task_service.rs` | Task input validation | Unit | ✅ OK |
| `two_factor_service_tests.rs` | `services/two_factor_service.rs` | 2FA setup/verify | Unit | ✅ OK |
| `user_settings_tests.rs` | `services/settings_service.rs` | User preference CRUD | Unit | ✅ OK |
| `workflow_validation_service_tests.rs` | `services/workflow_service.rs` | Workflow validation | Unit | ✅ OK |
| `analytics_service_tests.rs` | `services/analytics_service.rs` | Analytics KPIs | Unit | ✅ OK |

---

## 3. Backend — Integration Tests (`src-tauri/src/tests/integration/`)

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `analytics_integration_tests.rs` | Analytics service + DB | KPI data aggregation | Integration | ✅ OK |
| `audit_repository_test.rs` | Audit repository | Audit log persistence | Integration | ✅ OK |
| `client_task_intervention_material_flow.rs` | Multi-domain | End-to-end flow | Integration | ✅ OK |
| `cross_domain_integration_tests.rs` | Multi-domain | Cross-domain coordination | Integration | ✅ OK |
| `intervention_material_tracking.rs` | Interventions + Inventory | Material usage tracking | Integration | ✅ OK |
| `intervention_repository_test.rs` | Intervention repository | Intervention persistence | Integration | ✅ OK |
| `inventory_integration_tests.rs` | Inventory service + DB | Inventory operations | Integration | ✅ OK |
| `inventory_management_integration_tests.rs` | Inventory management | Stock management flows | Integration | ✅ OK |
| `material_integration_tests.rs` | Material service + DB | Material CRUD | Integration | ✅ OK |
| `messaging_system_integration_tests.rs` | Messaging service + DB | Message lifecycle | Integration | ✅ OK |
| `network_resilience_tests.rs` | Network service | Offline behavior | Integration | ✅ OK |
| `network_resilience_standalone.rs` | Network service | Standalone resilience | Integration | ✅ OK |
| `performance_integration_tests.rs` | Performance metrics | Response time validation | Integration | ✅ OK |
| `session_repository_test.rs` | Session repository | Session persistence | Integration | ✅ OK |
| `task_lifecycle_tests.rs` | Task service + DB | Task lifecycle | Integration | ✅ OK |
| `task_material_consumption_integration.rs` | Tasks + Inventory | Material consumption | Integration | ✅ OK |
| `task_repository_test.rs` | Task repository | Task persistence | Integration | ✅ OK |
| `user_settings_integration_tests.rs` | Settings service + DB | Settings persistence | Integration | ✅ OK |
| `workflow_tests.rs` | Workflow service + DB | Workflow progression | Integration | ✅ OK |

---

## 4. Backend — Property-Based Tests (`src-tauri/src/tests/proptests/`)

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `analytics_service_proptests.rs` | Analytics service | Random KPI inputs | Property | ✅ OK |
| `audit_service_proptests.rs` | Audit service | Random audit events | Property | ✅ OK |
| `auth_service_proptests.rs` | Auth service | Random credentials | Property | ✅ OK |
| `client_validation_proptests.rs` | Client validation | Random client data | Property | ✅ OK |
| `inventory_management_proptests.rs` | Inventory service | Random stock operations | Property | ✅ OK |
| `messaging_system_proptests.rs` | Messaging service | Random messages | Property | ✅ OK |
| `task_validation_comprehensive.rs` | Task validation | Comprehensive random | Property | ✅ OK |
| `task_validation_proptests.rs` | Task validation | Random task inputs | Property | ✅ OK |
| `user_settings_proptests.rs` | Settings service | Random settings | Property | ✅ OK |

---

## 5. Backend — Migration Tests (`src-tauri/src/tests/migrations/`)

| Test File | Migration | Functionality | Status |
|-----------|----------|---------------|--------|
| `test_008_workflow_constraints.rs` | 008 | Workflow constraint validation | ✅ OK |
| `test_011_duplicate_interventions.rs` | 011 | Duplicate prevention | ✅ OK |
| `test_012_material_tables.rs` | 012 | Material schema | ✅ OK |
| `test_019_enhanced_performance_indexes.rs` | 019 | Performance indexes | ✅ OK |
| `test_020_cache_metadata.rs` | 020 | Cache metadata tables | ✅ OK |
| `test_021_client_statistics.rs` | 021 | Client stats tables | ✅ OK |
| `test_022_task_history.rs` | 022 | Task history tables | ✅ OK |
| `test_023_messaging_tables.rs` | 023 | Messaging tables | ✅ OK |
| `test_024_inventory_management.rs` | 024 | Inventory tables | ✅ OK |
| `test_025_analytics_dashboard.rs` | 025 | Analytics tables | ✅ OK |
| `test_026_user_settings.rs` | 026 | User settings table | ✅ OK |
| `test_027_task_constraints.rs` | 027 | Task constraints | ✅ OK |
| `test_029_user_name_backfill.rs` | 029 | User name backfill | ✅ OK |
| `test_030_user_sessions_updated_at.rs` | 030 | Session updated_at | ✅ OK |
| `test_031_inventory_non_negative_checks.rs` | 031 | Non-negative checks | ✅ OK |
| `test_032_intervention_task_fk.rs` | 032 | Intervention-Task FK | ✅ OK |
| `test_033_task_workflow_fks.rs` | 033 | Task workflow FKs | ✅ OK |
| `test_034_session_activity_index.rs` | 034 | Session activity index | ✅ OK |
| `test_035_tasks_deleted_at_index.rs` | 035 | Deleted_at index | ✅ OK |
| `test_037_quotes.rs` | 037 | Quote tables | ✅ OK |

---

## 6. Backend — Command Integration Tests (`src-tauri/tests/commands/`)

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `auth_commands_test.rs` | `commands/`, `domains/auth/ipc/` | Auth IPC commands | Contract | ✅ OK |
| `auth_commands_simple_test.rs` | `domains/auth/ipc/` | Simplified auth tests | Contract | ✅ OK |
| `simple_auth_test.rs` | `domains/auth/ipc/` | Basic auth smoke | Contract | ✅ OK |
| `client_commands_test.rs` | `domains/clients/ipc/` | Client IPC commands | Contract | ✅ OK |
| `intervention_commands_test.rs` | `domains/interventions/ipc/` | Intervention IPC | Contract | ✅ OK |
| `task_commands_test.rs` | `domains/tasks/ipc/` | Task IPC commands | Contract | ✅ OK |
| `user_commands_test.rs` | `domains/users/ipc/` | User IPC commands | Contract | ✅ OK |

---

## 7. Frontend — IPC Contract Tests (`frontend/src/lib/ipc/__tests__/`)

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `auth-ipc-contract.test.ts` | `lib/ipc/client.ts` | Auth IPC shapes | Contract | ✅ OK |
| `bootstrap-ipc-contract.test.ts` | `lib/ipc/client.ts` | Bootstrap IPC shapes | Contract | ✅ OK |
| `clients-ipc-contract.test.ts` | `lib/ipc/client.ts` | Client IPC shapes | Contract | ✅ OK |
| `inventory-ipc-contract.test.ts` | `lib/ipc/client.ts` | Inventory IPC shapes | Contract | ✅ OK |
| `inventory-ipc-contract-new.test.ts` | `domains/inventory/server` | Inventory IPC (duplicate) | Contract | ⚠️ Suspect — duplicate of above |
| `interventions-ipc-contract.test.ts` | `lib/ipc/client.ts` | Interventions IPC shapes | Contract | ✅ OK |
| `tasks-ipc-contract.test.ts` | `lib/ipc/client.ts` | Tasks IPC shapes | Contract | ✅ OK |
| `system-ipc-contract.test.ts` | `lib/ipc/client.ts` | System IPC shapes | Contract | ✅ OK |
| `configuration-loader.test.ts` | `lib/ipc/configuration-loader.ts` | Config loading | Unit | ✅ OK |
| `security-arg-shape.test.ts` | `lib/ipc/client.ts` | Security arg shapes | Contract | ✅ OK |
| `settings-arg-shape.test.ts` | `lib/ipc/client.ts` | Settings arg shapes | Contract | ✅ OK |
| `domains/security.arg-shape.test.ts` | Security domain IPC | Security shapes | Contract | ✅ OK |
| `domains/settings.cache.test.ts` | Settings domain IPC | Settings caching | Unit | ✅ OK |

---

## 8. Frontend — Domain Tests

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `domains/analytics/*.test.*` | Analytics domain | Provider, IPC, migration | Unit | ✅ OK |
| `domains/auth/*.test.*` | Auth domain | Provider, hooks | Unit | ✅ OK |
| `domains/bootstrap/*.test.ts` | Bootstrap domain | Domain initialization | Unit | ✅ OK |
| `domains/dashboard/*.test.ts` | Dashboard domain | Domain logic | Unit | ✅ OK |
| `domains/tasks/*.test.*` | Tasks domain | Provider, hooks, components | Unit | ✅ OK |
| `domains/workflow/*.test.*` | Workflow domain | Service, IPC, provider | Unit | ✅ OK |
| `domains/inventory/*.test.*` | Inventory domain | Provider, hooks, components | Unit | ✅ OK |
| `domains/settings/*.test.*` | Settings domain | Provider, tabs, payloads | Unit | ✅ OK |

---

## 9. Frontend — Component Tests

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `components/ui/__tests__/button.test.tsx` | Button component | Rendering, events | Unit | ✅ OK |
| `components/ui/__tests__/error-boundary.test.tsx` | ErrorBoundary component | Error handling | Unit | ✅ OK |
| `components/dashboard/__tests__/*.test.tsx` | Dashboard components | Task previews, card lists | Unit | ✅ OK |
| `components/calendar/__tests__/*.test.tsx` | Calendar components | Agenda view, task cards | Unit | ✅ OK |
| `__tests__/components/data-explorer/*.test.tsx` | Data explorer components | Search, results, detail | Unit | ✅ OK |
| `__tests__/components/reports/*.test.tsx` | Report components | Tabs, export, filters | Unit | ✅ OK |

---

## 10. E2E Tests (`frontend/tests/e2e/`)

| Test File | Code File(s) | Functionality | Type | Status |
|-----------|-------------|---------------|------|--------|
| `user-authentication.spec.ts` | Auth flow | Login, logout, session | E2E | ✅ OK |
| `client-lifecycle.spec.ts` | Client flow | Create, update, delete | E2E | ✅ OK |
| `inventory-management.spec.ts` | Inventory flow | Stock operations | E2E | ✅ OK |
| `intervention-management.spec.ts` | Intervention flow | Lifecycle management | E2E | ✅ OK |
| `tasks-creation.spec.ts` | Task flow | Task creation | E2E | ✅ OK |
| `report-generation.spec.ts` | Report flow | Report generation | E2E | ✅ OK |
| `connectivity-smoke.spec.ts` | System | Offline behavior | E2E | ✅ OK |
| `configuration-smoke.spec.ts` | System | Configuration loading | E2E | ✅ OK |
| `inventory-smoke.spec.ts` | Inventory | Quick smoke test | E2E | ✅ OK |

---

## Summary Statistics

| Category | Total | ✅ OK | ⚠️ Suspect | ❌ Obsolete | 🔴 Missing |
|----------|-------|-------|-----------|------------|-----------|
| Domain tests | 48 | 28 | 18 | 0 | 2 |
| Unit tests | 21 | 21 | 0 | 0 | 0 |
| Integration tests | 19 | 19 | 0 | 0 | 0 |
| Property tests | 9 | 9 | 0 | 0 | 0 |
| Migration tests | 20 | 20 | 0 | 0 | 0 |
| Command tests | 7 | 7 | 0 | 0 | 0 |
| Frontend IPC | 13 | 12 | 1 | 0 | 0 |
| Frontend domain | 20+ | 20+ | 0 | 0 | 0 |
| Frontend component | 12 | 12 | 0 | 0 | 0 |
| E2E | 9 | 9 | 0 | 0 | 0 |
| **Total** | **~180** | **~158** | **~19** | **0** | **2** |
