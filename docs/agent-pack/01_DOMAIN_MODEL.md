# Domain Model

Core entities, their relationships, statuses, and storage mapping.

## Core Entities

### Task (`tasks` domain)
**Purpose**: Represents a high-level job or work order for a client.

**Key Fields**:
- `id`, `task_number` — identifiers
- `title`, `description` — basic info
- `vehicle_plate`, `vehicle_model`, `vehicle_year`, `vehicle_make`, `vin` — vehicle details
- `status` — see TaskStatus enum below
- `priority` — `Low`, `Medium`, `High`, `Urgent`
- `client_id`, `customer_name`, `customer_email`, `customer_phone` — client info
- `technician_id`, `assigned_at`, `assigned_by` — assignment
- `scheduled_date`, `date_rdv`, `heure_rdv` — scheduling
- `ppf_zones`, `custom_ppf_zones` — PPF configuration
- `created_at`, `updated_at`, `deleted_at`, `synced`, `last_synced_at` — audit fields

**Status Enum** (`TaskStatus` in `src-tauri/src/domains/tasks/domain/models/task.rs`):
| Status | Description |
|--------|-------------|
| `Draft` | Initial state (default) |
| `Scheduled` | Date assigned |
| `InProgress` | Work started |
| `Completed` | Work finished |
| `Cancelled` | Cancelled |
| `OnHold` | Paused/holding |
| `Pending` | Awaiting action |
| `Assigned` | Technician assigned |
| `Paused` | Temporarily stopped |
| `Overdue` | Past due date |
| `Archived` | Historical record |
| `Failed` | Unsuccessful completion |
| `Invalid` | Invalid/corrupted |

**Validation Rules** (CreateTaskRequest):
- `vehicle_plate`: required, non-empty
- `vehicle_model`: required, non-empty
- `ppf_zones`: required, non-empty array, each zone max 100 chars
- `scheduled_date`: required, non-empty
- `vehicle_year`: optional, must be between 1900-2100
- `customer_email`: optional, must contain '@' and '.'

**Relations**: Belongs to a Client; contains one or more Interventions.

---

### Intervention (`interventions` domain)
**Purpose**: The actual PPF application process with step-by-step workflow.

**Key Fields**:
- `id`, `task_id`, `task_number` — identifiers
- `status` — see InterventionStatus enum below
- `current_step`, `completion_percentage` — progress tracking
- `intervention_type` — `Ppf`, `Ceramic`, `Detailing`, `Other`
- `vehicle_plate`, `vehicle_model`, `vehicle_make`, `vehicle_year`, `vehicle_color`, `vehicle_vin` — vehicle
- `client_id`, `client_name`, `client_email`, `client_phone` — client
- `technician_id`, `technician_name` — assigned tech
- `scheduled_at`, `started_at`, `completed_at`, `paused_at` — timing
- `ppf_zones_config`, `ppf_zones_extended`, `film_type`, `film_brand`, `film_model` — PPF config
- `weather_condition`, `lighting_condition`, `temperature_celsius`, `humidity_percentage` — environment
- `customer_satisfaction` (1-10), `quality_score` (0-100), `customer_signature` — finalization
- `synced`, `last_synced_at` — audit fields

**Status Enum** (`InterventionStatus` in `src-tauri/src/domains/interventions/domain/models/intervention.rs`):
| Status | Description |
|--------|-------------|
| `Pending` | Awaiting start (default) |
| `InProgress` | Currently active |
| `Paused` | Temporarily stopped |
| `Completed` | Finished successfully |
| `Cancelled` | Abandoned |

**StepStatus Enum** (for workflow steps):
| Status | Description |
|--------|-------------|
| `Pending` | Not started |
| `InProgress` | Active |
| `Paused` | Temporarily stopped |
| `Completed` | Done |
| `Failed` | Unsuccessful |
| `Skipped` | Bypassed |
| `Rework` | Needs redo |

**Validation Rules**:
- `vehicle_plate`: required, non-empty
- `vehicle_year`: optional, must be between 1900-2100
- `completion_percentage`: must be 0.0-100.0
- `customer_satisfaction`: optional, must be 1-10
- `quality_score`: optional, must be 0-100

**Relations**: Belongs to a Task; contains Photos; consumes Inventory/Materials.

---

### Client (`clients` domain)
**Purpose**: Customer profile management.

**Key Fields**:
- `id` — identifier
- `name`, `email`, `phone` — contact info
- `customer_type` — `Individual` or `Business`
- `address_street`, `address_city`, `address_state`, `address_zip`, `address_country` — address
- `tax_id`, `company_name`, `contact_person` — business info
- `notes`, `tags` — metadata
- `total_tasks`, `active_tasks`, `completed_tasks`, `last_task_date` — statistics
- `created_at`, `updated_at`, `deleted_at`, `synced` — audit fields

**Validation Rules** (CreateClientRequest):
- `name`: required, non-empty, max 100 chars
- `email`: optional, valid email format
- `phone`: optional, 7-20 digits
- `notes`: optional, max 1000 chars

**Relations**: Has many Tasks, Quotes.

---

### User (`users` / `auth` domain)
**Purpose**: System personnel (Technicians, Supervisors, Admins, Viewers).

**Key Fields**:
- `id`, `email`, `username` — identifiers
- `first_name`, `last_name`, `phone` — profile
- `role` — see UserRole enum below
- `password_hash`, `salt` — credential
- `is_active` — account status
- `last_login`, `login_count` — activity tracking
- `preferences` — settings JSON
- `created_at`, `updated_at`, `synced` — audit fields

**Role Enum** (`UserRole` in `src-tauri/src/domains/auth/domain/models/auth.rs`):
| Role | Access Level |
|------|--------------|
| `Admin` | Full system access |
| `Supervisor` | Task management, assignment, quotes |
| `Technician` | Assigned tasks, interventions, photos |
| `Viewer` | Read-only access |

**Role Hierarchy**: Admin > Supervisor > Technician > Viewer

**Relations**: Performs Interventions; owns Sessions.

---

### Material (`inventory` domain)
**Purpose**: PPF materials, tools, and consumables.

**Key Fields**:
- `id`, `sku`, `name`, `description` — identifiers
- `material_type` — `PpfFilm`, `Adhesive`, `CleaningSolution`, `Tool`, `Consumable`
- `category`, `subcategory` — categorization
- `brand`, `model`, `specifications` — specs
- `unit_of_measure` — `Piece`, `Meter`, `Liter`, `Gram`, `Roll`
- `current_stock`, `minimum_stock`, `maximum_stock`, `reorder_point` — inventory levels
- `unit_cost`, `currency` — pricing
- `supplier_id`, `supplier_name` — supplier
- `quality_grade`, `certification`, `expiry_date` — quality
- `storage_location`, `warehouse_id` — location
- `is_active`, `is_discontinued`, `is_expired`, `is_low_stock` — status flags
- `created_at`, `updated_at`, `synced` — audit fields

**Relations**: Consumed by Interventions; tracked via `material_consumption` and `inventory_transactions` tables.

---

### Photo (`documents` domain)
**Purpose**: Progress tracking and QA validation imagery.

**Key Fields**:
- `id` — identifier
- `intervention_id`, `step_id` — relations
- `file_path` — storage location
- `captured_at` — timestamp
- Metadata: dimensions, file size, format

---

### SyncOperation (`sync` domain)
**Purpose**: Offline-first queue for background synchronization.

**Key Fields**:
- `id` — identifier
- `operation_type` — `Create`, `Update`, `Delete`
- `entity_type` — `Task`, `Client`, `Intervention`, `Step`, `Photo`, `User`
- `entity_id` — target entity
- `data` — JSON payload
- `dependencies` — ordered list of prerequisite entity IDs
- `status` — `Pending`, `Processing`, `Completed`, `Failed`, `Abandoned`
- `retry_count`, `max_retries`, `last_error` — retry logic
- `timestamp_utc`, `created_at`, `updated_at` — timing

---

## Storage Mapping

| Entity | Primary Table | Key Migration File |
|--------|---------------|-------------------|
| Task | `tasks` | Base schema |
| Intervention | `interventions` | Base schema |
| Client | `clients` | Base schema / `002_*` (FTS) |
| User | `users` | Base schema / `041_*` (Sessions) |
| Session | `sessions` | `041_replace_user_sessions_with_sessions.sql` |
| Material | `materials` | `012_add_material_tables.sql` |
| Photo | `photos` | Base schema |
| Quote | `quotes`, `quote_items` | `037_quotes.sql` |
| Audit Log | `audit_events` | `025_add_analytics_dashboard.sql` |
| Sync Queue | `sync_queue` | Sync domain infrastructure |
| Notification | `notifications` | `044_add_notifications_table.sql` |
| App Settings | `app_settings` | `054_app_settings_table.sql` |

## Domain Invariants

- **Cross-domain isolation**: Domains cannot directly query other domains' tables. Use public application services.
- **Soft delete**: Entities use `deleted_at` timestamps rather than hard deletion (where applicable).
- **Audit trail**: Changes to sensitive entities trigger `audit_events` records.
- **Offline sync**: All entities have `synced` boolean and `last_synced_at` timestamps.
- **Status transitions**: Domain layer enforces valid status transitions (e.g., cannot complete a task that hasn't started).
