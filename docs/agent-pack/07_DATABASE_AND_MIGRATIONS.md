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
- ✅ **Concurrent reads** while writing
- ✅ **Better performance** for writes
- ✅ **Crash recovery** via checkpoint
- ✅ **Reduced lock contention**

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

RPMA uses a **custom migration system** that:
- ✅ Tracks applied migrations in `schema_version` table
- ✅ Applies migrations in **sequential order** based on filename numbering
- ✅ **Idempotent**: Safe to run multiple times (uses `CREATE IF NOT EXISTS`, `ALTER IF NOT EXISTS`)
- ✅ **Validation**: Checks migration integrity before applying

---

### Migration File Structure

**Location**: `src-tauri/migrations/`

**Naming Convention**: `NNN_description.sql`
- `NNN`: Zero-padded sequential number (e.g., `002`, `024`, `100`)
- `description`: Short snake_case description (e.g., `add_task_constraints`)

**Example**:
```
002_rename_ppf_zone.sql
003_add_client_stats_triggers.sql
024_add_inventory_management.sql
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
    pub fn discover_migrations(&self) -> DbResult<Vec<Migration>> {
        let migration_dir = Path::new("migrations/");
        let mut migrations = Vec::new();

        for entry in fs::read_dir(migration_dir)? {
            let path = entry?.path();
            if path.extension().and_then(|s| s.to_str()) == Some("sql") {
                let filename = path.file_name().unwrap().to_str().unwrap();
                let version = parse_version_from_filename(filename)?;
                let sql = fs::read_to_string(&path)?;
                
                migrations.push(Migration {
                    version,
                    name: filename.to_string(),
                    sql,
                });
            }
        }

        // Sort by version number
        migrations.sort_by_key(|m| m.version);
        Ok(migrations)
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
pub fn get_version(&self) -> DbResult<i64> {
    let conn = self.get_connection()?;
    let version: Option<i64> = conn
        .query_row(
            "SELECT MAX(version) FROM schema_version",
            [],
            |row| row.get(0)
        )
        .optional()?;
    Ok(version.unwrap_or(0))
}
```

---

### Migration Application

**Code Path**: `src-tauri/src/db/migrations.rs::migrate`

```rust
impl Database {
    pub fn migrate(&self, target_version: i64) -> DbResult<()> {
        let current_version = self.get_version()?;
        let migrations = self.discover_migrations()?;

        // Filter out already-applied migrations
        let pending: Vec<_> = migrations
            .into_iter()
            .filter(|m| m.version > current_version && m.version <= target_version)
            .collect();

        if pending.is_empty() {
            info!("No pending migrations");
            return Ok(());
        }

        // Apply each migration in a transaction
        for migration in pending {
            info!("Applying migration {}: {}", migration.version, migration.name);
            
            self.with_transaction(|tx| {
                // Execute migration SQL
                tx.execute_batch(&migration.sql)?;
                
                // Record migration as applied
                tx.execute(
                    "INSERT INTO schema_version (version) VALUES (?)",
                    params![migration.version],
                )?;
                
                Ok(())
            })?;
            
            info!("Migration {} applied successfully", migration.version);
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
ls src-tauri/migrations/*.sql | sort | tail -1
# Output: 028_add_two_factor_user_columns.sql
# Next number: 029
```

---

### Step 2: Create Migration File

```bash
# Create file
touch src-tauri/migrations/029_add_task_templates.sql
```

---

### Step 3: Write Migration SQL

```sql
-- Migration 029: Add task templates
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
node scripts/test-migrations.js 029
```

**Check Logs**:
```
[INFO] Applying migration 029: 029_add_task_templates.sql
[INFO] Migration 029 applied successfully
[INFO] Current schema version: 029
```

---

### Step 5: Validate Migration System

```bash
node scripts/validate-migration-system.js
```

**Checks**:
- ✅ All migration files are numbered sequentially
- ✅ No duplicate migration numbers
- ✅ All migrations are idempotent (can run multiple times safely)
- ✅ Foreign key constraints are valid
- ✅ Syntax is correct

**Example Output**:
```
✅ Migration file numbering is sequential
✅ All migrations use CREATE IF NOT EXISTS
✅ Foreign key references are valid
✅ No syntax errors detected
```

---

## Testing Migrations

### Approach 1: In-Memory Database

```rust
#[tokio::test]
async fn test_migration_029() {
    let db = Database::new_in_memory().await.unwrap();
    
    // Apply migration
    let result = db.migrate(29);
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
-- ❌ BAD
CREATE TABLE new_table (...);

-- ✅ GOOD
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
node scripts/test-migrations.js 029
```

---

## Database Schema Documentation

For a complete reference of all tables, columns, and relationships, see:
- **Domain Model**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
- **Codebase**: `src-tauri/src/models/*.rs` (model definitions)

**Key Tables**:
- `tasks` - Work orders
- `clients` - Customers
- `interventions` - PPF installations
- `intervention_steps` - Workflow steps
- `photos` - Captured images
- `materials` - Inventory items
- `users` - System users
- `user_sessions` - Active sessions
- `audit_logs` - Security audit trail
- `sync_queue` - Pending sync operations

---

## Next Steps

- **Dev workflows**: [08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)
- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
- **Domain model**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
