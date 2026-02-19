# Bounded-Context Legacy Test Migration Map

This map is the Step 2 source-of-truth for migrating legacy backend tests into bounded-context targets.
Each legacy `*.rs` file under `src-tauri/src/tests/{unit,integration,proptests,performance}` has exactly one planned destination.

## Wave 1: Users/Auth

| Legacy file | Target module path |
| --- | --- |
| `src-tauri/src/tests/unit/auth_service_tests.rs` | `src-tauri/src/domains/users/tests/unit_users.rs` |
| `src-tauri/src/tests/unit/two_factor_service_tests.rs` | `src-tauri/src/domains/users/tests/permission_users.rs` |
| `src-tauri/src/tests/unit/security_monitor_service_tests.rs` | `src-tauri/src/domains/users/tests/permission_users.rs` |
| `src-tauri/src/tests/unit/user_settings_tests.rs` | `src-tauri/src/domains/users/tests/validation_users.rs` |
| `src-tauri/src/tests/unit/audit_service_tests.rs` | `src-tauri/src/domains/users/tests/permission_users.rs` |
| `src-tauri/src/tests/unit/messaging_system_tests.rs` | `src-tauri/src/domains/users/tests/integration_users.rs` |
| `src-tauri/src/tests/integration/session_repository_test.rs` | `src-tauri/src/domains/users/tests/integration_users.rs` |
| `src-tauri/src/tests/integration/user_settings_integration_tests.rs` | `src-tauri/src/domains/users/tests/integration_users.rs` |
| `src-tauri/src/tests/integration/audit_repository_test.rs` | `src-tauri/src/domains/users/tests/integration_users.rs` |
| `src-tauri/src/tests/integration/messaging_system_integration_tests.rs` | `src-tauri/src/domains/users/tests/integration_users.rs` |
| `src-tauri/src/tests/proptests/auth_service_proptests.rs` | `src-tauri/src/domains/users/tests/validation_users.rs` |
| `src-tauri/src/tests/proptests/user_settings_proptests.rs` | `src-tauri/src/domains/users/tests/validation_users.rs` |
| `src-tauri/src/tests/proptests/audit_service_proptests.rs` | `src-tauri/src/domains/users/tests/validation_users.rs` |
| `src-tauri/src/tests/proptests/messaging_system_proptests.rs` | `src-tauri/src/domains/users/tests/validation_users.rs` |

## Wave 2: Tasks

| Legacy file | Target module path |
| --- | --- |
| `src-tauri/src/tests/unit/task_creation_service_tests.rs` | `src-tauri/src/domains/tasks/tests/unit_tasks.rs` |
| `src-tauri/src/tests/unit/task_creation_tests.rs` | `src-tauri/src/domains/tasks/tests/unit_tasks.rs` |
| `src-tauri/src/tests/unit/task_crud_tests.rs` | `src-tauri/src/domains/tasks/tests/unit_tasks.rs` |
| `src-tauri/src/tests/unit/task_deletion_tests.rs` | `src-tauri/src/domains/tasks/tests/unit_tasks.rs` |
| `src-tauri/src/tests/unit/task_update_tests.rs` | `src-tauri/src/domains/tasks/tests/unit_tasks.rs` |
| `src-tauri/src/tests/unit/task_validation_service_tests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/unit/task_validation_tests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/unit/workflow_validation_service_tests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/unit/client_service_tests.rs` | `src-tauri/src/domains/tasks/tests/unit_tasks.rs` |
| `src-tauri/src/tests/unit/analytics_service_tests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/integration/task_lifecycle_tests.rs` | `src-tauri/src/domains/tasks/tests/integration_tasks.rs` |
| `src-tauri/src/tests/integration/task_repository_test.rs` | `src-tauri/src/domains/tasks/tests/integration_tasks.rs` |
| `src-tauri/src/tests/integration/workflow_tests.rs` | `src-tauri/src/domains/tasks/tests/integration_tasks.rs` |
| `src-tauri/src/tests/integration/analytics_integration_tests.rs` | `src-tauri/src/domains/tasks/tests/integration_tasks.rs` |
| `src-tauri/src/tests/integration/cross_domain_integration_tests.rs` | `src-tauri/src/domains/tasks/tests/integration_tasks.rs` |
| `src-tauri/src/tests/proptests/task_validation_proptests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/proptests/task_validation_service_proptests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/proptests/task_validation_comprehensive.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/proptests/client_validation_proptests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |
| `src-tauri/src/tests/proptests/analytics_service_proptests.rs` | `src-tauri/src/domains/tasks/tests/validation_tasks.rs` |

## Wave 3: Interventions

| Legacy file | Target module path |
| --- | --- |
| `src-tauri/src/tests/unit/intervention_workflow_tests.rs` | `src-tauri/src/domains/interventions/tests/unit_interventions.rs` |
| `src-tauri/src/tests/integration/intervention_material_tracking.rs` | `src-tauri/src/domains/interventions/tests/integration_interventions.rs` |
| `src-tauri/src/tests/integration/intervention_repository_test.rs` | `src-tauri/src/domains/interventions/tests/integration_interventions.rs` |
| `src-tauri/src/tests/integration/task_material_consumption_integration.rs` | `src-tauri/src/domains/interventions/tests/integration_interventions.rs` |
| `src-tauri/src/tests/integration/client_task_intervention_material_flow.rs` | `src-tauri/src/domains/interventions/tests/integration_interventions.rs` |

## Wave 4: Inventory

| Legacy file | Target module path |
| --- | --- |
| `src-tauri/src/tests/unit/inventory_management_tests.rs` | `src-tauri/src/domains/inventory/tests/unit_inventory.rs` |
| `src-tauri/src/tests/unit/material_repository_tests.rs` | `src-tauri/src/domains/inventory/tests/unit_inventory.rs` |
| `src-tauri/src/tests/unit/material_service_tests.rs` | `src-tauri/src/domains/inventory/tests/unit_inventory.rs` |
| `src-tauri/src/tests/unit/material_transaction_tests.rs` | `src-tauri/src/domains/inventory/tests/validation_inventory.rs` |
| `src-tauri/src/tests/integration/inventory_integration_tests.rs` | `src-tauri/src/domains/inventory/tests/integration_inventory.rs` |
| `src-tauri/src/tests/integration/inventory_management_integration_tests.rs` | `src-tauri/src/domains/inventory/tests/integration_inventory.rs` |
| `src-tauri/src/tests/integration/material_integration_tests.rs` | `src-tauri/src/domains/inventory/tests/integration_inventory.rs` |
| `src-tauri/src/tests/integration/performance_integration_tests.rs` | `src-tauri/src/domains/inventory/tests/integration_inventory.rs` |
| `src-tauri/src/tests/proptests/inventory_management_proptests.rs` | `src-tauri/src/domains/inventory/tests/validation_inventory.rs` |
| `src-tauri/src/tests/performance/repository_performance_test.rs` | `src-tauri/src/domains/inventory/tests/integration_inventory.rs` |
| `src-tauri/src/tests/performance/repository_performance_tests.rs` | `src-tauri/src/domains/inventory/tests/integration_inventory.rs` |

## Wave 5: Quotes

No currently identified legacy test files map directly to the quotes bounded context.
Wave 5 will introduce quotes-native tests directly in:

- `src-tauri/src/domains/quotes/tests/unit_quotes.rs`
- `src-tauri/src/domains/quotes/tests/integration_quotes.rs`
- `src-tauri/src/domains/quotes/tests/permission_quotes.rs`
- `src-tauri/src/domains/quotes/tests/validation_quotes.rs`

## Wave 6: Documents

| Legacy file | Target module path |
| --- | --- |
| `src-tauri/src/tests/integration/network_resilience_standalone.rs` | `src-tauri/src/domains/documents/tests/integration_documents.rs` |
| `src-tauri/src/tests/integration/network_resilience_tests.rs` | `src-tauri/src/domains/documents/tests/integration_documents.rs` |
