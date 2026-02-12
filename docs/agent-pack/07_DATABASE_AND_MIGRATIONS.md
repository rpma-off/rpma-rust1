# 07 - Database and Migrations

## SQLite Setup

RPMA v2 uses **SQLite** as its local database with specific optimizations for desktop application use.

### Database Configuration

**File Location**: `<app_data_dir>/rpma.db`

**Connection Pool**:
- **Pool Manager**: r2d2
- **Default connections**: 8-16 (configurable via `PoolConfig`)
- **Min idle**: 2
- **Connection timeout**: 5 seconds

**SQLite Mode**: **WAL (Write-Ahead Logging)**

```sql
PRAGMA journal_mode = WAL;
```

**Benefits of WAL Mode**:
- **Concurrent reads** while writing
- **Better performance** for writes
- **Crash recovery** via checkpoint
- **Reduced lock contention**

**Other PRAGMA Settings**:
```sql
PRAGMA foreign_keys = ON;        -- Enforce foreign key constraints
PRAGMA synchronous = NORMAL;     -- Good balance of safety and performance
PRAGMA cache_size = 10000;       -- 10MB cache (default is -2000 = 2MB)
PRAGMA temp_store = MEMORY;      -- Store temp tables in memory
PRAGMA mmap_size = 30000000000;  -- Memory-mapped I/O (30GB limit)
```

**Code Path**: `src-tauri/src/db/connection.rs::initialize_pool`

---

## Migration System

### Overview

RPMA uses a **hybrid migration system** with:
- **SQL migration files** in `migrations/` directory (embedded via `include_dir!`)
- **Rust-implemented migrations** in `src-tauri/src/db/migrations.rs` for complex schema transformations

The system:
- Tracks applied migrations in `schema_version` table
- Applies migrations in **sequential order** based on version number
- **Idempotent**: Safe to run multiple times (uses `CREATE IF NOT EXISTS`, column existence checks)
- **Validation**: Checks migration integrity before applying

**Current Version**: 33+ migrations

---

### Migration Types

#### SQL-Only Migrations
Located in `migrations/` directory, applied via `apply_sql_migration()`:
- `003` - `007`: Schema additions
- `010`, `013` - `015`, `019`, `021` - `023`: Feature additions
- `020_calendar_enhancements.sql`: Calendar indexes and task_conflicts table
- `025_audit_logging.sql`, `026_performance_indexes.sql`
- `029_add_users_first_last_name.sql`, `030_add_user_sessions_updated_at.sql`

#### Rust-Implemented Migrations
Complex migrations requiring logic beyond SQL, implemented in `migrations.rs`:

| Version | Description |
|---------|-------------|
| 002 | Rename `ppf_zone` to `ppf_zones` column (table rebuild) |
| 006 | Add location columns to `intervention_steps` |
| 008 | Add workflow triggers for task/intervention sync |
| 009 | Add `task_number` column to interventions |
| 11 | Add `task_id` FK to interventions (table rebuild) |
| 12 | Add unique constraint for active interventions per task |
| 16 | Add task assignment validation indexes |
| 17 | Add `cache_metadata` table |
| 18 | Add `settings_audit_log` table |
| 24 | Enhanced inventory: `material_categories`, `inventory_transactions` |
| 25 | Add `audit_events` table for security audit trail |
| 26 | Add performance optimization indexes |
| 27 | Add CHECK constraints to tasks table (table rebuild) |
| 28 | Add 2FA columns: `backup_codes`, `verified_at` |
| 29 | Add `first_name`, `last_name` columns to users |
| 30 | Add `updated_at` column to user_sessions |
| 31 | Add non-negative CHECK constraints to inventory tables |
| 32 | Add FK for `interventions.task_id -> tasks(id)` |
| 33 | Add FKs for `tasks.workflow_id` and `tasks.current_workflow_step_id` |

---

### Migration File Structure

**Location**: `migrations/`

**Naming Convention**: `NNN_description.sql`
- `NNN`: Zero-padded sequential number (e.g., `002`, `024`, `100`)
- `description`: Short snake_case description (e.g., `add_task_constraints`)

**Example**:
```
020_calendar_enhancements.sql
025_audit_logging.sql
026_performance_indexes.sql
029_add_users_first_last_name.sql
```

---

### Migration File Format

**Basic Structure**:
```sql
-- Migration NNN: Brief description
-- Purpose: What this migration does

-- Create or modify tables
CREATE TABLE IF NOT EXISTS new_table (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);

-- Insert seed data (if needed)
INSERT OR IGNORE INTO new_table (id, name) VALUES ('seed-1', 'Default Entry');
```

**Best Practices**:
1. **Use `IF NOT EXISTS`** for CREATE statements (idempotency)
2. **Use `ALTER TABLE ADD COLUMN IF NOT EXISTS`** for schema changes (SQLite 3.35+)
   - Fallback: Check if column exists before adding
3. **Comment your migrations** to explain the purpose
4. **Group related changes** in a single migration
5. **Test both up and down** (though SQLite doesn't support rollback migrations easily)

---

### Example Migration: Adding a New Column

**File**: `migrations/030_add_task_priority_score.sql`

```sql
-- Migration 030: Add priority score to tasks
-- This allows weighted sorting of tasks by computed priority

-- Add new column (SQLite 3.35+ syntax)
ALTER TABLE tasks ADD COLUMN priority_score INTEGER DEFAULT 0;

-- Populate initial values based on existing priority
UPDATE tasks SET priority_score = CASE
    WHEN priority = 'urgent' THEN 100
    WHEN priority = 'high' THEN 75
    WHEN priority = 'medium' THEN 50
    WHEN priority = 'low' THEN 25
    ELSE 0
END;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_tasks_priority_score ON tasks(priority_score DESC);
```

---

### Example Migration: Creating a New Table

**File**: `migrations/031_add_task_templates.sql`

```sql
-- Migration 031: Add task templates
-- Allows users to create reusable task templates

CREATE TABLE IF NOT EXISTS task_templates (
    -- Identifiers
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Template data (JSON)
    template_data TEXT NOT NULL, -- JSON with default values

    -- Metadata
    is_active INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,

    -- Audit
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    created_by TEXT,

    -- Foreign Keys
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON task_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_task_templates_name ON task_templates(name);
```

---

### Example Migration: Data Migration

**File**: `migrations/032_migrate_vehicle_data.sql`

```sql
-- Migration 032: Normalize vehicle data
-- Extracts vehicle information into separate table

-- Create new vehicle table
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY NOT NULL,
    plate TEXT UNIQUE NOT NULL,
    make TEXT,
    model TEXT,
    year TEXT,
    vin TEXT UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Migrate existing vehicle data from tasks
INSERT OR IGNORE INTO vehicles (id, plate, make, model, year, vin, created_at)
SELECT 
    lower(hex(randomblob(16))) AS id,  -- Generate UUID
    vehicle_plate,
    vehicle_make,
    vehicle_model,
    vehicle_year,
    vin,
    created_at
FROM tasks
WHERE vehicle_plate IS NOT NULL
GROUP BY vehicle_plate;  -- Deduplicate

-- Update tasks to reference vehicles
ALTER TABLE tasks ADD COLUMN vehicle_id TEXT REFERENCES vehicles(id);

UPDATE tasks SET vehicle_id = (
    SELECT id FROM vehicles WHERE vehicles.plate = tasks.vehicle_plate
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle ON tasks(vehicle_id);
```

---

## How Migrations Are Discovered and Applied

### Migration Discovery

**Code Path**: `src-tauri/src/db/migrations.rs`

```rust
impl Database {
    pub fn get_latest_migration_version() -> i32 {
        let mut max_version = 0;

        for file in MIGRATIONS_DIR.files() {
            if let Some(name) = file.path().file_name().and_then(|n| n.to_str()) {
                // Try to parse version from filename (e.g., "025_add_analytics.sql")
                if let Some(version_part) = name.split('_').next() {
                    if let Ok(version) = version_part.parse::<i32>() {
                        if version > max_version {
                            max_version = version;
                        }
                    }
                }
            }
        }

        // Ensure we at least cover the hardcoded Rust migrations (up to 33)
        if max_version < 33 {
            max_version = 33;
        }

        max_version
    }
}
```

---

### Schema Version Tracking

**Table**: `schema_version`

```sql
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

**Current Version Query**:
```rust
pub fn get_version(&self) -> DbResult<i32> {
    let conn = self.get_connection()?;

    // Create version table if not exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (
             version INTEGER PRIMARY KEY,
             applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
         )",
        [],
    ).map_err(|e| e.to_string())?;

    let version: Result<i32, _> = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string());

    Ok(version.unwrap_or(0))
}
```

---

### Migration Application

**Code Path**: `src-tauri/src/db/migrations.rs::migrate`

```rust
impl Database {
    pub fn migrate(&self, target_version: i32) -> DbResult<()> {
        let current_version = self.get_version()?;

        if current_version >= target_version {
            return Ok(());
        }

        // Apply migrations sequentially
        for version in (current_version + 1)..=target_version {
            self.apply_migration(version)?;
        }

        Ok(())
    }
}
```

**Transaction Guarantees**:
- Each migration runs in its own transaction
- If a migration fails, it is rolled back and the process stops
- Future runs will retry the failed migration

---

## How to Add a Migration Safely

### Step 1: Determine Next Migration Number

```bash
ls migrations/*.sql | sort | tail -1
# Output: 030_add_user_sessions_updated_at.sql
# Next number: 031
```

---

### Step 2: Create Migration File or Rust Implementation

**Option A: SQL-only migration**
```bash
touch migrations/031_add_task_templates.sql
```

**Option B: Rust-implemented migration** (for complex logic)
Add a new `apply_migration_NN` function in `src-tauri/src/db/migrations.rs` and update the match statement in `apply_migration()`.

---

### Step 3: Write Migration SQL

```sql
-- Migration 031: Add task templates
-- Allows users to save and reuse task configurations

CREATE TABLE IF NOT EXISTS task_templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_data TEXT NOT NULL,  -- JSON
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_templates_active ON task_templates(is_active);
```

---

### Step 4: Test Migration Locally

**Option A: Run application** (migrations apply on startup):
```bash
npm run dev
```

**Option B: Test migration script**:
```bash
node scripts/test-migrations.js 031
```

**Check Logs**:
```
[INFO] Applying migration 031: 031_add_task_templates.sql
[INFO] Migration 031 applied successfully
[INFO] Current schema version: 031
```

---

### Step 5: Validate Migration System

```bash
node scripts/validate-migration-system.js
```

**Checks**:
- All migration files are numbered sequentially
- No duplicate migration numbers
- All migrations are idempotent (can run multiple times safely)
- Foreign key constraints are valid
- Syntax is correct

**Example Output**:
```
Migration file numbering is sequential
All migrations use CREATE IF NOT EXISTS
Foreign key references are valid
No syntax errors detected
```

---

## Testing Migrations

### Approach 1: In-Memory Database

```rust
#[tokio::test]
async fn test_migration_031() {
    let db = Database::new_in_memory().await.unwrap();
    
    // Apply migration
    let result = db.migrate(31);
    assert!(result.is_ok());
    
    // Verify schema
    let conn = db.get_connection().unwrap();
    let table_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='task_templates')",
        [],
        |row| row.get(0),
    ).unwrap();
    
    assert!(table_exists);
}
```

---

### Approach 2: Test Script

**Script**: `scripts/test-migrations.js`

```bash
node scripts/test-migrations.js
```

**What it does**:
1. Creates a test database
2. Applies all migrations
3. Validates schema
4. Runs smoke tests (insert/query data)
5. Deletes test database

---

## Troubleshooting: Common Migration Failures

### Error: "Table already exists"

**Cause**: Migration wasn't idempotent

**Fix**: Use `CREATE TABLE IF NOT EXISTS`
```sql
-- BAD
CREATE TABLE new_table (...);

-- GOOD
CREATE TABLE IF NOT EXISTS new_table (...);
```

---

### Error: "Foreign key constraint failed"

**Cause**: Referenced table or column doesn't exist

**Fix 1**: Ensure migrations are applied in correct order
**Fix 2**: Check foreign key references:
```sql
-- Verify parent table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='users';

-- Check foreign key constraints
PRAGMA foreign_key_list(tasks);
```

---

### Error: "Duplicate column name"

**Cause**: Adding a column that already exists

**Fix**: Check if column exists before adding:
```sql
-- SQLite 3.35+ (built-in check)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Older SQLite (manual check)
-- Skip if column exists (handled by migration logic)
```

---

### Error: "Migration 025 failed, schema version is still 024"

**Cause**: Migration SQL has syntax error or constraint violation

**Fix**:
1. Read error message carefully
2. Fix SQL in migration file
3. **Drop test database** (if local testing)
4. Re-run migration

```bash
# Reset local database (CAUTION: deletes all data)
rm <app_data_dir>/rpma.db
npm run dev  # Migrations re-apply from scratch
```

---

## Migration Scripts Reference

### 1. Validate Migration System

**Script**: `scripts/validate-migration-system.js`

**Usage**: `node scripts/validate-migration-system.js`

**Checks**:
- Sequential numbering
- Idempotency (use of IF NOT EXISTS)
- Foreign key validity
- SQL syntax

---

### 2. Migration Health Check

**Script**: `scripts/migration-health-check.js`

**Usage**: `node scripts/migration-health-check.js`

**Checks**:
- Current schema version
- Pending migrations
- Database integrity (`PRAGMA integrity_check`)
- Table counts

---

### 3. Test Migrations

**Script**: `scripts/test-migrations.js`

**Usage**: `node scripts/test-migrations.js [migration_number]`

**Example**:
```bash
node scripts/test-migrations.js 031
```

---

## Database Schema Documentation

For a complete reference of all tables, columns, and relationships, see:
- **Domain Model**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
- **Codebase**: `src-tauri/src/models/*.rs` (model definitions)
- **Schema SQL**: `src-tauri/src/db/schema.sql`

---

## Database Schema Overview

### Tables by Domain

#### User Management
| Table | Description |
|-------|-------------|
| `users` | System users with roles and authentication |
| `user_sessions` | Active login sessions |
| `user_settings` | User preferences and settings |
| `user_consent` | GDPR consent tracking |

#### Task Management
| Table | Description |
|-------|-------------|
| `tasks` | Work orders and task management |
| `task_history` | Task status transition audit |
| `task_conflicts` | Scheduling conflict detection |

#### Intervention/Workflow
| Table | Description |
|-------|-------------|
| `interventions` | PPF installation records |
| `intervention_steps` | Workflow step execution |
| `photos` | Captured images with EXIF/GPS |

#### Client Management
| Table | Description |
|-------|-------------|
| `clients` | Customer records |
| `client_statistics` *(view)* | Aggregated client task counts |

#### Inventory/Materials
| Table | Description |
|-------|-------------|
| `suppliers` | Material supplier master data |
| `materials` | Inventory items |
| `material_categories` | Material categorization hierarchy |
| `material_consumption` | Material usage per intervention |
| `inventory_transactions` | Stock movements (in/out/adjustments) |

#### Calendar/Scheduling
| Table | Description |
|-------|-------------|
| `calendar_events` | Calendar events and appointments |
| `calendar_tasks` *(view)* | Tasks with scheduled dates |

#### Messaging/Notifications
| Table | Description |
|-------|-------------|
| `messages` | Outgoing/in-app messages |
| `message_templates` | Reusable message templates |
| `notification_preferences` | User notification settings |

#### Settings/Audit
| Table | Description |
|-------|-------------|
| `settings_audit_log` | Settings change audit |
| `audit_events` | Security audit trail |
| `audit_logs` | General audit logging |

#### Sync/Caching
| Table | Description |
|-------|-------------|
| `sync_queue` | Pending sync operations |
| `cache_metadata` | Cache key-value store |
| `cache_statistics` | Cache performance metrics |

---

### Views

| View | Description |
|------|-------------|
| `client_statistics` | Aggregated client task counts (total, active, completed) |
| `calendar_tasks` | Tasks with scheduled dates joined with technician/client names |
| `clients_fts` | Full-text search index for clients |

---

### Key Tables (Detailed)

#### Core Tables
- `users` - User accounts with RBAC roles (admin, technician, supervisor, viewer)
- `user_sessions` - JWT session management with expiration
- `clients` - Customer records with FTS support
- `tasks` - Work orders with status workflow, soft delete
- `task_history` - Audit trail of status changes
- `task_conflicts` - Detected scheduling conflicts

#### Intervention Tables
- `interventions` - PPF work records linked to tasks
- `intervention_steps` - Step-by-step workflow execution
- `photos` - Photo capture with EXIF, GPS, quality scores

#### Inventory Tables
- `suppliers` - Supplier master data with ratings
- `materials` - Inventory with stock tracking, CHECK constraints
- `material_categories` - Hierarchical categorization
- `material_consumption` - Usage tracking per intervention
- `inventory_transactions` - Stock movement audit trail

#### Settings/Preferences
- `user_settings` - Comprehensive user preferences
- `settings_audit_log` - Settings change history
- `user_consent` - GDPR consent
- `notification_preferences` - Notification settings

#### Messaging
- `messages` - Email/SMS/in-app messages
- `message_templates` - Reusable templates

#### Scheduling
- `calendar_events` - Calendar events with recurrence support

#### Sync/Cache
- `sync_queue` - Offline sync queue with retry logic
- `cache_metadata` - Key-value cache with TTL
- `cache_statistics` - Cache hit/miss metrics

#### Audit
- `audit_events` - Comprehensive security audit trail
- `audit_logs` - General audit logging

---

## Next Steps

- **Dev workflows**: [08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)
- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
- **Domain model**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
