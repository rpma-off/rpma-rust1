---
title: "Hybrid SQL + Rust Migration System"
summary: "Combine embedded SQL migration files with Rust-implemented migrations for complex schema changes, with idempotency guarantees."
domain: migrations
status: accepted
created: 2026-03-12
---

## Context

Database schemas evolve over time, requiring a migration system that:

- Applies changes incrementally
- Tracks applied versions
- Handles complex data transformations
- Works offline without external tooling
- Supports rollback in development

Pure SQL migrations work for simple schema changes but cannot express complex data transformations. Pure code migrations lose declarative clarity.

## Decision

**Implement a hybrid migration system combining embedded SQL files with Rust-implemented migrations.**

### Migration Discovery

Migrations are embedded at compile time from `src-tauri/migrations/`:

```rust
static MIGRATIONS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/migrations");
```

### Version Tracking

Schema version stored in `schema_version` table:

```sql
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

### Dispatch Logic

Migrations dispatch to SQL or Rust based on version number (`migrations/mod.rs:256-297`):

```rust
fn apply_migration(&self, version: i32) -> DbResult<()> {
    match version {
        1 => { /* Schema already created in init() */ },
        2 => self.apply_migration_002(),
        6 => self.apply_migration_006(),
        8 => self.apply_migration_008(),
        // ... Rust migrations for complex operations
        40 => self.apply_migration_40(),
        _ => self.apply_sql_migration(version), // Default: SQL file
    }
}
```

### SQL Migrations

SQL files follow naming convention `NNN_description.sql`:

```
migrations/
├── 003_add_quotes_table.sql
├── 004_add_task_indexes.sql
├── 005_client_constraints.sql
└── ...
```

### Rust Migrations

Complex migrations implemented as methods:

```rust
impl Database {
    fn apply_migration_002(&self) -> DbResult<()> {
        // Complex data transformation logic
    }
    
    fn apply_migration_006(&self) -> DbResult<()> {
        // Index creation with conditional logic
    }
}
```

### Idempotency

SQL migrations handle legacy SQLite compatibility:

```rust
// Handle "IF NOT EXISTS" syntax variations
if syntax_near_exists {
    let normalized_sql = sql_content.replace("ADD COLUMN IF NOT EXISTS", "ADD COLUMN");
    // ... execute normalized SQL
}
```

### Initialization Sequence

```rust
pub fn initialize_or_migrate(&self) -> DbResult<()> {
    if !self.is_initialized()? {
        self.init()?;
    }
    
    // Create version table if needed
    // Get current version
    // Apply migrations up to latest
    // Run legacy cleanup
    // Ensure views exist
}
```

## Consequences

### Positive

- **Flexibility**: SQL for simple changes, Rust for complex logic
- **Offline Capable**: Migrations embedded in binary
- **Version Control**: Schema changes tracked in git
- **Idempotent**: Safe to re-run migrations
- **Legacy Compatibility**: Handles older SQLite versions

### Negative

- **Two Formats**: Developers must learn both SQL and Rust migrations
- **Version Gaps**: Unused version numbers can be confusing
- **No Rollback**: Forward-only migrations (manual rollback required)
- **Test Complexity**: Each Rust migration needs its own test

## Related Files

- `src-tauri/src/db/migrations/mod.rs` — Migration dispatcher
- `src-tauri/src/db/migrations/rust_migrations/` — Rust migration implementations
- `src-tauri/src/db/migrations/views.rs` — View creation
- `src-tauri/src/db/migrations/tests.rs` — Migration tests
- `src-tauri/migrations/` — SQL migration files
- `src-tauri/src/db/schema.sql` — Initial schema

## Read When

- Adding new database schema changes
- Debugging migration failures
- Understanding why a migration wasn't applied
- Implementing data backfill operations
- Adding new tables or indexes
- Running database initialization
