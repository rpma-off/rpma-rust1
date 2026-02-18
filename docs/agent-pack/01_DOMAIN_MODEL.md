# 01 - Domain Model

## Core Entities and Relationships

This document describes the primary business entities, their relationships, lifecycles, and how they map to database tables.

---

## Entity Relationship Diagram

```
┌─────────┐         ┌──────────┐         ┌──────────────┐
│  Client │1──────*│   Task   │1────────│ Intervention │
└─────────┘         └──────────┘         └──────────────┘
     │                    │                        │
     │                    │                        │1
     │                    │                        │
     │                    │                        │
                ┌─────────┴─────────┐     ┌────────┴────────┐
                │       User        │     │ InterventionStep│
                └───────────────────┘     └─────────────────┘
                     │     │                        │
                     │     │                        │*
                     │     │                        │
                ┌────┴──┐  │                ┌───────┴───────┐
                │Session│  │                │     Photo     │
                └───────┘  │                └───────────────┘
                           │                       │
                     ┌─────┴─────┐           ┌─────┴─────┐
                     │ Calendar  │           │  Material │
                     │  Event    │           └───────────┘
                     └───────────┘
```

---

## 1. Task

**Purpose**: Represents a work order or intervention request. Tasks are the top-level unit of work.

**Model**: `src-tauri/src/models/task.rs`

**Key Fields**:
- `id`: String (UUID primary key)
- `task_number`: String (unique, human-readable identifier, e.g., "T-20260211-001")
- `title`: String (short description)
- `description`: Option<String>
- `status`: TaskStatus enum
- `priority`: TaskPriority enum (Low, Medium, High, Urgent)
- `client_id`: Option<String> (foreign key → `clients.id`)
- `technician_id`: Option<String> (assigned user ID)
- `scheduled_date`: Option<String> (ISO 8601 date)
- `vehicle_plate`, `vehicle_model`, `vehicle_year`, `vehicle_make`, `vin`: Option<String>
- `ppf_zones`: Option<String> (JSON array of PPF zones)
- `workflow_status`: Option<String>
- `current_workflow_step_id`: Option<String>
- `synced`: bool, `last_synced_at`: Option<i64>
- `created_at`, `updated_at`: i64 (Unix timestamp ms)

**Status Enum** (`src-tauri/src/models/task.rs`):
```rust
pub enum TaskStatus {
    Draft, Scheduled, InProgress, Completed, Cancelled, 
    OnHold, Pending, Invalid, Archived, Failed, Overdue, Assigned, Paused
}
```

**Priority Enum**:
```rust
pub enum TaskPriority { Low, Medium, High, Urgent }
```

**Relations**:
- 1 Task → 0..1 Client (via `client_id`)
- 1 Task → 0..* Interventions
- 1 Task → 0..1 User (assigned technician)

**Storage**:
- Table: `tasks`
- Indexes: `task_number`, `status`, `client_id`, `technician_id`, `scheduled_date`

**Domain Rules**:
- A task must have a unique `task_number`
- A task can only have one active intervention at a time
- Status transitions must be valid

**Code Paths**:
- Model: `src-tauri/src/models/task.rs`
- Service: `src-tauri/src/services/task.rs`, `task_validation.rs`, `task_creation.rs`
- Repository: `src-tauri/src/repositories/task_repository.rs`
- Commands: `src-tauri/src/commands/task/facade.rs`

---

## 2. Client

**Purpose**: Represents a customer (individual or business) who owns vehicles requiring PPF installation.

**Model**: `src-tauri/src/models/client.rs`

**Key Fields**:
- `id`: String (UUID)
- `name`: String (full name or business name)
- `email`: Option<String> (unique if provided)
- `phone`: Option<String>
- `address`: Option<String>
- `customer_type`: CustomerType enum (Individual, Business)
- `company_name`: Option<String>
- `siret`: Option<String> (business registration number)
- `notes`: Option<String>
- `total_tasks`: i32, `completed_tasks`: i32 (cached counts)
- `synced`: bool, `last_synced_at`: Option<i64>
- `created_at`, `updated_at`: i64

**Relations**:
- 1 Client → 0..* Tasks

**Storage**:
- Table: `clients`
- Indexes: `email`, `phone`
- View: `client_statistics` (aggregated counts)
- FTS: `clients_fts` (FTS5 virtual table for search)

**Code Paths**:
- Model: `src-tauri/src/models/client.rs`
- Service: `src-tauri/src/services/client.rs`, `client_validation.rs`
- Repository: `src-tauri/src/repositories/client_repository.rs`
- Commands: `src-tauri/src/commands/client.rs`

---

## 3. Intervention

**Purpose**: Represents the execution of a task. Tracks the actual work being performed, including step-by-step progression.

**Model**: `src-tauri/src/models/intervention.rs`

**Key Fields**:
- `id`: String (UUID)
- `task_id`: Option<String> (FK → `tasks.id`)
- `task_number`: Option<String> (denormalized)
- `status`: InterventionStatus enum
- `intervention_type`: InterventionType enum (Ppf, Ceramic, Detailing, Other)
- `vehicle_plate`: Option<String>
- `technician_id`, `client_id`: Option<String>
- `started_at`, `completed_at`, `paused_at`: Option<i64>
- `total_duration_seconds`: Option<i64>
- `quality_score`: Option<i32>
- Environmental: `temperature`, `humidity`
- GPS: `start_location_lat/lon`, `end_location_lat/lon`
- `synced`: bool, `last_synced_at`: Option<i64>

**Status Enum**:
```rust
pub enum InterventionStatus {
    Pending, InProgress, Paused, Completed, Cancelled
}
```

**Relations**:
- 1 Intervention → 1 Task (via `task_id`)
- 1 Intervention → 0..* InterventionSteps
- 1 Intervention → 0..* Photos

**Storage**:
- Table: `interventions`
- Indexes: `task_id`, `status`
- Constraint: Only one active intervention per task (unique constraint)

**Code Paths**:
- Model: `src-tauri/src/models/intervention.rs`
- Service: `src-tauri/src/services/intervention.rs`, `intervention_workflow.rs`
- Repository: `src-tauri/src/repositories/intervention_repository.rs`
- Commands: `src-tauri/src/commands/intervention/workflow.rs`

---

## 4. InterventionStep

**Purpose**: Represents a single step in the intervention workflow (e.g., "Vehicle Preparation", "Film Application").

**Model**: `src-tauri/src/models/step.rs`

**Key Fields**:
- `id`: String (UUID)
- `intervention_id`: String (FK → `interventions.id`)
- `step_number`: i32 (order in workflow)
- `step_type`: Option<String>
- `title`: String
- `description`: Option<String>
- `status`: StepStatus enum
- `started_at`, `completed_at`: Option<i64>
- `duration_seconds`: Option<i64>
- `notes`: Option<String>
- `location_latitude`, `location_longitude`: Option<f64>
- `required`: bool
- `synced`: bool, `last_synced_at`: Option<i64>

**Status Enum**:
```rust
pub enum StepStatus { Pending, InProgress, Completed, Skipped }
```

**Relations**:
- 1 Step → 1 Intervention
- 1 Step → 0..* Photos

**Storage**:
- Table: `intervention_steps`
- Indexes: `intervention_id`, `status`, `step_number`

**Code Paths**:
- Model: `src-tauri/src/models/step.rs`
- Service: `src-tauri/src/services/intervention_workflow.rs`
- Commands: `src-tauri/src/commands/intervention/`

---

## 5. Photo

**Purpose**: Captures visual documentation at various stages of the intervention.

**Model**: `src-tauri/src/models/photo.rs`

**Key Fields**:
- `id`: String (UUID)
- `intervention_id`: String (FK → `interventions.id`)
- `step_id`: Option<String> (FK → `intervention_steps.id`)
- `file_path`: String
- `file_size`: Option<i64>
- `mime_type`: Option<String>
- `caption`: Option<String>
- `latitude`, `longitude`: Option<f64>
- `quality_score`: Option<i32>
- `taken_at`: Option<i64>
- `upload_retry_count`: i32, `upload_error`: Option<String>
- `synced`: bool, `last_synced_at`: Option<i64>

**Storage**:
- Table: `photos`
- Indexes: `intervention_id`, `step_id`

**Code Paths**:
- Model: `src-tauri/src/models/photo.rs`
- Service: `src-tauri/src/services/photo/`
- Repository: `src-tauri/src/repositories/photo_repository.rs`

---

## 6. Material

**Purpose**: Tracks inventory items (PPF rolls, tools, consumables) used during interventions.

**Model**: `src-tauri/src/models/material.rs`

**Key Fields**:
- `id`: String (UUID)
- `sku`: String (unique)
- `name`: String
- `description`: Option<String>
- `material_type`: MaterialType enum (PpfFilm, Adhesive, CleaningSolution, Tool, Consumable)
- `unit_of_measure`: UnitOfMeasure enum (Piece, Meter, Liter, Gram, Roll)
- `current_stock`: f64
- `minimum_stock`: Option<f64>
- `unit_cost`: Option<f64>
- `supplier_id`: Option<String>
- `lot_number`: Option<String>
- `expiry_date`: Option<String>
- `synced`: bool, `last_synced_at`: Option<i64>

**Storage**:
- Table: `materials`
- Related: `material_consumption`, `inventory_transactions`, `material_categories`

**Code Paths**:
- Model: `src-tauri/src/models/material.rs`
- Service: `src-tauri/src/services/material.rs`
- Repository: `src-tauri/src/repositories/material_repository.rs`
- Commands: `src-tauri/src/commands/material.rs`

---

## 7. User

**Purpose**: System users with authentication and role-based permissions.

**Model**: `src-tauri/src/models/auth.rs`, `src-tauri/src/models/user.rs`

**Key Fields**:
- `id`: String (UUID)
- `email`: String (unique)
- `username`: String
- `first_name`, `last_name`: Option<String>
- `password_hash`: String (Argon2)
- `role`: UserRole enum
- `is_active`: bool
- `two_factor_enabled`: bool
- `two_factor_secret`: Option<String>
- `backup_codes`: Option<String> (JSON)
- `last_login`: Option<i64>
- `synced`: bool, `last_synced_at`: Option<i64>

**Role Enum** (`src-tauri/src/models/auth.rs:31-41`):
```rust
pub enum UserRole {
    Admin,       // Full system access
    Supervisor,  // Manage operations, limited config
    Technician,  // Execute tasks, view assigned data
    Viewer,      // Read-only access
}
```

**Storage**:
- Table: `users`
- Indexes: `email`, `role`

**Code Paths**:
- Model: `src-tauri/src/models/auth.rs`, `src-tauri/src/models/user.rs`
- Service: `src-tauri/src/services/auth.rs`, `src-tauri/src/services/user.rs`, `src-tauri/src/services/session.rs`, `src-tauri/src/services/token.rs`, `src-tauri/src/services/two_factor.rs`
- Repository: `src-tauri/src/repositories/user_repository.rs`
- Commands: `src-tauri/src/commands/auth.rs`, `src-tauri/src/commands/user.rs`

---

## 8. Session (UserSession)

**Purpose**: Manages authenticated user sessions with token-based authentication.

**Model**: `src-tauri/src/models/auth.rs`

**Key Fields**:
- `id`: String (UUID)
- `user_id`: String (FK → `users.id`)
- `token`: String (JWT)
- `refresh_token`: Option<String>
- `expires_at`: i64
- `last_activity`: Option<i64>
- `device_info`: Option<DeviceInfo>
- `two_factor_verified`: bool

**Storage**:
- Table: `user_sessions`
- Indexes: `token`, `user_id`

**Code Paths**:
- Model: `src-tauri/src/models/auth.rs`
- Service: `src-tauri/src/services/session.rs`, `src-tauri/src/services/token.rs`
- Repository: `src-tauri/src/repositories/session_repository.rs`
- Middleware: `src-tauri/src/commands/auth_middleware.rs`

---

## 9. CalendarEvent

**Purpose**: Scheduled appointments and task bookings.

**Model**: `src-tauri/src/models/calendar_event.rs`

**Key Fields**:
- `id`: String (UUID)
- `task_id`: Option<String>
- `title`: String
- `start_datetime`, `end_datetime`: i64
- `technician_id`: Option<String>
- `synced`: bool, `last_synced_at`: Option<i64>

**Storage**:
- Table: `quotes` (new in migration 037)
- Related: `quote_items` (line items with pricing)
- Indexes: `client_id`, `vehicle_plate`, `status`

**Code Paths**:
- Model: `src-tauri/src/models/calendar.rs`, `src-tauri/src/models/calendar_event.rs`
- Service: `src-tauri/src/services/calendar.rs`, `src-tauri/src/services/calendar_event_service.rs`
- Repository: `src-tauri/src/repositories/calendar_event_repository.rs`
- Commands: `src-tauri/src/commands/calendar.rs` (9 calendar commands)

---

## 10. Quote/Devis

**Purpose**: PPF quotation/estimation generation with line items and pricing.

**Model**: **TODO (verify in code)**

**Key Fields**:
- `id`: String (UUID)
- `quote_number`: String (unique)
- `client_id`: String (FK → `clients.id`)
- `vehicle_plate`: Option<String>
- `status`: QuoteStatus enum (Draft, Sent, Accepted, Rejected, Expired)
- `total_amount`: f64
- `valid_until`: Option<i64>
- `created_at`, `updated_at`: i64

**Storage**:
- Tables: `quotes`, `quote_items` (added in migration 037)
- Indexes: `client_id`, `status`

**Code Paths**:
- Commands: `src-tauri/src/commands/quote.rs` (11 quote commands)
  - `quote_create`, `quote_mark_sent`, `quote_export_pdf`

---

## 11. SyncOperation

**Purpose**: Tracks pending operations for server synchronization.

**Model**: `src-tauri/src/models/sync.rs`

**Key Fields**:
- `id`: Option<i64>
- `operation_type`: OperationType (Create, Update, Delete)
- `entity_type`: EntityType (Task, Client, Intervention, Step, Photo, User)
- `entity_id`: String
- `data`: JSON
- `dependencies`: Vec<String>
- `status`: SyncStatus (Pending, Processing, Completed, Failed, Abandoned)
- `retry_count`, `max_retries`: i32

**Storage**:
- Table: `sync_queue`

**Code Paths**:
- Model: `src-tauri/src/models/sync.rs`
- Service: `src-tauri/src/sync/queue.rs`, `src-tauri/src/sync/background.rs`
- Commands: `src-tauri/src/commands/sync.rs`, `src-tauri/src/commands/queue.rs` (8 sync commands)

---

## Supporting Tables

| Table | Purpose |
|-------|---------|
| `audit_logs` | Sensitive operation tracking |
| `audit_events` | Comprehensive security audit trail |
| `settings_audit_log` | Settings change audit |
| `cache_metadata` | Key-value cache with TTL |
| `task_conflicts` | Scheduling conflict detection |
| `schema_version` | Migration version tracking |
| `user_settings` | User preferences |
| `notification_preferences` | Notification settings |
| `message_templates` | Reusable message templates |

---

## Quick Reference: Table Names

| Entity | Table | Primary Key | Main Indexes |
|--------|-------|-------------|--------------|
| Task | `tasks` | `id` (TEXT) | `task_number`, `status`, `client_id`, `technician_id` |
| Client | `clients` | `id` (TEXT) | `email`, `phone` |
| Intervention | `interventions` | `id` (TEXT) | `task_id`, `status` |
| InterventionStep | `intervention_steps` | `id` (TEXT) | `intervention_id`, `status` |
| Photo | `photos` | `id` (TEXT) | `intervention_id`, `step_id` |
| Material | `materials` | `id` (TEXT) | `sku`, `material_type` |
| User | `users` | `id` (TEXT) | `email`, `role` |
| Session | `user_sessions` | `id` (TEXT) | `token`, `user_id` |
| CalendarEvent | `calendar_events` | `id` (TEXT) | `task_id`, `start_datetime` |
| Quote | `quotes` | `id` (TEXT) | `client_id`, `status` |
| SyncOperation | `sync_queue` | `id` (INTEGER) | `entity_type`, `status` |

---

## Next Steps

- **Understand data flows**: [02_ARCHITECTURE_AND_DATAFLOWS.md](./02_ARCHITECTURE_AND_DATAFLOWS.md)
- **Learn IPC contracts**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
- **Database migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
