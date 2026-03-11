# Database & Migrations

The database system uses SQLite customized for native app performance with WAL mode.

## SQLite Configuration

| Setting | Value |
|---------|-------|
| **Driver** | `rusqlite` |
| **Pool** | `r2d2` connection pooling |
| **Mode** | WAL (Write-Ahead Logging) enabled |
| **Synchronous** | `NORMAL` |
| **Busy Timeout** | 5000ms |
| **WAL Checkpoint** | Configurable (default via SQLite) |
| **Foreign Keys** | `ON` (enforced) |
| **Temp Store** | `MEMORY` |
| **Max Connections** | 10 (default) |
| **Min Idle** | 2 (default) |

---

## Query Performance Monitoring

The application includes a built-in `QueryPerformanceMonitor` (`src-tauri/src/db/connection.rs`) to track all query executions.

### Key Features
- **Slow Query Threshold**: 100ms. Queries exceeding this are logged with full text and duration.
- **Prepared Statement Cache**: Reduces parsing overhead for frequently executed queries.
- **Dynamic Pool Management**: Adjusts pool size based on load.
- **Pool Stats**: Utilization metrics available via `get_database_pool_stats` command.

---

## SQLite Pragma Configuration

All connections are initialized with optimized pragmas in `connection.rs`:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;
PRAGMA foreign_keys = ON;
```
This configuration balances durability and performance, enabling concurrent read access without blocking during writes.

**Key Files**:
- Connection: `src-tauri/src/db/connection.rs`
- Database Wrapper: `src-tauri/src/db/mod.rs`
- Schema: `src-tauri/src/db/schema.sql`
- Migrations: `src-tauri/migrations/`

---

## Migration System

**Location**: `src-tauri/migrations/`

### Naming Convention
```
NNN_description.sql
```
- `NNN` — Sequential 3-digit version

**Current Migrations**: 53 files (versions 002-056, missing 001, 029, 030).

### Migration Tracking
**Table**: `schema_version`

**Dual Migration Approach**:
1. **SQL Migrations** — Embedded via `include_dir!` and applied sequentially
2. **Rust Migrations** — Complex logic in `src-tauri/src/db/migrations/rust_migrations/`

### Rust Migrations Categories
Located in `src-tauri/src/db/migrations/rust_migrations/`:
- `early.rs` — Early-stage migrations
- `mid.rs` — Mid-stage migrations
- `late.rs` — Late-stage migrations
- `user_integrity.rs` — User data integrity
- `inventory_audit.rs` — Inventory audit migrations

---

## Key Database Tables

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User accounts, roles, credentials |
| `sessions` | Active session tokens (replaced user_sessions in 041) |
| `clients` | Customer profiles |
| `tasks` | Work orders |
| `interventions` | PPF intervention records |
| `materials` | Inventory items |
| `material_consumption` | Usage tracking |
| `inventory_transactions` | All stock movements |
| `quotes` | Estimates |
| `quote_items` | Quote line items |
| `audit_events` | Security audit log |
| `sync_queue` | Offline sync operations |
| `photos` | Photo metadata |
| `notifications` | In-app notifications |
| `messages` | Task-scoped messaging |
| `app_settings` | Application settings (054) |
| `cache_metadata` | Cache tracking |

### Views
| View | Purpose |
|------|---------|
| `client_statistics` | Aggregated client stats |

---

## How to Add a Migration

### 1. Create Migration File
```bash
# Next version number (e.g., 057)
touch src-tauri/migrations/057_new_feature.sql
```

### 2. Write Migration SQL
```sql
-- Example: Add a new column
ALTER TABLE tasks ADD COLUMN new_field TEXT;

-- Or create a new table
CREATE TABLE IF NOT EXISTS new_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
```

### 3. Register (if Rust migration needed)
SQL migrations are automatically detected. Rust migrations must be added to `apply_migration` in `src-tauri/src/db/migrations/mod.rs`.

### 4. Validate Migration
```bash
node scripts/validate-migration-system.js
node scripts/migration-health-check.js
node scripts/test-migrations.js
```

### 5. Test Fresh DB
```bash
npm run backend:migration:fresh-db-test
```

### 6. Sync Types (if schema changed)
```bash
npm run types:sync
```

---

## Database Commands

| Command | Purpose |
|---------|---------|
| `health_check` | Basic database health |
| `diagnose_database` | Detailed diagnostics |
| `get_database_stats` | Database statistics |
| `get_database_pool_stats` | Connection pool stats |
| `get_database_pool_health` | Pool health check |
| `vacuum_database` | Run VACUUM to reclaim space |
| `get_large_test_data` | Test data retrieval |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Migration fails** | Check `schema_version` table; ensure SQL is idempotent where possible |
| **Lock timeout** | Ensure transactions are short; check WAL mode is active |
| **Schema drift** | Run `node scripts/detect-schema-drift.js` |
| **Slow queries** | Check QueryPerformanceMonitor logs; add indexes |
| **Pool exhaustion** | Check `get_database_pool_stats`; increase pool size if needed |

**Reset Dev Database**:
Delete the `.db` file in AppData and restart the app to re-run all migrations:
- Windows: `%APPDATA%/rpma-rust/rpma.db`
- macOS: `~/Library/Application Support/rpma-rust/rpma.db`
- Linux: `~/.config/rpma-rust/rpma.db`
