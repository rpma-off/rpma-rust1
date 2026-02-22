-- Configuration SQLite pour performance optimale
-- Note: PRAGMA déjà appliqués dans mod.rs, ce fichier contient uniquement les CREATE statements

-- Table 1: interventions
-- Detailed PPF intervention records with workflow steps, photos, and quality tracking.
-- Created from tasks when PPF work is initiated. More detailed than general tasks.
CREATE TABLE IF NOT EXISTS interventions (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),

  -- Véhicule
  vehicle_plate TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_make TEXT,
  vehicle_year INTEGER
    CHECK(vehicle_year IS NULL OR (vehicle_year >= 1900 AND vehicle_year <= 2100)),
  vehicle_color TEXT,
  vehicle_vin TEXT,

  -- Client (dénormalisé pour offline)
  client_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,

  -- Technicien (dénormalisé)
  technician_id TEXT,
  technician_name TEXT,

  -- Intervention PPF
  intervention_type TEXT NOT NULL DEFAULT 'ppf',
  current_step INTEGER NOT NULL DEFAULT 0, -- Number of completed steps (0-based count)
  completion_percentage REAL DEFAULT 0
    CHECK(completion_percentage >= 0 AND completion_percentage <= 100),

  -- Configuration PPF
  ppf_zones_config TEXT,
  ppf_zones_extended TEXT,
  film_type TEXT
    CHECK(film_type IS NULL OR film_type IN ('standard', 'premium', 'matte', 'colored')),
  film_brand TEXT,
  film_model TEXT,

  -- Temporalité
  scheduled_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  paused_at INTEGER,
  estimated_duration INTEGER,
  actual_duration INTEGER,

  -- Conditions environnementales
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

  -- Métadonnées
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
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Indexes for interventions
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_synced ON interventions(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_interventions_technician ON interventions(technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_client ON interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_scheduled ON interventions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interventions_created ON interventions(created_at);
CREATE INDEX IF NOT EXISTS idx_interventions_task_number ON interventions(task_number);
CREATE INDEX IF NOT EXISTS idx_interventions_vehicle_plate ON interventions(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_interventions_task_created
  ON interventions(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_status_created
  ON interventions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_current_step_status
  ON interventions(current_step, status);
CREATE INDEX IF NOT EXISTS idx_interventions_incomplete
  ON interventions(id, task_id, current_step, status)
  WHERE status NOT IN ('completed', 'cancelled');

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_interventions_status_technician ON interventions(status, technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status_scheduled ON interventions(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interventions_status_created ON interventions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_interventions_client_status ON interventions(client_id, status);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_scheduled ON interventions(technician_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_created ON interventions(technician_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interventions_client_created ON interventions(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interventions_sync_status ON interventions(synced, status) WHERE synced = 0;

-- Table 2: intervention_steps
CREATE TABLE IF NOT EXISTS intervention_steps (
  -- Identifiants
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

  -- Temporalité
  started_at INTEGER,
  completed_at INTEGER,
  paused_at INTEGER,
  duration_seconds INTEGER,
  estimated_duration_seconds INTEGER,

  -- Données collectées
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

-- Indexes for intervention_steps
CREATE INDEX IF NOT EXISTS idx_steps_intervention ON intervention_steps(intervention_id);
CREATE INDEX IF NOT EXISTS idx_steps_status ON intervention_steps(step_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_steps_intervention_number ON intervention_steps(intervention_id, step_number);
CREATE INDEX IF NOT EXISTS idx_steps_synced ON intervention_steps(synced) WHERE synced = 0;

-- Table 3: photos
CREATE TABLE IF NOT EXISTS photos (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,
  step_id TEXT,
  step_number INTEGER,

  -- Fichier local
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

  -- Contexte
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
  gps_location_lat REAL
    CHECK(gps_location_lat IS NULL OR (gps_location_lat >= -90 AND gps_location_lat <= 90)),
  gps_location_lon REAL
    CHECK(gps_location_lon IS NULL OR (gps_location_lon >= -180 AND gps_location_lon <= 180)),
  gps_location_accuracy REAL,
  gps_altitude REAL,

  -- Qualité automatique
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

-- Indexes for photos
CREATE INDEX IF NOT EXISTS idx_photos_intervention ON photos(intervention_id);
CREATE INDEX IF NOT EXISTS idx_photos_step ON photos(step_id);
CREATE INDEX IF NOT EXISTS idx_photos_synced ON photos(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_photos_type ON photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(photo_category);

-- Table 4: tasks
-- General task management for all work types (legacy/general tasks).
-- For PPF-specific interventions, see interventions table below.
-- Tasks can spawn interventions when PPF work is required.
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    task_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT, -- Changed to TEXT to match migrate schema
    vehicle_make TEXT,
    vin TEXT,
     ppf_zones TEXT,
    custom_ppf_zones TEXT, -- JSON array
    status TEXT NOT NULL DEFAULT 'draft',
    priority TEXT NOT NULL DEFAULT 'medium',
    technician_id TEXT,
    assigned_at INTEGER,
    assigned_by TEXT,
    scheduled_date TEXT,
    start_time TEXT,
    end_time TEXT,
    date_rdv TEXT,
    heure_rdv TEXT,
    template_id TEXT,
    workflow_id TEXT,
    workflow_status TEXT,
    current_workflow_step_id TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    completed_steps TEXT, -- JSON array
    client_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    external_id TEXT,
    lot_film TEXT,
    checklist_completed INTEGER DEFAULT 0, -- BOOLEAN stored as INTEGER
    notes TEXT,
    tags TEXT, -- JSON array
    estimated_duration INTEGER,
    actual_duration INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    creator_id TEXT,
    created_by TEXT,
    updated_by TEXT,

    -- Soft delete
    deleted_at INTEGER,
    deleted_by TEXT,

    synced INTEGER DEFAULT 0,
    last_synced_at INTEGER,

    -- Foreign keys
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (workflow_id) REFERENCES interventions(id) ON DELETE SET NULL,
    FOREIGN KEY (current_workflow_step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,

    -- CHECK constraints
    CHECK(status IN (
        'draft', 'scheduled', 'in_progress', 'completed', 'cancelled',
        'on_hold', 'pending', 'invalid', 'archived', 'failed',
        'overdue', 'assigned', 'paused'
    )),
    CHECK(priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_id ON tasks(technician_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created_desc ON tasks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at ON tasks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_synced ON tasks(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_current_workflow_step_id ON tasks(current_workflow_step_id);

-- Composite indexes for task query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_status_technician ON tasks(status, technician_id);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_status ON tasks(technician_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_scheduled ON tasks(technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled ON tasks(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(synced, status) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority_scheduled_date
  ON tasks(status, priority DESC, scheduled_date ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_technician_status_priority
  ON tasks(technician_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_created_status_scheduled
  ON tasks(created_at DESC, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status_priority
  ON tasks(client_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_active_only
  ON tasks(id, technician_id, priority, scheduled_date)
  WHERE status IN ('pending', 'in_progress', 'assigned');
CREATE INDEX IF NOT EXISTS idx_tasks_title_description
  ON tasks(title, description)
  WHERE title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle_plate_lower
  ON tasks(LOWER(vehicle_plate))
  WHERE vehicle_plate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle_plate ON tasks(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_tasks_active
  ON tasks(status, created_at)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_status_created
  ON tasks(deleted_at, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_task_number
  ON tasks(deleted_at, task_number);

-- Table 4.5: task_history
-- Tracks task status transitions for auditing
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  task_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  changed_by TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for task_history
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_changed_at ON task_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_task_history_new_status ON task_history(new_status);
CREATE INDEX IF NOT EXISTS idx_task_history_changed_by ON task_history(changed_by) WHERE changed_by IS NOT NULL;

-- Table 4.6: quotes (PRD-09: Quotes)
-- Implements the Devis (Quotes) feature for PPF interventions
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY NOT NULL,
  quote_number TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id),
  task_id TEXT REFERENCES tasks(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until INTEGER,
  notes TEXT,
  terms TEXT,
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  vehicle_plate TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year TEXT,
  vehicle_vin TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY NOT NULL,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'service'
    CHECK(kind IN ('labor', 'material', 'service', 'discount')),
  label TEXT NOT NULL,
  description TEXT,
  qty REAL NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate REAL,
  material_id TEXT REFERENCES materials(id),
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_task_id ON quotes(task_id);

-- Indexes for quote_items
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_position ON quote_items(quote_id, position);
CREATE INDEX IF NOT EXISTS idx_quote_items_material_id ON quote_items(material_id);

-- Table 5: clients
CREATE TABLE IF NOT EXISTS clients (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,

  -- Informations personnelles
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Type de client
  customer_type TEXT NOT NULL DEFAULT 'individual'
    CHECK(customer_type IN ('individual', 'business')),

  -- Adresse
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'France',

  -- Informations business
  tax_id TEXT,
  company_name TEXT,
  contact_person TEXT,

  -- Métadonnées
  notes TEXT,
  tags TEXT, -- JSON array

  -- Statistiques (computed)
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

-- Indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_customer_type ON clients(customer_type);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_synced ON clients(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_clients_name_type_active
  ON clients(name, customer_type, deleted_at);

-- Full-text search for clients
CREATE VIRTUAL TABLE IF NOT EXISTS clients_fts USING fts5(
  name, email, phone, company_name, contact_person, notes,
  content='clients',
  content_rowid='rowid'
);

-- Triggers for FTS maintenance
CREATE TRIGGER IF NOT EXISTS clients_fts_insert AFTER INSERT ON clients
BEGIN
  INSERT INTO clients_fts(rowid, name, email, phone, company_name, contact_person, notes)
  VALUES (new.rowid, new.name, new.email, new.phone, new.company_name, new.contact_person, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS clients_fts_delete AFTER DELETE ON clients
BEGIN
  DELETE FROM clients_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS clients_fts_update AFTER UPDATE ON clients
BEGIN
  UPDATE clients_fts SET
    name = new.name,
    email = new.email,
    phone = new.phone,
    company_name = new.company_name,
    contact_person = new.contact_person,
    notes = new.notes
  WHERE rowid = new.rowid;
END;

-- Triggers to maintain client statistics

-- Trigger for task insertion
CREATE TRIGGER IF NOT EXISTS task_insert_update_client_stats AFTER INSERT ON tasks
BEGIN
  -- Only update if task has a client_id
  UPDATE clients
  SET
    total_tasks = total_tasks + 1,
    active_tasks = active_tasks + CASE
      WHEN NEW.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks + CASE
      WHEN NEW.status = 'completed' THEN 1
      ELSE 0
    END,
    last_task_date = CASE
      WHEN IFNULL(last_task_date, 0) > NEW.created_at THEN last_task_date
      ELSE NEW.created_at
    END
  WHERE id = NEW.client_id AND NEW.client_id IS NOT NULL;
END;

-- Trigger for task update
CREATE TRIGGER IF NOT EXISTS task_update_update_client_stats AFTER UPDATE ON tasks
BEGIN
  -- Handle client_id change or status change
  -- First, decrement from old client if it existed
  UPDATE clients
  SET
    total_tasks = total_tasks - 1,
    active_tasks = active_tasks - CASE
      WHEN OLD.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks - CASE
      WHEN OLD.status = 'completed' THEN 1
      ELSE 0
    END
  WHERE id = OLD.client_id AND OLD.client_id IS NOT NULL;

  -- Then, increment for new/updated client if it exists
  UPDATE clients
  SET
    total_tasks = total_tasks + 1,
    active_tasks = active_tasks + CASE
      WHEN NEW.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks + CASE
      WHEN NEW.status = 'completed' THEN 1
      ELSE 0
    END,
    last_task_date = CASE
      WHEN IFNULL(last_task_date, 0) > NEW.updated_at THEN last_task_date
      ELSE NEW.updated_at
    END
  WHERE id = NEW.client_id AND NEW.client_id IS NOT NULL;
END;

-- Trigger for task deletion
CREATE TRIGGER IF NOT EXISTS task_delete_update_client_stats AFTER DELETE ON tasks
BEGIN
  -- Decrement from client if it existed
  UPDATE clients
  SET
    total_tasks = total_tasks - 1,
    active_tasks = active_tasks - CASE
      WHEN OLD.status IN ('completed', 'cancelled', 'archived', 'failed', 'invalid') THEN 0
      ELSE 1
    END,
    completed_tasks = completed_tasks - CASE
      WHEN OLD.status = 'completed' THEN 1
      ELSE 0
    END
  WHERE id = OLD.client_id AND OLD.client_id IS NOT NULL;
END;

-- Table 6: sync_queue
CREATE TABLE IF NOT EXISTS sync_queue (
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

-- Indexes for sync_queue
CREATE INDEX IF NOT EXISTS idx_sync_pending ON sync_queue(status, retry_count, created_at)
  WHERE status = 'pending' AND retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_timestamp ON sync_queue(timestamp_utc);

-- Composite indexes for sync queue performance
CREATE INDEX IF NOT EXISTS idx_sync_entity_operation ON sync_queue(entity_type, entity_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_sync_retry_status ON sync_queue(retry_count, status);

-- Table 7: users
CREATE TABLE IF NOT EXISTS users (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,

  -- Authentification
  password_hash TEXT NOT NULL,
  salt TEXT,

  -- Profil
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'technician'
    CHECK(role IN ('admin', 'technician', 'supervisor', 'viewer')),

  -- Contact
  phone TEXT,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at INTEGER,
  login_count INTEGER DEFAULT 0,

  -- Préférences
  preferences TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- Table 7.5: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
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
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires_activity
  ON user_sessions(user_id, expires_at, last_activity DESC);

-- Table 8: audit_logs (optionnel)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Contexte
  user_id TEXT,
  user_email TEXT,

  -- Action
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,

  -- Changements
  old_values TEXT,
  new_values TEXT,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  device_id TEXT,

  -- Timestamp
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Table 8.1: audit_events
-- Comprehensive security audit trail (kept in sync with migration 025)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT,
  resource_type TEXT,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  result TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  timestamp INTEGER NOT NULL,
  metadata TEXT,
  session_id TEXT,
  request_id TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_result ON audit_events(result);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_timestamp ON audit_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource_timestamp ON audit_events(resource_type, resource_id, timestamp DESC);

-- Table 9: user_settings
-- User-specific settings and preferences
CREATE TABLE IF NOT EXISTS user_settings (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,

  -- Profile settings
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
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

-- Indexes for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Table 9.1: settings_audit_log
-- Tracks user settings changes for auditing and diagnostics.
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  setting_type TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_settings_audit_user_timestamp ON settings_audit_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_settings_audit_type_timestamp ON settings_audit_log(setting_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp_setting_type
  ON settings_audit_log(timestamp DESC, setting_type);

-- Table 9.2: cache_metadata
-- Cache metadata table for tracking cache entries
CREATE TABLE IF NOT EXISTS cache_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL, -- 'query_result', 'image_thumbnail', 'computed_analytics', 'api_response'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  size_bytes INTEGER NOT NULL,
  ttl_seconds INTEGER, -- NULL means no expiration
  backend_type TEXT NOT NULL, -- 'memory', 'disk', 'redis'
  expires_at DATETIME GENERATED ALWAYS AS (
      CASE
          WHEN ttl_seconds IS NOT NULL THEN datetime(created_at, '+' || ttl_seconds || ' seconds')
          ELSE NULL
      END
  ) VIRTUAL
);

-- Cache statistics table for historical tracking
CREATE TABLE IF NOT EXISTS cache_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  cache_type TEXT NOT NULL,
  total_keys INTEGER NOT NULL DEFAULT 0,
  memory_used_bytes INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  miss_count INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms REAL,
  eviction_count INTEGER DEFAULT 0
);

-- Indexes for cache tables
CREATE INDEX IF NOT EXISTS idx_cache_metadata_key ON cache_metadata(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_type ON cache_metadata(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_expires ON cache_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_updated ON cache_metadata(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_timestamp ON cache_statistics(timestamp);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_type ON cache_statistics(cache_type);

-- Trigger to clean up expired cache entries
CREATE TRIGGER IF NOT EXISTS cleanup_expired_cache
  AFTER INSERT ON cache_metadata
  WHEN NEW.expires_at IS NOT NULL AND NEW.expires_at < datetime('now')
BEGIN
  DELETE FROM cache_metadata WHERE id = NEW.id;
END;

-- Table 9.3: user_consent
-- Stores user consent preferences for GDPR/compliance features.
CREATE TABLE IF NOT EXISTS user_consent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  consent_data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_consent_user_id ON user_consent(user_id);

-- Table 9.5: message_templates
-- Reusable templates for email/SMS/in-app messages
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN (
    'email', 'sms', 'in_app',
    'task_assignment', 'task_update', 'task_completion', 'status_change',
    'overdue_warning', 'system_alert', 'new_assignment', 'deadline_reminder',
    'quality_approval'
  )),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'task', 'client', 'system', 'reminder')),
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(message_type);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);

-- Table 9.6: messages
-- Stores all outgoing/in-app messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'in_app')),
  sender_id TEXT,
  recipient_id TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  template_id TEXT,
  task_id TEXT,
  client_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_at INTEGER,
  sent_at INTEGER,
  read_at INTEGER,
  error_message TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_at ON messages(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Table 9.7: notification_preferences
-- User notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT NOT NULL UNIQUE,
  email_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 0,
  in_app_enabled INTEGER DEFAULT 1,
  task_assigned INTEGER DEFAULT 1,
  task_updated INTEGER DEFAULT 1,
  task_completed INTEGER DEFAULT 1,
  task_overdue INTEGER DEFAULT 1,
  client_created INTEGER DEFAULT 1,
  client_updated INTEGER DEFAULT 1,
  system_alerts INTEGER DEFAULT 1,
  maintenance_notifications INTEGER DEFAULT 1,
  quiet_hours_enabled INTEGER DEFAULT 0,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
  email_digest_time TEXT DEFAULT '09:00',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Table 10: sync_queue (PRD-07: Sync Queue System)
-- Note: Table already defined above at line 464 with comprehensive schema
-- This duplicate definition removed to prevent schema corruption

-- Table 10.5: suppliers
-- Master data for material suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT,
  tax_id TEXT,
  business_license TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_preferred INTEGER NOT NULL DEFAULT 0,
  quality_rating REAL DEFAULT 0.0 CHECK(quality_rating IS NULL OR (quality_rating >= 0.0 AND quality_rating <= 5.0)),
  delivery_rating REAL DEFAULT 0.0 CHECK(delivery_rating IS NULL OR (delivery_rating >= 0.0 AND delivery_rating <= 5.0)),
  on_time_delivery_rate REAL DEFAULT 0.0 CHECK(on_time_delivery_rate IS NULL OR (on_time_delivery_rate >= 0.0 AND on_time_delivery_rate <= 100.0)),
  notes TEXT,
  special_instructions TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_preferred ON suppliers(is_preferred);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_by ON suppliers(updated_by);

-- Table 10.5: material_categories (PRD-08: Material Tracking)
-- Hierarchical categorization system for materials
CREATE TABLE IF NOT EXISTS material_categories (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE,

  -- Hierarchy
  parent_id TEXT,
  level INTEGER NOT NULL DEFAULT 1,

  -- Description and metadata
  description TEXT,
  color TEXT, -- Hex color for UI display

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (parent_id) REFERENCES material_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for material_categories
CREATE INDEX IF NOT EXISTS idx_material_categories_parent ON material_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_material_categories_level ON material_categories(level);
CREATE INDEX IF NOT EXISTS idx_material_categories_active ON material_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_material_categories_created_by ON material_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_material_categories_updated_by ON material_categories(updated_by);

-- Seed default material categories
INSERT OR IGNORE INTO material_categories (id, name, code, level, description, color, created_at, updated_at)
VALUES
  ('cat_ppf_films', 'PPF Films', 'PPF', 1, 'Paint Protection Films', '#3B82F6', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_adhesives', 'Adhesives', 'ADH', 1, 'Adhesive products', '#10B981', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_cleaning', 'Cleaning Solutions', 'CLN', 1, 'Cleaning and preparation products', '#F59E0B', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_tools', 'Tools & Equipment', 'TLS', 1, 'Tools and installation equipment', '#EF4444', unixepoch() * 1000, unixepoch() * 1000),
  ('cat_consumables', 'Consumables', 'CON', 1, 'Consumable supplies', '#8B5CF6', unixepoch() * 1000, unixepoch() * 1000);

-- Table 11: materials (PRD-08: Material Tracking)
-- Inventory management for PPF materials and consumables
CREATE TABLE IF NOT EXISTS materials (
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
  category_id TEXT,

  -- Specifications
  brand TEXT,
  model TEXT,
  specifications TEXT, -- JSON field for detailed specs

  -- Inventory
  unit_of_measure TEXT NOT NULL DEFAULT 'piece'
    CHECK(unit_of_measure IN ('piece', 'meter', 'liter', 'gram', 'roll')),
  current_stock REAL NOT NULL DEFAULT 0
    CHECK(current_stock >= 0),
  minimum_stock REAL DEFAULT 0
    CHECK(minimum_stock IS NULL OR minimum_stock >= 0),
  maximum_stock REAL
    CHECK(maximum_stock IS NULL OR maximum_stock >= 0),
  reorder_point REAL
    CHECK(reorder_point IS NULL OR reorder_point >= 0),

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
  FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for materials
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_supplier ON materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(is_active);
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_updated_by ON materials(updated_by);
CREATE INDEX IF NOT EXISTS idx_materials_active_discontinued
  ON materials(is_active, is_discontinued)
  WHERE is_active = 1 AND is_discontinued = 0;
CREATE INDEX IF NOT EXISTS idx_materials_low_stock
  ON materials(is_active, is_discontinued, current_stock)
  WHERE is_active = 1 AND is_discontinued = 0;
CREATE INDEX IF NOT EXISTS idx_materials_type_active
  ON materials(material_type, is_active)
  WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_sku_active
  ON materials(sku, is_active)
  WHERE is_active = 1;

-- Table 12: material_consumption (PRD-08: Material Tracking)
-- Tracks material usage per intervention for cost calculation and inventory management
CREATE TABLE IF NOT EXISTS material_consumption (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  intervention_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  step_id TEXT,

  -- Consumption details
  quantity_used REAL NOT NULL
    CHECK(quantity_used >= 0),
  unit_cost REAL,
  total_cost REAL,
  waste_quantity REAL DEFAULT 0
    CHECK(waste_quantity IS NULL OR waste_quantity >= 0),
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

-- Indexes for material_consumption
CREATE INDEX IF NOT EXISTS idx_material_consumption_intervention ON material_consumption(intervention_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_material ON material_consumption(material_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_step ON material_consumption(step_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_recorded_by ON material_consumption(recorded_by);

-- Table 12.5: inventory_transactions (PRD-08: Inventory Tracking)
-- Tracks all inventory movements (in/out/adjustments)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,
  material_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL
    CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste', 'return')),

  -- Quantities
  quantity REAL NOT NULL CHECK(quantity >= 0),
  previous_stock REAL NOT NULL CHECK(previous_stock >= 0),
  new_stock REAL NOT NULL CHECK(new_stock >= 0),

  -- Transaction details
  reference_number TEXT, -- PO number, intervention ID, etc.
  reference_type TEXT, -- 'purchase_order', 'intervention', 'manual_adjustment', etc.
  notes TEXT,

  -- Cost tracking
  unit_cost REAL,
  total_cost REAL,

  -- Location tracking
  warehouse_id TEXT,
  location_from TEXT,
  location_to TEXT,

  -- Quality and batch tracking
  batch_number TEXT,
  expiry_date INTEGER,
  quality_status TEXT,

  -- Workflow integration
  intervention_id TEXT,
  step_id TEXT,

  -- User and audit
  performed_by TEXT NOT NULL,
  performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),

  -- Sync
  synced INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,

  -- Foreign Keys
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
  FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for inventory_transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material ON inventory_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(performed_at);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_intervention ON inventory_transactions(intervention_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_step_id ON inventory_transactions(step_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON inventory_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material_performed_at
  ON inventory_transactions(material_id, performed_at DESC);

-- Table 13: calendar_events
-- Calendar events for scheduling meetings, appointments, and task-related time blocks
CREATE TABLE IF NOT EXISTS calendar_events (
  -- Identifiers
  id TEXT PRIMARY KEY NOT NULL,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,

  -- Temporal data (stored as ISO 8601 strings for simplicity)
  start_datetime TEXT NOT NULL, -- ISO 8601: "2024-02-07T09:00:00Z"
  end_datetime TEXT NOT NULL,   -- ISO 8601: "2024-02-07T10:00:00Z"
  all_day INTEGER NOT NULL DEFAULT 0, -- Boolean: all-day event
  timezone TEXT DEFAULT 'UTC',

  -- Event type and category
  event_type TEXT NOT NULL DEFAULT 'meeting'
    CHECK(event_type IN ('meeting', 'appointment', 'task', 'reminder', 'other')),
  category TEXT, -- e.g., 'client-meeting', 'internal', 'break'

  -- Relations
  task_id TEXT, -- Optional link to a task
  client_id TEXT, -- Optional link to a client
  technician_id TEXT, -- Owner/assigned technician

  -- Meeting details
  location TEXT,
  meeting_link TEXT,
  is_virtual INTEGER DEFAULT 0,

  -- Participants (JSON array of participant objects)
  participants TEXT, -- JSON: [{"id": "user1", "name": "John Doe", "status": "accepted"}]

  -- Recurrence (future enhancement)
  is_recurring INTEGER DEFAULT 0,
  recurrence_rule TEXT, -- RRULE format (RFC 5545)
  parent_event_id TEXT, -- For recurring event instances

  -- Reminders (JSON array of reminder offsets in minutes)
  reminders TEXT, -- JSON: [15, 60] for 15 min and 1 hr before

  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK(status IN ('confirmed', 'tentative', 'cancelled')),
  color TEXT, -- Hex color code for visual distinction
  tags TEXT, -- JSON array
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

-- Indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_events_technician ON calendar_events(technician_id);
CREATE INDEX IF NOT EXISTS idx_events_task ON calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_client ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_events_parent_event ON calendar_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON calendar_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_end_datetime ON calendar_events(end_datetime);
CREATE INDEX IF NOT EXISTS idx_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_synced ON calendar_events(synced) WHERE synced = 0;
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_technician_date ON calendar_events(technician_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON calendar_events(start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_events_status_technician ON calendar_events(status, technician_id);

-- Views
-- View for optimized client statistics (kept in sync with migration 021)
CREATE VIEW IF NOT EXISTS client_statistics AS
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

-- View for calendar tasks (kept in sync with migration 020)
CREATE VIEW IF NOT EXISTS calendar_tasks AS
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
WHERE t.scheduled_date IS NOT NULL
  AND t.deleted_at IS NULL;

-- Schema Version Management
-- This table tracks which database migrations have been applied
-- The current schema.sql represents version 39 of the database schema
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Initialize baseline schema versions 1..39 to keep version history contiguous.
WITH RECURSIVE baseline_versions(version) AS (
    SELECT 1
    UNION ALL
    SELECT version + 1
    FROM baseline_versions
    WHERE version < 39
)
INSERT OR IGNORE INTO schema_version (version)
SELECT version FROM baseline_versions;
