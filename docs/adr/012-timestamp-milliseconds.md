# ADR-012: Timestamp as Milliseconds

## Status

Accepted

## Date

2026-03-13

## Summary

All timestamps in the database and API are stored and transmitted as Unix timestamps in **milliseconds** (i64), not seconds, not ISO 8601 strings.

## Context

- SQLite's native datetime handling is limited
- JavaScript uses milliseconds for Date objects
- Need consistent timestamp representation across Rust and TypeScript
- Avoid timezone confusion
- Integer comparisons are faster than string comparisons

## Decision

### Database Storage

All timestamp columns use `INTEGER` storing Unix milliseconds:

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    -- ...
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at INTEGER,  -- NULL if not deleted
    due_date INTEGER,    -- Optional due date
    completed_at INTEGER -- NULL if not completed
);

CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

### SQLite Default

```sql
-- SQLite's unixepoch() returns seconds, so multiply by 1000
created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
```

### Rust Implementation

```rust
use chrono::{Utc, DateTime};

// Getting current timestamp
let now_ms: i64 = Utc::now().timestamp_millis();

// Storing in database
conn.execute(
    "INSERT INTO tasks (id, created_at, updated_at) VALUES (?, ?, ?)",
    params![task.id, now_ms, now_ms],
)?;

// Converting from database
fn from_row(row: &Row) -> Result<Self, Error> {
    Ok(Task {
        created_at: Utc.timestamp_millis(row.get::<_, i64>(10)?),
        updated_at: Utc.timestamp_millis(row.get::<_, i64>(11)?),
    })
}

// Rust type for timestamps
pub type Timestamp = i64; // Unix milliseconds

// Helper functions
pub fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}

pub fn from_ms(ms: i64) -> DateTime<Utc> {
    Utc.timestamp_millis(ms)
}

pub fn to_ms(dt: DateTime<Utc>) -> i64 {
    dt.timestamp_millis()
}
```

### TypeScript/Frontend

```typescript
// Frontend receives milliseconds from API
interface Task {
  id: string;
  createdAt: number;  // Unix milliseconds
  updatedAt: number;   // Unix milliseconds
}

// Converting to Date
const task: Task = await ipcClient.tasks.get(id);
const createdDate = new Date(task.createdAt);

// Converting to milliseconds for API
const createRequest: CreateTaskRequest = {
  // ...
  dueDate: dueDate.getTime(), // Date.getTime() returns milliseconds
};

// Display formatting
const formattedDate = new Date(task.createdAt).toLocaleDateString();
const relativeTime = formatDistanceToNow(task.createdAt);
```

### Type Generation (ts-rs)

```rust
// Rust types exported to TypeScript
#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Task {
    pub id: String,
    pub title: String,
    #[ts(type = "number")]  // Explicitly number in TypeScript
    pub created_at: i64,     // Unix milliseconds
    #[ts(type = "number")]
    pub updated_at: i64,
}
```

### API Response Example

```json
{
  "id": "task-123",
  "title": "Install PPF film",
  "status": "in_progress",
  "created_at": 1707878400000,
  "updated_at": 1707964800000,
  "due_date": 1708051200000
}
```

### Query Patterns

```rust
// Filter by date range
let tasks = conn.query_map(
    "SELECT * FROM tasks 
     WHERE created_at >= ? AND created_at < ?
     AND deleted_at IS NULL
     ORDER BY created_at DESC",
    params![start_ms, end_ms],
    |row| Task::from_row(row),
)?;

// Tasks overdue (due_date < now AND status != 'completed')
let overdue = conn.query_map(
    "SELECT * FROM tasks 
     WHERE due_date < ? 
     AND status != 'completed' 
     AND deleted_at IS NULL",
    [Utc::now().timestamp_millis()],
    |row| Task::from_row(row),
)?;
```

### Date Arithmetic

```rust
// Add 7 days in milliseconds
let one_week_ms = 7 * 24 * 60 * 60 * 1000;
let due_date = Utc::now().timestamp_millis() + one_week_ms;

// Compare timestamps
if task.due_date < Utc::now().timestamp_millis() {
    // Task is overdue
}

// Calculate duration
let duration_ms = task.completed_at - task.created_at;
let duration_hours = duration_ms / (1000 * 60 * 60);
```

### NullHandling

```rust
// Optional timestamps are nullable
pub struct Task {
    pub completed_at: Option<i64>,  // NULL if not completed
    pub deleted_at: Option<i64>,   // NULL if not deleted
}

// In queries
fn find_completed(&self) -> Result<Vec<Task>, Error> {
    conn.query_map(
        "SELECT * FROM tasks 
         WHERE completed_at IS NOT NULL 
         AND deleted_at IS NULL",
        [],
        |row| Task::from_row(row),
    )
}
```

## Why Milliseconds?

| Format | Pros | Cons |
|--------|------|------|
| **Milliseconds** | JavaScript-native, integer comparison, no timezone confusion | Large numbers |
| Seconds | Smaller numbers | Requires conversion for JS |
| ISO 8601 | Human-readable | String comparison, timezone issues |
| SQLite datetime | SQL functions | Poor performance, timezone confusion |

JavaScript `Date.getTime()` returns milliseconds. Using milliseconds eliminates conversion overhead.

## Consequences

### Positive

- Zero conversion overhead between Rust and JavaScript
- Integer comparisons are fast
- No timezone confusion (always UTC)
- SQLite indexes work efficiently
- Natural fit for SQLite INTEGER type

### Negative

- Not human-readable in database
- Numbers can be large (13+ digits)
- Need helper functions for display

## Related Files

- All entity models in `src-tauri/src/domains/*/domain/models/`
- Type definitions in `frontend/src/types/`
- Migration files (all use `unixepoch() * 1000`)
- Timestamp utility functions

## When to Read This ADR

- Creating new entity with timestamp fields
- Writing queries involving dates
- Converting timestamps between Rust and TypeScript
- Displaying dates in UI
- Building date range filters

## References

- JavaScript `Date.getTime()` documentation
- SQLite `unixepoch()` function
- `chrono` crate documentation for timestamp handling