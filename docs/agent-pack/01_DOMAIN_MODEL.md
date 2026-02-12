# 01 - Domain Model

## Core Entities and Relationships

This document describes the primary business entities, their relationships, lifecycles, and how they map to database tables.

---

## Entity Relationship Diagram

```
┌─────────┐         ┌──────────┐         ┌──────────────┐
│  Client │1──────*0│   Task   │1────────│ Intervention │
└─────────┘         └──────────┘         └──────────────┘
                         │                        │
                         │                        │
                         │                        │1
                         │                        │
                         │                        │
                    ┌────┴────┐         ┌─────────┴─────────┐
                    │  User   │         │ InterventionStep  │
                    └─────────┘         └───────────────────┘
                         │                        │
                         │                        │*
                         │                        │
                    ┌────┴────┐             ┌────┴────┐
                    │ Session │             │  Photo  │
                    └─────────┘             └─────────┘
                                                 │
                                            ┌────┴────┐
                                            │Material │
                                            └─────────┘
```

---

##  1. Task

**Purpose**: Represents a work order or intervention request. Tasks are the top-level unit of work.

**Key Fields**:
- `id`: TEXT (UUID primary key)
- `task_number`: TEXT (unique, human-readable identifier, e.g., "T-20260211-001")
- `title`: TEXT (short description)
- `description`: TEXT (detailed information)
- `status`: TEXT (draft | assigned | in_progress | completed | cancelled | archived)
- `priority`: TEXT (low | medium | high | urgent)
- `client_id`: TEXT (foreign key → `clients.id`)
- `technician_id`: TEXT (assigned user ID)
- `scheduled_date`: TEXT (ISO 8601 date)
- `vehicle_plate`, `vehicle_model`, `vehicle_year`, `vehicle_make`, `vin`: TEXT
- `ppf_zones`: TEXT (JSON array of PPF zones to protect)
- `workflow_status`: TEXT (workflow progression status)
- `current_workflow_step_id`: TEXT (active intervention step ID)
- `created_at`, `updated_at`: INTEGER (Unix timestamp ms)

**Lifecycle / Status Enum**:
```rust
pub enum TaskStatus {
    Draft,        // Created but not yet assigned
    Assigned,     // Assigned to a technician
    InProgress,   // Intervention has started
    Completed,    // Intervention finished successfully
    Cancelled,    // Task cancelled before completion
    Archived,     // Completed task archived for records
    Failed,       // Task failed or aborted
    Overdue,      // Scheduled date passed without completion
    Paused,       // Temporarily paused
}
```

**Relations**:
- **1 Task → 0..1 Client** (via `client_id`)
- **1 Task → 0..* Interventions** (a task may have multiple intervention attempts)
- **1 Task → 0..1 User** (assigned technician)

**Storage**:
- **Table**: `tasks`
- **Soft Delete**: No (hard delete or archive)
- **Audit**: Yes (via `audit_logs` table for sensitive operations)

**Domain Rules** (from REQUIREMENTS):
- A task must have a unique `task_number`
- A task can only have one active intervention at a time
- Status transitions must be valid (e.g., can't go from `cancelled` to `in_progress`)
- Tasks with status `in_progress` must have an active intervention
- Technicians can only be assigned tasks matching their role permissions

**Code Paths**:
- Model: `src-tauri/src/models/task.rs`
- Service: `src-tauri/src/services/task.rs`, `task_validation.rs`, `task_crud.rs`
- Repository: `src-tauri/src/repositories/task_repository.rs`
- Commands: `src-tauri/src/commands/task/`

---

##  2. Client

**Purpose**: Represents a customer (individual or business) who owns vehicles requiring PPF installation.

**Key Fields**:
- `id`: TEXT (UUID)
- `name`: TEXT (full name or business name)
- `email`: TEXT (nullable, unique if provided)
- `phone`: TEXT (nullable)
- `address`: TEXT (nullable)
- `customer_type`: TEXT (individual | business)
- `company_name`: TEXT (for business clients)
- `siret`: TEXT (business registration number, France)
- `notes`: TEXT (internal notes)
- `total_tasks`: INTEGER (computed/cached count)
- `completed_tasks`: INTEGER (computed/cached count)
- `created_at`, `updated_at`: INTEGER (Unix timestamp ms)

**Lifecycle**:
- Clients are created when needed
- No formal status enum (active by default)
- Can be soft-deleted or archived (TODO: verify in code)

**Relations**:
- **1 Client → 0..* Tasks**

**Storage**:
- **Table**: `clients`
- **Indexes**: `idx_clients_email`, `idx_clients_phone`
- **Soft Delete**: TODO (verify in code)

**Domain Rules**:
- Email must be valid format if provided
- A client must have at least a `name`
- Statistics (`total_tasks`, `completed_tasks`) are maintained via triggers

**Code Paths**:
- Model: `src-tauri/src/models/client.rs`
- Service: `src-tauri/src/services/client.rs`, `client_validation.rs`, `client_statistics.rs`
- Repository: `src-tauri/src/repositories/client_repository.rs`
- Commands: `src-tauri/src/commands/client.rs`

---

##  3. Intervention

**Purpose**: Represents the execution of a task. An intervention tracks the actual work being performed, including step-by-step progression.

**Key Fields**:
- `id`: TEXT (UUID)
- `task_id`: TEXT (foreign key → `tasks.id`)
- `task_number`: TEXT (denormalized for quick access)
- `status`: TEXT (pending | in_progress | paused | completed | cancelled)
- `intervention_type`: TEXT (ppf | ceramic | detailing | other)
- `vehicle_plate`: TEXT (denormalized from task)
- `started_at`: INTEGER (when intervention began)
- `completed_at`: INTEGER (nullable, when intervention finished)
- `paused_at`: INTEGER (nullable)
- `total_duration_seconds`: INTEGER (calculated duration)
- `notes`: TEXT (technician notes)
- `quality_score`: INTEGER (nullable, 0-100)
- `created_at`, `updated_at`: INTEGER

**Lifecycle / Status Enum**:
```rust
pub enum InterventionStatus {
    Pending,      // Created but not started
    InProgress,   // Currently being executed
    Paused,       // Temporarily paused
    Completed,    // Successfully finished
    Cancelled,    // Aborted
}
```

**Relations**:
- **1 Intervention → 1 Task** (via `task_id`)
- **1 Intervention → 0..* InterventionSteps** (workflow steps)
- **1 Intervention → 0..* Photos** (captured during execution)

**Storage**:
- **Table**: `interventions`
- **Indexes**: `idx_interventions_task_id`, `idx_interventions_status`

**Domain Rules**:
- Only one intervention can be `in_progress` per task at a time
- Intervention must be started before steps can be executed
- Cannot complete an intervention with incomplete required steps
- Photos must be associated with specific steps

**Code Paths**:
- Model: `src-tauri/src/models/intervention.rs`
- Service: `src-tauri/src/services/intervention.rs`, `intervention_workflow.rs`, `intervention_validation.rs`
- Repository: `src-tauri/src/repositories/intervention_repository.rs`
- Commands: `src-tauri/src/commands/intervention/`

---

##  4. InterventionStep

**Purpose**: Represents a single step in the intervention workflow (e.g., "Vehicle Preparation", "Film Application", "Final Inspection").

**Key Fields**:
- `id`: TEXT (UUID)
- `intervention_id`: TEXT (foreign key → `interventions.id`)
- `step_number`: INTEGER (order in workflow)
- `step_type`: TEXT (preparation | application | inspection | cleanup | quality_check)
- `title`: TEXT (step name)
- `description`: TEXT (detailed instructions)
- `status`: TEXT (pending | in_progress | completed | skipped)
- `started_at`: INTEGER (nullable)
- `completed_at`: INTEGER (nullable)
- `duration_seconds`: INTEGER (calculated)
- `notes`: TEXT (technician notes for this step)
- `location_latitude`, `location_longitude`: REAL (GPS capture, nullable)
- `required`: INTEGER (boolean, 1 if step must be completed)
- `created_at`, `updated_at`: INTEGER

**Lifecycle / Status Enum**:
```rust
pub enum StepStatus {
    Pending,     // Not started yet
    InProgress,  // Currently executing
    Completed,   // Finished
    Skipped,     // Optionally skipped (only for non-required steps)
}
```

**Relations**:
- **1 Step → 1 Intervention**
- **1 Step → 0..* Photos** (photos taken during this step)

**Storage**:
- **Table**: `intervention_steps`
- **Indexes**: `idx_steps_intervention_id`, `idx_steps_status`

**Domain Rules**:
- Steps must be executed in order (enforced by `step_number`)
- Required steps cannot be skipped
- Cannot mark intervention as complete if required steps are not completed

**Code Paths**:
- Model: `src-tauri/src/models/step.rs`
- Service: `src-tauri/src/services/intervention_workflow.rs`, `workflow_progression.rs`
- Commands: `src-tauri/src/commands/intervention/`

---

##  5. Photo

**Purpose**: Captures visual documentation at various stages of the intervention.

**Key Fields**:
- `id`: TEXT (UUID)
- `intervention_id`: TEXT (foreign key → `interventions.id`)
- `step_id`: TEXT (nullable, foreign key → `intervention_steps.id`)
- `file_path`: TEXT (path to photo on disk)
- `file_size`: INTEGER (bytes)
- `mime_type`: TEXT (e.g., "image/jpeg")
- `caption`: TEXT (nullable, user-provided description)
- `latitude`, `longitude`: REAL (GPS coordinates, nullable)
- `taken_at`: INTEGER (Unix timestamp ms)
- `created_at`: INTEGER

**Relations**:
- **1 Photo → 1 Intervention**
- **1 Photo → 0..1 InterventionStep** (optional association with specific step)

**Storage**:
- **Table**: `photos`
- **Indexes**: `idx_photos_intervention_id`, `idx_photos_step_id`
- **File Storage**: Local filesystem (path stored in DB)

**Domain Rules**:
- Photos are immutable once created
- File path must exist on local filesystem
- Photos should be associated with a step when possible for better organization

**Code Paths**:
- Model: `src-tauri/src/models/photo.rs`
- Service: `src-tauri/src/services/photo/`
- Repository: `src-tauri/src/repositories/photo_repository.rs`

---

##  6. Material

**Purpose**: Tracks inventory items (PPF rolls, tools, consumables) used during interventions.

**Key Fields**:
- `id`: TEXT (UUID)
- `sku`: TEXT (unique stock keeping unit)
- `name`: TEXT
- `description`: TEXT (nullable)
- `category`: TEXT (film | tool | consumable | accessory)
- `unit`: TEXT (m2 | liter | piece | roll)
- `quantity_in_stock`: REAL (current stock level)
- `minimum_stock`: REAL (alert threshold)
- `unit_cost`: REAL (price per unit)
- `supplier_id`: TEXT (nullable, foreign key → `suppliers.id`)
- `lot_number`: TEXT (nullable, batch tracking)
- `expiry_date`: TEXT (nullable, ISO 8601)
- `created_at`, `updated_at`: INTEGER

**Relations**:
- **1 Material → 0..* MaterialConsumption** (usage records)
- **1 Material → 0..1 Supplier**

**Storage**:
- **Table**: `materials`
- **Indexes**: `idx_materials_sku`, `idx_materials_category`

**Domain Rules**:
- Stock cannot go negative (enforced in business logic)
- Low stock alerts trigger when `quantity_in_stock < minimum_stock`
- Expired materials should be flagged (expiry_date < current date)

**Code Paths**:
- Model: `src-tauri/src/models/material.rs`
- Service: `src-tauri/src/services/material.rs`
- Repository: `src-tauri/src/repositories/material_repository.rs`
- Commands: `src-tauri/src/commands/material.rs`

---

##  7. User

**Purpose**: Represents system users with authentication and role-based permissions.

**Key Fields**:
- `id`: TEXT (UUID)
- `email`: TEXT (unique, used for login)
- `first_name`: TEXT
- `last_name`: TEXT
- `password_hash`: TEXT (Argon2 hashed password)
- `role`: TEXT (admin | supervisor | technician | viewer)
- `is_active`: INTEGER (boolean, 1 if account is active)
- `two_factor_enabled`: INTEGER (boolean)
- `two_factor_secret`: TEXT (nullable, TOTP secret)
- `avatar_url`: TEXT (nullable)
- `created_at`, `updated_at`: INTEGER
- `last_login_at`: INTEGER (nullable)

**Role Enum**:
```rust
pub enum UserRole {
    Admin,       // Full system access
    Supervisor,  // Manage tasks, users, view all data
    Technician,  // Execute tasks, view assigned data
    Viewer,      // Read-only access
}
```

**Relations**:
- **1 User → 0..* Tasks** (assigned tasks)
- **1 User → 0..* Sessions** (active login sessions)
- **1 User → 0..* AuditLogs** (actions performed)

**Storage**:
- **Table**: `users`
- **Indexes**: `idx_users_email`, `idx_users_role`

**Domain Rules**:
- Email must be unique
- Password must be hashed with Argon2
- Inactive users cannot log in
- Role determines access permissions (see RBAC matrix in 06_SECURITY_AND_RBAC.md)

**Code Paths**:
- Model: `src-tauri/src/models/auth.rs`, `user.rs`
- Service: `src-tauri/src/services/auth.rs`, `user.rs`
- Repository: `src-tauri/src/repositories/user_repository.rs`
- Commands: `src-tauri/src/commands/auth.rs`, `user.rs`

---

##  8. Session

**Purpose**: Manages authenticated user sessions with token-based authentication.

**Key Fields**:
- `id`: TEXT (UUID)
- `user_id`: TEXT (foreign key → `users.id`)
- `session_token`: TEXT (unique, JWT or random token)
- `refresh_token`: TEXT (unique, for token renewal)
- `expires_at`: INTEGER (Unix timestamp ms)
- `created_at`: INTEGER
- `updated_at`: INTEGER
- `last_activity_at`: INTEGER (for session timeout tracking)

**Relations**:
- **1 Session → 1 User**

**Storage**:
- **Table**: `user_sessions`
- **Indexes**: `idx_sessions_token`, `idx_sessions_user_id`

**Domain Rules**:
- Session tokens expire after a configured duration (default: 24 hours)
- Refresh tokens allow extending session without re-login
- Expired sessions must be cleaned up periodically
- Each user can have multiple active sessions (different devices)

**Code Paths**:
- Model: `src-tauri/src/models/auth.rs`
- Service: `src-tauri/src/services/session.rs`
- Repository: `src-tauri/src/repositories/session_repository.rs`

---

##  9. CalendarEvent

**Purpose**: Represents scheduled appointments and task bookings on the calendar.

**Key Fields**:
- `id`: TEXT (UUID)
- `task_id`: TEXT (nullable, foreign key → `tasks.id`)
- `title`: TEXT
- `description`: TEXT (nullable)
- `start_time`: INTEGER (Unix timestamp ms)
- `end_time`: INTEGER (Unix timestamp ms)
- `all_day`: INTEGER (boolean)
- `recurrence_rule`: TEXT (nullable, RRULE format for recurring events)
- `technician_id`: TEXT (nullable, assigned user)
- `created_at`, `updated_at`: INTEGER

**Relations**:
- **1 CalendarEvent → 0..1 Task**
- **1 CalendarEvent → 0..1 User** (technician)

**Storage**:
- **Table**: `calendar_events`
- **Indexes**: `idx_calendar_start_time`, `idx_calendar_task_id`

**Domain Rules**:
- `start_time` must be before `end_time`
- Calendar conflict detection prevents double-booking technicians
- Recurring events follow iCalendar RRULE standard

**Code Paths**:
- Model: `src-tauri/src/models/calendar_event.rs`
- Service: `src-tauri/src/services/calendar.rs`
- Repository: `src-tauri/src/repositories/calendar_event_repository.rs`
- Commands: `src-tauri/src/commands/calendar.rs`

---

##  10. Message / Notification

**Purpose**: Internal messaging and notification system for user communication.

**Key Fields** (Message):
- `id`: TEXT (UUID)
- `sender_id`: TEXT (foreign key → `users.id`, nullable for system messages)
- `receiver_id`: TEXT (foreign key → `users.id`)
- `subject`: TEXT
- `body`: TEXT
- `read_at`: INTEGER (nullable, Unix timestamp when read)
- `archived`: INTEGER (boolean)
- `created_at`: INTEGER

**Key Fields** (Notification):
- `id`: TEXT (UUID)
- `user_id`: TEXT (foreign key → `users.id`)
- `type`: TEXT (task_assigned | intervention_completed | low_stock | etc.)
- `title`: TEXT
- `message`: TEXT
- `read`: INTEGER (boolean)
- `action_url`: TEXT (nullable, deep link to relevant screen)
- `created_at`: INTEGER

**Storage**:
- **Tables**: `messages`, `notifications`
- **Indexes**: `idx_messages_receiver`, `idx_notifications_user_id`

**Domain Rules**:
- System-generated notifications have `sender_id = NULL`
- Notifications can be marked as read
- Messages support archive functionality

**Code Paths**:
- Model: `src-tauri/src/models/message.rs`, `notification.rs`
- Service: `src-tauri/src/services/notification.rs`
- Repository: `src-tauri/src/repositories/message_repository.rs`, `notification_repository.rs`
- Commands: `src-tauri/src/commands/message.rs`, `notification.rs`

---

##  Supporting Tables (not primary entities)

### `audit_logs`
Tracks sensitive operations for security and compliance.

**Fields**: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `changes`, `ip_address`, `user_agent`, `created_at`

### `sync_queue`
Stores pending operations for future server synchronization.

**Fields**: `id`, `operation_type`, `entity_type`, `entity_id`, `payload`, `status`, `created_at`, `synced_at`

### `schema_version`
Migration tracking table.

**Fields**: `version` (INTEGER, current schema version)

---

## Quick Reference: Table Names

| Entity | Table Name | Primary Key | Main Indexes |
|--------|-----------|-------------|--------------|
| Task | `tasks` | `id` (TEXT) | `task_number`, `status`, `client_id`, `technician_id` |
| Client | `clients` | `id` (TEXT) | `email`, `phone` |
| Intervention | `interventions` | `id` (TEXT) | `task_id`, `status` |
| InterventionStep | `intervention_steps` | `id` (TEXT) | `intervention_id`, `status`, `step_number` |
| Photo | `photos` | `id` (TEXT) | `intervention_id`, `step_id` |
| Material | `materials` | `id` (TEXT) | `sku`, `category` |
| User | `users` | `id` (TEXT) | `email`, `role` |
| Session | `user_sessions` | `id` (TEXT) | `session_token`, `user_id` |
| CalendarEvent | `calendar_events` | `id` (TEXT) | `task_id`, `start_time` |
| Message | `messages` | `id` (TEXT) | `receiver_id`, `sender_id` |
| Notification | `notifications` | `id` (TEXT) | `user_id`, `read` |

---

## Next Steps

- **Understand data flows**: [02_ARCHITECTURE_AND_DATAFLOWS.md](./02_ARCHITECTURE_AND_DATAFLOWS.md)
- **Learn IPC contracts**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
- **Database migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
