# ADR-001: Four-Layer Architecture Pattern

## Status

Accepted

## Date

2026-03-13

## Summary

Implements strict IPC → Application → Domain → Infrastructure layer separation for all domain code in the RPMA backend.

## Context

- Desktop application built with Tauri (Rust backend, Next.js frontend)
- Need for clear separation between Tauri IPC handlers and business logic
- Domain code should be testable independent of UI framework
- Team needs consistent patterns for organizing code across multiple domains
- Reference: AGENTS.md mandates this architecture as non-negotiable

## Decision

We implement a four-layer architecture within each domain module:

### Layer Definitions

1. **IPC Layer** (`domains/*/ipc/`)
   - Thin handlers decorated with `#[tauri::command]`
   - First line must call `resolve_context!` macro for authentication
   - Delegates immediately to application layer
   - Never contains business logic

2. **Application Layer** (`domains/*/application/`)
   - Use cases and orchestration logic
   - Auth enforcement via `RequestContext`
   - Calls domain services and infrastructure repositories
   - Returns domain models or DTOs to IPC layer

3. **Domain Layer** (`domains/*/domain/`)
   - Pure business rules, entities, and validation
   - Zero dependencies on other layers
   - No imports from infrastructure, application, or IPC
   - Tested in isolation with mocked infrastructure

4. **Infrastructure Layer** (`domains/*/infrastructure/`)
   - Repository implementations
   - SQL queries and database adapters
   - External service integrations
   - Implements domain-defined interfaces

### Dependency Rule

```text
IPC → Application → Domain ← Infrastructure
                      ↓
                  (no external deps)
```

Dependencies flowinward. Domain layer has no dependencies on any other layer.

## Consequences

### Positive

- Domain layer is fully testable without database or IPC mocking
- Clear dependency direction prevents circular imports
- Each layer can evolve independently
- New developers can find code placement easily
- Business logic is decoupled from Tauri framework

### Negative

- More boilerplate for simple CRUD operations
- Learning curve for developers unfamiliar with layered architecture
- May seem over-engineered for trivial features

## Code Examples

### IPC Layer

```rust,ignore
// src-tauri/src/domains/tasks/ipc/task.rs
#[tauri::command]
pub async fn task_crud(
    operation: String,
    payload: Option<serde_json::Value>,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<serde_json::Value> {
    let ctx = resolve_context!(&state, &correlation_id); // First line!
    let facade = TasksFacade::new(/* ... */);
    facade.handle_crud(operation, payload, &ctx).await
}
```

### Application Layer

```rust,ignore
// src-tauri/src/domains/tasks/application/task_service.rs
pub async fn create_task(&self, request: CreateTaskRequest, ctx: &RequestContext) -> AppResult<Task> {
    // RBAC check using context
    if !ctx.auth.role.can_create_tasks() {
        return Err(AppError::Authorization("...".into()));
    }
    // Validation in domain layer
    let task = self.task_factory.create(request)?;
    // Persistence via infrastructure
    self.repository.save(&task).await?;
    Ok(task)
}
```

### Domain Layer

```rust,ignore
// src-tauri/src/domains/tasks/domain/models/task.rs
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: TaskStatus,
    // Pure domain model, no infrastructure deps
}

impl Task {
    pub fn transition_to(&self, new_status: TaskStatus) -> Result<Self, DomainError> {
        // Pure business rule
        if !self.status.can_transition_to(&new_status) {
            return Err(DomainError::InvalidTransition);
        }
        Ok(self.with_status(new_status))
    }
}
```

### Infrastructure Layer

```rust,ignore
// src-tauri/src/domains/tasks/infrastructure/task_repository.rs
impl TaskRepository for SqliteTaskRepository {
    fn save(&self, task: &Task) -> Result<(), RepositoryError> {
        let conn = self.db.get_connection()?;
        conn.execute(/* SQL here */, params![
            task.id,
            task.title,
            // ...
        ])?;
        Ok(())
    }
}
```

## Related Files

- `src-tauri/src/domains/*/ipc/` - IPC command handlers
- `src-tauri/src/domains/*/application/` - Use case services
- `src-tauri/src/domains/*/domain/` - Pure business logic
- `src-tauri/src/domains/*/infrastructure/` - Repository implementations
- `AGENTS.md` - Architecture mandate

## When to Read This ADR

- Adding a new domain or feature
- Wondering where to place new code
- Reviewing IPC command implementations
- Writing tests for business logic
- Onboarding new developers

## References

- Clean Architecture by Robert C. Martin
- Domain-Driven Design by Eric Evans
- AGENTS.md Architecture section