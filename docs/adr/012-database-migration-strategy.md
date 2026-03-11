# ADR-012: Database Migration and Schema Evolution

## Status
Accepted

## Context
The application must safely evolve its database schema across version upgrades in offline environments while preserving existing user data.

## Decision

### Embedded Migrations
- All SQL migration files are embedded in the application binary using `include_dir!`.
- Files are located in `src-tauri/migrations/` and follow the `NNN_description.sql` naming convention.
- This ensures that migrations are always available without external filesystem dependencies.

### Implementation Patterns
- **SQL Migrations**: For standard schema changes (tables, indexes, constraints).
- **Rust Migrations**: For complex data migrations requiring business logic or non-SQL transformations.
- **Idempotency**: All migrations must be idempotent, checking for the existence of columns or indices before attempting modification.

### Forward Compatibility
- `Database::ensure_required_views` recreates all SQL views on every startup. This allows views to evolve independently of the migration sequence.
- The `schema_version` table tracks the highest successfully applied migration number.

## Consequences
- Deployment is simplified by bundling schema logic within the binary.
- Data integrity is preserved through idempotent, versioned upgrades.
- Schema drift is detected early through automated validation scripts.
