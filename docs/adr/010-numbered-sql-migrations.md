---
title: "ADR-010: Numbered SQL Migrations with Rust Data Migrations"
summary: "Database schema changes use numbered SQL files in `migrations/` directory. Complex data transformations use Rust-based migrations embedded in the application."
domain: "migrations"
status: "accepted"
read_when:
  - "Designing new features"
  - "Reviewing architectural decisions"
---

# ADR-010: Numbered SQL Migrations with Rust Data Migrations

## Status

Accepted

## Date

2026-03-13

## Summary

Database schema changes use numbered SQL files in `migrations/` directory. Complex data transformations use Rust-based migrations embedded in the application.

## Context

- Need versioned schema changes for SQLite
- Some migrations require data transformation beyond SQL
- Team needs to track schema history
- Rollback support for development
- Production migrations must be idempotent

## Decision

### SQL Migrations

Fresh databases are bootstrapped from `src-tauri/src/db/schema.sql`, then additive changes are applied from numbered SQL migrations stored in `src-tauri/migrations/`:

```
src-tauri/src/db/schema.sql

src-tauri/migrations/
├── 002_rename_ppf_zone.sql
├── 003_add_client_stats_triggers.sql
├── ...
├── 037_quotes.sql
├── 050_add_materials_soft_delete_columns.sql
└── 057_add_login_attempts_table.sql
```

### Naming Convention

```
{number}_{description}.sql

Examples:
├── 002_rename_ppf_zone.sql
├── 014_add_avatar_url.sql
├── 037_quotes.sql
├── 052_add_intervention_reports_table.sql
```

### Bootstrap Schema

The repository no longer carries a `001_initial_schema.sql` file. Instead, `src-tauri/src/db/schema.sql` is embedded into the application and executed on first startup to create the bootstrap schema for a fresh database.

After bootstrap, numbered migrations (`002+`) are applied in order. This keeps new changes reviewable and preserves additive schema history while still allowing a fresh database to be initialized from a single up-to-date snapshot.

### Migration Structure

Each migration must be idempotent:

```sql
-- Migration 037: Create quotes and quote_items tables
-- Implements the Devis (Quotes) feature for PPF interventions

CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY NOT NULL,
    quote_number TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id),
    task_id TEXT REFERENCES tasks(id),
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    -- ...
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS quote_items (
    id TEXT PRIMARY KEY NOT NULL,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    -- ...
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
```

### Idempotent Patterns

```sql
-- Use IF NOT EXISTS for tables
CREATE TABLE IF NOT EXISTS my_table (...);

-- Use IF NOT EXISTS for indexes
CREATE INDEX IF NOT EXISTS idx_my_column ON my_table(my_column);

-- Use ALTER TABLE with IF EXISTS where possible
ALTER TABLE my_table ADD COLUMN new_col TEXT;

-- For SQLite, check column existence
-- (SQLite doesn't support IF NOT EXISTS for columns directly)
-- Use separate migration files for additive changes

-- Soft deletes use triggers instead of CHECK constraints
-- Because SQLite CHECK constraints are limited
```

### Version Tracking

```rust
// src-tauri/src/db/mod.rs
impl Database {
    pub fn get_version(&self) -> Result<i32, String> {
        let conn = self.get_connection()?;
        let version: i32 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        ).unwrap_or(0);
        Ok(version)
    }

    pub fn initialize_or_migrate(&self) -> Result<(), String> {
        let conn = self.get_connection()?;
        
        // Create migrations table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER NOT NULL
            )",
            [],
        )?;
        
        // Apply each migration in order
        for migration in embedded_migrations::get_all() {
            self.apply_migration(&conn, migration)?;
        }
        
        Ok(())
    }
}
```

### Rust Data Migrations

Complex data transformations use Rust code:

```rust
// src-tauri/src/db/migrations/rust_migrations/user_integrity.rs
pub fn migrate(conn: &Connection) -> Result<(), MigrationError> {
    // Complex data transformation that SQL can't handle
    let users = conn.query_map(
        "SELECT id, email FROM users WHERE normalized_email IS NULL",
        [],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    )?;
    
    for user in users {
        let (id, email) = user?;
        let normalized = email.to_lowercase();
        conn.execute(
            "UPDATE users SET normalized_email = ? WHERE id = ?",
            params![normalized, id],
        )?;
    }
    
    Ok(())
}
```

### Migration Categories

Rust migrations are organized by timing:

```rust
// src-tauri/src/db/migrations/rust_migrations/mod.rs
mod early;    // Run before SQL migrations
mod mid;       // Run during SQL migrations  
mod late;     // Run after SQL migrations

pub fn run_all(conn: &Connection) -> Result<(), MigrationError> {
    early::run(conn)?;
    // SQL migrations embedded here
    mid::run(conn)?;
    late::run(conn)?;
    Ok(())
}
```

### Embedded Migrations

Migrations are embedded at compile time:

```rust
// src-tauri/src/db/migrations/mod.rs
pub fn get_all() -> Vec<Migration> {
    vec![
        // Fresh databases are bootstrapped from src/db/schema.sql via Database::init()
        Migration::from_sql(include_str!("../../migrations/002_rename_ppf_zone.sql")),
        // ... all migrations
    ]
}
```

## Consequences

### Positive

- Migrations are version-controlled with code
- Idempotent migrations safe to re-run
- SQLite embedded migrations are simple
- Complex transformations handled in Rust
- Transparent version tracking

### Negative

- No automatic rollback (SQLite limitation)
- Large number of migration files over time
- Need to keep migrations for schema creation forever
- Manual numbering can cause conflicts

## Testing Migrations

```bash
# Validate migration system
npm run backend:migration:fresh-db-test

# Detect schema drift
node scripts/detect-schema-drift.js

# Test specific migration
cd src-tauri && cargo test --test migrations
```

## Example Migration Flow

```sql
-- Migration 053: Add soft delete indexes
-- Performance optimization for soft-deleted records

-- Add deleted_at column to tasks if not exists
-- (SQLite requires separate handling)
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- Add deleted_at to materials
CREATE INDEX IF NOT EXISTS idx_materials_deleted_at ON materials(deleted_at);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status_deleted 
    ON tasks(status, deleted_at);
```

## Related Files

- `src-tauri/migrations/` — All migration files
- `src-tauri/src/db/migrations/mod.rs` — Migration runner
- `src-tauri/src/db/migrations/rust_migrations/` — Rust migrations
- `scripts/validate-migration-system.js` — Validation script
- `scripts/detect-schema-drift.js` — Drift detection

## When to Read This ADR

- Adding new database tables
- Modifying schema
- Writing data migrations
- Debugging migration failures
- Understanding schema history
- Creating new indexes

## References

- AGENTS.md "New migrations: numbered .sql file in src-tauri/migrations/"
- SQLite migration best practices
- Embedded migrations pattern
