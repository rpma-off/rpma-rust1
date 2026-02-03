# Database Documentation

## Overview

The RPMA PPF Intervention application uses **SQLite** as its embedded database engine, providing a robust, serverless, zero-configuration database solution optimized for offline-first operation.

### Database Configuration

**Identified in**: `src-tauri/src/db/mod.rs`, `schema.sql`

- **Engine**: SQLite 3.x (bundled with rusqlite 0.32)
- **Journal Mode**: WAL (Write-Ahead Logging)
- **Foreign Keys**: Enabled
- **Synchronous**: NORMAL
- **Cache Size**: -64000 (64MB)
- **Page Size**: 4096 bytes
- **Temp Store**: MEMORY
- **Mmap Size**: 268435456 (256MB)
- **Encryption**: Optional SQLCipher support (feature flag)

### Database Location

- **Windows**: `%APPDATA%\com.rpma.ppf-intervention\rpma.db`
- **macOS**: `~/Library/Application Support/com.rpma.ppf-intervention/rpma.db`
- **Linux**: `~/.local/share/com.rpma.ppf-intervention/rpma.db`

### Schema Version

**Current Version**: 25 (base schema) + 27 migration files in `migrations/` directory
**Migration System**: Sequential SQL migration files tracked by `schema_version` table

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │         │   clients    │         │    tasks     │
│              │         │              │         │              │
│  id (PK)     │         │  id (PK)     │◄────────│  client_id   │
│  email       │         │  name        │         │  task_number │
│  username    │         │  email       │         │  title       │
│  role        │         │  phone       │         │  status      │
└──────┬───────┘         └──────────────┘         └──────┬───────┘
       │                                                  │
       │                                                  │
       │                 ┌──────────────┐                │
       │                 │interventions │                │
       │                 │              │                │
       └─────────────────┤technician_id │◄───────────────┘
                         │  task_id     │
                         │  status      │
                         │  vehicle_*   │
                         └──────┬───────┘
                                │
                                │
                    ┌───────────┴───────────┐
                    │                       │
         ┌──────────▼──────────┐  ┌────────▼────────┐
         │intervention_steps   │  │     photos      │
         │                     │  │                 │
         │  intervention_id    │  │ intervention_id │
         │  step_number        │  │  file_path      │
         │  step_status        │  │  photo_type     │
         └─────────────────────┘  └─────────────────┘

         ┌──────────────┐         ┌──────────────┐
         │  materials   │         │ sync_queue   │
         │              │         │              │
         │  id (PK)     │         │  entity_type │
         │  sku         │         │  entity_id   │
         │  stock       │         │  status      │
         └──────────────┘         └──────────────┘
```

## Tables

### 1. users

**Purpose**: User authentication and authorization

**Identified in**: `schema.sql` lines 622-662

**Schema**:
```sql
CREATE TABLE users (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,

  -- Authentication
  password_hash TEXT NOT NULL,
  salt TEXT,

  -- Profile
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'technician'
    CHECK(role IN ('admin', 'technician', 'supervisor', 'viewer')),
  phone TEXT,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at INTEGER,
  login_count INTEGER DEFAULT 0,

  -- Preferences
  preferences TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

**Indexes**:
- `idx_users_email` ON users(email)
- `idx_users_username` ON users(username)
- `idx_users_role` ON users(role)
- `idx_users_active` ON users(is_active) WHERE is_active = 1

**Key Features**:
- Argon2 password hashing via salt field
- Role-based access control (4 roles)
- Session tracking via last_login_at and login_count
- Sync tracking for offline-first support

---

### 2. user_sessions

**Purpose**: Active session management for JWT tokens

**Identified in**: `schema.sql` lines 665-682

**Schema**:
```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  last_activity TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Indexes**:
- `idx_user_sessions_user_id` ON user_sessions(user_id)
- `idx_user_sessions_token` ON user_sessions(token)
- `idx_user_sessions_expires_at` ON user_sessions(expires_at)

**Key Features**:
- JWT token storage with refresh token support
- Session expiration tracking
- User denormalization for quick access
- One-to-many relationship with users table

---

### 3. user_settings

**Purpose**: User-specific settings and preferences

**Identified in**: `schema.sql` lines 717-797

**Schema**:
```sql
CREATE TABLE user_settings (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,

  -- Profile settings
  full_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,

  -- Preferences
  email_notifications INTEGER NOT NULL DEFAULT 1,
  push_notifications INTEGER NOT NULL DEFAULT 1,
  task_assignments INTEGER NOT NULL DEFAULT 1,
  task_updates INTEGER NOT NULL DEFAULT 1,
  system_alerts INTEGER NOT NULL DEFAULT 1,
  weekly_reports INTEGER NOT NULL DEFAULT 0,
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'fr',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '24h',
  high_contrast INTEGER NOT NULL DEFAULT 0,
  large_text INTEGER NOT NULL DEFAULT 0,
  reduce_motion INTEGER NOT NULL DEFAULT 0,
  screen_reader INTEGER NOT NULL DEFAULT 0,
  auto_refresh INTEGER NOT NULL DEFAULT 1,
  refresh_interval INTEGER NOT NULL DEFAULT 60,

  -- Security settings
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  session_timeout INTEGER NOT NULL DEFAULT 480,

  -- Performance settings
  cache_enabled INTEGER NOT NULL DEFAULT 1,
  cache_size INTEGER NOT NULL DEFAULT 100,
  offline_mode INTEGER NOT NULL DEFAULT 0,
  sync_on_startup INTEGER NOT NULL DEFAULT 1,
  background_sync INTEGER NOT NULL DEFAULT 1,
  image_compression INTEGER NOT NULL DEFAULT 1,
  preload_data INTEGER NOT NULL DEFAULT 0,

  -- Accessibility settings
  accessibility_high_contrast INTEGER NOT NULL DEFAULT 0,
  accessibility_large_text INTEGER NOT NULL DEFAULT 0,
  accessibility_reduce_motion INTEGER NOT NULL DEFAULT 0,
  accessibility_screen_reader INTEGER NOT NULL DEFAULT 0,
  accessibility_focus_indicators INTEGER NOT NULL DEFAULT 1,
  accessibility_keyboard_navigation INTEGER NOT NULL DEFAULT 1,
  accessibility_text_to_speech INTEGER NOT NULL DEFAULT 0,
  accessibility_speech_rate REAL NOT NULL DEFAULT 1.0,
  accessibility_font_size INTEGER NOT NULL DEFAULT 16,
  accessibility_color_blind_mode TEXT NOT NULL DEFAULT 'none',

  -- Notification settings
  notifications_email_enabled INTEGER NOT NULL DEFAULT 1,
  notifications_push_enabled INTEGER NOT NULL DEFAULT 1,
  notifications_in_app_enabled INTEGER NOT NULL DEFAULT 1,
  notifications_task_assigned INTEGER NOT NULL DEFAULT 1,
  notifications_task_updated INTEGER NOT NULL DEFAULT 1,
  notifications_task_completed INTEGER NOT NULL DEFAULT 0,
  notifications_task_overdue INTEGER NOT NULL DEFAULT 1,
  notifications_system_alerts INTEGER NOT NULL DEFAULT 1,
  notifications_maintenance INTEGER NOT NULL DEFAULT 0,
  notifications_security_alerts INTEGER NOT NULL DEFAULT 1,
  notifications_quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
  notifications_quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  notifications_quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  notifications_digest_frequency TEXT NOT NULL DEFAULT 'never',
  notifications_batch_notifications INTEGER NOT NULL DEFAULT 0,
  notifications_sound_enabled INTEGER NOT NULL DEFAULT 1,
  notifications_sound_volume INTEGER NOT NULL DEFAULT 70,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- `idx_user_settings_user_id` ON user_settings(user_id)

**Key Features**:
- Comprehensive user preferences in single row per user
- Accessibility support (high contrast, large text, screen reader, etc.)
- Notification fine-grained controls
- Performance and sync settings
- Cascade delete on user deletion

---

### 4. clients

**Purpose**: Client management with full-text search and statistics

**Identified in**: `schema.sql` lines 401-486

**Schema**:
```sql
CREATE TABLE clients (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,

  -- Personal information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Client type
  customer_type TEXT NOT NULL DEFAULT 'individual'
    CHECK(customer_type IN ('individual', 'business')),

  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'France',

  -- Business information
  tax_id TEXT,
  company_name TEXT,
  contact_person TEXT,

  -- Metadata
  notes TEXT,
  tags TEXT, -- JSON array

  -- Statistics (computed via triggers)
  total_tasks INTEGER DEFAULT 0,
  active_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  last_task_date TEXT,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,

  -- Soft delete
  deleted_at INTEGER,
  deleted_by TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER
);
```

**Indexes**:
- `idx_clients_name` ON clients(name COLLATE NOCASE)
- `idx_clients_email` ON clients(email)
- `idx_clients_customer_type` ON clients(customer_type)
- `idx_clients_created_at` ON clients(created_at)
- `idx_clients_synced` ON clients(synced) WHERE synced = 0

**Full-Text Search**:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS clients_fts USING fts5(
  name, email, phone, company_name, contact_person, notes,
  content='clients',
  content_rowid='rowid'
);
```

**Triggers**: Automatic statistics updates on task changes (INSERT, UPDATE, DELETE)

**Key Features**:
- Full-text search via FTS5
- Automatic task statistics via triggers
- Support for individual and business clients
- Soft delete support
- Tagging system (JSON array)

---

### 5. tasks

**Purpose**: General task management for all work types

**Identified in**: `schema.sql` lines 311-398

**Schema**:
```sql
CREATE TABLE tasks (
  -- Identifiers
  id TEXT PRIMARY KEY,
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Vehicle
  vehicle_plate TEXT,
  vehicle_model TEXT,
  vehicle_year TEXT,
  vehicle_make TEXT,
  vin TEXT,
  ppf_zones TEXT,
  custom_ppf_zones TEXT, -- JSON array

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN (
      'draft', 'scheduled', 'in_progress', 'completed', 'cancelled',
      'on_hold', 'pending', 'invalid', 'archived', 'failed',
      'overdue', 'assigned', 'paused'
    )),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK(priority IN ('low', 'medium', 'high', 'urgent')),

  -- Assignment
  technician_id TEXT,
  assigned_at INTEGER,
  assigned_by TEXT,

  -- Scheduling
  scheduled_date TEXT,
  start_time TEXT,
  end_time TEXT,
  date_rdv TEXT,
  heure_rdv TEXT,

  -- Workflow
  template_id TEXT,
  workflow_id TEXT,
  workflow_status TEXT,
  current_workflow_step_id TEXT,

  -- Temporal
  started_at INTEGER,
  completed_at INTEGER,
  completed_steps TEXT, -- JSON array

  -- Client
  client_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  external_id TEXT,

  -- Material
  lot_film TEXT,

  -- Checklist
  checklist_completed INTEGER DEFAULT 0, -- BOOLEAN stored as INTEGER

  -- Metadata
  notes TEXT,
  tags TEXT, -- JSON array
  estimated_duration INTEGER,
  actual_duration INTEGER,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  creator_id TEXT,
  created_by TEXT,
  updated_by TEXT,

  -- Soft delete
  deleted_at INTEGER,
  deleted_by TEXT,

  -- Sync
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign keys
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_tasks_status` ON tasks(status)
- `idx_tasks_technician_id` ON tasks(technician_id)
- `idx_tasks_client_id` ON tasks(client_id)
- `idx_tasks_priority` ON tasks(priority)
- `idx_tasks_scheduled_date` ON tasks(scheduled_date)
- `idx_tasks_created_at` ON tasks(created_at)
- `idx_tasks_synced` ON tasks(synced) WHERE synced = 0
- `idx_tasks_task_number` ON tasks(task_number)
- Composite indexes for common query patterns

**Key Features**:
- 12 possible task statuses with state machine validation
- 4 priority levels
- PPF zone configuration (JSON)
- Workflow integration
- Task number generation (YYYYMMDD-XXX format)
- Soft delete support
- Rich metadata (tags, notes)

---

### 6. interventions

**Purpose**: PPF intervention workflow tracking with detailed steps

**Identified in**: `schema.sql` lines 7-134

**Schema**:
```sql
CREATE TABLE interventions (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),

  -- Vehicle
  vehicle_plate TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_make TEXT,
  vehicle_year INTEGER
    CHECK(vehicle_year IS NULL OR (vehicle_year >= 1900 AND vehicle_year <= 2100)),
  vehicle_color TEXT,
  vehicle_vin TEXT,

  -- Client (denormalized for offline)
  client_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,

  -- Technician (denormalized)
  technician_id TEXT,
  technician_name TEXT,

  -- Intervention PPF
  intervention_type TEXT NOT NULL DEFAULT 'ppf',
  current_step INTEGER NOT NULL DEFAULT 0,
  completion_percentage REAL DEFAULT 0
    CHECK(completion_percentage >= 0 AND completion_percentage <= 100),

  -- Configuration PPF
  ppf_zones_config TEXT,
  ppf_zones_extended TEXT,
  film_type TEXT
    CHECK(film_type IS NULL OR film_type IN ('standard', 'premium', 'matte', 'colored')),
  film_brand TEXT,
  film_model TEXT,

  -- Temporal
  scheduled_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  paused_at INTEGER,
  estimated_duration INTEGER,
  actual_duration INTEGER,

  -- Environmental conditions
  weather_condition TEXT
    CHECK(weather_condition IS NULL OR weather_condition IN ('sunny', 'cloudy', 'rainy', 'foggy', 'windy', 'other')),
  lighting_condition TEXT
    CHECK(lighting_condition IS NULL OR lighting_condition IN ('natural', 'artificial', 'mixed')),
  work_location TEXT
    CHECK(work_location IS NULL OR work_location IN ('indoor', 'outdoor', 'semi_covered')),
  temperature_celsius REAL,
  humidity_percentage REAL
    CHECK(humidity_percentage IS NULL OR (humidity_percentage >= 0 AND humidity_percentage <= 100)),

  -- GPS Start Location
  start_location_lat REAL
    CHECK(start_location_lat IS NULL OR (start_location_lat >= -90 AND start_location_lat <= 90)),
  start_location_lon REAL
    CHECK(start_location_lon IS NULL OR (start_location_lon >= -180 AND start_location_lon <= 180)),
  start_location_accuracy REAL,

  -- GPS End Location
  end_location_lat REAL
    CHECK(end_location_lat IS NULL OR (end_location_lat >= -90 AND end_location_lat <= 90)),
  end_location_lon REAL
    CHECK(end_location_lon IS NULL OR (end_location_lon >= -180 AND end_location_lon <= 180)),
  end_location_accuracy REAL,

  -- Finalization data
  customer_satisfaction INTEGER
    CHECK(customer_satisfaction IS NULL OR (customer_satisfaction >= 1 AND customer_satisfaction <= 10)),
  quality_score INTEGER
    CHECK(quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  final_observations TEXT,
  customer_signature TEXT,
  customer_comments TEXT,

  -- Metadata
  metadata TEXT,
  notes TEXT,
  special_instructions TEXT,

  -- Device tracking
  device_info TEXT,
  app_version TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  sync_error TEXT,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  task_number TEXT,

  -- Foreign Keys
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_interventions_status` ON interventions(status)
- `idx_interventions_synced` ON interventions(synced) WHERE synced = 0
- `idx_interventions_technician` ON interventions(technician_id)
- `idx_interventions_client` ON interventions(client_id)
- `idx_interventions_scheduled` ON interventions(scheduled_at)
- `idx_interventions_created` ON interventions(created_at)
- `idx_interventions_task_number` ON interventions(task_number)
- `idx_interventions_vehicle_plate` ON interventions(vehicle_plate)
- Composite indexes for common query patterns

**Key Features**:
- 4-step workflow tracking
- GPS location tracking (start/end)
- Environmental condition logging
- Quality scoring and customer satisfaction
- PPF zone and film configuration
- Denormalized client/technician data for offline access

---

### 7. intervention_steps

**Purpose**: Individual workflow steps for interventions

**Identified in**: `schema.sql` lines 138-217

**Schema**:
```sql
CREATE TABLE intervention_steps (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,

  -- Configuration step
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL
    CHECK(step_type IN ('inspection', 'preparation', 'installation', 'finalization')),
  step_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(step_status IN ('pending', 'in_progress', 'paused', 'completed', 'failed', 'skipped', 'rework')),

  -- Metadata
  description TEXT,
  instructions TEXT,
  quality_checkpoints TEXT,

  -- Requirements
  is_mandatory INTEGER NOT NULL DEFAULT 0,
  requires_photos INTEGER DEFAULT 0,
  min_photos_required INTEGER DEFAULT 0,
  max_photos_allowed INTEGER DEFAULT 20,

  -- Temporal
  started_at INTEGER,
  completed_at INTEGER,
  paused_at INTEGER,
  duration_seconds INTEGER,
  estimated_duration_seconds INTEGER,

  -- Data collected
  step_data TEXT,
  collected_data TEXT,
  measurements TEXT,
  observations TEXT,

  -- Photos
  photo_count INTEGER NOT NULL DEFAULT 0,
  required_photos_completed INTEGER DEFAULT 0,
  photo_urls TEXT,

  -- Validation
  validation_data TEXT,
  validation_errors TEXT,
  validation_score INTEGER
    CHECK(validation_score IS NULL OR (validation_score >= 0 AND validation_score <= 100)),

  -- Approval
  requires_supervisor_approval INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT,

  -- GPS Location
  location_lat REAL
    CHECK(location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)),
  location_lon REAL
    CHECK(location_lon IS NULL OR (location_lon >= -180 AND location_lon <= 180)),
  location_accuracy REAL,

  -- Device
  device_timestamp INTEGER,
  server_timestamp INTEGER,

  -- Notes
  title TEXT,
  notes TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Foreign Keys
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE
);
```

**Indexes**:
- `idx_steps_intervention` ON intervention_steps(intervention_id)
- `idx_steps_status` ON intervention_steps(step_status)
- `idx_steps_intervention_number` ON intervention_steps(intervention_id, step_number) UNIQUE
- `idx_steps_synced` ON intervention_steps(synced) WHERE synced = 0

**Key Features**:
- 4 step types (inspection, preparation, installation, finalization)
- Photo requirements per step
- GPS location per step
- Quality validation and scoring
- Supervisor approval workflow

---

### 8. photos

**Purpose**: Photo documentation for interventions

**Identified in**: `schema.sql` lines 226-302

**Schema**:
```sql
CREATE TABLE photos (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,
  step_id TEXT,
  step_number INTEGER,

  -- File local
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg'
    CHECK(mime_type IN ('image/jpeg', 'image/png', 'image/heic', 'image/webp')),
  width INTEGER,
  height INTEGER,

  -- Classification
  photo_type TEXT
    CHECK(photo_type IS NULL OR photo_type IN ('before', 'during', 'after')),
  photo_category TEXT,
  photo_angle TEXT,
  zone TEXT,

  -- Context
  title TEXT,
  description TEXT,
  notes TEXT,
  annotations TEXT,

  -- EXIF Data
  exif_data TEXT,
  camera_make TEXT,
  camera_model TEXT,
  capture_datetime TEXT,

  -- GPS
  gps_lat REAL
    CHECK(gps_lat IS NULL OR (gps_lat >= -90 AND gps_lat <= 90)),
  gps_lon REAL
    CHECK(gps_lon IS NULL OR (gps_lon >= -180 AND gps_lon <= 180)),
  gps_accuracy REAL,
  gps_altitude REAL,

  -- Quality automatic
  quality_score INTEGER
    CHECK(quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  blur_score INTEGER
    CHECK(blur_score IS NULL OR (blur_score >= 0 AND blur_score <= 100)),
  exposure_score INTEGER
    CHECK(exposure_score IS NULL OR (exposure_score >= 0 AND exposure_score <= 100)),
  composition_score INTEGER
    CHECK(composition_score IS NULL OR (composition_score >= 0 AND composition_score <= 100)),

  -- Validation
  is_required INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 1,
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  storage_url TEXT,
  upload_retry_count INTEGER DEFAULT 0,
  upload_error TEXT,
  last_synced_at INTEGER,

  -- Timestamps
  captured_at INTEGER,
  uploaded_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Foreign Keys
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_photos_intervention` ON photos(intervention_id)
- `idx_photos_step` ON photos(step_id)
- `idx_photos_synced` ON photos(synced) WHERE synced = 0
- `idx_photos_type` ON photos(photo_type)
- `idx_photos_category` ON photos(photo_category)

**Key Features**:
- Multi-format support (JPEG, PNG, HEIC, WebP)
- Automatic quality scoring (blur, exposure, composition)
- GPS location with altitude
- EXIF data extraction
- Photo approval workflow
- Upload retry mechanism

---

### 9. materials

**Purpose**: Inventory management for PPF materials

**Identified in**: `schema.sql` lines 807-872

**Schema**:
```sql
CREATE TABLE materials (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Material type and category
  material_type TEXT NOT NULL
    CHECK(material_type IN ('ppf_film', 'adhesive', 'cleaning_solution', 'tool', 'consumable')),
  category TEXT,
  subcategory TEXT,

  -- Specifications
  brand TEXT,
  model TEXT,
  specifications TEXT, -- JSON field for detailed specs

  -- Inventory
  unit_of_measure TEXT NOT NULL DEFAULT 'piece'
    CHECK(unit_of_measure IN ('piece', 'meter', 'liter', 'gram', 'roll')),
  current_stock REAL NOT NULL DEFAULT 0,
  minimum_stock REAL DEFAULT 0,
  maximum_stock REAL,
  reorder_point REAL,

  -- Pricing
  unit_cost REAL,
  currency TEXT DEFAULT 'EUR',

  -- Supplier information
  supplier_id TEXT,
  supplier_name TEXT,
  supplier_sku TEXT,

  -- Quality and compliance
  quality_grade TEXT,
  certification TEXT,
  expiry_date INTEGER,
  batch_number TEXT,
  serial_numbers TEXT, -- JSON array for tracked items

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  is_discontinued INTEGER NOT NULL DEFAULT 0,

  -- Location
  storage_location TEXT,
  warehouse_id TEXT,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_materials_sku` ON materials(sku)
- `idx_materials_type` ON materials(material_type)
- `idx_materials_supplier` ON materials(supplier_id)
- `idx_materials_active` ON materials(is_active)

**Key Features**:
- 5 material types
- 5 unit of measure options
- Stock level tracking with reorder points
- Supplier management
- Batch/serial number tracking
- Multi-currency support

---

### 10. material_consumption

**Purpose**: Track material usage per intervention

**Identified in**: `schema.sql` lines 881-919

**Schema**:
```sql
CREATE TABLE material_consumption (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  step_id TEXT,

  -- Consumption details
  quantity_used REAL NOT NULL,
  unit_cost REAL,
  total_cost REAL,
  waste_quantity REAL DEFAULT 0,
  waste_reason TEXT,

  -- Quality tracking
  batch_used TEXT,
  expiry_used INTEGER,
  quality_notes TEXT,

  -- Workflow integration
  step_number INTEGER,
  recorded_by TEXT,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_material_consumption_intervention` ON material_consumption(intervention_id)
- `idx_material_consumption_material` ON material_consumption(material_id)
- `idx_material_consumption_step` ON material_consumption(step_id)

**Key Features**:
- Cost tracking per intervention
- Waste tracking with reasons
- Batch/quality tracking
- Link to intervention steps

---

### 11. calendar_events

**Purpose**: Calendar and scheduling

**Identified in**: `schema.sql` lines 927-994

**Schema**:
```sql
CREATE TABLE calendar_events (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,

  -- Temporal data (ISO 8601 strings)
  start_datetime TEXT NOT NULL,
  end_datetime TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  timezone TEXT DEFAULT 'UTC',

  -- Event type and category
  event_type TEXT NOT NULL DEFAULT 'meeting'
    CHECK(event_type IN ('meeting', 'appointment', 'task', 'reminder', 'other')),
  category TEXT,

  -- Relations
  task_id TEXT,
  client_id TEXT,
  technician_id TEXT,

  -- Meeting details
  location TEXT,
  meeting_link TEXT,
  is_virtual INTEGER DEFAULT 0,

  -- Participants (JSON array)
  participants TEXT,

  -- Recurrence (future)
  is_recurring INTEGER DEFAULT 0,
  recurrence_rule TEXT,
  parent_event_id TEXT,

  -- Reminders (JSON array)
  reminders TEXT,

  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK(status IN ('confirmed', 'tentative', 'cancelled')),
  color TEXT,
  tags TEXT,
  notes TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,

  -- Soft delete
  deleted_at INTEGER,
  deleted_by TEXT,

  -- Foreign Keys
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE
);
```

**Indexes**:
- `idx_events_technician` ON calendar_events(technician_id)
- `idx_events_task` ON calendar_events(task_id)
- `idx_events_client` ON calendar_events(client_id)
- `idx_events_start_datetime` ON calendar_events(start_datetime)
- `idx_events_end_datetime` ON calendar_events(end_datetime)
- `idx_events_status` ON calendar_events(status)
- `idx_events_event_type` ON calendar_events(event_type)
- `idx_events_synced` ON calendar_events(synced) WHERE synced = 0
- Composite indexes for common query patterns

**Key Features**:
- Multiple view support (day/week/month/agenda)
- Recurring events support
- Multi-participant support
- Task and client linking
- Virtual meeting support
- Timezone support

---

### 12. sync_queue

**Purpose**: Offline synchronization queue

**Identified in**: `schema.sql` lines 568-608

**Schema**:
```sql
CREATE TABLE sync_queue (
  -- Identifiant
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Operation details
  operation_type TEXT NOT NULL
    CHECK(operation_type IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL
    CHECK(entity_type IN ('task', 'client', 'intervention', 'photo')),
  entity_id TEXT NOT NULL,

  -- Data
  data TEXT NOT NULL,
  dependencies TEXT, -- JSON array of dependency IDs

  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_retry_at INTEGER,
  next_retry_at INTEGER,
  last_error TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'abandoned')),

  -- Priority
  priority INTEGER NOT NULL DEFAULT 5
    CHECK(priority >= 1 AND priority <= 10),

  -- Metadata
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  device_id TEXT,
  batch_id TEXT,

  -- Timestamps
  timestamp_utc INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER,
  processed_at INTEGER
);
```

**Indexes**:
- `idx_sync_pending` ON sync_queue(status, retry_count, created_at) WHERE status = 'pending' AND retry_count < max_retries
- `idx_sync_entity` ON sync_queue(entity_type, entity_id)
- `idx_sync_status` ON sync_queue(status)
- `idx_sync_timestamp` ON sync_queue(timestamp_utc)
- `idx_sync_entity_operation` ON sync_queue(entity_type, entity_id, operation_type)
- `idx_sync_retry_status` ON sync_queue(retry_count, status)

**Key Features**:
- Operation-based sync (create, update, delete)
- Retry logic with exponential backoff
- Dependency tracking
- Priority queue (1-10)
- Status tracking
- Batch processing support

---

### 13. audit_logs

**Purpose**: Audit trail for security

**Identified in**: `schema.sql` lines 685-714

**Schema**:
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Context
  user_id TEXT,
  user_email TEXT,

  -- Action
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,

  -- Changes
  old_values TEXT,
  new_values TEXT,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  device_id TEXT,

  -- Timestamp
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

**Indexes**:
- `idx_audit_user` ON audit_logs(user_id)
- `idx_audit_entity` ON audit_logs(entity_type, entity_id)
- `idx_audit_timestamp` ON audit_logs(timestamp)
- `idx_audit_action` ON audit_logs(action)

**Key Features**:
- All mutations logged
- Before/after values
- User and device tracking
- IP address logging
- Timestamped audit trail

---

### 14. schema_version

**Purpose**: Database schema version tracking

**Identified in**: `schema.sql` lines 1011-1019

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

**Current Version**: 25 (initialized with `INSERT OR IGNORE INTO schema_version (version) VALUES (25)`)

**Key Features**:
- Simple version tracking
- Applied timestamp
- Used by migration runner

---

## Database Features

### Triggers

#### Client Statistics Triggers

**Purpose**: Automatically update client statistics when tasks change

**Trigger 1: task_insert_update_client_stats**
- Fired on INSERT to tasks table
- Increments total_tasks and active_tasks counts
- Updates completed_tasks if status is 'completed'
- Updates last_task_date

**Trigger 2: task_update_update_client_stats**
- Fired on UPDATE to tasks table
- Handles client_id changes
- Recalculates statistics based on old and new values

**Trigger 3: task_delete_update_client_stats**
- Fired on DELETE from tasks table
- Decrements appropriate counters

### Full-Text Search

**clients_fts** virtual table provides:
- Fast text search across name, email, phone, company_name, contact_person, notes
- Automatic content sync via triggers
- FTS5 ranking support

### Foreign Key Constraints

**Important Relationships**:
- interventions.task_id → tasks.id
- interventions.client_id → clients.id (SET NULL)
- interventions.technician_id → users.id (SET NULL)
- intervention_steps.intervention_id → interventions.id (CASCADE)
- photos.intervention_id → interventions.id (CASCADE)
- photos.step_id → intervention_steps.id (SET NULL)
- tasks.client_id → clients.id (SET NULL)
- tasks.technician_id → users.id (SET NULL)
- user_settings.user_id → users.id (CASCADE)
- user_sessions.user_id → users.id
- material_consumption.intervention_id → interventions.id (CASCADE)
- material_consumption.material_id → materials.id (RESTRICT)
- material_consumption.step_id → intervention_steps.id (SET NULL)
- calendar_events.task_id → tasks.id (CASCADE)
- calendar_events.client_id → clients.id (SET NULL)
- calendar_events.technician_id → users.id (CASCADE)
- materials.supplier_id → suppliers.id (SET NULL)

### Soft Delete Pattern

Tables with soft delete:
- tasks (deleted_at, deleted_by)
- clients (deleted_at, deleted_by)
- calendar_events (deleted_at, deleted_by)

Soft deleted rows are preserved in database but excluded from queries unless explicitly included.

### Sync Tracking

All primary tables have sync tracking:
- synced (INTEGER): 0 = not synced, 1 = synced
- last_synced_at (INTEGER): timestamp of last sync

Used by sync_queue and background sync service.

---

## Indexing Strategy

### Index Categories

1. **Single Column Indexes**: Basic queries on individual fields
2. **Composite Indexes**: Multi-column queries (status + technician, etc.)
3. **Unique Indexes**: Enforce uniqueness (task_number, email, username, etc.)
4. **Partial Indexes**: Filtered indexes (WHERE synced = 0)
5. **FTS Indexes**: Full-text search

### Index Usage Patterns

- **Status filtering**: Tasks, interventions frequently filtered by status
- **Date ranges**: Calendar queries by date range
- **Foreign key lookups**: All indexed
- **Sync operations**: Partial indexes on synced = 0
- **Search**: FTS for clients

---

## Migration System

**Location**: `src-tauri/src/db/migrations.rs` and `migrations/` directory

**Migration Files**: 27 sequential SQL migrations

**Migration Process**:
1. Read current version from schema_version table
2. Apply unapplied migrations sequentially
3. Update schema_version after each successful migration
4. Rollback on failure

**Version History**:
- Version 0: Initial schema
- Versions 1-24: Progressive schema additions
- Version 25: Current stable schema (in schema.sql)

---

## Performance Optimization

### WAL Mode (Write-Ahead Logging)
- Allows concurrent reads and writes
- Improves database performance
- Managed via r2d2 connection pool

### Connection Pooling
- r2d2 pool with configurable size
- Reduces connection overhead
- Max 100 connections (configurable)

### Pragma Settings
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB
PRAGMA page_size = 4096;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB
```

---

## Data Integrity

### Check Constraints

Extensive CHECK constraints validate:
- Status values (enums)
- Priority values (enums)
- Date ranges (year >= 1900, etc.)
- GPS coordinates (lat/lon ranges)
- Percentages (0-100)
- Ratings (1-10, 0-100)

### Foreign Key Enforcement

All foreign key constraints are enforced with appropriate actions:
- CASCADE: Delete dependent rows
- SET NULL: Set foreign key to NULL
- RESTRICT: Prevent deletion if referenced

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tables | 14 |
| Total Indexes | 40+ |
| FTS Tables | 1 |
| Triggers | 4 |
| Schema Version | 25 |
| Migrations | 27 |
| Max Table Rows (est.) | 1,000,000 (audit_logs) |

---

**Document Version**: 2.0
**Last Updated**: 2026-02-03
**Maintained By**: RPMA Team
  last_synced_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

**Indexes**:
- `idx_users_email` on `email`
- `idx_users_username` on `username`
- `idx_users_role` on `role`
- `idx_users_active` on `is_active` WHERE `is_active = 1`

**Constraints**:
- `email` UNIQUE
- `username` UNIQUE
- `role` CHECK constraint (admin, technician, supervisor, viewer)

**Row Count** (typical): 10-100

---

### 2. user_sessions

**Purpose**: Session management and JWT token tracking

**Identified in**: `schema.sql` lines 665-682

```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  last_activity TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Indexes**:
- `idx_user_sessions_user_id` on `user_id`
- `idx_user_sessions_token` on `token`
- `idx_user_sessions_expires_at` on `expires_at`

**Foreign Keys**:
- `user_id` → `users(id)`

**Row Count** (typical): 50-500

---

### 3. user_settings

**Purpose**: User-specific preferences and configuration

**Identified in**: `schema.sql` lines 717-800

```sql
CREATE TABLE user_settings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  -- Profile
  full_name TEXT,
  email TEXT,
  phone TEXT,
  -- Preferences
  email_notifications INTEGER NOT NULL DEFAULT 1,
  push_notifications INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'fr',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '24h',
  -- Accessibility
  high_contrast INTEGER NOT NULL DEFAULT 0,
  large_text INTEGER NOT NULL DEFAULT 0,
  reduce_motion INTEGER NOT NULL DEFAULT 0,
  screen_reader INTEGER NOT NULL DEFAULT 0,
  -- Performance
  cache_enabled INTEGER NOT NULL DEFAULT 1,
  cache_size INTEGER NOT NULL DEFAULT 100,
  offline_mode INTEGER NOT NULL DEFAULT 0,
  -- Security
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  session_timeout INTEGER NOT NULL DEFAULT 480,
  -- Notifications (detailed)
  notifications_email_enabled INTEGER NOT NULL DEFAULT 1,
  notifications_push_enabled INTEGER NOT NULL DEFAULT 1,
  notifications_task_assigned INTEGER NOT NULL DEFAULT 1,
  notifications_quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
  notifications_quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  notifications_quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- `idx_user_settings_user_id` on `user_id`

**Foreign Keys**:
- `user_id` → `users(id)` ON DELETE CASCADE

---

### 4. clients

**Purpose**: Customer/client management (CRM)

**Identified in**: `schema.sql` lines 401-448

```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  customer_type TEXT NOT NULL DEFAULT 'individual'
    CHECK(customer_type IN ('individual', 'business')),
  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'France',
  -- Business info
  tax_id TEXT,
  company_name TEXT,
  contact_person TEXT,
  -- Metadata
  notes TEXT,
  tags TEXT,  -- JSON array
  -- Statistics (computed)
  total_tasks INTEGER DEFAULT 0,
  active_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  last_task_date TEXT,
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER
);
```

**Indexes**:
- `idx_clients_name` on `name COLLATE NOCASE`
- `idx_clients_email` on `email`
- `idx_clients_customer_type` on `customer_type`
- `idx_clients_created_at` on `created_at`
- `idx_clients_synced` on `synced` WHERE `synced = 0`

**Full-Text Search**:
```sql
CREATE VIRTUAL TABLE clients_fts USING fts5(
  name, email, phone, company_name, contact_person, notes,
  content='clients',
  content_rowid='rowid'
);
```

**Triggers**:
- `clients_fts_insert`: Maintain FTS index on insert
- `clients_fts_delete`: Maintain FTS index on delete
- `clients_fts_update`: Maintain FTS index on update
- `task_insert_update_client_stats`: Update statistics on task insert
- `task_update_update_client_stats`: Update statistics on task update
- `task_delete_update_client_stats`: Update statistics on task delete

**Row Count** (typical): 1,000-10,000

---

### 5. tasks

**Purpose**: General task management and work orders

**Identified in**: `schema.sql` lines 315-380

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Vehicle info
  vehicle_plate TEXT,
  vehicle_model TEXT,
  vehicle_year TEXT,
  vehicle_make TEXT,
  vin TEXT,
  ppf_zones TEXT,
  custom_ppf_zones TEXT,  -- JSON array
  -- Status and priority
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN (
      'draft', 'scheduled', 'in_progress', 'completed', 'cancelled',
      'on_hold', 'pending', 'invalid', 'archived', 'failed',
      'overdue', 'assigned', 'paused'
    )),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  -- Assignment
  technician_id TEXT,
  assigned_at INTEGER,
  assigned_by TEXT,
  -- Scheduling
  scheduled_date TEXT,
  start_time TEXT,
  end_time TEXT,
  date_rdv TEXT,
  heure_rdv TEXT,
  -- Workflow
  template_id TEXT,
  workflow_id TEXT,
  workflow_status TEXT,
  current_workflow_step_id TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  completed_steps TEXT,  -- JSON array
  -- Client info
  client_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  -- Metadata
  external_id TEXT,
  lot_film TEXT,
  checklist_completed INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT,  -- JSON array
  estimated_duration INTEGER,
  actual_duration INTEGER,
  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  creator_id TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT,
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  -- Foreign keys
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_tasks_status` on `status`
- `idx_tasks_technician_id` on `technician_id`
- `idx_tasks_client_id` on `client_id`
- `idx_tasks_priority` on `priority`
- `idx_tasks_scheduled_date` on `scheduled_date`
- `idx_tasks_created_at` on `created_at`
- `idx_tasks_synced` on `synced` WHERE `synced = 0`
- `idx_tasks_task_number` on `task_number`
- `idx_tasks_status_technician` on `(status, technician_id)`
- `idx_tasks_status_priority` on `(status, priority)`
- `idx_tasks_client_status` on `(client_id, status)`
- `idx_tasks_technician_scheduled` on `(technician_id, scheduled_date)`
- `idx_tasks_status_scheduled` on `(status, scheduled_date)`
- `idx_tasks_sync_status` on `(synced, status)` WHERE `synced = 0`

**Foreign Keys**:
- `client_id` → `clients(id)` ON DELETE SET NULL
- `technician_id` → `users(id)` ON DELETE SET NULL

**Row Count** (typical): 10,000-100,000

---

### 6. interventions

**Purpose**: Detailed PPF intervention records with workflow tracking

**Identified in**: `schema.sql` lines 7-115

```sql
CREATE TABLE interventions (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
  -- Vehicle
  vehicle_plate TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_make TEXT,
  vehicle_year INTEGER
    CHECK(vehicle_year IS NULL OR (vehicle_year >= 1900 AND vehicle_year <= 2100)),
  vehicle_color TEXT,
  vehicle_vin TEXT,
  -- Client (denormalized for offline)
  client_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  -- Technician (denormalized)
  technician_id TEXT,
  technician_name TEXT,
  -- Intervention PPF
  intervention_type TEXT NOT NULL DEFAULT 'ppf',
  current_step INTEGER NOT NULL DEFAULT 0,
  completion_percentage REAL DEFAULT 0
    CHECK(completion_percentage >= 0 AND completion_percentage <= 100),
  -- PPF Configuration
  ppf_zones_config TEXT,
  ppf_zones_extended TEXT,
  film_type TEXT
    CHECK(film_type IS NULL OR film_type IN ('standard', 'premium', 'matte', 'colored')),
  film_brand TEXT,
  film_model TEXT,
  -- Timing
  scheduled_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  paused_at INTEGER,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  -- Environmental conditions
  weather_condition TEXT
    CHECK(weather_condition IS NULL OR weather_condition IN ('sunny', 'cloudy', 'rainy', 'foggy', 'windy', 'other')),
  lighting_condition TEXT
    CHECK(lighting_condition IS NULL OR lighting_condition IN ('natural', 'artificial', 'mixed')),
  work_location TEXT
    CHECK(work_location IS NULL OR work_location IN ('indoor', 'outdoor', 'semi_covered')),
  temperature_celsius REAL,
  humidity_percentage REAL
    CHECK(humidity_percentage IS NULL OR (humidity_percentage >= 0 AND humidity_percentage <= 100)),
  -- GPS Start Location
  start_location_lat REAL
    CHECK(start_location_lat IS NULL OR (start_location_lat >= -90 AND start_location_lat <= 90)),
  start_location_lon REAL
    CHECK(start_location_lon IS NULL OR (start_location_lon >= -180 AND start_location_lon <= 180)),
  start_location_accuracy REAL,
  -- GPS End Location
  end_location_lat REAL,
  end_location_lon REAL,
  end_location_accuracy REAL,
  -- Finalization
  customer_satisfaction INTEGER
    CHECK(customer_satisfaction IS NULL OR (customer_satisfaction >= 1 AND customer_satisfaction <= 10)),
  quality_score INTEGER
    CHECK(quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  final_observations TEXT,
  customer_signature TEXT,
  customer_comments TEXT,
  -- Metadata
  metadata TEXT,
  notes TEXT,
  special_instructions TEXT,
  device_info TEXT,
  app_version TEXT,
  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  sync_error TEXT,
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  task_number TEXT,
  -- Foreign Keys
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_interventions_status` on `status`
- `idx_interventions_synced` on `synced` WHERE `synced = 0`
- `idx_interventions_technician` on `technician_id`
- `idx_interventions_client` on `client_id`
- `idx_interventions_scheduled` on `scheduled_at`
- `idx_interventions_created` on `created_at`
- `idx_interventions_task_number` on `task_number`
- `idx_interventions_vehicle_plate` on `vehicle_plate`
- `idx_interventions_status_technician` on `(status, technician_id)`
- `idx_interventions_status_scheduled` on `(status, scheduled_at)`
- `idx_interventions_status_created` on `(status, created_at)`
- `idx_interventions_client_status` on `(client_id, status)`
- `idx_interventions_technician_scheduled` on `(technician_id, scheduled_at)`
- `idx_interventions_sync_status` on `(synced, status)` WHERE `synced = 0`

**Foreign Keys**:
- `client_id` → `clients(id)` ON DELETE SET NULL
- `technician_id` → `users(id)` ON DELETE SET NULL

**Row Count** (typical): 5,000-50,000

---

### 7. intervention_steps

**Purpose**: Individual workflow steps within an intervention

**Identified in**: `schema.sql` lines 138-217

```sql
CREATE TABLE intervention_steps (
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,
  -- Step configuration
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL
    CHECK(step_type IN ('inspection', 'preparation', 'installation', 'finalization')),
  step_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(step_status IN ('pending', 'in_progress', 'paused', 'completed', 'failed', 'skipped', 'rework')),
  -- Metadata
  description TEXT,
  instructions TEXT,
  quality_checkpoints TEXT,
  -- Requirements
  is_mandatory INTEGER NOT NULL DEFAULT 0,
  requires_photos INTEGER DEFAULT 0,
  min_photos_required INTEGER DEFAULT 0,
  max_photos_allowed INTEGER DEFAULT 20,
  -- Timing
  started_at INTEGER,
  completed_at INTEGER,
  paused_at INTEGER,
  duration_seconds INTEGER,
  estimated_duration_seconds INTEGER,
  -- Data collected
  step_data TEXT,
  collected_data TEXT,
  measurements TEXT,
  observations TEXT,
  -- Photos
  photo_count INTEGER NOT NULL DEFAULT 0,
  required_photos_completed INTEGER DEFAULT 0,
  photo_urls TEXT,
  -- Validation
  validation_data TEXT,
  validation_errors TEXT,
  validation_score INTEGER
    CHECK(validation_score IS NULL OR (validation_score >= 0 AND validation_score <= 100)),
  -- Approval
  requires_supervisor_approval INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT,
  -- GPS Location
  location_lat REAL
    CHECK(location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)),
  location_lon REAL
    CHECK(location_lon IS NULL OR (location_lon >= -180 AND location_lon <= 180)),
  location_accuracy REAL,
  -- Device
  device_timestamp INTEGER,
  server_timestamp INTEGER,
  -- Notes
  title TEXT,
  notes TEXT,
  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  -- Foreign Keys
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE
);
```

**Indexes**:
- `idx_steps_intervention` on `intervention_id`
- `idx_steps_status` on `step_status`
- `idx_steps_intervention_number` UNIQUE on `(intervention_id, step_number)`
- `idx_steps_synced` on `synced` WHERE `synced = 0`

**Foreign Keys**:
- `intervention_id` → `interventions(id)` ON DELETE CASCADE

**Row Count** (typical): 20,000-200,000 (4-8 steps per intervention)

---

### 8. photos

**Purpose**: Photo documentation for interventions

**Identified in**: `schema.sql` lines 226-302

```sql
CREATE TABLE photos (
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,
  step_id TEXT,
  step_number INTEGER,
  -- File info
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg'
    CHECK(mime_type IN ('image/jpeg', 'image/png', 'image/heic', 'image/webp')),
  width INTEGER,
  height INTEGER,
  -- Classification
  photo_type TEXT
    CHECK(photo_type IS NULL OR photo_type IN ('before', 'during', 'after')),
  photo_category TEXT,
  photo_angle TEXT,
  zone TEXT,
  -- Context
  title TEXT,
  description TEXT,
  notes TEXT,
  annotations TEXT,
  -- EXIF Data
  exif_data TEXT,
  camera_make TEXT,
  camera_model TEXT,
  capture_datetime TEXT,
  -- GPS
  gps_lat REAL
    CHECK(gps_lat IS NULL OR (gps_lat >= -90 AND gps_lat <= 90)),
  gps_lon REAL
    CHECK(gps_lon IS NULL OR (gps_lon >= -180 AND gps_lon <= 180)),
  gps_accuracy REAL,
  gps_altitude REAL,
  -- Quality scores
  quality_score INTEGER
    CHECK(quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  blur_score INTEGER
    CHECK(blur_score IS NULL OR (blur_score >= 0 AND blur_score <= 100)),
  exposure_score INTEGER
    CHECK(exposure_score IS NULL OR (exposure_score >= 0 AND exposure_score <= 100)),
  composition_score INTEGER
    CHECK(composition_score IS NULL OR (composition_score >= 0 AND composition_score <= 100)),
  -- Validation
  is_required INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 1,
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT,
  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  storage_url TEXT,
  upload_retry_count INTEGER DEFAULT 0,
  upload_error TEXT,
  last_synced_at INTEGER,
  -- Timestamps
  captured_at INTEGER,
  uploaded_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  -- Foreign Keys
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL
);
```

**Indexes**:
- `idx_photos_intervention` on `intervention_id`
- `idx_photos_step` on `step_id`
- `idx_photos_synced` on `synced` WHERE `synced = 0`
- `idx_photos_type` on `photo_type`
- `idx_photos_category` on `photo_category`

**Foreign Keys**:
- `intervention_id` → `interventions(id)` ON DELETE CASCADE
- `step_id` → `intervention_steps(id)` ON DELETE SET NULL

**Row Count** (typical): 50,000-500,000 (10-30 photos per intervention)

---

### 9. materials

**Purpose**: Material inventory catalog

**Identified in**: Migration `012_add_material_tables.sql`

```sql
CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  material_type TEXT,
  unit_of_measure TEXT NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  current_stock REAL NOT NULL DEFAULT 0,
  minimum_stock REAL NOT NULL DEFAULT 0,
  maximum_stock REAL,
  supplier_id TEXT,
  expiration_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

**Indexes**:
- `idx_materials_sku` on `sku`
- `idx_materials_category` on `category`
- `idx_materials_active` on `is_active`

**Row Count** (typical): 100-1,000

---

### 10. material_consumption

**Purpose**: Track material usage per intervention

**Identified in**: Migration `012_add_material_tables.sql`

```sql
CREATE TABLE material_consumption (
  id TEXT PRIMARY KEY,
  intervention_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  quantity_used REAL NOT NULL,
  unit_cost REAL NOT NULL,
  total_cost REAL NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (intervention_id) REFERENCES interventions(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);
```

**Indexes**:
- `idx_material_consumption_intervention` on `intervention_id`
- `idx_material_consumption_material` on `material_id`

**Row Count** (typical): 10,000-100,000

---

### 11. sync_queue

**Purpose**: Offline synchronization queue

**Identified in**: `schema.sql` lines 568-608

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Operation details
  operation_type TEXT NOT NULL
    CHECK(operation_type IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL
    CHECK(entity_type IN ('task', 'client', 'intervention', 'photo')),
  entity_id TEXT NOT NULL,
  -- Data
  data TEXT NOT NULL,
  dependencies TEXT,  -- JSON array
  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_retry_at INTEGER,
  next_retry_at INTEGER,
  last_error TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'abandoned')),
  -- Priority
  priority INTEGER NOT NULL DEFAULT 5
    CHECK(priority >= 1 AND priority <= 10),
  -- Metadata
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  device_id TEXT,
  batch_id TEXT,
  -- Timestamps
  timestamp_utc INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER,
  processed_at INTEGER
);
```

**Indexes**:
- `idx_sync_pending` on `(status, retry_count, created_at)` WHERE `status = 'pending' AND retry_count < max_retries`
- `idx_sync_entity` on `(entity_type, entity_id)`
- `idx_sync_status` on `status`
- `idx_sync_timestamp` on `timestamp_utc`
- `idx_sync_entity_operation` on `(entity_type, entity_id, operation_type)`
- `idx_sync_retry_status` on `(retry_count, status)`

**Row Count** (typical): 1,000-10,000 (cleared periodically)

---

### 12. audit_logs

**Purpose**: Audit trail for compliance and security

**Identified in**: `schema.sql` lines 685-714

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Context
  user_id TEXT,
  user_email TEXT,
  -- Action
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  -- Changes
  old_values TEXT,
  new_values TEXT,
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  device_id TEXT,
  -- Timestamp
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

**Indexes**:
- `idx_audit_user` on `user_id`
- `idx_audit_entity` on `(entity_type, entity_id)`
- `idx_audit_timestamp` on `timestamp`
- `idx_audit_action` on `action`

**Row Count** (typical): 100,000-1,000,000 (grows continuously)

---

### 13. calendar_events

**Purpose**: Calendar and scheduling events

**Identified in**: Migration `020_calendar_enhancements.sql`

```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL,
  task_id TEXT,
  technician_id TEXT,
  location TEXT,
  attendees TEXT,  -- JSON array
  recurrence_rule TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);
```

**Indexes**:
- `idx_calendar_events_start_time` on `start_time`
- `idx_calendar_events_technician` on `technician_id`
- `idx_calendar_events_task` on `task_id`

**Row Count** (typical): 5,000-50,000

---

### 14. messages

**Purpose**: Internal messaging system

**Identified in**: Migration `023_add_messaging_tables.sql`

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_read INTEGER NOT NULL DEFAULT 0,
  task_id TEXT,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**Indexes**:
- `idx_messages_recipient` on `recipient_id`
- `idx_messages_sender` on `sender_id`
- `idx_messages_task` on `task_id`
- `idx_messages_unread` on `is_read` WHERE `is_read = 0`

**Row Count** (typical): 10,000-100,000

---

## Relationships

### One-to-Many Relationships

1. **users → tasks**: One user (technician) can have many tasks
2. **clients → tasks**: One client can have many tasks
3. **tasks → interventions**: One task can have multiple interventions (historical)
4. **interventions → intervention_steps**: One intervention has many steps
5. **interventions → photos**: One intervention has many photos
6. **intervention_steps → photos**: One step can have many photos
7. **users → user_sessions**: One user can have multiple active sessions
8. **materials → material_consumption**: One material can be consumed in many interventions

### Many-to-Many Relationships

None explicitly defined (handled through application logic or JSON arrays)

## Indexes and Performance

### Index Strategy

**Identified in**: Schema and migration files

1. **Primary Keys**: All tables use TEXT or INTEGER primary keys
2. **Foreign Keys**: Indexed for join performance
3. **Composite Indexes**: For common query patterns (e.g., `status + technician_id`)
4. **Partial Indexes**: For filtered queries (e.g., `WHERE synced = 0`)
5. **Full-Text Search**: FTS5 virtual table for client search

### Query Optimization

**Common Query Patterns**:
```sql
-- Get tasks for technician by status
SELECT * FROM tasks 
WHERE technician_id = ? AND status = ?
-- Uses: idx_tasks_status_technician

-- Get unsynced interventions
SELECT * FROM interventions 
WHERE synced = 0
-- Uses: idx_interventions_synced (partial index)

-- Search clients
SELECT * FROM clients_fts 
WHERE clients_fts MATCH ?
-- Uses: FTS5 index
```

## Constraints

### CHECK Constraints

**Identified throughout schema**:

1. **Status Enums**: Enforce valid status values
   - Task status: 13 possible values
   - Intervention status: 5 possible values
   - Step status: 7 possible values

2. **Range Constraints**:
   - `vehicle_year`: 1900-2100
   - `completion_percentage`: 0-100
   - `customer_satisfaction`: 1-10
   - `quality_score`: 0-100
   - GPS coordinates: Valid lat/lon ranges
   - `humidity_percentage`: 0-100

3. **Enum Constraints**:
   - `role`: admin, technician, supervisor, viewer
   - `customer_type`: individual, business
   - `priority`: low, medium, high, urgent
   - `film_type`: standard, premium, matte, colored
   - `weather_condition`: sunny, cloudy, rainy, foggy, windy, other

### Foreign Key Constraints

**Cascade Behavior**:
- **ON DELETE CASCADE**: intervention_steps, photos (delete children when parent deleted)
- **ON DELETE SET NULL**: Most foreign keys (preserve data, null out reference)

## Migrations

### Migration System

**Identified in**: `src-tauri/migrations/` (25 files)

**Migration Files**:
```
002_rename_ppf_zone.sql
003_add_client_stats_triggers.sql
004_add_task_client_index.sql
005_add_task_indexes.sql
006_add_step_location_columns.sql
007_add_user_consent.sql
008_add_workflow_constraints.sql
009_add_task_number_to_interventions.sql
010_fix_task_statuses.sql
011_prevent_duplicate_interventions.sql
012_add_material_tables.sql
013_add_suppliers_table.sql
014_add_avatar_url.sql
015_add_two_factor_auth.sql
016_add_task_assignment_indexes.sql
017_add_cache_metadata.sql
018_add_settings_audit_log.sql
019_enhanced_performance_indexes.sql
020_fix_cache_metadata_schema.sql
021_add_client_statistics_view.sql
022_add_task_history_table.sql
023_add_messaging_tables.sql
024_add_inventory_management.sql
025_add_analytics_dashboard.sql
027_add_task_constraints.sql
```

### Migration Process

**Identified in**: `src-tauri/src/db/mod.rs`

1. Check current schema version
2. Compare with latest migration version
3. Apply migrations sequentially
4. Update schema_version table
5. Verify migration success

### Schema Versioning

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

**Current Version**: 27

## Database Maintenance

### Vacuum

**Purpose**: Reclaim unused space and optimize database

```sql
VACUUM;
```

**Frequency**: Weekly or after large deletions

### WAL Checkpoint

**Purpose**: Merge WAL file back into main database

```sql
PRAGMA wal_checkpoint(TRUNCATE);
```

**Frequency**: Every 60 seconds (automatic)

### Integrity Check

**Purpose**: Verify database integrity

```sql
PRAGMA integrity_check;
```

**Frequency**: On startup and weekly

### Statistics Update

**Purpose**: Update query planner statistics

```sql
ANALYZE;
```

**Frequency**: After significant data changes

## Backup Strategy

### Backup Methods

1. **File Copy**: Copy `rpma.db` and `rpma.db-wal` files
2. **SQLite Backup API**: Use `.backup` command
3. **Export to SQL**: Dump schema and data

### Backup Frequency

- **Automatic**: Daily (planned feature)
- **Manual**: On-demand via UI
- **Pre-migration**: Before applying migrations

### Backup Location

- Local: User-specified directory
- Cloud: Planned integration

## Performance Metrics

### Expected Performance

**Identified in**: Performance monitoring code

- **Query Time**: < 100ms for 95% of queries
- **Insert Time**: < 50ms for single insert
- **Batch Insert**: 1000 records in < 500ms
- **Full-Text Search**: < 200ms for typical queries
- **Database Size**: 100MB-1GB typical, 10GB maximum

### Connection Pool

**Configuration**:
- **Min Connections**: 1
- **Max Connections**: 10 (dynamic)
- **Connection Timeout**: 30 seconds
- **Idle Timeout**: 300 seconds

## Security

### Encryption

**Optional SQLCipher Support**:
```rust
// Feature flag: sqlcipher
rusqlite = { version = "0.32", features = ["bundled-sqlcipher"] }
```

**Encryption Key**: Stored in environment variable `RPMA_DB_KEY`

### Access Control

- **Application Level**: Role-based access control
- **Database Level**: No user authentication (embedded database)

### Sensitive Data

**Encrypted Fields** (when SQLCipher enabled):
- `password_hash`
- `salt`
- `customer_signature`
- `token`, `refresh_token`

## Troubleshooting

### Common Issues

1. **Database Locked**
   - Cause: Long-running transaction or WAL checkpoint
   - Solution: Retry with exponential backoff

2. **Disk Full**
   - Cause: WAL file growth
   - Solution: Force WAL checkpoint, vacuum database

3. **Slow Queries**
   - Cause: Missing indexes or large result sets
   - Solution: Add indexes, use pagination

4. **Corruption**
   - Cause: Improper shutdown or disk failure
   - Solution: Restore from backup, run integrity check

### Diagnostic Queries

```sql
-- Check database size
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();

-- Check table sizes
SELECT name, SUM(pgsize) as size FROM dbstat GROUP BY name;

-- Check index usage
SELECT * FROM sqlite_stat1;

-- Check WAL size
PRAGMA wal_checkpoint;
```

---

**Database Version**: 27  
**Last Updated**: February 2026  
**Total Tables**: 15+  
**Total Indexes**: 80+
