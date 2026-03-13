---
title: "Data Persistence and Migrations"
summary: "Detailed guide on how data is stored, queried, and migrated in the RPMA application."
read_when:
  - "Designing database schema changes"
  - "Creating new repositories"
  - "Optimizing database queries"
---

# Data Persistence and Migrations

The RPMA application uses **SQLite** as its primary data store, operating in **WAL (Write-Ahead Logging) mode** for better concurrency (ADR-009).

## Repository Pattern (ADR-005)

To decouple business logic from database implementation, all data access MUST go through repositories.

- **Location**: `src-tauri/src/domains/*/infrastructure/`
- **Rule**: Domain and Application layers never see raw SQL or database connections.
- **Structure**:
  - `repository_impl.rs`: Main implementation of the repository trait.
  - `query.rs`: Contains the actual SQL strings and query execution logic.
  - `mapping.rs`: Logic for mapping database rows to domain entities.

### Example Repository Implementation:
```rust
impl TaskRepository for SqliteTaskRepository {
    fn save(&self, task: &Task) -> Result<(), RepositoryError> {
        let conn = self.db.get_connection()?;
        conn.execute("INSERT OR REPLACE INTO tasks ...", params![...])?;
        Ok(())
    }
}
```

## Database Migrations (ADR-010)

Migrations are managed as numbered SQL files to ensure a predictable schema evolution.

- **Location**: `src-tauri/migrations/`
- **Naming**: `001_initial_schema.sql`, `002_add_client_phone.sql`, etc.
- **Execution**: Migrations are automatically applied by the backend on startup.
- **Validation**: Run `npm run backend:migration:fresh-db-test` after adding a migration to ensure it applies correctly to a clean database.

## Soft Deletes (ADR-011)

Most entities implement a soft-delete pattern to preserve data integrity and audit trails.

- **Field**: `deleted_at` (TIMESTAMP) and `deleted_by` (TEXT/UUID).
- **Behavior**: Queries in the repository layer SHOULD filter out records where `deleted_at` is NOT NULL by default.

## Timestamps (ADR-012)

- All timestamps are stored as **64-bit integers (Unix milliseconds)**.
- Use `chrono::Utc::now().timestamp_millis()` in Rust.
- Use `Date.now()` in TypeScript.

## Testing Data Access

Repositories should be tested using an in-memory SQLite database to ensure query correctness without affecting persistent data.
- *Reference*: `src-tauri/src/domains/tasks/infrastructure/task_repository.rs` (see `#[cfg(test)]` section).
