# ADR-012: Database Migration Strategy

## Status
Accepted

## Context
RPMA v2 must handle schema evolution across application upgrades while preserving user data. The migration system must be reliable, idempotent, and work in offline-only environments without filesystem dependencies.

## Decision

### Embedded Migrations
- All SQL migration files are embedded in the binary using the `include_dir!` macro (`static MIGRATIONS_DIR`)
- This eliminates runtime filesystem access requirements and ensures migrations ship with each release
- Migration files are located in `src-tauri/migrations/` and follow the naming pattern `NNN_description.sql`

### Version Tracking
- A `schema_version` table tracks the highest applied migration number
- `Database::initialize_or_migrate()` applies pending migrations in filename-sorted order on startup
- The latest migration version is determined at compile time via `get_latest_migration_version()`

### Idempotency Pattern
Every migration (both SQL files and Rust functions) must check for existing state before making changes:
```rust
// Example: Check if column already exists
let column_exists: i64 = conn.query_row(
    "SELECT COUNT(*) FROM pragma_table_info('table_name') WHERE name='column_name'",
    [], |row| row.get(0)
)?;
if column_exists > 0 {
    return Ok(()); // Skip - already applied
}
```

### Mixed Migration Implementation
The system supports two migration approaches:
1. **SQL Files**: For simple schema changes (most migrations)
2. **Rust Functions**: For complex data transformations requiring application logic (versions 2, 6, 8, 9, 11, 12, 16, 17, 18, 24-34, 40)

### Forward Compatibility
- `Database::ensure_required_views()` recreates SQL views (`client_statistics`, `calendar_tasks`) on every startup if missing
- This provides forward compatibility without requiring a migration for each view change
- Views are dropped and recreated with current definitions

### Migration Validation
- `scripts/validate-migration-system.js` validates the migration system in CI:
  - Checks migration filename integrity (unique versions, valid format)
  - Verifies schema.sql has no legacy artifacts
  - Runs fresh database simulation tests

### Migration Order
- New migrations must use the next available version number
- Migration numbers must never be reused or modified once committed
- Migration files must be added before running `types:sync` and tests

## Consequences
- Database schema is always consistent after startup
- No data loss during upgrades (idempotent migrations can be re-run safely)
- Embedded migrations simplify deployment (single binary, no external files needed)
- Forward compatibility via view recreation ensures newer views work on older schemas
- Validation scripts catch migration drift in CI before releases

## Related
- ADR-008: Offline-First Strategy
- ADR-009: TypeScript Type Synchronization
