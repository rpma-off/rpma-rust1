# Database & Migrations

The database system uses SQLite customized for native app performance with WAL mode.

## SQLite Configuration

| Setting | Value |
|---------|-------|
| **Driver** | `rusqlite` |
| **Pool** | `r2d2` connection pooling |
| **Mode** | WAL (Write-Ahead Logging) enabled |
| **Location** | AppData via `tauri::path::app_data_dir()` |

**WAL Benefits**:
- Readers don't block writers.
- High read/write concurrency.
- Manual or automatic checkpoints.

**Key Files**:
- Connection: `src-tauri/src/db/connection.rs`
- Pool: `src-tauri/src/db/mod.rs`
- Schema: `src-tauri/src/schema.sql`

---

## Migration System

**Location**: `src-tauri/migrations/`

### Naming Convention
```
NNN_description.sql
```
- `NNN` — Sequential 3-digit version (002-052)

**Current Migrations**: 52 files (versions 002-052).

### Migration Tracking
**Table**: `schema_version`

**Dual Migration Approach**:
1. **SQL Migrations** — Embedded via `include_dir!` and applied sequentially.
2. **Rust Migrations** — Complex logic in `src-tauri/src/db/migrations/rust_migrations/`.

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
| `audit_events` | Security audit log |
| `sync_queue` | Offline sync operations |
| `photos` | Photo metadata |
| `notifications` | In-app notifications |

---

## How to Add a Migration

### 1. Create Migration File
```bash
touch src-tauri/migrations/053_new_feature.sql
```

### 2. Register (if needed)
SQL migrations are automatically detected if they follow naming conventions. Rust migrations must be added to `apply_migration` in `src-tauri/src/db/migrations/mod.rs`.

### 3. Validate Migration
```bash
node scripts/validate-migration-system.js
```

### 4. Sync Types (if schema changed)
```bash
npm run types:sync
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Migration fails** | Check `schema_version` table; ensure SQL is idempotent. |
| **Lock timeout** | Ensure transactions are short; check WAL mode is active. |
| **Schema drift** | Run `node scripts/detect-schema-drift.js`. |

**Reset Dev Database**:
Delete the `.db` file in AppData and restart the app to re-run all migrations.
