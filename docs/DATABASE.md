# RPMA v2 - Database Documentation

## Table of Contents

- [Introduction](#introduction)
- [Database Technology](#database-technology)
- [Schema Overview](#schema-overview)
- [Table Definitions](#table-definitions)
- [Indexes](#indexes)
- [Constraints](#constraints)
- [Triggers](#triggers)
- [Views](#views)
- [Entity Relationships](#entity-relationships)
- [Migration History](#migration-history)
- [Database Management](#database-management)

## Introduction

This document provides comprehensive documentation for the **RPMA v2** database schema. The application uses **SQLite** as its database engine, configured with **WAL (Write-Ahead Logging)** mode for improved concurrency and performance.

### Database Characteristics

- **Engine**: SQLite 3.x
- **Mode**: WAL (Write-Ahead Logging)
- **Foreign Keys**: Enabled
- **Case Sensitivity**: Case-insensitive for TEXT, case-sensitive for identifiers
- **Timestamp Storage**: Unix milliseconds (for JavaScript compatibility)
- **Primary Keys**: UUID (TEXT, 36 characters)
- **Soft Deletes**: Enabled for major tables (deleted_at, deleted_by)

### Database File

- **Location**: Configurable (typically in application data directory)
- **File Size**: Grows with data, supports up to 140TB (SQLite limit)
- **Backup**: Manual or periodic vacuum operations
- **Migration System**: Versioned migrations (001, 002, etc.)

## Database Technology

### SQLite Configuration

```sql
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging
PRAGMA foreign_keys = ON;            -- Enable foreign key constraints
PRAGMA synchronous = NORMAL;         -- Balance between safety and performance
PRAGMA cache_size = -64000;          -- 64MB cache
PRAGMA temp_store = MEMORY;          -- Store temporary tables in memory
PRAGMA mmap_size = 30000000000;      -- 30GB memory-mapped I/O
```

### Connection Pooling

- **Library**: r2d2 (Rust connection pool)
- **Max Connections**: 100 (configurable)
- **Min Idle**: 1
- **Connection Timeout**: 30 seconds
- **Retry Logic**: 3 attempts with exponential backoff

### WAL Checkpointing

- **Frequency**: Every 60 seconds
- **Automatic**: Enabled
- **Manual**: Available via `vacuum_database` command

## Schema Overview

### Entity Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                        RPMA Database                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. User Management                                          │
│    - users                                                   │
│    - user_settings                                           │
│    - user_consent                                             │
│    - two_factor_backup_codes                                   │
│    - two_factor_attempts                                      │
│                                                             │
│ 2. Client Management                                        │
│    - clients                                                 │
│                                                             │
│ 3. Task Management                                          │
│    - tasks                                                   │
│    - task_history                                            │
│    - task_conflicts                                          │
│                                                             │
│ 4. Intervention Management                                   │
│    - interventions                                           │
│    - intervention_steps                                      │
│                                                             │
│ 5. Photo Management                                         │
│    - photos                                                  │
│                                                             │
│ 6. Material & Inventory                                    │
│    - materials                                               │
│    - material_consumption                                    │
│    - material_categories                                      │
│    - inventory_transactions                                   │
│    - suppliers                                               │
│                                                             │
│ 7. Messaging & Notifications                                │
│    - messages                                                │
│    - message_templates                                       │
│    - notification_preferences                                 │
│                                                             │
│ 8. Calendar                                                │
│    - calendar_events                                         │
│                                                             │
│ 9. Authentication & Sessions                                 │
│    - sessions                                                │
│                                                             │
│ 10. Sync & Cache                                           │
│     - sync_queue                                             │
│     - cache_metadata                                         │
│     - cache_statistics                                       │
│                                                             │
│ 11. Audit & Compliance                                      │
│     - audit_events                                           │
│     - settings_audit_log                                     │
│                                                             │
│ 12. Analytics                                               │
│     - analytics_kpis                                         │
│     - analytics_metrics                                       │
│     - analytics_dashboards                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Table Definitions

### 1. User Management Tables

#### 1.1 users

**Purpose**: Store user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | User UUID |
| email | TEXT | NOT NULL UNIQUE | User email address |
| username | TEXT | NOT NULL | Username |
| password_hash | TEXT | NOT NULL | Argon2 hashed password |
| full_name | TEXT | NOT NULL | User's full name |
| role | TEXT | NOT NULL | User role (admin, supervisor, technician, viewer) |
| phone | TEXT | NULL | Phone number |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active status (0 or 1) |
| last_login_at | INTEGER | NULL | Last login timestamp (Unix ms) |
| login_count | INTEGER | DEFAULT 0 | Number of successful logins |
| two_factor_enabled | INTEGER | NOT NULL DEFAULT 0 | 2FA enabled (0 or 1) |
| two_factor_secret | TEXT | NULL | TOTP secret (base32) |
| preferences | TEXT | NULL | User preferences (JSON) |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

**Indexes**:
- `idx_users_role_active` (role, is_active)
- `idx_users_last_login` (last_login_at DESC)

**Example Data**:
```sql
INSERT INTO users (
  id, email, username, password_hash, full_name, role, is_active, created_at, updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'admin@example.com',
  'admin',
  '$argon2id$v=19$m=32768,t=3,p=4$...',
  'System Administrator',
  'admin',
  1,
  1704067200000,
  1704067200000
);
```

---

#### 1.2 user_settings

**Purpose**: Store user-specific settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | TEXT | PRIMARY KEY REFERENCES users(id) | User UUID |
| avatar_url | TEXT | NULL | Avatar image URL |
| updated_at | INTEGER | NOT NULL DEFAULT 0 | Last update timestamp (Unix ms) |

---

#### 1.3 user_consent

**Purpose**: Store GDPR consent information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| user_id | TEXT | UNIQUE NOT NULL REFERENCES users(id) | User UUID |
| consent_data | TEXT | NOT NULL | Consent data (JSON) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| created_at | INTEGER | NOT NULL DEFAULT (strftime('%s') * 1000) | Creation timestamp (Unix ms) |

**Indexes**:
- `idx_user_consent_user_id` (user_id)

---

#### 1.4 two_factor_backup_codes

**Purpose**: Store 2FA backup codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Backup code UUID |
| user_id | TEXT | NOT NULL REFERENCES users(id) | User UUID |
| code_hash | TEXT | NOT NULL | Hashed backup code |
| used | INTEGER | NOT NULL DEFAULT 0 | Used status (0 or 1) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| used_at | INTEGER | NULL | Usage timestamp (Unix ms) |

**Indexes**:
- `idx_two_factor_backup_codes_user_id` (user_id)

---

#### 1.5 two_factor_attempts

**Purpose**: Log 2FA attempts for audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Attempt UUID |
| user_id | TEXT | NOT NULL REFERENCES users(id) | User UUID |
| attempt_type | TEXT | NOT NULL | setup, verification, or backup_code |
| success | INTEGER | NOT NULL | Success status (0 or 1) |
| ip_address | TEXT | NULL | Client IP address |
| user_agent | TEXT | NULL | User agent string |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |

**Indexes**:
- `idx_two_factor_attempts_user_id` (user_id)
- `idx_two_factor_attempts_created_at` (created_at)

---

### 2. Client Management Tables

#### 2.1 clients

**Purpose**: Store client/customer information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Client UUID |
| name | TEXT | NOT NULL | Client name |
| email | TEXT | NULL | Email address |
| phone | TEXT | NULL | Phone number |
| customer_type | TEXT | NOT NULL | individual or business |
| address_street | TEXT | NULL | Street address |
| address_city | TEXT | NULL | City |
| address_state | TEXT | NULL | State/Province |
| address_zip | TEXT | NULL | ZIP/Postal code |
| address_country | TEXT | NULL | Country |
| tax_id | TEXT | NULL | Tax ID |
| company_name | TEXT | NULL | Company name (business clients) |
| contact_person | TEXT | NULL | Contact person (business clients) |
| notes | TEXT | NULL | Client notes |
| tags | TEXT | NULL | Tags (JSON array) |
| total_tasks | INTEGER | DEFAULT 0 | Computed: total tasks |
| active_tasks | INTEGER | DEFAULT 0 | Computed: active tasks |
| completed_tasks | INTEGER | DEFAULT 0 | Computed: completed tasks |
| last_task_date | TEXT | NULL | Computed: last task date |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| deleted_at | INTEGER | NULL | Soft delete timestamp (Unix ms) |
| deleted_by | TEXT | NULL REFERENCES users(id) | Deleter user UUID |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_clients_name_type_active` (name, customer_type, deleted_at)
- `idx_clients_name_email` (name, email)
- `idx_clients_active_created` (is_active, created_at DESC)

**Triggers**:
- `task_insert_update_client_stats` - Updates stats on task insert
- `task_update_update_client_stats` - Updates stats on task update
- `task_delete_update_client_stats` - Updates stats on task delete

---

### 3. Task Management Tables

#### 3.1 tasks

**Purpose**: Store PPF installation tasks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Task UUID |
| task_number | TEXT | UNIQUE NOT NULL | Unique task number |
| title | TEXT | NOT NULL | Task title |
| description | TEXT | NULL | Task description |
| vehicle_plate | TEXT | NULL | Vehicle license plate |
| vehicle_model | TEXT | NULL | Vehicle model |
| vehicle_year | TEXT | NULL | Vehicle year |
| vehicle_make | TEXT | NULL | Vehicle make |
| vin | TEXT | NULL | Vehicle identification number |
| ppf_zones | TEXT | NULL | PPF zones (JSON array) |
| custom_ppf_zones | TEXT | NULL | Custom PPF zones (JSON array) |
| status | TEXT | NOT NULL DEFAULT 'draft' | Task status |
| priority | TEXT | NOT NULL DEFAULT 'medium' | Task priority |
| technician_id | TEXT | NULL REFERENCES users(id) | Assigned technician UUID |
| assigned_at | INTEGER | NULL | Assignment timestamp (Unix ms) |
| assigned_by | TEXT | NULL REFERENCES users(id) | Assigner user UUID |
| scheduled_date | TEXT | NULL | Scheduled date (YYYY-MM-DD) |
| start_time | TEXT | NULL | Start time (HH:MM) |
| end_time | TEXT | NULL | End time (HH:MM) |
| date_rdv | TEXT | NULL | RDV date (YYYY-MM-DD) |
| heure_rdv | TEXT | NULL | RDV time (HH:MM) |
| template_id | TEXT | NULL | Template UUID |
| workflow_id | TEXT | NULL REFERENCES interventions(id) | Linked intervention UUID |
| workflow_status | TEXT | NULL | Workflow status |
| current_workflow_step_id | TEXT | NULL | Current workflow step UUID |
| started_at | INTEGER | NULL | Start timestamp (Unix ms) |
| completed_at | INTEGER | NULL | Completion timestamp (Unix ms) |
| completed_steps | TEXT | NULL | Completed steps (JSON array) |
| client_id | TEXT | NULL REFERENCES clients(id) | Client UUID |
| customer_name | TEXT | NULL | Denormalized customer name |
| customer_email | TEXT | NULL | Denormalized customer email |
| customer_phone | TEXT | NULL | Denormalized customer phone |
| customer_address | TEXT | NULL | Denormalized customer address |
| external_id | TEXT | NULL | External system ID |
| lot_film | TEXT | NULL | Film lot number |
| checklist_completed | INTEGER | DEFAULT 0 | Checklist completed (0 or 1) |
| notes | TEXT | NULL | Task notes |
| tags | TEXT | NULL | Tags (JSON array) |
| estimated_duration | INTEGER | NULL | Estimated duration (minutes) |
| actual_duration | INTEGER | NULL | Actual duration (minutes) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| creator_id | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| created_by | TEXT | NULL REFERENCES users(id) | Creator UUID |
| updated_by | TEXT | NULL REFERENCES users(id) | Updater user UUID |
| deleted_at | INTEGER | NULL | Soft delete timestamp (Unix ms) |
| deleted_by | TEXT | NULL REFERENCES users(id) | Deleter user UUID |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**CHECK Constraints**:
```sql
CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused'))
CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
```

**Indexes**:
- `idx_tasks_status` (status)
- `idx_tasks_technician_id` (technician_id)
- `idx_tasks_client_id` (client_id)
- `idx_tasks_priority` (priority)
- `idx_tasks_scheduled_date` (scheduled_date)
- `idx_tasks_created_at` (created_at)
- `idx_tasks_synced` (synced) WHERE synced = 0
- `idx_tasks_task_number` (task_number)
- `idx_tasks_status_technician` (status, technician_id)
- `idx_tasks_status_priority` (status, priority)
- `idx_tasks_client_status` (client_id, status)
- `idx_tasks_technician_scheduled` (technician_id, scheduled_date)
- `idx_tasks_status_scheduled` (status, scheduled_date)
- `idx_tasks_sync_status` (synced, status) WHERE synced = 0
- `idx_tasks_client_id_created_at` (client_id, created_at DESC)
- `idx_tasks_technician_scheduled_date` (technician_id, scheduled_date)
- `idx_tasks_technician_status_scheduled` (technician_id, status, scheduled_date)
- `idx_tasks_status_priority_scheduled_date` (status, priority DESC, scheduled_date)
- `idx_tasks_technician_status_priority` (technician_id, status, priority DESC)
- `idx_tasks_created_status_scheduled` (created_at DESC, status, scheduled_date)
- `idx_tasks_client_status_priority` (client_id, status, priority DESC)
- `idx_tasks_active_only` (id, technician_id, priority, scheduled_date) WHERE status IN ('pending', 'in_progress', 'assigned')
- `idx_tasks_title_description` (title, description) WHERE title IS NOT NULL
- `idx_tasks_vehicle_plate_lower` (LOWER(vehicle_plate)) WHERE vehicle_plate IS NOT NULL
- `idx_tasks_scheduled_datetime` (scheduled_date, start_time, end_time) WHERE scheduled_date IS NOT NULL
- `idx_tasks_technician_date_status` (technician_id, scheduled_date, status) WHERE technician_id IS NOT NULL

**Example Data**:
```sql
INSERT INTO tasks (
  id, task_number, title, status, priority,
  vehicle_plate, vehicle_make, vehicle_model, vin,
  scheduled_date, start_time, end_time,
  client_id, technician_id, created_at, updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'TASK-2024-0001',
  'PPF Installation - 2024 Toyota Camry',
  'scheduled',
  'high',
  'ABC-123',
  'Toyota',
  'Camry',
  '4T1BF1FKXCU123456',
  '2024-01-15',
  '09:00',
  '11:00',
  'client_uuid',
  'technician_uuid',
  1704067200000,
  1704067200000
);
```

---

#### 3.2 task_history

**Purpose**: Track task status changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | History UUID |
| task_id | TEXT | NOT NULL REFERENCES tasks(id) | Task UUID |
| old_status | TEXT | NULL | Previous status |
| new_status | TEXT | NOT NULL | New status |
| reason | TEXT | NULL | Change reason |
| changed_at | INTEGER | NOT NULL | Change timestamp (Unix ms) |
| changed_by | TEXT | NULL REFERENCES users(id) | User UUID who made change |

**Indexes**:
- `idx_task_history_task_id` (task_id)
- `idx_task_history_changed_at` (changed_at)
- `idx_task_history_new_status` (new_status)
- `idx_task_history_changed_by` (changed_by) WHERE changed_by IS NOT NULL

---

#### 3.3 task_conflicts

**Purpose**: Track scheduling conflicts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Conflict UUID |
| task_id | TEXT | NOT NULL REFERENCES tasks(id) | Task UUID |
| conflicting_task_id | TEXT | NOT NULL REFERENCES tasks(id) | Conflicting task UUID |
| conflict_type | TEXT | NOT NULL | time_overlap or technician_overload |
| detected_at | INTEGER | NOT NULL | Detection timestamp (Unix ms) |
| resolved_at | INTEGER | NULL | Resolution timestamp (Unix ms) |

**Indexes**:
- `idx_conflicts_unresolved` (resolved_at) WHERE resolved_at IS NULL

---

### 4. Intervention Management Tables

#### 4.1 interventions

**Purpose**: Store PPF intervention sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Intervention UUID |
| task_id | TEXT | NOT NULL REFERENCES tasks(id) ON DELETE CASCADE | Task UUID |
| task_number | TEXT | NOT NULL | Task number |
| status | TEXT | NOT NULL | Intervention status |
| vehicle_plate | TEXT | NOT NULL | Vehicle plate |
| vehicle_model | TEXT | NULL | Vehicle model |
| vehicle_make | TEXT | NULL | Vehicle make |
| vehicle_year | INTEGER | NULL | Vehicle year |
| vehicle_color | TEXT | NULL | Vehicle color |
| vehicle_vin | TEXT | NULL | VIN |
| client_id | TEXT | NULL REFERENCES clients(id) | Client UUID |
| client_name | TEXT | NULL | Denormalized client name |
| client_email | TEXT | NULL | Denormalized client email |
| client_phone | TEXT | NULL | Denormalized client phone |
| technician_id | TEXT | NULL REFERENCES users(id) | Technician UUID |
| technician_name | TEXT | NULL | Denormalized technician name |
| intervention_type | TEXT | NOT NULL | ppf, ceramic, detailing, other |
| current_step | INTEGER | NOT NULL | Current step number (0-based) |
| completion_percentage | REAL | NOT NULL | Completion percentage (0-100) |
| ppf_zones_config | TEXT | NULL | PPF zones config (JSON) |
| ppf_zones_extended | TEXT | NULL | Extended PPF zones (JSON) |
| film_type | TEXT | NULL | Film type |
| film_brand | TEXT | NULL | Film brand |
| film_model | TEXT | NULL | Film model |
| scheduled_at | INTEGER | NULL | Scheduled timestamp (Unix ms) |
| started_at | INTEGER | NULL | Start timestamp (Unix ms) |
| completed_at | INTEGER | NULL | Completion timestamp (Unix ms) |
| paused_at | INTEGER | NULL | Pause timestamp (Unix ms) |
| estimated_duration | INTEGER | NULL | Estimated duration (minutes) |
| actual_duration | INTEGER | NULL | Actual duration (minutes) |
| weather_condition | TEXT | NULL | sunny, cloudy, rainy, foggy, windy |
| lighting_condition | TEXT | NULL | natural, artificial, mixed |
| work_location | TEXT | NULL | indoor, outdoor, semi_covered |
| temperature_celsius | REAL | NULL | Temperature |
| humidity_percentage | REAL | NULL | Humidity |
| start_location_lat | REAL | NULL | Start GPS latitude |
| start_location_lon | REAL | NULL | Start GPS longitude |
| start_location_accuracy | REAL | NULL | Start GPS accuracy (meters) |
| end_location_lat | REAL | NULL | End GPS latitude |
| end_location_lon | REAL | NULL | End GPS longitude |
| end_location_accuracy | REAL | NULL | End GPS accuracy (meters) |
| customer_satisfaction | INTEGER | NULL | Satisfaction rating (1-10) |
| quality_score | INTEGER | NULL | Quality score (0-100) |
| final_observations | TEXT | NULL | Final observations (JSON array) |
| customer_signature | TEXT | NULL | Customer signature (Base64) |
| customer_comments | TEXT | NULL | Customer comments |
| metadata | TEXT | NULL | Metadata (JSON) |
| notes | TEXT | NULL | Notes |
| special_instructions | TEXT | NULL | Special instructions |
| device_info | TEXT | NULL | Device info (JSON) |
| app_version | TEXT | NULL | Application version |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |
| sync_error | TEXT | NULL | Sync error message |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| updated_by | TEXT | NULL REFERENCES users(id) | Updater user UUID |

**CHECK Constraints**:
```sql
CHECK (task_number IS NOT NULL)
CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled'))
CHECK (intervention_type IN ('ppf', 'ceramic', 'detailing', 'other'))
CHECK (current_step >= 0)
CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
CHECK (customer_satisfaction IS NULL OR (customer_satisfaction >= 1 AND customer_satisfaction <= 10))
CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100))
```

**Indexes**:
- `idx_interventions_task_created` (task_id, created_at DESC)
- `idx_interventions_status_created` (status, created_at DESC)
- `idx_interventions_current_step_status` (current_step, status)
- `idx_interventions_task_status` (task_id, status)
- `idx_interventions_technician_status` (technician_id, status)
- `idx_interventions_incomplete` (id, task_id, current_step, status) WHERE status NOT IN ('completed', 'cancelled')
- `idx_interventions_task_number` (task_number)
- `idx_interventions_active_per_task` (task_id) WHERE status IN ('pending', 'in_progress', 'paused')

**Unique Indexes**:
- `idx_active_intervention_per_task` (task_id) WHERE status IN ('pending', 'in_progress', 'paused')

**Triggers**:
- `sync_task_on_intervention_start` - Sync task on intervention creation
- `sync_task_on_intervention_update` - Sync task on intervention update
- `cleanup_task_on_intervention_delete` - Clean task references on delete
- `sync_task_current_step` - Sync current step on step update

---

#### 4.2 intervention_steps

**Purpose**: Store workflow steps for interventions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Step UUID |
| intervention_id | TEXT | NOT NULL REFERENCES interventions(id) | Intervention UUID |
| step_number | INTEGER | NOT NULL | Step order (0-based) |
| step_name | TEXT | NOT NULL | Step name |
| step_type | TEXT | NOT NULL | inspection, preparation, installation, finalization |
| step_status | TEXT | NOT NULL | pending, in_progress, paused, completed, failed, skipped, rework |
| description | TEXT | NULL | Step description |
| instructions | TEXT | NULL | Instructions (JSON) |
| quality_checkpoints | TEXT | NULL | Quality checkpoints (JSON array) |
| is_mandatory | INTEGER | DEFAULT 0 | Mandatory step (0 or 1) |
| requires_photos | INTEGER | DEFAULT 0 | Requires photos (0 or 1) |
| min_photos_required | INTEGER | DEFAULT 0 | Minimum photos required |
| max_photos_allowed | INTEGER | DEFAULT 20 | Maximum photos allowed |
| started_at | INTEGER | NULL | Start timestamp (Unix ms) |
| completed_at | INTEGER | NULL | Completion timestamp (Unix ms) |
| paused_at | INTEGER | NULL | Pause timestamp (Unix ms) |
| duration_seconds | INTEGER | NULL | Duration (seconds) |
| estimated_duration_seconds | INTEGER | NULL | Estimated duration (seconds) |
| step_data | TEXT | NULL | Step data (JSON) |
| collected_data | TEXT | NULL | Collected data (JSON) |
| measurements | TEXT | NULL | Measurements (JSON) |
| observations | TEXT | NULL | Observations (JSON array) |
| photo_count | INTEGER | DEFAULT 0 | Photo count |
| required_photos_completed | INTEGER | DEFAULT 0 | Required photos completed (0 or 1) |
| photo_urls | TEXT | NULL | Photo URLs (JSON array) |
| validation_data | TEXT | NULL | Validation data (JSON) |
| validation_errors | TEXT | NULL | Validation errors (JSON array) |
| validation_score | INTEGER | NULL | Validation score (0-100) |
| requires_supervisor_approval | INTEGER | DEFAULT 0 | Requires approval (0 or 1) |
| approved_by | TEXT | NULL REFERENCES users(id) | Approver user UUID |
| approved_at | INTEGER | NULL | Approval timestamp (Unix ms) |
| rejection_reason | TEXT | NULL | Rejection reason |
| location_lat | REAL | NULL | GPS latitude |
| location_lon | REAL | NULL | GPS longitude |
| location_accuracy | REAL | NULL | GPS accuracy (meters) |
| device_timestamp | INTEGER | NULL | Device timestamp (Unix ms) |
| server_timestamp | INTEGER | NULL | Server timestamp (Unix ms) |
| title | TEXT | NULL | Title |
| notes | TEXT | NULL | Notes |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

**CHECK Constraints**:
```sql
CHECK (step_type IN ('inspection', 'preparation', 'installation', 'finalization'))
CHECK (step_status IN ('pending', 'in_progress', 'paused', 'completed', 'failed', 'skipped', 'rework'))
CHECK (validation_score IS NULL OR (validation_score >= 0 AND validation_score <= 100))
CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90))
CHECK (location_lon IS NULL OR (location_lon >= -180 AND location_lon <= 180))
```

**Indexes**:
- `idx_intervention_steps_intervention_status` (intervention_id, step_status)
- `idx_intervention_steps_created_at` (created_at DESC)

---

### 5. Photo Management Tables

#### 5.1 photos

**Purpose**: Store intervention photos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Photo UUID |
| intervention_id | TEXT | NOT NULL REFERENCES interventions(id) | Intervention UUID |
| step_id | TEXT | NULL REFERENCES intervention_steps(id) | Step UUID |
| step_number | INTEGER | NULL | Step number |
| file_path | TEXT | NOT NULL | File path |
| file_name | TEXT | NULL | File name |
| file_size | INTEGER | NULL | File size (bytes) |
| mime_type | TEXT | NOT NULL | MIME type |
| width | INTEGER | NULL | Image width (pixels) |
| height | INTEGER | NULL | Image height (pixels) |
| photo_type | TEXT | NULL | before, during, after |
| photo_category | TEXT | NULL | vehicle_condition, workspace, step_progress, qc_check, final_result, other |
| photo_angle | TEXT | NULL | Photo angle |
| zone | TEXT | NULL | PPF zone |
| title | TEXT | NULL | Title |
| description | TEXT | NULL | Description |
| notes | TEXT | NULL | Notes |
| annotations | TEXT | NULL | Annotations (JSON) |
| gps_location_lat | REAL | NULL | GPS latitude |
| gps_location_lon | REAL | NULL | GPS longitude |
| gps_location_accuracy | REAL | NULL | GPS accuracy (meters) |
| quality_score | INTEGER | NULL | Quality score (0-100) |
| blur_score | INTEGER | NULL | Blur score |
| exposure_score | INTEGER | NULL | Exposure score |
| composition_score | INTEGER | NULL | Composition score |
| is_required | INTEGER | DEFAULT 0 | Required photo (0 or 1) |
| is_approved | INTEGER | DEFAULT 1 | Approved status (0 or 1) |
| approved_by | TEXT | NULL REFERENCES users(id) | Approver user UUID |
| approved_at | INTEGER | NULL | Approval timestamp (Unix ms) |
| rejection_reason | TEXT | NULL | Rejection reason |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| storage_url | TEXT | NULL | Cloud storage URL |
| upload_retry_count | INTEGER | DEFAULT 0 | Upload retry count |
| upload_error | TEXT | NULL | Upload error message |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |
| captured_at | INTEGER | NULL | Capture timestamp (Unix ms) |
| uploaded_at | INTEGER | NULL | Upload timestamp (Unix ms) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

**Indexes**:
- `idx_photos_intervention_step` (intervention_id, step_id)
- `idx_photos_step_status` (step_id, status)
- `idx_photos_created_at` (created_at DESC)

---

### 6. Material & Inventory Tables

#### 6.1 materials

**Purpose**: Store material inventory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Material UUID |
| sku | TEXT | UNIQUE NOT NULL | Stock keeping unit |
| name | TEXT | NOT NULL | Material name |
| description | TEXT | NULL | Description |
| material_type | TEXT | NOT NULL | ppf_film, adhesive, cleaning_solution, tool, consumable |
| category | TEXT | NULL | Category |
| subcategory | TEXT | NULL | Subcategory |
| category_id | TEXT | NULL REFERENCES material_categories(id) | Category UUID |
| brand | TEXT | NULL | Brand |
| model | TEXT | NULL | Model |
| specifications | TEXT | NULL | Specifications (JSON) |
| unit_of_measure | TEXT | DEFAULT 'piece' | piece, meter, liter, gram, roll |
| current_stock | REAL | NOT NULL DEFAULT 0 | Current stock |
| minimum_stock | REAL | DEFAULT 0 | Minimum stock |
| maximum_stock | REAL | NULL | Maximum stock |
| reorder_point | REAL | NULL | Reorder point |
| unit_cost | REAL | NULL | Unit cost |
| currency | TEXT | DEFAULT 'EUR' | Currency code |
| supplier_id | TEXT | NULL REFERENCES suppliers(id) | Supplier UUID |
| supplier_name | TEXT | NULL | Denormalized supplier name |
| supplier_sku | TEXT | NULL | Supplier SKU |
| quality_grade | TEXT | NULL | Quality grade |
| certification | TEXT | NULL | Certification |
| expiry_date | INTEGER | NULL | Expiry timestamp (Unix ms) |
| batch_number | TEXT | NULL | Batch number |
| serial_numbers | TEXT | NULL | Serial numbers (JSON array) |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active status (0 or 1) |
| is_discontinued | INTEGER | NOT NULL DEFAULT 0 | Discontinued status (0 or 1) |
| storage_location | TEXT | NULL | Storage location |
| warehouse_id | TEXT | NULL | Warehouse ID |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| updated_by | TEXT | NULL REFERENCES users(id) | Updater user UUID |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_materials_sku` (sku)
- `idx_materials_type` (material_type)
- `idx_materials_supplier` (supplier_id)
- `idx_materials_active` (is_active)

---

#### 6.2 material_consumption

**Purpose**: Track material usage per intervention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Consumption UUID |
| intervention_id | TEXT | NOT NULL REFERENCES interventions(id) | Intervention UUID |
| material_id | TEXT | NOT NULL REFERENCES materials(id) | Material UUID |
| step_id | TEXT | NULL REFERENCES intervention_steps(id) | Step UUID |
| quantity_used | REAL | NOT NULL | Quantity used |
| unit_cost | REAL | NULL | Unit cost |
| total_cost | REAL | NULL | Total cost |
| waste_quantity | REAL | DEFAULT 0 | Waste quantity |
| waste_reason | TEXT | NULL | Waste reason |
| batch_used | TEXT | NULL | Batch used |
| expiry_used | INTEGER | NULL | Expiry timestamp (Unix ms) |
| quality_notes | TEXT | NULL | Quality notes |
| step_number | INTEGER | NULL | Step number |
| recorded_by | TEXT | NULL REFERENCES users(id) | Recorder user UUID |
| recorded_at | INTEGER | NOT NULL | Record timestamp (Unix ms) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_material_consumption_intervention` (intervention_id)
- `idx_material_consumption_material` (material_id)
- `idx_material_consumption_step` (step_id)

---

#### 6.3 material_categories

**Purpose**: Hierarchical material categories.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Category UUID |
| name | TEXT | NOT NULL | Category name |
| code | TEXT | UNIQUE | Category code |
| parent_id | TEXT | NULL REFERENCES material_categories(id) | Parent category UUID |
| level | INTEGER | NOT NULL DEFAULT 1 | Hierarchy level |
| description | TEXT | NULL | Description |
| color | TEXT | NULL | Hex color code |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active status (0 or 1) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| updated_by | TEXT | NULL REFERENCES users(id) | Updater user UUID |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_material_categories_parent` (parent_id)
- `idx_material_categories_level` (level)
- `idx_material_categories_active` (is_active)

---

#### 6.4 inventory_transactions

**Purpose**: Track all inventory movements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Transaction UUID |
| material_id | TEXT | NOT NULL REFERENCES materials(id) | Material UUID |
| transaction_type | TEXT | NOT NULL | stock_in, stock_out, adjustment, transfer, waste, return |
| quantity | REAL | NOT NULL | Quantity |
| previous_stock | REAL | NOT NULL | Previous stock |
| new_stock | REAL | NOT NULL | New stock |
| reference_number | TEXT | NULL | Reference number |
| reference_type | TEXT | NULL | Reference type |
| notes | TEXT | NULL | Notes |
| unit_cost | REAL | NULL | Unit cost |
| total_cost | REAL | NULL | Total cost |
| warehouse_id | TEXT | NULL | Warehouse ID |
| location_from | TEXT | NULL | From location |
| location_to | TEXT | NULL | To location |
| batch_number | TEXT | NULL | Batch number |
| expiry_date | INTEGER | NULL | Expiry timestamp (Unix ms) |
| quality_status | TEXT | NULL | Quality status |
| intervention_id | TEXT | NULL REFERENCES interventions(id) | Intervention UUID |
| step_id | TEXT | NULL REFERENCES intervention_steps(id) | Step UUID |
| performed_by | TEXT | NOT NULL REFERENCES users(id) | Performer user UUID |
| performed_at | INTEGER | NOT NULL | Perform timestamp (Unix ms) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_inventory_transactions_material` (material_id)
- `idx_inventory_transactions_type` (transaction_type)
- `idx_inventory_transactions_date` (performed_at)
- `idx_inventory_transactions_reference` (reference_number)
- `idx_inventory_transactions_intervention` (intervention_id)

---

#### 6.5 suppliers

**Purpose**: Store supplier information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Supplier UUID |
| name | TEXT | NOT NULL | Supplier name |
| code | TEXT | UNIQUE | Supplier code |
| contact_person | TEXT | NULL | Contact person |
| email | TEXT | NULL | Email address |
| phone | TEXT | NULL | Phone number |
| website | TEXT | NULL | Website URL |
| address_street | TEXT | NULL | Street address |
| address_city | TEXT | NULL | City |
| address_state | TEXT | NULL | State/Province |
| address_zip | TEXT | NULL | ZIP/Postal code |
| address_country | TEXT | NULL | Country |
| tax_id | TEXT | NULL | Tax ID |
| business_license | TEXT | NULL | Business license |
| payment_terms | TEXT | NULL | Payment terms |
| lead_time_days | INTEGER | DEFAULT 0 | Lead time (days) |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active status (0 or 1) |
| is_preferred | INTEGER | NOT NULL DEFAULT 0 | Preferred supplier (0 or 1) |
| quality_rating | REAL | DEFAULT 0.0 | Quality rating (0.0-5.0) |
| delivery_rating | REAL | DEFAULT 0.0 | Delivery rating (0.0-5.0) |
| on_time_delivery_rate | REAL | DEFAULT 0.0 | On-time delivery rate (0.0-100.0) |
| notes | TEXT | NULL | Notes |
| special_instructions | TEXT | NULL | Special instructions |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| updated_by | TEXT | NULL REFERENCES users(id) | Updater user UUID |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_suppliers_code` (code)
- `idx_suppliers_active` (is_active)
- `idx_suppliers_preferred` (is_preferred)

---

### 7. Messaging & Notifications Tables

#### 7.1 messages

**Purpose**: Store messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Message UUID |
| message_type | TEXT | NOT NULL | email, sms, in_app |
| sender_id | TEXT | NULL REFERENCES users(id) | Sender user UUID |
| recipient_id | TEXT | NULL REFERENCES users(id) | Recipient user UUID |
| recipient_email | TEXT | NULL | Recipient email |
| recipient_phone | TEXT | NULL | Recipient phone |
| subject | TEXT | NULL | Subject |
| body | TEXT | NOT NULL | Message body |
| template_id | TEXT | NULL REFERENCES message_templates(id) | Template UUID |
| task_id | TEXT | NULL REFERENCES tasks(id) | Task UUID |
| client_id | TEXT | NULL REFERENCES clients(id) | Client UUID |
| status | TEXT | NOT NULL DEFAULT 'pending' | pending, sent, delivered, failed, read |
| priority | TEXT | DEFAULT 'normal' | low, normal, high, urgent |
| scheduled_at | INTEGER | NULL | Schedule timestamp (Unix ms) |
| sent_at | INTEGER | NULL | Sent timestamp (Unix ms) |
| read_at | INTEGER | NULL | Read timestamp (Unix ms) |
| error_message | TEXT | NULL | Error message |
| metadata | TEXT | NULL | Metadata (JSON) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

**Indexes**:
- `idx_messages_sender_id` (sender_id)
- `idx_messages_recipient_id` (recipient_id)
- `idx_messages_task_id` (task_id)
- `idx_messages_client_id` (client_id)
- `idx_messages_status` (status)
- `idx_messages_type` (message_type)
- `idx_messages_created_at` (created_at)
- `idx_messages_scheduled_at` (scheduled_at) WHERE scheduled_at IS NOT NULL

---

#### 7.2 message_templates

**Purpose**: Store message templates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Template UUID |
| name | TEXT | UNIQUE NOT NULL | Template name |
| description | TEXT | NULL | Description |
| message_type | TEXT | NOT NULL | email, sms, in_app |
| subject | TEXT | NULL | Subject |
| body | TEXT | NOT NULL | Body |
| variables | TEXT | NULL | Variables (JSON array) |
| category | TEXT | DEFAULT 'general' | general, task, client, system, reminder |
| is_active | INTEGER | DEFAULT 1 | Active status (0 or 1) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

**Indexes**:
- `idx_message_templates_type` (message_type)
- `idx_message_templates_category` (category)
- `idx_message_templates_active` (is_active)

---

#### 7.3 notification_preferences

**Purpose**: Store user notification preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Preference UUID |
| user_id | TEXT | UNIQUE NOT NULL REFERENCES users(id) | User UUID |
| email_enabled | INTEGER | DEFAULT 1 | Email enabled (0 or 1) |
| sms_enabled | INTEGER | DEFAULT 0 | SMS enabled (0 or 1) |
| in_app_enabled | INTEGER | DEFAULT 1 | In-app enabled (0 or 1) |
| task_assigned | INTEGER | DEFAULT 1 | Task assigned (0 or 1) |
| task_updated | INTEGER | DEFAULT 1 | Task updated (0 or 1) |
| task_completed | INTEGER | DEFAULT 1 | Task completed (0 or 1) |
| task_overdue | INTEGER | DEFAULT 1 | Task overdue (0 or 1) |
| client_created | INTEGER | DEFAULT 1 | Client created (0 or 1) |
| client_updated | INTEGER | DEFAULT 1 | Client updated (0 or 1) |
| system_alerts | INTEGER | DEFAULT 1 | System alerts (0 or 1) |
| maintenance_notifications | INTEGER | DEFAULT 1 | Maintenance notifications (0 or 1) |
| quiet_hours_enabled | INTEGER | DEFAULT 0 | Quiet hours enabled (0 or 1) |
| quiet_hours_start | TEXT | NULL | Quiet hours start (HH:MM) |
| quiet_hours_end | TEXT | NULL | Quiet hours end (HH:MM) |
| email_frequency | TEXT | DEFAULT 'immediate' | immediate, daily, weekly |
| email_digest_time | TEXT | DEFAULT '09:00' | Email digest time (HH:MM) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

**Indexes**:
- `idx_notification_preferences_user_id` (user_id)

---

### 8. Calendar Tables

#### 8.1 calendar_events

**Purpose**: Store calendar events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Event UUID |
| title | TEXT | NOT NULL | Event title |
| description | TEXT | NULL | Description |
| start_date | TEXT | NOT NULL | Start date (YYYY-MM-DD) |
| end_date | TEXT | NOT NULL | End date (YYYY-MM-DD) |
| start_time | TEXT | NULL | Start time (HH:MM) |
| end_time | TEXT | NULL | End time (HH:MM) |
| all_day | INTEGER | DEFAULT 0 | All day event (0 or 1) |
| technician_id | TEXT | NULL REFERENCES users(id) | Technician UUID |
| task_id | TEXT | NULL REFERENCES tasks(id) | Task UUID |
| location | TEXT | NULL | Location |
| attendees | TEXT | NULL | Attendees (JSON array) |
| status | TEXT | DEFAULT 'confirmed' | confirmed, tentative, cancelled |
| reminders | TEXT | NULL | Reminders (JSON array) |
| recurrence | TEXT | NULL | Recurrence rule |
| recurrence_end_date | TEXT | NULL | Recurrence end date (YYYY-MM-DD) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

---

### 9. Authentication & Sessions Tables

#### 9.1 sessions

**Purpose**: Store user sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Session UUID |
| user_id | TEXT | NOT NULL REFERENCES users(id) | User UUID |
| access_token | TEXT | NOT NULL UNIQUE | Access token (JWT) |
| refresh_token | TEXT | NOT NULL UNIQUE | Refresh token |
| expires_at | INTEGER | NOT NULL | Expiry timestamp (Unix ms) |
| ip_address | TEXT | NULL | IP address |
| user_agent | TEXT | NULL | User agent string |
| device_info | TEXT | NULL | Device info (JSON) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| last_accessed_at | INTEGER | NOT NULL | Last accessed timestamp (Unix ms) |

**Indexes**:
- `idx_sessions_user_id` (user_id)
- `idx_sessions_access_token` (access_token)
- `idx_sessions_refresh_token` (refresh_token)
- `idx_sessions_expires_at` (expires_at)

---

### 10. Sync & Cache Tables

#### 10.1 sync_queue

**Purpose**: Store offline sync operations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| operation_type | TEXT | NOT NULL | create, update, delete |
| entity_type | TEXT | NOT NULL | task, client, intervention, step, photo, user, material, supplier |
| entity_id | TEXT | NOT NULL | Entity UUID |
| data | TEXT | NOT NULL | Data (JSON) |
| dependencies | TEXT | NULL | Dependencies (JSON array) |
| timestamp_utc | INTEGER | NOT NULL | Timestamp (Unix ms) |
| retry_count | INTEGER | DEFAULT 0 | Retry count |
| max_retries | INTEGER | DEFAULT 3 | Max retries |
| last_error | TEXT | NULL | Last error message |
| status | TEXT | NOT NULL DEFAULT 'pending' | pending, processing, completed, failed, abandoned |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |

**Indexes**:
- `idx_sync_queue_status_created` (status, created_at)
- `idx_sync_queue_entity_created` (entity_type, entity_id, created_at)

---

#### 10.2 cache_metadata

**Purpose**: Store cache metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| cache_key | TEXT | UNIQUE NOT NULL | Cache key |
| cache_type | TEXT | NOT NULL | query_result, image_thumbnail, computed_analytics, api_response |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation date |
| last_accessed | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last access |
| access_count | INTEGER | DEFAULT 0 | Access count |
| size_bytes | INTEGER | NOT NULL | Size (bytes) |
| ttl_seconds | INTEGER | NULL | TTL (seconds) |
| backend_type | TEXT | NOT NULL | memory, disk, redis |
| expires_at | DATETIME VIRTUAL GENERATED | Expiration date |

**Indexes**:
- `idx_cache_metadata_key` (cache_key)
- `idx_cache_metadata_type` (cache_type)
- `idx_cache_metadata_expires` (expires_at)
- `idx_cache_metadata_updated` (updated_at DESC)

**Triggers**:
- `cleanup_expired_cache` - Auto-cleanup expired entries

---

#### 10.3 cache_statistics

**Purpose**: Store cache statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| timestamp | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp |
| cache_type | TEXT | NOT NULL | Cache type |
| total_keys | INTEGER | NOT NULL DEFAULT 0 | Total keys |
| memory_used_bytes | INTEGER | NOT NULL DEFAULT 0 | Memory used (bytes) |
| hit_count | INTEGER | NOT NULL DEFAULT 0 | Hit count |
| miss_count | INTEGER | NOT NULL DEFAULT 0 | Miss count |
| avg_response_time_ms | REAL | NULL | Avg response time (ms) |
| eviction_count | INTEGER | DEFAULT 0 | Eviction count |

**Indexes**:
- `idx_cache_statistics_timestamp` (timestamp)
- `idx_cache_statistics_type` (cache_type)

---

### 11. Audit & Compliance Tables

#### 11.1 audit_events

**Purpose**: Store comprehensive audit log.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Event UUID |
| event_type | TEXT | NOT NULL | Event type |
| user_id | TEXT | NOT NULL REFERENCES users(id) | User UUID |
| action | TEXT | NOT NULL | Action |
| resource_id | TEXT | NULL | Resource ID |
| resource_type | TEXT | NULL | Resource type |
| description | TEXT | NOT NULL | Description |
| ip_address | TEXT | NULL | IP address |
| user_agent | TEXT | NULL | User agent string |
| result | TEXT | NOT NULL | Result (success/failure) |
| previous_state | TEXT | NULL | Previous state (JSON) |
| new_state | TEXT | NULL | New state (JSON) |
| timestamp | INTEGER | NOT NULL | Timestamp (Unix ms) |
| metadata | TEXT | NULL | Metadata (JSON) |
| session_id | TEXT | NULL | Session UUID |
| request_id | TEXT | NULL | Request ID |
| created_at | INTEGER | DEFAULT (strftime('%s') * 1000) | Creation timestamp (Unix ms) |

**Indexes**:
- `idx_audit_events_user_id` (user_id)
- `idx_audit_events_timestamp` (timestamp)
- `idx_audit_events_resource` (resource_type, resource_id)
- `idx_audit_events_event_type` (event_type)
- `idx_audit_events_result` (result)
- `idx_audit_events_user_timestamp` (user_id, timestamp DESC)
- `idx_audit_events_resource_timestamp` (resource_type, resource_id, timestamp DESC)

---

#### 11.2 settings_audit_log

**Purpose**: Store settings change log.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Log UUID |
| user_id | TEXT | NOT NULL REFERENCES users(id) | User UUID |
| setting_type | TEXT | NOT NULL | profile, preferences, security, accessibility, notifications, performance |
| details | TEXT | NOT NULL | Change details (JSON) |
| timestamp | INTEGER | NOT NULL | Timestamp (Unix ms) |
| ip_address | TEXT | NULL | IP address |
| user_agent | TEXT | NULL | User agent string |

**Indexes**:
- `idx_settings_audit_user_timestamp` (user_id, timestamp DESC)
- `idx_settings_audit_type_timestamp` (setting_type, timestamp DESC)
- `idx_audit_log_timestamp_setting_type` (timestamp DESC, setting_type)

---

### 12. Analytics Tables

#### 12.1 analytics_kpis

**Purpose**: Store key performance indicators.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | KPI UUID |
| kpi_name | TEXT | UNIQUE NOT NULL | KPI name |
| kpi_category | TEXT | NOT NULL | operational, financial, quality, efficiency, client_satisfaction |
| display_name | TEXT | NOT NULL | Display name |
| description | TEXT | NULL | Description |
| unit | TEXT | NULL | percentage, currency, count, hours |
| calculation_method | TEXT | NOT NULL | Calculation method |
| current_value | REAL | NULL | Current value |
| previous_value | REAL | NULL | Previous value |
| target_value | REAL | NULL | Target value |
| trend_direction | TEXT | NULL | up, down, stable, unknown |
| last_calculated | INTEGER | NULL | Last calculated (Unix ms) |
| calculation_period | TEXT | DEFAULT 'daily' | hourly, daily, weekly, monthly |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active status (0 or 1) |
| priority | INTEGER | DEFAULT 0 | Priority |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_analytics_kpis_category` (kpi_category)
- `idx_analytics_kpis_active` (is_active)
- `idx_analytics_kpis_priority` (priority)

---

#### 12.2 analytics_metrics

**Purpose**: Store metrics data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Metric UUID |
| metric_name | TEXT | NOT NULL | Metric name |
| metric_category | TEXT | NOT NULL | Category |
| value | REAL | NOT NULL | Metric value |
| value_type | TEXT | NOT NULL | count, percentage, currency, duration, rating |
| dimensions | TEXT | NULL | Dimensions (JSON) |
| timestamp | INTEGER | NOT NULL | Timestamp (Unix ms) |
| period_start | INTEGER | NULL | Period start (Unix ms) |
| period_end | INTEGER | NULL | Period end (Unix ms) |
| source | TEXT | NOT NULL | Source |
| source_id | TEXT | NULL | Source ID |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |

**Indexes**:
- `idx_analytics_metrics_name` (metric_name)
- `idx_analytics_metrics_category` (metric_category)
- `idx_analytics_metrics_timestamp` (timestamp)
- `idx_analytics_metrics_source` (source)

---

#### 12.3 analytics_dashboards

**Purpose**: Store dashboard configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Dashboard UUID |
| name | TEXT | NOT NULL | Dashboard name |
| dashboard_type | TEXT | DEFAULT 'main' | main, operational, financial, quality, custom |
| layout_config | TEXT | NULL | Layout config (JSON) |
| widget_configs | TEXT | NULL | Widget configs (JSON) |
| filters_config | TEXT | NULL | Filters config (JSON) |
| user_id | TEXT | NULL REFERENCES users(id) | User UUID |
| is_public | INTEGER | NOT NULL DEFAULT 0 | Public dashboard (0 or 1) |
| is_default | INTEGER | NOT NULL DEFAULT 0 | Default dashboard (0 or 1) |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active status (0 or 1) |
| created_at | INTEGER | NOT NULL | Creation timestamp (Unix ms) |
| updated_at | INTEGER | NOT NULL | Last update timestamp (Unix ms) |
| created_by | TEXT | NULL REFERENCES users(id) | Creator user UUID |
| updated_by | TEXT | NULL REFERENCES users(id) | Updater user UUID |
| synced | INTEGER | DEFAULT 0 | Sync status (0 or 1) |
| last_synced_at | INTEGER | NULL | Last sync timestamp (Unix ms) |

**Indexes**:
- `idx_analytics_dashboards_type` (dashboard_type)
- `idx_analytics_dashboards_user` (user_id)
- `idx_analytics_dashboards_active` (is_active)

---

## Indexes

### Index Overview

| Table | Index Count | Purpose |
|-------|-------------|---------|
| users | 2 | Role queries, login history |
| clients | 3 | Client search, filtering |
| tasks | 20+ | Task queries, filtering, sorting |
| interventions | 7 | Intervention tracking, filtering |
| intervention_steps | 2 | Step queries |
| photos | 3 | Photo retrieval |
| materials | 4 | Material queries, filtering |
| material_consumption | 3 | Usage tracking |
| material_categories | 3 | Category hierarchy |
| inventory_transactions | 5 | Transaction tracking |
| suppliers | 3 | Supplier queries |
| messages | 8 | Message retrieval |
| message_templates | 3 | Template lookup |
| notification_preferences | 1 | User preferences |
| calendar_events | - | Event queries |
| sessions | 4 | Session management |
| sync_queue | 2 | Sync operations |
| cache_metadata | 4 | Cache management |
| cache_statistics | 2 | Cache metrics |
| audit_events | 7 | Audit trail queries |
| settings_audit_log | 3 | Settings audit |
| analytics_kpis | 3 | KPI queries |
| analytics_metrics | 4 | Metric queries |
| analytics_dashboards | 3 | Dashboard queries |

### Partial Indexes

Partial indexes are used to optimize queries for common filtering patterns:

```sql
-- Only index synced rows for sync operations
CREATE INDEX idx_tasks_synced ON tasks(synced) WHERE synced = 0;

-- Only index active tasks
CREATE INDEX idx_tasks_active_only ON tasks(id, technician_id, priority, scheduled_date)
WHERE status IN ('pending', 'in_progress', 'assigned');

-- Only index unresolved conflicts
CREATE INDEX idx_conflicts_unresolved ON task_conflicts(resolved_at)
WHERE resolved_at IS NULL;

-- Only index incomplete interventions
CREATE INDEX idx_interventions_incomplete ON interventions(id, task_id, current_step, status)
WHERE status NOT IN ('completed', 'cancelled');
```

### Composite Indexes

Composite indexes optimize multi-column queries:

```sql
-- Task queries by status and technician
CREATE INDEX idx_tasks_status_technician ON tasks(status, technician_id);

-- Task queries by status and priority
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);

-- Task queries by client and status
CREATE INDEX idx_tasks_client_status ON tasks(client_id, status);

-- Task queries by technician and scheduled date
CREATE INDEX idx_tasks_technician_scheduled ON tasks(technician_id, scheduled_date);

-- Task queries by status and scheduled date
CREATE INDEX idx_tasks_status_scheduled ON tasks(status, scheduled_date);
```

## Constraints

### Foreign Key Constraints

Foreign key relationships ensure referential integrity:

```sql
-- Client references
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- User references
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_technician
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL;

-- Intervention references
ALTER TABLE interventions ADD CONSTRAINT fk_interventions_task
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Photo references
ALTER TABLE photos ADD CONSTRAINT fk_photos_intervention
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE;

-- Material references
ALTER TABLE material_consumption ADD CONSTRAINT fk_material_consumption_material
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT;
```

### CHECK Constraints

Check constraints validate data at the database level:

```sql
-- Task status validation
CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed',
                  'cancelled', 'on_hold', 'pending', 'invalid',
                  'archived', 'failed', 'overdue', 'assigned', 'paused'))

-- Task priority validation
CHECK (priority IN ('low', 'medium', 'high', 'urgent'))

-- GPS coordinate validation
CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90))
CHECK (location_lon IS NULL OR (location_lon >= -180 AND location_lon <= 180))

-- Rating validation
CHECK (customer_satisfaction IS NULL OR
       (customer_satisfaction >= 1 AND customer_satisfaction <= 10))
CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100))

-- Percentage validation
CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
```

## Triggers

### Client Statistics Triggers

These triggers automatically update client statistics when tasks change:

```sql
-- Update client stats on task insert
CREATE TRIGGER task_insert_update_client_stats
AFTER INSERT ON tasks
FOR EACH ROW
BEGIN
  UPDATE clients SET
    total_tasks = total_tasks + 1,
    active_tasks = active_tasks + CASE WHEN NEW.status IN ('in_progress', 'scheduled') THEN 1 ELSE 0 END,
    completed_tasks = completed_tasks + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    last_task_date = CASE
      WHEN NEW.status IN ('completed', 'in_progress') THEN NEW.updated_at
      ELSE last_task_date
    END
  WHERE id = NEW.client_id;
END;

-- Update client stats on task update
CREATE TRIGGER task_update_update_client_stats
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  UPDATE clients SET
    active_tasks = active_tasks +
      CASE WHEN OLD.status != NEW.status THEN
        CASE
          WHEN NEW.status IN ('in_progress', 'scheduled') THEN 1
          WHEN OLD.status IN ('in_progress', 'scheduled') THEN -1
          ELSE 0
        END
      ELSE 0 END,
    completed_tasks = completed_tasks +
      CASE WHEN OLD.status != NEW.status THEN
        CASE
          WHEN NEW.status = 'completed' THEN 1
          WHEN OLD.status = 'completed' THEN -1
          ELSE 0
        END
      ELSE 0 END
  WHERE id = NEW.client_id;
END;

-- Update client stats on task delete
CREATE TRIGGER task_delete_update_client_stats
AFTER DELETE ON tasks
FOR EACH ROW
BEGIN
  UPDATE clients SET
    total_tasks = total_tasks - 1,
    active_tasks = active_tasks - CASE WHEN OLD.status IN ('in_progress', 'scheduled') THEN 1 ELSE 0 END,
    completed_tasks = completed_tasks - CASE WHEN OLD.status = 'completed' THEN 1 ELSE 0 END
  WHERE id = OLD.client_id;
END;
```

### Intervention Triggers

These triggers keep tasks synchronized with intervention state:

```sql
-- Sync task on intervention start
CREATE TRIGGER sync_task_on_intervention_start
AFTER INSERT ON interventions
FOR EACH ROW
BEGIN
  UPDATE tasks SET
    workflow_id = NEW.id,
    status = 'in_progress',
    started_at = NEW.started_at
  WHERE id = NEW.task_id;
END;

-- Sync task on intervention completion
CREATE TRIGGER sync_task_on_intervention_update
AFTER UPDATE OF status ON interventions
FOR EACH ROW
WHEN NEW.status = 'completed'
BEGIN
  UPDATE tasks SET
    status = 'completed',
    completed_at = NEW.completed_at,
    actual_duration = NEW.actual_duration
  WHERE id = NEW.task_id;
END;
```

### Cache Cleanup Trigger

Automatically removes expired cache entries:

```sql
CREATE TRIGGER cleanup_expired_cache
AFTER INSERT ON cache_metadata
FOR EACH ROW
BEGIN
  DELETE FROM cache_metadata
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
```

## Views

### client_statistics

Computed view aggregating client task statistics:

```sql
CREATE VIEW client_statistics AS
SELECT
  c.id,
  c.name,
  c.customer_type,
  c.created_at,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as active_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
  MAX(CASE WHEN t.status IN ('completed', 'in_progress') THEN t.updated_at END) as last_task_date
FROM clients c
LEFT JOIN tasks t ON t.client_id = c.id AND t.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.customer_type, c.created_at;
```

### calendar_tasks

View for calendar display:

```sql
CREATE VIEW calendar_tasks AS
SELECT
  t.id,
  t.task_number,
  t.title,
  t.status,
  t.priority,
  t.scheduled_date,
  t.start_time,
  t.end_time,
  t.vehicle_plate,
  t.vehicle_model,
  t.technician_id,
  u.username as technician_name,
  t.client_id,
  c.name as client_name,
  t.estimated_duration,
  t.actual_duration
FROM tasks t
LEFT JOIN users u ON t.technician_id = u.id
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.scheduled_date IS NOT NULL AND t.deleted_at IS NULL;
```

## Entity Relationships

### ERD (Entity Relationship Diagram)

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│    users    │      │   clients   │      │  materials       │
├─────────────┤      ├─────────────┤      ├──────────────────┤
│ id (PK)     │<────│ id (PK)     │<────│ id (PK)          │
│ email       │      │ name        │      │ sku (UNIQUE)     │
│ role        │      │ email       │      │ name             │
│ ...         │      │ ...         │      │ material_type    │
└──────┬──────┘      └──────┬──────┘      │ ...              │
       │                    │              │                  │
       │                    │              │                  │
       │                    │              └────────┬─────────┘
       │                    │                       │
       ▼                    ▼                       ▼
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│    tasks    │      │  messages   │      │   suppliers     │
├─────────────┤      ├─────────────┤      ├──────────────────┤
│ id (PK)     │      │ id (PK)     │      │ id (PK)          │
│ client_id   │      │ sender_id   │      │ name             │
│ technician_ │<─┐   │ recipient_ │      │ ...              │
│ task_number │  │   │ id          │      └──────────────────┘
│ status      │  │   │ task_id     │              ▲
│ ...         │  │   │ client_id   │              │
└──────┬──────┘  │   │ ...         │              │
       │         │   └─────────────┘              │
       │         │                               │
       ▼         ▼                               │
┌─────────────────┐                               │
│  interventions │                               │
├─────────────────┤                               │
│ id (PK)        │                               │
│ task_id (FK)   │                               │
│ status         │                               │
│ current_step   │                               │
│ ...           │                               │
└──────┬────────┘                               │
       │                                        │
       │                                        │
       ▼                                        │
┌──────────────────┐                            │
│intervention_steps│                            │
├──────────────────┤                            │
│ id (PK)         │                            │
│ intervention_id │                            │
│ step_number     │                            │
│ step_status    │                            │
│ ...            │                            │
└──────┬─────────┘                            │
       │                                      │
       │                                      │
       ▼                                      │
┌──────────────────┐                            │
│     photos      │                            │
├──────────────────┤                            │
│ id (PK)         │                            │
│ intervention_id │                            │
│ step_id        │                            │
│ ...            │                            │
└──────────────────┘                            │
                                             │
                                             │
┌─────────────────────────────────────────────────┘
│    material_consumption
├─────────────────────────────────────────────────┤
│ id (PK)
│ intervention_id (FK)
│ material_id (FK)
│ quantity_used
│ ...
└─────────────────────────────────────────────────┘
```

### Relationship Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| users → tasks | 1:N | A user can be assigned multiple tasks |
| clients → tasks | 1:N | A client can have multiple tasks |
| tasks → interventions | 1:1 | A task has one active intervention |
| interventions → steps | 1:N | An intervention has multiple steps |
| steps → photos | 1:N | A step can have multiple photos |
| materials → consumption | 1:N | A material can be used in multiple interventions |
| suppliers → materials | 1:N | A supplier provides multiple materials |
| users → messages | 1:N | A user can send/receive multiple messages |
| users → sessions | 1:N | A user can have multiple sessions |
| clients → tasks | 1:N | A client can have multiple tasks |

## Migration History

| Migration | Description | Date |
|-----------|-------------|------|
| 001 | Initial schema creation | - |
| 002 | Rename ppf_zone to ppf_zones | 2025 |
| 003 | Add client statistics triggers | 2025 |
| 004 | Add task-client index | 2025 |
| 005 | Add task performance indexes | 2025 |
| 006 | Add step location columns | 2025 |
| 007 | Add user consent table | 2025 |
| 008 | Add workflow constraints | 2025 |
| 009 | Add task_number to interventions | 2025 |
| 010 | Fix task statuses | 2025 |
| 011 | Prevent duplicate interventions | 2025-11-29 |
| 012 | Add material tables | 2025 |
| 013 | Add suppliers table | 2025 |
| 014 | Add avatar_url to user_settings | 2025 |
| 015 | Add two-factor auth tables | 2025 |
| 016 | Add task assignment indexes | 2025 |
| 017 | Add cache metadata table | 2025-12-11 |
| 018 | Add settings audit log | 2025 |
| 019 | Enhanced performance indexes | 2025 |
| 020 | Fix cache metadata schema | 2025 |
| 021 | Add client statistics view | 2025 |
| 022 | Add task history table | 2026-01-20 |
| 023 | Add messaging tables | 2026-01-20 |
| 024 | Add inventory management | 2025 |
| 025 | Add audit logging | 2025 |
| 026 | Add analytics dashboard | 2025 |
| 027 | Add task constraints | 2026-02-01 |

### Migration File Structure

Migrations are stored in `src-tauri/migrations/`:

```
src-tauri/migrations/
├── 002_rename_ppf_zone.sql
├── 003_add_client_stats_triggers.sql
├── 004_add_task_client_index.sql
├── 005_add_task_indexes.sql
├── 006_add_step_location_columns.sql
├── 007_add_user_consent.sql
├── 008_add_workflow_constraints.sql
├── 009_add_task_number_to_interventions.sql
├── 010_fix_task_statuses.sql
├── 011_prevent_duplicate_interventions.sql
├── 012_add_material_tables.sql
├── 013_add_suppliers_table.sql
├── 014_add_avatar_url.sql
├── 015_add_two_factor_auth.sql
├── 016_add_task_assignment_indexes.sql
├── 017_add_cache_metadata.sql
├── 018_add_settings_audit_log.sql
├── 019_enhanced_performance_indexes.sql
├── 020_fix_cache_metadata_schema.sql
├── 021_add_client_statistics_view.sql
├── 022_add_task_history_table.sql
├── 023_add_messaging_tables.sql
├── 024_add_inventory_management.sql
├── 025_audit_logging.sql
├── 026_performance_indexes.sql
└── 027_add_task_constraints.sql
```

## Database Management

### Health Check

Check database status:

```bash
npm run check_db
```

### Schema Inspection

Inspect database schema:

```bash
npm run check_db_schema
```

### Vacuum Database

Optimize database:

```bash
npm run vacuum_database
```

### Database Stats

Get database statistics:

```typescript
const stats = await ipcClient.system.getDatabaseStats();
```

### Migration Testing

Test database migrations:

```bash
npm run test-migrations
```

### Migration Validation

Validate migration system:

```bash
npm run validate-migration-system
```

### Migration System Details

#### Migration Runner Implementation

```rust
// src-tauri/src/db/migrations.rs
pub struct MigrationRunner {
    db: Arc<AsyncDatabase>,
    migrations: Vec<Box<dyn Migration>>,
}

impl MigrationRunner {
    pub async fn run_migrations(&self) -> Result<MigrationReport> {
        // Ensure schema_version table exists
        self.ensure_schema_table().await?;
        
        // Get current version
        let current_version = self.get_current_version().await?;
        
        // Get pending migrations
        let pending_migrations = self.get_pending_migrations(current_version).await?;
        
        // Run each migration in transaction
        for migration in pending_migrations {
            let tx = self.db.begin().await?;
            
            // Run migration
            migration.up(&tx).await?;
            
            // Update version
            self.update_version(&tx, &migration.version()).await?;
            
            tx.commit().await?;
        }
        
        Ok(MigrationReport {
            migrations_run: pending_migrations.len(),
            final_version: self.get_current_version().await?,
        })
    }
}
```

#### Migration Validation

```rust
// Validate migration integrity
pub fn validate_migration(migration: &str) -> Result<ValidationReport> {
    let checks = vec![
        ("SELECT", "No SELECT statements in migrations"),
        ("DROP TABLE", "Drops must be in down() method"),
        ("PRAGMA", "PRAGMA changes go in main.rs, not migrations"),
    ];
    
    for (pattern, message) in checks {
        if migration.to_uppercase().contains(pattern) {
            return Err(ValidationError::new(message));
        }
    }
    
    Ok(ValidationReport::success())
}
```

### Performance Optimization

#### Index Strategy

The database uses a comprehensive indexing strategy:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_tasks_technician_status_scheduled 
ON tasks(technician_id, status, scheduled_date);

-- Partial indexes for filtered queries
CREATE INDEX idx_tasks_active_only 
ON tasks(id, technician_id, priority, scheduled_date) 
WHERE status IN ('pending', 'in_progress', 'assigned');

-- Covering indexes to avoid table lookups
CREATE INDEX idx_interventions_cover 
ON interventions(task_id, status) 
INCLUDE (started_at, completed_at, technician_id);
```

#### Query Optimization

```sql
-- Material stock queries
SELECT m.*, COALESCE(SUM(mc.quantity_used), 0) as used_quantity
FROM materials m
LEFT JOIN material_consumption mc ON m.id = mc.material_id
GROUP BY m.id;

-- Task statistics with CTE
WITH task_stats AS (
  SELECT 
    client_id,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
    AVG(actual_duration) FILTER (WHERE status = 'completed') as avg_duration
  FROM tasks
  WHERE deleted_at IS NULL
  GROUP BY client_id
)
UPDATE clients c
SET total_tasks = ts.total_tasks,
    completed_tasks = ts.completed_tasks,
    avg_task_duration = ts.avg_duration
FROM task_stats ts
WHERE c.id = ts.client_id;
```

### Sync Queue Implementation

#### Offline-First Architecture

```sql
-- Sync queue supports dependencies
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL, -- create, update, delete
    entity_type TEXT NOT NULL,   -- task, client, intervention, etc.
    entity_id TEXT NOT NULL,
    data TEXT NOT NULL,           -- JSON payload
    dependencies TEXT,             -- JSON array of dependent operations
    priority INTEGER DEFAULT 0,   -- Higher number = higher priority
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Index for processing order
CREATE INDEX idx_sync_queue_status_priority 
ON sync_queue(status, priority DESC, created_at);
```

#### Sync Processing Logic

```rust
// src-tauri/src/sync/queue.rs
impl SyncQueue {
    pub async fn process_queue(&self) -> Result<Vec<SyncResult>> {
        // Get batch of pending operations
        let operations = self.get_pending_batch(100).await?;
        
        let mut results = Vec::new();
        
        for operation in operations {
            // Check dependencies
            if !self.are_dependencies_satisfied(&operation).await? {
                continue; // Skip for now
            }
            
            // Process operation
            match self.process_operation(&operation).await {
                Ok(result) => {
                    self.mark_completed(operation.id).await?;
                    results.push(result);
                }
                Err(e) => {
                    self.mark_failed(operation.id, &e.to_string()).await?;
                }
            }
        }
        
        Ok(results)
    }
}
```

### Version Control

#### Schema Version Table

```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL,
    migration_hash TEXT NOT NULL, -- SHA256 of migration content
    description TEXT,
    migration_time_ms INTEGER  -- Time taken to apply migration
);
```

#### Current Schema Details

- **Current Version**: 27
- **Total Tables**: 21
- **Total Migrations**: 27
- **Schema Size**: ~1249 lines of SQL

### Database Size Management

#### Automatic Vacuum

```rust
// src-tauri/src/db/connection.rs
impl AsyncDatabase {
    pub async fn auto_vacuum(&self) -> Result<()> {
        // Check if vacuum is needed (every 100MB of changes)
        let page_count = self.query_one::<i64>(
            "PRAGMA page_count",
            &[]
        ).await?;
        
        let changes_since_vacuum = self.query_one::<i64>(
            "SELECT changes FROM pragma_user_version()",
            &[]
        ).await?;
        
        if changes_since_vacuum > 100_000_000 / 4096 { // ~100MB
            self.execute("VACUUM", &[]).await?;
            self.execute("PRAGMA user_version = 0", &[]).await?;
        }
        
        Ok(())
    }
}
```

#### Size Monitoring

```sql
-- Database size query
SELECT 
    page_count * page_size as database_size_bytes,
    (page_count * page_size) / 1024.0 / 1024.0 as database_size_mb,
    (page_count * page_size) / 1024.0 / 1024.0 / 1024.0 as database_size_gb
FROM pragma_page_count(), pragma_page_size();

-- Table sizes
SELECT 
    name,
    COUNT(*) as row_count,
    SUM(LENGTH(CAST(name AS BLOB))) as name_size,
    SUM(LENGTH(sql)) as sql_size
FROM sqlite_master 
WHERE type = 'table' 
GROUP BY name;
```

---

**Document Version**: 2.0
**Last Updated**: Based on comprehensive codebase analysis
