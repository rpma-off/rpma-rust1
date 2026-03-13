# ADR-011: Soft Delete Pattern

## Status

Accepted

## Date

2026-03-13

## Summary

All entities use `deleted_at` timestamps for soft deletion instead of hard deletes. Records are never physically removed, only marked as deleted.

## Context

- Need to preserve audit trail for all entity changes
- Recovery from accidental deletions
- Client statistics include historical data
- Regulatory requirements for data retention
- Hard deletes break foreign key relationships

## Decision

### Soft Delete Column

All entities include a `deleted_at` column:

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    -- other columns ...
    deleted_at INTEGER,  -- NULL if active, timestamp if deleted
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
```

### Timestamp Convention

- `deleted_at` stores Unix timestamp in milliseconds
- `NULL` indicates active (non-deleted) record
- Non-`NULL` timestamp indicates deletion time

### Query Pattern

Always filter out deleted records:

```rust
// src-tauri/src/domains/tasks/infrastructure/task_repository.rs
impl TaskRepository for SqliteTaskRepository {
    fn find_by_id(&self, id: &str) -> Result<Option<Task>, RepositoryError> {
        let conn = self.db.get_connection()?;
        
        conn.query_row(
            "SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL",
            [id],
            |row| Ok(Task::from_row(row)),
        ).optional()
    }

    fn find_all(&self) -> Result<Vec<Task>, RepositoryError> {
        let conn = self.db.get_connection()?;
        
        let mut stmt = conn.prepare(
            "SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC"
        )?;
        
        let tasks = stmt.query_map([], |row| Task::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        
        Ok(tasks)
    }
}
```

### Delete Operation

```rust
// Soft delete: set deleted_at to current timestamp
pub fn delete(&self, id: &str, ctx: &RequestContext) -> Result<(), RepositoryError> {
    let conn = self.db.get_connection()?;
    let now = Utc::now().timestamp_millis();
    
    conn.execute(
        "UPDATE tasks SET deleted_at = ? WHERE id = ?",
        params![now, id],
    )?;
    
    // Emit event for audit trail
    self.event_bus.publish(DomainEvent::TaskDeleted {
        id: id.to_string(),
        deleted_by: ctx.user_id().to_string(),
        deleted_at: now,
    })?;
    
    Ok(())
}

// Hard delete (admin only, for GDPR compliance):
pub fn hard_delete(&self, id: &str) -> Result<(), RepositoryError> {
    let conn = self.db.get_connection();
    conn.execute("DELETE FROM tasks WHERE id = ?", [id])?;
    Ok(())
}
```

### Restore Operation

```rust
pub fn restore(&self, id: &str, ctx: &RequestContext) -> Result<Task, RepositoryError> {
    let conn = self.db.get_connection()?;
    
    // First check if it exists and is deleted
    let task = conn.query_row(
        "SELECT * FROM tasks WHERE id = ? AND deleted_at IS NOT NULL",
        [id],
        |row| Task::from_row(row),
    ).map_err(|_| RepositoryError::NotFound)?;
    
    // Restore by setting deleted_at to NULL
    conn.execute(
        "UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?",
        params![Utc::now().timestamp_millis(), id],
    )?;
    
    Ok(task)
}
```

### Foreign Key Considerations

Soft delete prevents FK constraint violations:

```sql
-- With hard delete, this would fail:
DELETE FROM clients WHERE id = 'client-123';
-- Error: FOREIGN KEY constraint failed (tasks reference this client)

-- With soft delete, it succeeds:
UPDATE clients SET deleted_at = ? WHERE id = 'client-123';
-- OK: Tasks still reference the client, but client is marked deleted
```

### Indexes for Soft Deletes

```sql
-- Composite index for status + deleted_at (common query pattern)
CREATE INDEX idx_tasks_status_deleted ON tasks(status, deleted_at);

-- Index on deleted_at alone for finding all deleted records
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);

-- Include deleted_at in queries for index usage
-- Good: uses idx_tasks_status_deleted
SELECT * FROM tasks WHERE status = 'pending' AND deleted_at IS NULL;

-- Bad: full table scan
SELECT * FROM tasks WHERE status = 'pending';
```

### Statistics and Reporting

Soft deletes allow historical analysis:

```rust
// Include deleted records in statistics
pub fn client_statistics(&self, client_id: &str) -> Result<ClientStats, Error> {
    // All tasks, including deleted, for historical statistics
    let total_tasks = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE client_id = ?",
        [client_id],
        |row| row.get(0),
    )?;

    // Active tasks only
    let active_tasks = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE client_id = ? AND deleted_at IS NULL",
        [client_id],
        |row| row.get(0),
    )?;
    
    Ok(ClientStats {
        total_tasks,
        active_tasks,
        deleted_tasks: total_tasks - active_tasks,
    })
}
```

## Entity Types with Soft Delete

| Entity | Column | Indexes |
|--------|--------|---------|
| `tasks` | `deleted_at` | `idx_tasks_deleted_at`, `idx_tasks_status_deleted` |
| `clients` | `deleted_at` | `idx_clients_deleted_at` |
| `quotes` | `deleted_at` | `idx_quotes_deleted_at` |
| `materials` | `deleted_at` | `idx_materials_deleted_at` |
| `interventions` | `deleted_at` | `idx_interventions_deleted_at` |

## Consequences

### Positive

- Complete audit trail of all changes
- Recovery from accidental deletions
- Historical statistics preserved
- FK constraints remain satisfied
- GDPR-friendly: hard_delete available when needed

### Negative

- All queries must include `deleted_at IS NULL`
- Slightly larger database (deleted records remain)
- Need indexes on `deleted_at` for performance
- API must exclude deleted records by default

## Related Files

- `src-tauri/migrations/035_add_tasks_deleted_at_index.sql`
- `src-tauri/migrations/050_add_materials_soft_delete_columns.sql`
- `src-tauri/migrations/051_quotes_soft_delete.sql`
- Domain repositories: soft delete implementations

## When to Read This ADR

- Creating new entities
- Writing queries against entities
- Implementing delete/restore features
- Building statistics or reports
- Debugging "missing" records
- Understanding data retention

## References

- AGENTS.md "Soft Delete Pattern" section
- Migration files for soft delete columns
- Repository implementations