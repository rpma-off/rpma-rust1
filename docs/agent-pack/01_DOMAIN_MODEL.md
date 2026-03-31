# 01 — Domain Model: Core Entities & Rules

The backend follows Domain-Driven Design. Core business logic lives in `src-tauri/src/domains/`. Shared cross-domain contracts live in `src-tauri/src/shared/contracts/`.

## Core Entities

### 1. Task (`src-tauri/src/domains/tasks/`)
Unit of work representing a requested PPF intervention for a vehicle.
- **Key Fields**: `id` (UUID), `task_number`, `vehicle_plate`, `status`, `priority`, `technician_id`, `client_id`, `scheduled_date`, `ppf_zones`, `deleted_at`
- **Status Enum** (`shared/contracts/task_status.rs`):
  `Draft` | `Scheduled` | `InProgress` | `Completed` | `Cancelled` | `OnHold` | `Pending` | `Invalid` | `Archived` | `Failed` | `Overdue` | `Assigned` | `Paused`
- **Relations**: belongs to **Client**, assigned to **User** (Technician), has one **Intervention** (once started), has many **InterventionSteps** via the intervention

### 2. Intervention (`src-tauri/src/domains/interventions/`)
Active execution phase of a task.
- **Key Fields**: `id`, `task_id`, `status`, `current_step`, `completion_percentage`, `vehicle_vin`, `started_at`, `completed_at`, `quality_score`
- **Status Enum** (`shared/contracts/intervention_enums.rs`):
  `Pending` | `InProgress` | `Paused` | `Completed` | `Cancelled` | `Archived`
- **Relations**: belongs to **Task** (1:1), has many **InterventionSteps**, has many **Photos**, generates **InventoryTransactions** on completion

### 3. InterventionStep (`src-tauri/src/domains/interventions/`)
Discrete phase within an intervention (e.g., "Front Bumper Inspection").
- **Key Fields**: `id`, `intervention_id`, `step_number`, `step_name`, `step_type`, `step_status`, `requires_photos`, `photo_count`, `min_photos_required`
- **Step Types**: `Inspection` | `Preparation` | `Installation` | `Finalization`
- **Step Statuses**: `Pending` | `InProgress` | `Paused` | `Completed` | `Failed` | `Skipped` | `Rework`
- **Indexed by**: `(intervention_id)` and `(intervention_id, step_number)` — see migration 070

### 4. Client (`src-tauri/src/domains/clients/`)
Customer entity (Individual or Business).
- **Key Fields**: `id`, `name`, `email`, `phone`, `customer_type`, `address_street`, `tax_id`, `deleted_at`
- **Denormalized stats**: maintained via SQLite triggers (migration 003: `task_insert/update/delete_update_client_stats`)

### 5. Material / InventoryTransaction (`src-tauri/src/domains/inventory/`)
Tracks physical materials and stock movements.
- **Material fields**: `id`, `name`, `sku`, `material_type`, `unit_of_measure`, `current_stock`, `minimum_stock`, `expiry_date`
- **InventoryTransaction**: records each stock change with `material_id`, `quantity`, `transaction_type`, `intervention_id`
- **Infrastructure**: split into 8 modules under `infrastructure/material/` (crud, stock_ops, stats, delegation, errors, types)

### 6. Quote (`src-tauri/src/domains/quotes/`)
Client-facing cost estimate that can be converted to a Task.
- **Key Fields**: `id`, `client_id`, `status`, `items`, `total_amount`, `created_by`, `deleted_at`
- **Status**: Draft → Sent → Accepted/Rejected → (Converted to Task)
- **Indexed**: partial index on `quotes(created_by) WHERE deleted_at IS NULL` (migration 067)

### 7. User (`src-tauri/src/domains/users/`)
System account with role assignment.
- **Key Fields**: `id`, `username`, `email`, `password_hash` (never serialized), `salt`, `role`, `is_active`, `deleted_at`
- **Roles** (`domain/models/auth.rs`): `Admin` | `Supervisor` | `Technician` | `Viewer`

### 8. Notification (`src-tauri/src/domains/notifications/`)
In-app alert or message.
- **Key Fields**: `id`, `user_id`, `title`, `body`, `notification_type`, `read_at`, `created_at`

## Domain Relationships

```
Client ||--o{ Task          (has)
User   ||--o{ Task          (assigned_to)
Task   ||--|| Intervention  (executes, 1:1)
Intervention ||--o{ InterventionStep     (contains)
Intervention ||--o{ Photo               (captures)
Intervention ||--o{ InventoryTransaction (consumes)
Task   ||--o{ Quote         (converted_from, optional)
```

## Storage Facts
| Aspect | Detail |
|--------|--------|
| Table names | `tasks`, `interventions`, `intervention_steps`, `clients`, `users`, `materials`, `inventory_transactions`, `quotes`, `notifications`, `calendar_events`, `app_settings` |
| Primary keys | UUID strings (v4) |
| Soft delete | `deleted_at` column (i64 ms timestamp, ADR-011). Filter: `WHERE deleted_at IS NULL` |
| Timestamps | All `*_at` columns are `INTEGER` (milliseconds since epoch, ADR-012) |
| Audit fields | `created_at`, `updated_at`, `created_by`, `updated_by` on all main entities |

## Domain Rules (Critical Constraints)
1. `vehicle_plate` and `scheduled_date` are mandatory on Task creation.
2. A Task cannot move to `InProgress` until an Intervention is created.
3. An Intervention cannot reach `Completed` until all mandatory steps are done.
4. `InterventionStep` completion may require a minimum photo count (`min_photos_required`).
5. All mutations must go through the Application layer — never call repositories directly from IPC.
6. Cross-domain access goes through `shared/contracts/` traits, not direct imports.

## Shared Contracts (`src-tauri/src/shared/contracts/`)
| File | Exports |
|------|---------|
| `auth.rs` | `UserRole`, `UserSession`, `UserAccount` |
| `task_status.rs` | `TaskStatus` enum with Display/FromStr |
| `intervention_enums.rs` | Intervention status, step type enums |
| `events.rs` | `DomainEvent` variants for EventBus |
| `rules_engine.rs` | `BlockingRuleEngine` trait |
| `notification.rs` | `NotificationSender` trait |
| `task_scheduler.rs` | `TaskScheduler` trait (calendar integration) |
| `integration_sink.rs` | `IntegrationEventSink` trait |
| `sync.rs` | Sync/offline queue types |
