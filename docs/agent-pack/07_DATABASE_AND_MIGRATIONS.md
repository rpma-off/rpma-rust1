# 07 - Database and Migrations

## SQLite Setup

RPMA v2 uses **SQLite** as its local database with specific optimizations for desktop application use.

### Database Configuration

**File Location**: `$TAURI_APP_DATA/rpma.db` (platform-specific app data directory)

**Connection Pool** (`src-tauri/src/db/connection.rs:42-52`):
| Setting | Value | Purpose |
|---------|-------|---------|
| max_connections | 10 | SQLite single-writer limitation |
| min_idle | 2 | Keep connections ready |
| connection_timeout | 30s | Max wait for connection |
| idle_timeout | 600s (10 min) | Close idle connections |
| max_lifetime | 3600s (60 min) | Force connection refresh |

### SQLite PRAGMA Settings (`connection.rs:96-103`)

```sql
PRAGMA journal_mode = WAL;       -- Write-Ahead Logging
PRAGMA synchronous = NORMAL;     -- Balanced durability/performance
PRAGMA busy_timeout = 5000;      -- 5 second lock timeout
PRAGMA cache_size = 10000;       -- 10,000 page cache
PRAGMA temp_store = MEMORY;      -- In-memory temp tables
PRAGMA foreign_keys = ON;        -- Enforce FK constraints
PRAGMA locking_mode = NORMAL;    -- Standard locking
```

**Benefits of WAL Mode**:
- Concurrent reads while writing (critical for desktop app responsiveness)
- Better write performance (up to 2x faster)
- Crash recovery via checkpoint mechanism
- Reduced lock contention between readers and writers
- Atomic commits with rollback support

---

## Migration System

### Overview

RPMA uses a **hybrid migration system**:
- **SQL files** in `src-tauri/migrations/` directory (embedded at compile time via `include_dir!` macro)
- **Rust-implemented migrations** in `src-tauri/src/db/migrations.rs` for complex logic

**Features**:
- Tracks applied migrations in `schema_version` table
- Sequential version-based ordering (001, 002, ..., 037)
- **Idempotent**: Uses `CREATE TABLE IF NOT EXISTS`, safe to run multiple times
- Validation before applying (syntax check, dependency check)
- Transactional: Each migration runs in its own transaction

**Current Version**: 37 (as of migration 037_quotes.sql)

**Discovery**: Migrations auto-discovered from embedded directory at runtime (`migrations.rs:159-181`)

**IMPORTANT**: Migration files are in `src-tauri/migrations/` directory (35 SQL files). Always place new migration files there.

> ⚠️ **Deprecated directory**: The root `migrations/` directory at the project root is **not used** by the migration system and was created by mistake. It contains files with conflicting version numbers. **Never add migrations there.** Always use `src-tauri/migrations/`.

---

### Migration Types

#### SQL-Only Migrations
Located in `src-tauri/migrations/` directory:
- `020_fix_cache_metadata_schema.sql` - Fix cache_metadata table schema
- `025_add_analytics_dashboard.sql` - Analytics dashboard tables
- `026_fix_user_settings.sql` - Fix user settings table
- `031_add_inventory_non_negative_checks.sql` - Inventory constraints
- `034_add_session_activity_index.sql` - Session activity index
- `035_add_tasks_deleted_at_index.sql` - Tasks deleted_at index
- `036_core_screen_indexes.sql` - Core screen performance
- `037_quotes.sql` - Quotes and quote_items tables for PPF quotations

#### Rust-Implemented Migrations
Complex migrations in `migrations.rs`:

| Version | Description |
|---------|-------------|
| 2 | Rename ppf_zone to ppf_zones |
| 6 | Add location columns to intervention_steps |
| 8 | Add workflow triggers |
| 9 | Add task_number to interventions |
| 11 | Add task_id FK to interventions |
| 12 | Unique constraint for active interventions per task |
| 16 | Task assignment validation indexes |
| 17 | Add cache_metadata table |
| 18 | Add settings_audit_log table |
| 24 | Enhanced inventory (material_categories, inventory_transactions) |
| 25 | Add audit_events table |
| 26 | Add performance indexes |
| 27 | Add CHECK constraints to tasks |
| 28 | Add 2FA columns (backup_codes, verified_at) to users |
| 29 | Add first_name/last_name to users table |
| 30 | Add updated_at to user_sessions for tracking |
| 31 | Add non-negative CHECK constraints to inventory columns |
| 32 | Add FK for interventions.task_id → tasks.id |
| 33 | Add FKs for tasks.workflow_id and current_workflow_step_id |

---

### Migration Discovery

**Code**: `src-tauri/src/db/migrations.rs:159-181`

```rust
// Migrations embedded at compile time
static MIGRATIONS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/migrations");

pub fn get_latest_migration_version() -> i32 {
    // Scans migrations/ for "NNN_description.sql" files
    // Parses filename prefix to extract version number
    // Returns max version found (minimum 18 for hardcoded Rust migrations)
}
```

**Naming Pattern**: Files must be named `NNN_description.sql` where NNN is a zero-padded number (e.g., `002_`, `024_`, `036_`)

---

### Schema Version Tracking

```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

---

### Migration Application

**Code**: `src-tauri/src/db/migrations.rs`

```rust
pub fn migrate(&self, target_version: i32) -> DbResult<()> {
    let current_version = self.get_version()?;
    
    for version in (current_version + 1)..=target_version {
        self.apply_migration(version)?;
    }
    Ok(())
}
```

**Transaction Guarantees**:
- Each migration runs in its own transaction
- Failure rolls back and stops process
- Future runs retry failed migration

---

## How to Add a Migration Safely

### Step 1: Determine Next Number

```bash
ls src-tauri/migrations/*.sql | sort | tail -1
# Next: 038
```

### Step 2: Create Migration

**SQL-only** (`src-tauri/migrations/038_description.sql`):
```sql
-- Migration 034: Brief description

CREATE TABLE IF NOT EXISTS new_table (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
```

**Rust implementation** (for complex logic):
Add function in `migrations.rs` and update `apply_migration()` match.

### Step 3: Test

```bash
npm run dev  # Migrations auto-apply on startup
node scripts/validate-migration-system.js
```

---

## Database Schema Overview

### Tables by Domain

#### User Management
| Table | Description |
|-------|-------------|
| `users` | User accounts with roles |
| `user_sessions` | Active login sessions |
| `user_settings` | User preferences |
| `user_consent` | GDPR consent |

#### Task Management
| Table | Description |
|-------|-------------|
| `tasks` | Work orders |
| `task_history` | Status change audit |
| `task_conflicts` | Scheduling conflicts |

#### Intervention/Workflow
| Table | Description |
|-------|-------------|
| `interventions` | PPF installation records |
| `intervention_steps` | Workflow step execution |
| `photos` | Captured images with GPS |

#### Client Management
| Table | Description |
|-------|-------------|
| `clients` | Customer records |
| `client_statistics` *(view)* | Aggregated counts |
| `clients_fts` *(FTS5)* | Full-text search |

#### Inventory/Materials
| Table | Description |
|-------|-------------|
| `suppliers` | Supplier master data |
| `materials` | Inventory items |
| `material_categories` | Category hierarchy |
| `material_consumption` | Usage per intervention |
| `inventory_transactions` | Stock movements |

#### Calendar
| Table | Description |
|-------|-------------|
| `calendar_events` | Events and appointments |
| `calendar_tasks` *(view)* | Tasks with scheduled dates |

#### Messaging
| Table | Description |
|-------|-------------|
| `messages` | In-app messages |
| `message_templates` | Reusable templates |
| `notification_preferences` | User settings |

#### Settings/Audit
| Table | Description |
|-------|-------------|
| `settings_audit_log` | Settings changes |
| `audit_events` | Security audit |
| `audit_logs` | General audit |

#### Sync/Cache
| Table | Description |
|-------|-------------|
| `sync_queue` | Pending sync operations |
| `cache_metadata` | Key-value cache |

---

### Views

| View | Description |
|------|-------------|
| `client_statistics` | Aggregated client task counts |
| `calendar_tasks` | Tasks with scheduled dates |
| `clients_fts` | FTS5 search index |

---

## Troubleshooting

### Error: "Table already exists"

**Fix**: Use `CREATE TABLE IF NOT EXISTS`

### Error: "Foreign key constraint failed"

**Fix**: Ensure migrations apply in correct order; verify FK references

### Error: "Duplicate column name"

**Fix**: Check if column exists before adding (handled by Rust migrations)

### Error: "Migration failed"

**Fix**:
1. Read error message
2. Fix SQL/migration code
3. Reset database (local only):
```bash
rm <app_data_dir>/rpma.db
npm run dev
```

---

## Migration Scripts Reference

| Script | Purpose | Command |
|--------|---------|---------|
| `validate-migration-system.js` | Validate migrations | `node scripts/validate-migration-system.js` |
| `test-migrations.js` | Test migration | `node scripts/test-migrations.js [N]` |
| `migration-health-check.js` | Health check | `node scripts/migration-health-check.js` |
| `detect-schema-drift.js` | Detect drift | `node scripts/detect-schema-drift.js` |

---

## Next Steps

- **Dev workflows**: [08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)
- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
- **Domain model**: [01_DOMAIN_MODEL.md](./01_DOMAIN_MODEL.md)
