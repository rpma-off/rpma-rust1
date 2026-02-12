# RPMA v2 - Database Documentation

This document provides comprehensive information about the RPMA v2 database schema, migrations, data model, and best practices for database operations.

## Overview

RPMA v2 uses **SQLite** with **WAL (Write-Ahead Logging)** mode as its primary database. The offline-first architecture ensures all data is stored locally, with future synchronization capabilities planned.

### Database Configuration

- **Engine**: SQLite 3.x
- **Mode**: WAL mode for concurrent access
- **Connection Pooling**: r2d2 with SQLite
- **Location**: App data directory (`{app_data}/rpma_v2.db`)
- **Encryption**: Optional SQLCipher support for data at rest

## Migration System

### Migration Structure

Migrations are located in `src-tauri/migrations/` and follow the naming convention:
```
{序号}_{description}.sql
```

Example: `001_initial_schema.sql`, `002_add_user_sessions.sql`

### Migration Management

The migration system automatically:
1. Tracks applied migrations in `schema_migrations` table
2. Applies migrations in order
3. Supports rollback operations
4. Validates migration integrity

### Creating New Migrations

1. Create a new SQL file in `src-tauri/migrations/`
2. Use the next sequential number
3. Follow idempotent patterns (use `IF NOT EXISTS`)
4. Test both forward and rollback scenarios
5. Validate with `node scripts/validate-migration-system.js`

## Database Schema

### Core Tables

#### 1. `tasks` - PPF Installation Tasks

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,                     -- UUID
    task_number TEXT UNIQUE NOT NULL,         -- Human-readable (T-YYYYMMDD-001)
    title TEXT NOT NULL,                     -- Task title
    description TEXT,                        -- Detailed description
    client_id TEXT,                          -- Foreign key to clients
    status TEXT NOT NULL DEFAULT 'draft',    -- Task status
    priority TEXT NOT NULL DEFAULT 'medium', -- Priority level
    
    -- Vehicle Information
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vehicle_make TEXT,
    vin TEXT,
    
    -- PPF Specification
    ppf_zones TEXT,                          -- JSON array of zones
    custom_ppf_zones TEXT,                   -- JSON array of custom zones
    
    -- Assignment
    technician_id TEXT,                      -- Assigned technician
    assigned_at INTEGER,                     -- Assignment timestamp
    assigned_by TEXT,                        -- Who assigned
    
    -- Scheduling
    scheduled_date TEXT,                     -- ISO 8601 date
    start_time TEXT,                         -- Start time
    end_time TEXT,                           -- End time
    date_rdv TEXT,                           -- Legacy field
    heure_rdv TEXT,                          -- Legacy field
    
    -- Workflow
    template_id TEXT,                        -- Workflow template
    workflow_id TEXT,                        -- Active workflow
    workflow_status TEXT,                    -- Workflow progression
    current_workflow_step_id TEXT,           -- Current step
    
    -- Timing
    started_at INTEGER,                      -- Unix timestamp
    completed_at INTEGER,                    -- Unix timestamp
    estimated_duration INTEGER,              -- Minutes
    actual_duration INTEGER,                 -- Minutes
    
    -- Quality
    checklist_completed INTEGER DEFAULT 0,  -- Boolean flag
    
    -- Legacy/Additional
    lot_film TEXT,
    completed_steps TEXT,                    -- JSON array
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    external_id TEXT,
    notes TEXT,
    tags TEXT,                               -- JSON array
    
    -- Audit
    created_at INTEGER NOT NULL,             -- Unix timestamp
    updated_at INTEGER NOT NULL,             -- Unix timestamp
    
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (technician_id) REFERENCES users(id),
    FOREIGN KEY (current_workflow_step_id) REFERENCES intervention_steps(id)
);
```

#### 2. `clients` - Customer Information

```sql
CREATE TABLE clients (
    id TEXT PRIMARY KEY,                     -- UUID
    name TEXT NOT NULL,                      -- Client name
    email TEXT UNIQUE,                       -- Email address
    phone TEXT,                              -- Phone number
    address TEXT,                            -- Full address
    client_type TEXT NOT NULL DEFAULT 'individual', -- 'individual' | 'business'
    company_name TEXT,                       -- Business name
    tax_id TEXT,                             -- Tax ID for businesses
    website TEXT,                            -- Website URL
    notes TEXT,                              -- General notes
    tags TEXT,                               -- JSON array
    custom_fields TEXT,                      -- JSON object
    active INTEGER DEFAULT 1,                -- Boolean flag
    created_at INTEGER NOT NULL,             -- Unix timestamp
    updated_at INTEGER NOT NULL,             -- Unix timestamp
    
    -- Statistics (updated via triggers)
    total_tasks INTEGER DEFAULT 0,           -- Total tasks
    completed_tasks INTEGER DEFAULT 0,       -- Completed tasks
    last_task_date INTEGER,                 -- Last task date
    total_value REAL DEFAULT 0               -- Total value (currency)
);
```

#### 3. `users` - System Users

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,                     -- UUID
    email TEXT UNIQUE NOT NULL,              -- Email (login)
    password_hash TEXT NOT NULL,             -- Argon2 hash
    first_name TEXT NOT NULL,                -- First name
    last_name TEXT NOT NULL,                 -- Last name
    phone TEXT,                              -- Phone number
    role TEXT NOT NULL DEFAULT 'technician', -- User role
    avatar_url TEXT,                         -- Profile picture
    bio TEXT,                                -- Bio/description
    specialties TEXT,                        -- JSON array
    certifications TEXT,                     -- JSON array
    hourly_rate REAL,                        -- Hourly rate
    active INTEGER DEFAULT 1,                -- Boolean flag
    email_verified INTEGER DEFAULT 0,        -- Boolean flag
    phone_verified INTEGER DEFAULT 0,        -- Boolean flag
    last_login INTEGER,                      -- Last login timestamp
    login_count INTEGER DEFAULT 0,           -- Login count
    failed_login_attempts INTEGER DEFAULT 0,  -- Failed attempts
    locked_until INTEGER,                    -- Account lock until
    created_at INTEGER NOT NULL,             -- Unix timestamp
    updated_at INTEGER NOT NULL,             -- Unix timestamp
    
    -- 2FA fields
    two_factor_enabled INTEGER DEFAULT 0,   -- Boolean flag
    two_factor_secret TEXT,                  -- TOTP secret
    backup_codes TEXT                        -- JSON array of backup codes
);
```

#### 4. `user_sessions` - Authentication Sessions

```sql
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,                    -- Session ID (UUID)
    user_id TEXT NOT NULL,                   -- Foreign key to users
    token_hash TEXT NOT NULL,                -- JWT token hash
    created_at INTEGER NOT NULL,            -- Session creation
    expires_at INTEGER NOT NULL,             -- Session expiry
    last_accessed_at INTEGER,               -- Last activity
    ip_address TEXT,                        -- IP address
    user_agent TEXT,                         -- Browser/agent
    active INTEGER DEFAULT 1,               -- Boolean flag
    device_fingerprint TEXT,                -- Device identifier
    location TEXT,                           -- Geographic location
    updated_at INTEGER NOT NULL,             -- Unix timestamp
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 5. `interventions` - PPF Installation Executions

```sql
CREATE TABLE interventions (
    id TEXT PRIMARY KEY,                    -- UUID
    task_id TEXT NOT NULL,                  -- Related task
    technician_id TEXT NOT NULL,            -- Assigned technician
    status TEXT NOT NULL DEFAULT 'pending', -- Intervention status
    workflow_id TEXT,                       -- Workflow template
    started_at INTEGER,                     -- Start timestamp
    completed_at INTEGER,                  -- Completion timestamp
    paused_at INTEGER,                      -- Pause timestamp
    resumed_at INTEGER,                     -- Resume timestamp
    total_duration INTEGER,                 -- Total duration (minutes)
    final_notes TEXT,                       -- Completion notes
    quality_score INTEGER,                  -- Quality rating
    approved_by TEXT,                       -- Approver ID
    approved_at INTEGER,                    -- Approval timestamp
    weather_conditions TEXT,                -- Weather info
    temperature INTEGER,                    -- Temperature
    humidity INTEGER,                       -- Humidity percentage
    created_at INTEGER NOT NULL,            -- Unix timestamp
    updated_at INTEGER NOT NULL,            -- Unix timestamp
    
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (technician_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

#### 6. `intervention_steps` - Workflow Steps

```sql
CREATE TABLE intervention_steps (
    id TEXT PRIMARY KEY,                    -- UUID
    intervention_id TEXT NOT NULL,          -- Parent intervention
    step_template_id TEXT,                 -- Template reference
    step_order INTEGER NOT NULL,            -- Step order
    step_name TEXT NOT NULL,                -- Step name
    step_description TEXT,                  -- Step description
    status TEXT NOT NULL DEFAULT 'pending', -- Step status
    started_at INTEGER,                     -- Start timestamp
    completed_at INTEGER,                  -- Completion timestamp
    duration INTEGER,                       -- Duration (minutes)
    notes TEXT,                             -- Step notes
    location TEXT,                          -- Location where performed
    required_photos INTEGER DEFAULT 0,      -- Required photo count
    quality_passed INTEGER,                 -- Boolean flag
    quality_notes TEXT,                     -- Quality feedback
    completed_by TEXT,                      -- Who completed
    created_at INTEGER NOT NULL,            -- Unix timestamp
    updated_at INTEGER NOT NULL,            -- Unix timestamp
    
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES users(id)
);
```

#### 7. `photos` - Documentation Photos

```sql
CREATE TABLE photos (
    id TEXT PRIMARY KEY,                    -- UUID
    intervention_id TEXT,                   -- Related intervention
    step_id TEXT,                          -- Related step
    task_id TEXT,                          -- Related task
    user_id TEXT,                          -- Who uploaded
    file_path TEXT NOT NULL,               -- File path
    file_name TEXT NOT NULL,               -- Original filename
    file_size INTEGER NOT NULL,            -- File size in bytes
    mime_type TEXT NOT NULL,               -- MIME type
    width INTEGER,                         -- Image width
    height INTEGER,                        -- Image height
    thumbnail_path TEXT,                   -- Thumbnail path
    description TEXT,                      -- Photo description
    tags TEXT,                            -- JSON array of tags
    geolocation TEXT,                     -- GPS coordinates
    exif_data TEXT,                       -- EXIF metadata (JSON)
    uploaded_at INTEGER NOT NULL,          -- Upload timestamp
    created_at INTEGER NOT NULL,           -- Unix timestamp
    updated_at INTEGER NOT NULL,           -- Unix timestamp
    
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 8. `materials` - Inventory Materials

```sql
CREATE TABLE materials (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- Material name
    description TEXT,                        -- Description
    category TEXT NOT NULL,                 -- Category
    sku TEXT UNIQUE,                        -- Stock keeping unit
    barcode TEXT UNIQUE,                    -- Barcode
    supplier_id TEXT,                       -- Supplier reference
    unit TEXT NOT NULL,                     -- Unit of measure
    unit_cost REAL,                         -- Cost per unit
    selling_price REAL,                     -- Selling price
    current_stock REAL DEFAULT 0,           -- Current stock level
    min_stock_level REAL,                   -- Minimum stock alert
    max_stock_level REAL,                   -- Maximum stock level
    reorder_point REAL,                     -- Reorder point
    lead_time INTEGER,                      -- Reorder lead time (days)
    expiry_date INTEGER,                    -- Expiry timestamp
    batch_number TEXT,                      -- Batch/lot number
    manufacturer TEXT,                      -- Manufacturer
    model TEXT,                             -- Model number
    specifications TEXT,                     -- JSON specs
    hazardous INTEGER DEFAULT 0,            -- Boolean flag
    storage_requirements TEXT,              -- Storage instructions
    created_at INTEGER NOT NULL,            -- Unix timestamp
    updated_at INTEGER NOT NULL,            -- Unix timestamp
    active INTEGER DEFAULT 1,               -- Boolean flag
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

#### 9. `material_usage` - Material Consumption Tracking

```sql
CREATE TABLE material_usage (
    id TEXT PRIMARY KEY,                    -- UUID
    material_id TEXT NOT NULL,              -- Material reference
    intervention_id TEXT,                   -- Related intervention
    step_id TEXT,                          -- Related step
    task_id TEXT,                          -- Related task
    user_id TEXT,                          -- Who used it
    quantity_used REAL NOT NULL,            -- Quantity consumed
    waste_quantity REAL DEFAULT 0,           -- Waste quantity
    unit TEXT NOT NULL,                    -- Unit of measure
    cost_per_unit REAL,                     -- Cost at time of use
    total_cost REAL,                        -- Total cost
    notes TEXT,                            -- Usage notes
    timestamp INTEGER NOT NULL,             -- Usage timestamp
    created_at INTEGER NOT NULL,            -- Unix timestamp
    updated_at INTEGER NOT NULL,            -- Unix timestamp
    
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 10. `suppliers` - Material Suppliers

```sql
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- Supplier name
    contact_person TEXT,                    -- Contact person
    email TEXT,                            -- Email
    phone TEXT,                            -- Phone
    address TEXT,                          -- Address
    website TEXT,                          -- Website
    tax_id TEXT,                           -- Tax ID
    payment_terms TEXT,                    -- Payment terms
    delivery_terms TEXT,                   -- Delivery terms
    notes TEXT,                            -- Notes
    rating INTEGER,                        -- Supplier rating (1-5)
    active INTEGER DEFAULT 1,              -- Boolean flag
    created_at INTEGER NOT NULL,           -- Unix timestamp
    updated_at INTEGER NOT NULL,           -- Unix timestamp
);
```

#### 11. `calendar_events` - Calendar Events

```sql
CREATE TABLE calendar_events (
    id TEXT PRIMARY KEY,                    -- UUID
    title TEXT NOT NULL,                    -- Event title
    description TEXT,                       -- Event description
    start_time INTEGER NOT NULL,            -- Start timestamp
    end_time INTEGER NOT NULL,              -- End timestamp
    all_day INTEGER DEFAULT 0,              -- Boolean flag
    event_type TEXT NOT NULL,              -- Type: 'task', 'appointment', 'unavailable'
    user_id TEXT,                          -- Related user
    task_id TEXT,                          -- Related task
    location TEXT,                         -- Location
    color TEXT,                            -- Color code
    reminder INTEGER,                      -- Reminder minutes before
    recurrence_rule TEXT,                  -- Recurrence rule
    attendee_ids TEXT,                     -- JSON array of attendee IDs
    external_id TEXT,                      -- External calendar ID
    created_by TEXT NOT NULL,              -- Who created
    created_at INTEGER NOT NULL,           -- Unix timestamp
    updated_at INTEGER NOT NULL,           -- Unix timestamp
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### 12. `notifications` - User Notifications

```sql
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,                    -- UUID
    user_id TEXT NOT NULL,                  -- Recipient
    title TEXT NOT NULL,                    -- Notification title
    message TEXT NOT NULL,                  -- Message content
    type TEXT NOT NULL,                     -- Type: 'info', 'warning', 'error', 'success'
    category TEXT,                         -- Category: 'task', 'system', 'inventory'
    read_at INTEGER,                        -- Read timestamp
    data TEXT,                             -- JSON additional data
    action_url TEXT,                       -- Action URL
    priority INTEGER DEFAULT 0,             -- Priority level
    expires_at INTEGER,                     -- Expiry timestamp
    created_at INTEGER NOT NULL,           -- Unix timestamp
    updated_at INTEGER NOT NULL,           -- Unix timestamp
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 13. `audit_logs` - System Audit Trail

```sql
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,                    -- UUID
    user_id TEXT,                          -- Who performed action
    action TEXT NOT NULL,                  -- Action performed
    entity_type TEXT NOT NULL,             -- Entity type: 'task', 'user', etc.
    entity_id TEXT NOT NULL,               -- Entity ID
    old_values TEXT,                       -- Old values (JSON)
    new_values TEXT,                       -- New values (JSON)
    ip_address TEXT,                       -- IP address
    user_agent TEXT,                        -- User agent
    timestamp INTEGER NOT NULL,            -- Action timestamp
    session_id TEXT,                       -- Session ID
    severity TEXT DEFAULT 'info',          -- Severity: 'info', 'warning', 'error'
    notes TEXT,                            -- Additional notes
    created_at INTEGER NOT NULL,           -- Unix timestamp
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 14. `settings` - System Settings

```sql
CREATE TABLE settings (
    id TEXT PRIMARY KEY,                    -- UUID
    key TEXT UNIQUE NOT NULL,              -- Setting key
    value TEXT NOT NULL,                   -- Setting value
    description TEXT,                       -- Description
    category TEXT NOT NULL,                -- Category: 'general', 'security', etc.
    data_type TEXT DEFAULT 'string',       -- Data type: 'string', 'number', 'boolean', 'json'
    editable INTEGER DEFAULT 1,             -- Boolean flag
    requires_restart INTEGER DEFAULT 0,    -- Boolean flag
    user_id TEXT,                          -- User-specific setting
    created_at INTEGER NOT NULL,           -- Unix timestamp
    updated_at INTEGER NOT NULL,           -- Unix timestamp
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 15. `messages` - Internal Messaging

```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,                    -- UUID
    from_user_id TEXT NOT NULL,             -- Sender
    to_user_id TEXT NOT NULL,               -- Recipient
    subject TEXT NOT NULL,                  -- Subject
    body TEXT NOT NULL,                     -- Message body
    message_type TEXT DEFAULT 'message',    -- Type: 'message', 'notification', 'alert'
    priority INTEGER DEFAULT 0,             -- Priority
    read_at INTEGER,                        -- Read timestamp
    replied_to TEXT,                        -- Reply to message ID
    thread_id TEXT,                         -- Thread identifier
    attachments TEXT,                       -- JSON array of attachments
    created_at INTEGER NOT NULL,           -- Unix timestamp
    updated_at INTEGER NOT NULL,           -- Unix timestamp
    
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id),
    FOREIGN KEY (replied_to) REFERENCES messages(id)
);
```

### Support Tables

#### Schema Migrations Tracking

```sql
CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,               -- Migration version
    applied_at INTEGER NOT NULL            -- Application timestamp
);
```

#### Cache Metadata

```sql
CREATE TABLE cache_metadata (
    key TEXT PRIMARY KEY,                  -- Cache key
    value TEXT NOT NULL,                   -- Cached value
    expires_at INTEGER,                    -- Expiry timestamp
    created_at INTEGER NOT NULL,           -- Creation timestamp
    updated_at INTEGER NOT NULL            -- Update timestamp
);
```

## Indexes

### Performance Indexes

```sql
-- Task indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_technician ON tasks(technician_id);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_date);
CREATE INDEX idx_tasks_created ON tasks(created_at);
CREATE INDEX idx_tasks_status_technician ON tasks(status, technician_id);

-- Intervention indexes
CREATE INDEX idx_interventions_task ON interventions(task_id);
CREATE INDEX idx_interventions_technician ON interventions(technician_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_dates ON interventions(started_at, completed_at);

-- Step indexes
CREATE INDEX idx_intervention_steps_intervention ON intervention_steps(intervention_id);
CREATE INDEX idx_intervention_steps_status ON intervention_steps(status);
CREATE INDEX idx_intervention_steps_order ON intervention_steps(intervention_id, step_order);

-- Photo indexes
CREATE INDEX idx_photos_intervention ON photos(intervention_id);
CREATE INDEX idx_photos_step ON photos(step_id);
CREATE INDEX idx_photos_task ON photos(task_id);
CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_photos_uploaded ON photos(uploaded_at);

-- Material indexes
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_supplier ON materials(supplier_id);
CREATE INDEX idx_materials_stock ON materials(current_stock);
CREATE INDEX idx_materials_expiry ON materials(expiry_date);

-- Usage indexes
CREATE INDEX idx_material_usage_material ON material_usage(material_id);
CREATE INDEX idx_material_usage_intervention ON material_usage(intervention_id);
CREATE INDEX idx_material_usage_timestamp ON material_usage(timestamp);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Session indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(active);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Calendar indexes
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### Full-Text Search Indexes

```sql
-- Task search
CREATE VIRTUAL TABLE tasks_fts USING fts5(
    title, description, notes, tags,
    content='tasks',
    content_rowid='rowid'
);

-- Client search
CREATE VIRTUAL TABLE clients_fts USING fts5(
    name, email, phone, address, notes,
    content='clients',
    content_rowid='rowid'
);

-- Material search
CREATE VIRTUAL TABLE materials_fts USING fts5(
    name, description, category, sku,
    content='materials',
    content_rowid='rowid'
);
```

## Database Triggers

### Client Statistics Triggers

```sql
-- Update client statistics when tasks are added/modified
CREATE TRIGGER update_client_stats_on_task_insert
AFTER INSERT ON tasks
FOR EACH ROW
WHEN NEW.client_id IS NOT NULL
BEGIN
    UPDATE clients SET
        total_tasks = total_tasks + 1,
        updated_at = strftime('%s', 'now')
    WHERE id = NEW.client_id;
END;

CREATE TRIGGER update_client_stats_on_task_status_change
AFTER UPDATE OF status ON tasks
FOR EACH ROW
WHEN NEW.client_id IS NOT NULL AND OLD.status != NEW.status
BEGIN
    UPDATE clients SET
        completed_tasks = CASE 
            WHEN NEW.status = 'completed' THEN completed_tasks + 1
            WHEN OLD.status = 'completed' AND NEW.status != 'completed' THEN completed_tasks - 1
            ELSE completed_tasks
        END,
        last_task_date = CASE 
            WHEN NEW.status = 'completed' THEN strftime('%s', 'now')
            ELSE last_task_date
        END,
        updated_at = strftime('%s', 'now')
    WHERE id = NEW.client_id;
END;
```

### Audit Trail Triggers

```sql
-- Task audit logging
CREATE TRIGGER audit_task_insert
AFTER INSERT ON tasks
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        id, entity_type, entity_id, action, new_values, 
        timestamp, created_at
    ) VALUES (
        hex(randomblob(16)), 'task', NEW.id, 'INSERT', 
        json_object('task_number', NEW.task_number, 'title', NEW.title),
        strftime('%s', 'now'), strftime('%s', 'now')
    );
END;

CREATE TRIGGER audit_task_update
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN OLD.status != NEW.status OR OLD.technician_id != NEW.technician_id
BEGIN
    INSERT INTO audit_logs (
        id, entity_type, entity_id, action, old_values, new_values,
        timestamp, created_at
    ) VALUES (
        hex(randomblob(16)), 'task', NEW.id, 'UPDATE',
        json_object('status', OLD.status, 'technician_id', OLD.technician_id),
        json_object('status', NEW.status, 'technician_id', NEW.technician_id),
        strftime('%s', 'now'), strftime('%s', 'now')
    );
END;
```

### Material Stock Triggers

```sql
-- Update material stock when usage is recorded
CREATE TRIGGER update_material_stock_on_usage
AFTER INSERT ON material_usage
FOR EACH ROW
BEGIN
    UPDATE materials SET
        current_stock = current_stock - NEW.quantity_used,
        updated_at = strftime('%s', 'now')
    WHERE id = NEW.material_id;
END;
```

## Data Integrity Constraints

### Check Constraints

```sql
-- Task constraints
ALTER TABLE tasks ADD CONSTRAINT check_priority 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE tasks ADD CONSTRAINT check_status 
    CHECK (status IN ('draft', 'assigned', 'in_progress', 'completed', 'cancelled', 'archived', 'failed', 'overdue', 'paused'));

-- Intervention constraints
ALTER TABLE interventions ADD CONSTRAINT check_intervention_status 
    CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled', 'failed'));

-- Material constraints
ALTER TABLE materials ADD CONSTRAINT check_positive_stock 
    CHECK (current_stock >= 0);

ALTER TABLE materials ADD CONSTRAINT check_positive_values 
    CHECK (unit_cost >= 0 AND selling_price >= 0);

-- User constraints
ALTER TABLE users ADD CONSTRAINT check_role 
    CHECK (role IN ('admin', 'supervisor', 'technician', 'viewer'));

-- Rating constraints
ALTER TABLE suppliers ADD CONSTRAINT check_rating 
    CHECK (rating BETWEEN 1 AND 5);
```

### Unique Constraints

```sql
-- Task number uniqueness
CREATE UNIQUE INDEX idx_tasks_task_number ON tasks(task_number);

-- User email uniqueness
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Client email uniqueness (optional)
CREATE UNIQUE INDEX idx_clients_email ON clients(email) WHERE email IS NOT NULL;

-- Material SKU uniqueness
CREATE UNIQUE INDEX idx_materials_sku ON materials(sku) WHERE sku IS NOT NULL;
```

## Database Operations

### Connection Management

The application uses a connection pool with the following configuration:
- **Max Connections**: 10
- **Min Connections**: 2
- **Connection Timeout**: 30 seconds
- **Idle Timeout**: 10 minutes

### Transaction Management

- **Default Mode**: DEFERRED
- **WAL Mode**: Enabled for concurrent reads
- **Foreign Keys**: Enabled
- **Recursive Triggers**: Enabled

### Backup Strategy

1. **Automated Backups**: Daily at 2 AM
2. **Incremental Backups**: Every 4 hours
3. **Manual Backup**: On-demand via UI
4. **Backup Verification**: Checksum verification

### Performance Optimization

1. **Query Optimization**
   - Use EXPLAIN QUERY PLAN for complex queries
   - Implement pagination for large datasets
   - Use prepared statements for repeated queries

2. **Index Optimization**
   - Regular index analysis
   - Remove unused indexes
   - Consider composite indexes for frequent query patterns

3. **VACUUM and ANALYZE**
   - Weekly VACUUM to reclaim space
   - ANALYZE after bulk data operations

## Migration Examples

### Adding a New Column

```sql
-- Migration: 031_add_task_priority_created.sql
ALTER TABLE tasks ADD COLUMN priority_created_at INTEGER;
ALTER TABLE tasks ADD COLUMN priority_created_by TEXT;

-- Update existing records if needed
UPDATE tasks SET priority_created_at = created_at 
WHERE priority_created_at IS NULL;

-- Create index for the new column
CREATE INDEX idx_tasks_priority_created ON tasks(priority_created_at);
```

### Creating a New Table

```sql
-- Migration: 032_create_task_history.sql
CREATE TABLE task_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT NOT NULL,
    changed_at INTEGER NOT NULL,
    reason TEXT,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_task_history_task ON task_history(task_id);
CREATE INDEX idx_task_history_field ON task_history(field_name);
CREATE INDEX idx_task_history_changed_at ON task_history(changed_at);
```

### Data Migration

```sql
-- Migration: 033_migrate_ppf_zones_format.sql
-- Migrate from string to JSON array format
UPDATE tasks 
SET ppf_zones = json_array(ppf_zones)
WHERE json_valid(ppf_zones) = 0 AND ppf_zones IS NOT NULL AND ppf_zones != '';

-- Validate the migration
SELECT COUNT(*) as invalid_zones 
FROM tasks 
WHERE json_valid(ppf_zones) = 0 AND ppf_zones IS NOT NULL;
```

## Testing Database Operations

### Unit Test Database Setup

```rust
// In tests
let conn = Connection::open_in_memory().unwrap();
let migrations = migrations::runner();
migrations.run(&conn).unwrap();
```

### Test Data Fixtures

```sql
-- Test client
INSERT INTO clients (id, name, email) VALUES 
('test-client-1', 'Test Client', 'test@example.com');

-- Test user
INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES 
('test-user-1', 'technician@example.com', 'hashed_password', 'Test', 'Technician', 'technician');

-- Test task
INSERT INTO tasks (id, task_number, title, client_id, technician_id, status, created_at, updated_at) VALUES 
('test-task-1', 'T-20260211-001', 'Test PPF Installation', 'test-client-1', 'test-user-1', 'draft', strftime('%s', 'now'), strftime('%s', 'now'));
```

## Troubleshooting

### Common Issues

1. **Database Locked**
   - Ensure WAL mode is enabled
   - Check for long-running transactions
   - Verify connection pool configuration

2. **Migration Failures**
   - Check migration syntax
   - Verify table dependencies
   - Test rollback scenarios

3. **Performance Issues**
   - Analyze with EXPLAIN QUERY PLAN
   - Check missing indexes
   - Monitor connection pool usage

### Debug Queries

```sql
-- Show table info
PRAGMA table_info(tasks);

-- Show indexes
PRAGMA index_list(tasks);

-- Show foreign keys
PRAGMA foreign_key_list(tasks);

-- Analyze query plan
EXPLAIN QUERY PLAN SELECT * FROM tasks WHERE status = 'in_progress' AND technician_id = 'user-123';
```

---

**Version**: 2.0.0  
**Last Updated**: 2026-02-11  
**Maintained by**: RPMA Development Team