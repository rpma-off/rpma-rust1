# Database Schema - RPMA v2

Ce document décrit le schéma de base de données complet de l'application RPMA v2, incluant les tables, les relations, les contraintes et les migrations.

## 📋 Vue d'Ensemble

RPMA v2 utilise une base de données SQLite locale avec synchronisation cloud. La base de données est conçue pour être performante en mode offline tout en maintenant l'intégrité des données lors de la synchronisation.

### Caractéristiques Principales
- **SQLite** : Base de données locale légère et performante
- **Migrations automatiques** : Gestion des évolutions du schéma
- **Indexation optimisée** : Requêtes performantes même avec gros volumes
- **Contraintes intégrées** : Validation au niveau de la base de données
- **Support offline** : Dénormalisation stratégique pour le mode déconnecté

## 🗂️ Structure des Tables

### 1. Tables Principales

#### 1.1 `users` - Utilisateurs du système
```sql
CREATE TABLE IF NOT EXISTS users (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  
  -- Authentification
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  mfa_secret TEXT,
  mfa_enabled INTEGER DEFAULT 0,
  backup_codes TEXT,
  
  -- Profil
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Rôles et permissions
  role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'technician', 'viewer')),
  is_active INTEGER DEFAULT 1,
  is_banned INTEGER DEFAULT 0,
  banned_at INTEGER,
  banned_reason TEXT,
  
  -- Préférences
  preferences TEXT, -- JSON
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'fr',
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  last_login_at INTEGER,
  last_active_at INTEGER,
  password_changed_at INTEGER,
  
  -- Sync
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  sync_error TEXT
);
```

#### 1.2 `clients` - Gestion des clients
```sql
CREATE TABLE IF NOT EXISTS clients (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  
  -- Informations personnelles
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  customer_type TEXT DEFAULT 'individual' 
    CHECK(customer_type IN ('individual', 'business')),
  
  -- Adresse
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT,
  
  -- Informations professionnelles
  tax_id TEXT,
  company_name TEXT,
  contact_person TEXT,
  
  -- Métadonnées
  notes TEXT,
  tags TEXT, -- JSON array
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT,
  
  -- Sync
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER
);
```

#### 1.3 `tasks` - Tâches et interventions
```sql
CREATE TABLE IF NOT EXISTS tasks (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  task_number TEXT UNIQUE NOT NULL,
  
  -- Informations de base
  title TEXT NOT NULL,
  description TEXT,
  
  -- Véhicule
  vehicle_plate TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_year TEXT, -- String pour compatibilité frontend
  vehicle_make TEXT,
  vin TEXT,
  
  -- Configuration PPF
  ppf_zones TEXT, -- JSON array
  custom_ppf_zones TEXT, -- JSON array
  
  -- Statut et priorité
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  
  -- Assignment
  technician_id TEXT,
  assigned_at INTEGER,
  assigned_by TEXT,
  
  -- Planification
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
  completed_steps TEXT,
  
  -- Client
  client_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  
  -- Champs additionnels
  external_id TEXT,
  lot_film TEXT,
  checklist_completed INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  creator_id TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT,
  
  -- Sync
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  
  -- Foreign Keys
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);
```

#### 1.4 `interventions` - Interventions PPF détaillées
```sql
CREATE TABLE IF NOT EXISTS interventions (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  task_number TEXT,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
  
  -- Véhicule
  vehicle_plate TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_make TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_vin TEXT,
  
  -- Client (dénormalisé pour offline)
  client_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  
  -- Technicien (dénormalisé pour offline)
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
  
  -- Temporalité
  scheduled_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  paused_at INTEGER,
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes
  
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
  
  -- Finalization
  customer_satisfaction INTEGER
    CHECK(customer_satisfaction IS NULL OR (customer_satisfaction >= 1 AND customer_satisfaction <= 10)),
  quality_score INTEGER
    CHECK(quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  final_observations TEXT, -- JSON array
  customer_signature TEXT, -- base64
  customer_comments TEXT,
  
  -- Métadonnées
  metadata TEXT, -- JSON
  notes TEXT,
  special_instructions TEXT,
  
  -- Device tracking
  device_info TEXT, -- JSON
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
  
  -- Foreign Keys
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### 2. Tables de Workflow

#### 2.1 `intervention_steps` - Étapes d'intervention
```sql
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
  step_data TEXT, -- JSON
  collected_data TEXT, -- JSON
  measurements TEXT, -- JSON
  observations TEXT,
  
  -- Photos
  photo_count INTEGER NOT NULL DEFAULT 0,
  required_photos_completed INTEGER DEFAULT 0,
  photo_urls TEXT,
  
  -- Validation
  validation_data TEXT, -- JSON
  validation_errors TEXT, -- JSON
  validation_score INTEGER
    CHECK(validation_score IS NULL OR (validation_score >= 0 AND validation_score <= 100)),
  
  -- Approval
  requires_supervisor_approval INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT,
  
  -- GPS Location
  location_lat REAL,
  location_lon REAL,
  location_accuracy REAL,
  
  -- Device
  device_timestamp INTEGER,
  device_info TEXT,
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  
  -- Foreign Keys
  FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 3. Tables de Stock et Matériaux

#### 3.1 `materials` - Gestion des matériaux
```sql
CREATE TABLE IF NOT EXISTS materials (
  -- Identifiants
  id TEXT PRIMARY KEY NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Catégorisation
  category_id TEXT,
  material_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  
  -- Spécifications
  unit TEXT DEFAULT 'unit',
  unit_cost REAL,
  current_stock REAL DEFAULT 0,
  min_stock_level REAL DEFAULT 0,
  max_stock_level REAL,
  
  -- Gestion du stock
  is_active INTEGER DEFAULT 1,
  requires_refrigeration INTEGER DEFAULT 0,
  shelf_life_days INTEGER,
  
  -- Fournisseur
  supplier_id TEXT,
  supplier_sku TEXT,
  
  -- Métadonnées
  specifications TEXT, -- JSON
  notes TEXT,
  tags TEXT, -- JSON
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  updated_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT,
  
  -- Sync
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  
  -- Foreign Keys
  FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL
);
```

#### 3.2 `inventory_transactions` - Transactions d'inventaire
```sql
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  material_id TEXT NOT NULL,
  
  -- Type de transaction
  transaction_type TEXT NOT NULL
    CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjustment', 'transfer', 'waste', 'return')),
  
  -- Quantités
  quantity REAL NOT NULL,
  previous_stock REAL NOT NULL,
  new_stock REAL NOT NULL,
  
  -- Référence
  reference_number TEXT,
  reference_type TEXT,
  notes TEXT,
  
  -- Coûts
  unit_cost REAL,
  total_cost REAL,
  
  -- Localisation
  warehouse_id TEXT,
  location_from TEXT,
  location_to TEXT,
  
  -- Tracking
  batch_number TEXT,
  expiry_date INTEGER,
  quality_status TEXT,
  
  -- Intervention liée
  intervention_id TEXT,
  step_id TEXT,
  
  -- Audit
  performed_by TEXT NOT NULL,
  performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
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
```

### 4. Tables de Support

#### 4.1 `photos` - Gestion des photos
```sql
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY NOT NULL,
  
  -- Association
  entity_type TEXT NOT NULL CHECK(entity_type IN ('task', 'intervention', 'step', 'client', 'vehicle')),
  entity_id TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK(photo_type IN ('before', 'after', 'during', 'profile', 'document')),
  
  -- Métadonnées fichier
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT,
  
  -- Image metadata
  width INTEGER,
  height INTEGER,
  exif_data TEXT, -- JSON
  
  -- Informations
  description TEXT,
  taken_at INTEGER,
  taken_by TEXT,
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  -- Sync
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  
  -- Foreign Keys
  FOREIGN KEY (taken_by) REFERENCES users(id) ON DELETE SET NULL
);
```

#### 4.2 `notifications` - Système de notifications
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  
  -- Destinataire
  user_id TEXT NOT NULL,
  recipient_type TEXT DEFAULT 'user',
  
  -- Contenu
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL 
    CHECK(notification_type IN ('info', 'warning', 'error', 'success', 'task_assigned', 'task_updated', 'intervention_completed')),
  
  -- État
  is_read INTEGER DEFAULT 0,
  is_delivered INTEGER DEFAULT 0,
  read_at INTEGER,
  
  -- Actions
  action_url TEXT,
  action_data TEXT, -- JSON
  
  -- Métadonnées
  priority INTEGER DEFAULT 0 CHECK(priority >= 0 AND priority <= 10),
  expires_at INTEGER,
  metadata TEXT, -- JSON
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 5. Tables de Synchronisation et Audit

#### 5.1 `sync_queue` - Queue de synchronisation
```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  
  -- Opération
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation_type TEXT NOT NULL
    CHECK(operation_type IN ('create', 'update', 'delete', 'merge')),
  
  -- Données
  data TEXT NOT NULL, -- JSON
  
  -- État
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  processed_at INTEGER,
  next_retry_at INTEGER,
  
  -- Erreurs
  error_message TEXT,
  error_code TEXT,
  error_details TEXT, -- JSON
);
```

#### 5.2 `audit_events` - Journal d'audit complet
```sql
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  
  -- Événement
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT,
  resource_type TEXT,
  description TEXT NOT NULL,
  
  -- Métadonnées HTTP
  ip_address TEXT,
  user_agent TEXT,
  result TEXT NOT NULL,
  
  -- États
  previous_state TEXT, -- JSON
  new_state TEXT, -- JSON
  
  -- Timestamps
  timestamp INTEGER NOT NULL,
  
  -- Métadonnées
  metadata TEXT, -- JSON
  session_id TEXT,
  request_id TEXT,
  
  -- Audit
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 6. Tables de Configuration

#### 6.1 `user_settings` - Paramètres utilisateur
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Catégorie de paramètres
  setting_type TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  
  -- Valeur
  setting_value TEXT NOT NULL,
  setting_data_type TEXT DEFAULT 'string'
    CHECK(setting_data_type IN ('string', 'number', 'boolean', 'json')),
  
  -- Validation
  is_system INTEGER DEFAULT 0,
  is_encrypted INTEGER DEFAULT 0,
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_by TEXT,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
```

#### 6.2 `app_settings` - Configuration de l'application
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  
  -- Clé et catégorie
  setting_key TEXT UNIQUE NOT NULL,
  setting_category TEXT NOT NULL,
  
  -- Valeur et type
  setting_value TEXT NOT NULL,
  setting_data_type TEXT DEFAULT 'string',
  default_value TEXT,
  
  -- Validation
  is_public INTEGER DEFAULT 0, -- Accessible par tous les utilisateurs
  is_system INTEGER DEFAULT 0, -- Nécessite un redémarrage
  validation_regex TEXT,
  
  -- Description
  display_name TEXT,
  description TEXT,
  help_text TEXT,
  
  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_by TEXT,
  
  -- Foreign Keys
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
```

## 🔗 Relations et Contraintes

### Diagramme des Relations
```
users ────────────────────────┐
│                            │
│ 1:N │                    │ 1:N
│    │                    │    │
│ clients                  │   tasks ────┐
│    │                    │              │
│ 1:N                     │              │ 1:1
│    │                    │              │    │
│ materials ──┐           │            interventions
│            │1:N        │              │    │
│ inventory_transactions           │              │ 1:N
│                            │         intervention_steps
│                            │              │
│                      notifications              │
│                                              │ 1:N
│                                        photos
│
│                sync_queue
│                audit_events
│                user_settings
│                app_settings
```

### Contraintes d'Intégrité
1. **Foreign Key Constraints** : Maintien de l'intégrité référentielle
2. **Check Constraints** : Validation des données au niveau de la base
3. **Unique Constraints** : Prévention des doublons (emails, usernames, SKUs)
4. **Not Null Constraints** : Champs obligatoires

## 📊 Indexation Optimisée

### Indexes Primaires
- Toutes les tables ont un index primaire sur `id TEXT`

### Indexes de Performance
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Tasks
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_technician_id ON tasks(technician_id);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_synced ON tasks(synced) WHERE synced = 0;

-- Interventions
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_technician ON interventions(technician_id);
CREATE INDEX idx_interventions_scheduled ON interventions(scheduled_at);
CREATE INDEX idx_interventions_synced ON interventions(synced) WHERE synced = 0;

-- Materials
CREATE INDEX idx_materials_sku ON materials(sku);
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_active ON materials(is_active);

-- Photos
CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX idx_photos_type ON photos(photo_type);
```

### Indexes Composites
```sql
-- Optimisation des requêtes fréquentes
CREATE INDEX idx_tasks_status_technician ON tasks(status, technician_id);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_interventions_status_scheduled ON interventions(status, scheduled_at);
CREATE INDEX idx_inventory_material_date ON inventory_transactions(material_id, performed_at);
CREATE INDEX idx_audit_user_timestamp ON audit_events(user_id, timestamp DESC);
```

## 🔄 Système de Migrations

### Version Actuelle : 26
La base de données utilise un système de migrations avec tracking automatique de version.

### Historique des Migrations
- **Migration 1** : Schéma initial (users, clients, tasks)
- **Migration 2** : Renommage ppf_zone → ppf_zones
- **Migration 6** : Ajout locations GPS aux étapes d'intervention
- **Migration 8** : Triggers de workflow et contraintes
- **Migration 11** : Ajout task_id aux interventions
- **Migration 12** : Prévention doublons d'interventions actives
- **Migration 16** : Indexes optimisés pour assignment validation
- **Migration 17** : Table cache_metadata
- **Migration 18** : Table settings_audit_log
- **Migration 24** : Système d'inventaire avancé
- **Migration 25** : Système d'audit complet
- **Migration 26** : Indexes de performance

### Gestion des Migrations
```rust
// Dans src-tauri/src/db/migrations.rs
impl Database {
    pub fn get_version(&self) -> DbResult<i32>
    pub fn migrate(&self, target_version: i32) -> DbResult<()>
    pub fn get_latest_migration_version() -> i32
}
```

## 🔍 Vues Utilisateurs

### 1. `client_statistics` - Statistiques client
```sql
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
```

### 2. `calendar_tasks` - Tâches calendrier
```sql
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
```

## 🔧 Triggers Automatiques

### 1. Synchronisation Tâches ↔ Interventions
```sql
CREATE TRIGGER sync_task_on_intervention_start
AFTER INSERT ON interventions
BEGIN
    UPDATE tasks SET workflow_id = NEW.id
    WHERE task_number = NEW.task_number AND workflow_id IS NULL;
END
```

### 2. Mise à Jour Statut Tâche
```sql
CREATE TRIGGER sync_task_on_intervention_update
AFTER UPDATE ON interventions
BEGIN
    UPDATE tasks SET
        status = CASE
            WHEN NEW.status = 'completed' THEN 'completed'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            WHEN NEW.status = 'paused' THEN 'paused'
            ELSE 'in_progress'
        END,
        completed_at = CASE
            WHEN NEW.status = 'completed' THEN NEW.completed_at
            ELSE NULL
        END
    WHERE workflow_id = NEW.id;
END
```

## 📈 Performance et Optimisations

### Configuration SQLite Optimale
```sql
-- Performance settings
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -20000; -- 20MB
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456; -- 256MB
```

### Stratégies d'Optimisation
1. **WAL Mode** : Concurrency améliorée pour lecture/écriture
2. **Memory Mapping** : Accès rapide aux grosses tables
3. **Cache size** : Optimisé pour les requêtes fréquentes
4. **Indexes stratégiques** : Basés sur les patterns d'utilisation

## 🔒 Sécurité des Données

### Chiffrement Optionnel
```rust
// Support de chiffrement via clé optionnelle
let encryption_key = std::env::var("RPMA_DB_KEY").unwrap_or_else(|_| "".to_string());
let db_instance = Database::new(&db_path, &encryption_key)?;
```

### Validation d'Entrées
- **CHECK constraints** : Validation au niveau base de données
- **Triggers** : Validation des règles métier
- **Types forts** : Enums et structs dans Rust

### Audit Complet
- **Table audit_events** : Journalisation de toutes les actions
- **Tracking sessions** : Suivi des accès utilisateurs
- **Modification tracking** : Historique des changements

---

*Cette documentation est basée sur l'analyse du schéma SQL et sera mise à jour avec l'évolution de la base de données.*