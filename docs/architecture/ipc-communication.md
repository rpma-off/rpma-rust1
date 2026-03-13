---
title: "IPC Communication Pattern"
summary: "How the frontend and backend communicate through Tauri, including security and typing."
read_when:
  - "Adding new IPC commands"
  - "Debugging communication issues"
  - "Handling data exchange"
---

# IPC Communication Pattern

The frontend and backend communicate via Tauri's Inter-Process Communication (IPC). To maintain type safety and security, we use a structured request/response pattern.

## Request/Response Lifecycle

1.  **Request Construction**: Frontend constructs a request object, often including a `correlation_id` (ADR-020).
2.  **IPC Invoke**: The domain IPC wrapper calls `safeInvoke` with the command name and payload.
3.  **Rust Command Receive**: The command handler in `domains/*/ipc/` is invoked.
4.  **Context Resolution**: The handler calls `resolve_context!` (ADR-006) to authenticate the user and setup the request environment.
5.  **Execution**: The handler delegates to the application layer.
6.  **Response Wrapper**: The result is wrapped in an `ApiResponse` object, which includes the success data or an error, along with metadata.
7.  **Validation**: Frontend receives the JSON response and validates it against the expected Zod schema or type guard.

## Core Utilities

### Frontend (`frontend/src/lib/ipc/core.ts`)
- `safeInvoke`: Standard wrapper around Tauri's `invoke` with error handling.
- `extractAndValidate`: Ensures the backend response matches the expected structure.
- `cachedInvoke`: Used for read operations to provide quick UI updates from cache.

### Backend (`src-tauri/src/commands/mod.rs`)
- `ApiResponse<T>`: Unified response format containing `data`, `error`, and `correlation_id`.
- `resolve_context!`: Macro that ensures the command is called with a valid session and optional role requirements.

## Security Controls (ADR-007)

- **RBAC**: Role-based access control is enforced at the IPC boundary via the `resolve_context!` macro.
- **Payload Validation**: All inputs are validated at the IPC boundary before reaching domain logic (ADR-008).
- **Error Sanitization**: `AppError` prevents leaking sensitive backend details (like SQL errors) to the frontend (ADR-019).

## Example: Create Task

**Frontend IPC wrapper (`frontend/src/domains/tasks/ipc/task.ipc.ts`):**
```typescript
create: async (data: CreateTaskRequest): Promise<Task> => {
  const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
    request: { action: { action: 'Create', data } }
  });
  return extractAndValidate(result, validateTask) as Task;
}
```

**Backend IPC handler (`src-tauri/src/domains/tasks/ipc/task/facade.rs`):**
```rust
#[tauri::command]
pub async fn task_crud(
    request: TaskCrudRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<TaskResponse>, AppError> {
    let ctx = resolve_context!(&state, &request.correlation_id);
    // ... orchestrate creation ...
    Ok(ApiResponse::success(TaskResponse::Created(task))
        .with_correlation_id(Some(ctx.correlation_id.clone())))
}
```
