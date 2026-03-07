# Database & Migrations

The database system relies heavily on SQLite customized for native app performance.

## SQLite Configuration
- **Driver**: `rusqlite`
- **Connection Pool**: `r2d2` ensuring concurrent reads are supported safely.
- **WAL Mode**: Write-Ahead Logging is rigorously enforced to avoid database locking during heavy asynchronous operations (like photo saves + data syncs simultaneously). (TODO: Verify exact PRAGMA setup in `src-tauri/src/db/`).
- **Location**: Database path is typically determined via `tauri::api::path` (e.g., AppData on Windows, Application Support on macOS).

## Migration System
Migrations are strictly ordered SQL files located in `migrations/` and `src-tauri/migrations/`.

- **Mechanism**: On startup, RPMA checks a `schema_version` or `migrations` table. It sequentially applies unapplied `.sql` scripts.
- **Constraints**: 
  - Filenames must start with sequence numbers (`020_calendar_enhancements.sql`, `034_quote_sharing.sql`).
  - Migrations MUST be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN ... IF NOT EXISTS`).

## How to Add a Migration Safely
1. Create a realistically numbered file: `migrations/035_new_feature.sql`.
2. Write raw SQLite syntax.
3. **Validate**: Run `node scripts/validate-migration-system.js`.
4. Run tests: `cd src-tauri && cargo test migration`.
5. Run type sync: `npm run types:sync` if your Rust struct changed.

## Troubleshooting Migrations
- **Common Failure**: A bad syntax string locks the system, or SQLite complains a column already exists (non-idempotent script).
- **Fix**: Rollback local dev database, fix the `.sql` script idempotency, rerun.
