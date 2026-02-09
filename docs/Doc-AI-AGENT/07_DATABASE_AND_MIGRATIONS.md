# RPMA v2 Database and Migrations

## SQLite Setup

### Configuration
RPMA v2 uses SQLite with WAL (Write-Ahead Logging) mode for better concurrent access and performance:

```rust
// src-tauri/src/db/mod.rs
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::sync::Arc;

pub type DbPool = Arc<Pool<SqliteConnectionManager>>;

pub fn init_pool(database_path: &str) -> Result<DbPool, AppError> {
    let manager = SqliteConnectionManager::file(database_path);
    let pool = r2d2::Pool::new(manager)
        .map_err(|e| AppError::Database(format!("Failed to create connection pool: {}", e)))?;
    
    // Configure SQLite for optimal performance
    let conn = pool.get()?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;          -- Enable WAL mode
        PRAGMA synchronous = NORMAL;         -- Balance between safety and speed
        PRAGMA cache_size = -64000;          -- 64MB cache
        PRAGMA temp_store = memory;          -- Store temporary tables in memory
        PRAGMA foreign_keys = ON;            -- Enable foreign key constraints
        PRAGMA mmap_size = 268435456;         -- 256MB memory-mapped I/O
        "#
    )?;
    
    Ok(Arc::new(pool))
}
```

### Database Location
The database is stored in the platform-appropriate application data directory:

```rust
// src-tauri/src/main.rs
use tauri::api::path::app_data_dir;
use std::fs;

fn get_database_path() -> Result<PathBuf, AppError> {
    let app_dir = app_data_dir(&tauri::Config::default())
        .ok_or(AppError::Io("Failed to get app data directory".to_string()))?;
    
    // Ensure directory exists
    fs::create_dir_all(&app_dir)?;
    
    Ok(app_dir.join("rpma.db"))
}
```

## Migration System

### Overview
RPMA v2 uses a sophisticated migration system that tracks applied migrations and ensures database schema consistency:

1. **Migration Files**: SQL files in `src-tauri/migrations/` with naming convention `NNN_description.sql`
2. **Schema Version Table**: Tracks which migrations have been applied
3. **Migration Manager**: Handles discovery, validation, and application of migrations
4. **Custom Handlers**: Complex migrations implemented in Rust code

### Migration Structure
```sql
-- Example migration file: 024_enhanced_inventory.sql
-- Migration description
-- Enhances inventory management with categories and transactions

-- Create material categories table
CREATE TABLE IF NOT EXISTS material_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id TEXT,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES material_categories(id)
);

-- Add foreign key to materials table
ALTER TABLE materials ADD COLUMN category_id TEXT;
ALTER TABLE materials ADD CONSTRAINT fk_material_category 
    FOREIGN KEY (category_id) REFERENCES material_categories(id);

-- Create material transactions table
CREATE TABLE IF NOT EXISTS material_transactions (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'adjustment', 'transfer')),
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    location TEXT NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_material_id ON material_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_transactions_created_at ON material_transactions(created_at);

-- Insert default categories
INSERT OR IGNORE INTO material_categories (id, name, description) VALUES 
    ('cat_ppf', 'PPF Film', 'Paint Protection Film'),
    ('cat_tools', 'Tools', 'Installation tools and equipment'),
    ('cat_chemicals', 'Chemicals', 'Cleaning and preparation chemicals');
```

### Migration Manager Implementation
```rust
// src-tauri/src/db/migrations.rs
use crate::error::AppError;
use rusqlite::{Connection, Transaction};
use std::collections::HashMap;

pub struct MigrationManager;

impl MigrationManager {
    pub fn run_migrations(db: &DbPool) -> Result<(), AppError> {
        let conn = db.get()?;
        
        // Ensure schema version table exists
        Self::ensure_schema_version_table(&conn)?;
        
        // Get applied migrations
        let applied = Self::get_applied_migrations(&conn)?;
        
        // Get available migrations
        let available = Self::discover_migrations()?;
        
        // Apply unapplied migrations in order
        for (version, migration) in available {
            if !applied.contains(&version) {
                Self::apply_migration(&conn, version, &migration)?;
                println!("Applied migration {}", version);
            }
        }
        
        Ok(())
    }
    
    fn ensure_schema_version_table(conn: &Connection) -> Result<(), AppError> {
        conn.execute(
            r#"
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                description TEXT,
                applied_at DATETIME NOT NULL DEFAULT (datetime('now'))
            )
            "#,
            [],
        )?;
        Ok(())
    }
    
    fn get_applied_migrations(conn: &Connection) -> Result<Vec<i32>, AppError> {
        let mut stmt = conn.prepare("SELECT version FROM schema_version ORDER BY version")?;
        let rows = stmt.query_map([], |row| row.get(0))?;
        
        let applied: Result<Vec<i32>, _> = rows.collect();
        Ok(applied.unwrap_or_default())
    }
    
    fn discover_migrations() -> Result<HashMap<i32, String>, AppError> {
        let mut migrations = HashMap::new();
        
        // Embedded migrations
        let embedded = vec![
            // Add embedded migrations here
            (0, include_str!("../../migrations/000_initial_schema.sql")),
            (1, include_str!("../../migrations/001_add_indexes.sql")),
            // ... continue with all migrations
        ];
        
        for (version, sql) in embedded {
            migrations.insert(version, sql.to_string());
        }
        
        Ok(migrations)
    }
    
    fn apply_migration(conn: &Connection, version: i32, sql: &str) -> Result<(), AppError> {
        let tx = conn.transaction()?;
        
        // Execute migration
        tx.execute_batch(sql)?;
        
        // Record migration
        tx.execute(
            "INSERT INTO schema_version (version, description) VALUES (?, ?)",
            params![version, format!("Migration {}", version)],
        )?;
        
        tx.commit()?;
        Ok(())
    }
}
```

### Custom Migration Handlers
Some complex migrations require custom Rust implementation:

```rust
// Custom migration for renaming columns safely
impl MigrationManager {
    pub fn apply_migration_002(conn: &Connection) -> Result<(), AppError> {
        let tx = conn.transaction()?;
        
        // Check if old column exists
        let column_exists = tx.prepare(
            "PRAGMA table_info(tasks)"
        )?.query_map([], |row| {
            Ok(row.get::<_, String>(1)?)
        })?.any(|name| name.unwrap_or_default() == "ppf_zone");
        
        if column_exists {
            // Rename column
            tx.execute("ALTER TABLE tasks RENAME COLUMN ppf_zone TO ppf_zones")?;
        } else {
            // Add new column if it doesn't exist
            tx.execute("ALTER TABLE tasks ADD COLUMN ppf_zones TEXT")?;
        }
        
        tx.commit()?;
        Ok(())
    }
}
```

## Notable Migrations

### Migration 011: Prevent Duplicate Active Interventions
Prevents multiple active interventions for a single task:

```sql
-- Add unique constraint to prevent duplicate active interventions
CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_task_active
    ON interventions(task_id)
    WHERE status IN ('created', 'in_progress', 'pending_review');
```

### Migration 015: Two-Factor Authentication
Adds support for 2FA and backup codes:

```sql
-- Add 2FA fields to users table
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN backup_codes TEXT;  -- JSON array
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Create 2FA attempts table
CREATE TABLE IF NOT EXISTS user_2fa_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    attempt_time DATETIME NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Migration 024: Enhanced Inventory Management
Adds hierarchical material categories and transaction tracking:

```sql
-- Material categories with hierarchy
CREATE TABLE IF NOT EXISTS material_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    path TEXT NOT NULL,  -- Materialized path for efficient queries
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES material_categories(id)
);

-- Triggers to maintain materialized path
CREATE TRIGGER IF NOT EXISTS update_category_path
    AFTER INSERT ON material_categories
    BEGIN
        UPDATE material_categories 
        SET path = CASE 
            WHEN parent_id IS NULL THEN name
            ELSE (SELECT path FROM material_categories WHERE id = NEW.parent_id) || '/' || name
        END
        WHERE id = NEW.id;
    END;
```

### Migration 026: Check Constraints
Adds data validation constraints:

```sql
-- Add CHECK constraints for data validation
ALTER TABLE tasks ADD CONSTRAINT chk_task_priority 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE interventions ADD CONSTRAINT chk_quality_score
    CHECK (quality_score BETWEEN 0 AND 100);

ALTER TABLE interventions ADD CONSTRAINT chk_customer_satisfaction
    CHECK (customer_satisfaction BETWEEN 1 AND 10);

-- Add missing foreign keys
ALTER TABLE tasks ADD CONSTRAINT fk_task_client
    FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE interventions ADD CONSTRAINT fk_intervention_task
    FOREIGN KEY (task_id) REFERENCES tasks(id);
```

### Migration 027: User Settings Auto-Creation
Automatically creates user settings when users are created:

```sql
-- Create trigger to auto-create user settings
CREATE TRIGGER IF NOT EXISTS create_user_settings
    AFTER INSERT ON users
    BEGIN
        INSERT INTO user_settings (user_id, theme, language, notifications_email, notifications_push)
        VALUES (NEW.id, 'auto', 'en', 1, 1);
    END;
```

## Schema Management

### Schema Version Tracking
The `schema_version` table tracks applied migrations:

```sql
-- Current schema version
SELECT * FROM schema_version ORDER BY version DESC LIMIT 1;
```

### Database Health Checks
```rust
// src-tauri/src/db/health.rs
impl DatabaseHealth {
    pub fn check_database_health(db: &DbPool) -> Result<HealthReport, AppError> {
        let conn = db.get()?;
        let tx = conn.transaction()?;
        
        let mut report = HealthReport::new();
        
        // Check foreign key integrity
        let fk_errors = tx.prepare("PRAGMA foreign_key_check")?
            .query_map([], |row| Ok(row.get::<_, String>(2)?))
            .collect::<Result<Vec<String>, _>>()?;
        
        if !fk_errors.is_empty() {
            report.add_issue("foreign_key_violations", fk_errors);
        }
        
        // Check for orphaned records
        let orphaned_interventions = tx.prepare(
            "SELECT COUNT(*) FROM interventions i LEFT JOIN tasks t ON i.task_id = t.id WHERE t.id IS NULL"
        )?.query_row([], |row| row.get(0))?;
        
        if orphaned_interventions > 0 {
            report.add_metric("orphaned_interventions", orphaned_interventions);
        }
        
        // Check index fragmentation
        let index_stats = tx.prepare(
            "SELECT name, stat FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'"
        )?.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?.collect::<Result<Vec<_>, _>>()?;
        
        for (index_name, stat) in index_stats {
            report.add_metric(format!("index_{}", index_name), stat);
        }
        
        Ok(report)
    }
}
```

## Performance Optimization

### Indexing Strategy
The database uses carefully selected indexes for optimal performance:

```sql
-- Task queries
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_technician_date ON tasks(technician_id, scheduled_date);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);

-- Intervention queries
CREATE INDEX idx_interventions_task_status ON interventions(task_id, status);
CREATE INDEX idx_interventions_created_at ON interventions(created_at DESC);

-- Full-text search
CREATE VIRTUAL TABLE clients_fts USING fts5(name, email, phone);
CREATE TRIGGER clients_fts_insert AFTER INSERT ON clients BEGIN
    INSERT INTO clients_fts(rowid, name, email, phone) VALUES (new.id, new.name, new.email, new.phone);
END;
```

### Query Performance Monitoring
```rust
// src-tauri/src/db/performance.rs
pub struct QueryPerformance;

impl QueryPerformance {
    pub fn execute_with_timing<T, F>(
        conn: &Connection,
        query: &str,
        params: &[&dyn ToSql],
        mapper: F,
    ) -> Result<T, AppError>
    where
        F: FnOnce(&rusqlite::Row) -> rusqlite::Result<T>,
    {
        let start = std::time::Instant::now();
        
        let result = conn.prepare(query)?
            .query_map(params, mapper)?
            .next()
            .ok_or_else(|| AppError::NotFound("No rows returned".to_string()))??;
        
        let duration = start.elapsed();
        
        // Log slow queries
        if duration.as_millis() > 100 {
            log::warn!("Slow query detected: {}ms - {}", duration.as_millis(), query);
        }
        
        Ok(result)
    }
}
```

## Safe Migration Practices

### 1. Testing Migrations
```bash
# Validate migration syntax
node scripts/validate-migration-syntax.js src-tauri/migrations/028_new_migration.sql

# Test migration on sample database
node scripts/test-migration.js 028
```

### 2. Migration Checklist
Before creating a new migration:

- [ ] Understand the data impact and backup strategy
- [ ] Plan for rollback if possible
- [ ] Consider data validation constraints
- [ ] Test on development data first
- [ ] Document the migration purpose
- [ ] Include data migration if changing structure

### 3. Adding a Migration

1. Create SQL file in `src-tauri/migrations/` with next number
2. Write idempotent SQL (use `IF NOT EXISTS`)
3. Add the migration to the discovery list in `migrations.rs`
4. Write unit tests for the migration
5. Run validation scripts
6. Update documentation if schema changes affect API

### 4. Migration Validation Script
```bash
# Run comprehensive migration validation
node scripts/validate-migration-system.js

# Validates:
# 1. SQL syntax correctness
# 2. Migration ordering
# 3. Schema consistency
# 4. Performance impact
# 5. Data integrity
```

## Troubleshooting

### Common Migration Failures

#### 1. Syntax Errors
```
Error: near "ALTER": syntax error
```
**Solution**: Check SQLite version compatibility, some ALTER TABLE operations have limitations

#### 2. Constraint Violations
```
Error: UNIQUE constraint failed: tasks.task_number
```
**Solution**: Ensure data migration handles existing data before adding constraints

#### 3. Lock Timeout
```
Error: database is locked
```
**Solution**: Close all application instances, check for long-running transactions

#### 4. Disk Space
```
Error: database or disk is full
```
**Solution**: Ensure adequate disk space, especially for large data migrations

### Recovery Procedures

#### From Migration Failure
```bash
# Check current schema version
sqlite3 rpma.db "SELECT MAX(version) FROM schema_version;"

# Identify failed migration
ls -la src-tauri/migrations/ | grep $(expr $(sqlite3 rpma.db "SELECT MAX(version) FROM schema_version;") + 1)

# Manually rollback if needed
sqlite3 rpma.db "DELETE FROM schema_version WHERE version = FAILED_VERSION;"

# Re-run migrations
npm run db:migrate
```

#### Database Corruption
```bash
# Check integrity
sqlite3 rpma.db "PRAGMA integrity_check;"

# Export data if needed
sqlite3 rpma.db ".dump" > backup.sql

# Rebuild database
sqlite3 new_rpma.db < backup.sql
```