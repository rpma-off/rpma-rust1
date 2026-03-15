---
title: "IPC API and Contracts"
summary: "The contract between Frontend and Backend, type generation, and communication standards."
read_when:
  - "Defining new IPC commands"
  - "Debugging communication issues"
  - "Syncing types between Rust and TS"
---

# 05. IPC API AND CONTRACTS

The IPC layer connects React and Rust via Tauri's `invoke` system.

## Communication Standard

### Response Envelope
All IPC commands return a consistent `ApiResponse<T>`:
```rust
pub struct ApiResponse<T> {
    pub success: boolean,
    pub data: Option<T>,
    pub error: Option<ApiError>,
    pub correlation_id: String,
}
```

### Correlation IDs (**ADR-020**)
Every request carries a `correlation_id` for distributed tracing. If not provided by the frontend, the backend generates one.

## Type Synchronization (**ADR-015**)

We use `ts-rs` to export Rust types to TypeScript.
- **Rust side**: Annotate with `#[derive(TS)] #[ts(export)]`.
- **Sync**: Run `npm run types:sync`.
- **Output**: `frontend/src/types/`. **DO NOT EDIT MANUALLY.**

## Command Implementation Pattern

### 1. Rust Command Handler
```rust
// src-tauri/src/domains/tasks/ipc/mod.rs
#[tauri::command]
pub async fn task_crud(
    operation: String,
    payload: Value,
    state: State<'_, AppState>,
    correlation_id: Option<String>,
) -> AppResult<ApiResponse<Value>> {
    let ctx = resolve_context!(&state, &correlation_id);
    // ... logic
}
```

### 2. Frontend Wrapper (**ADR-013**)
```typescript
// frontend/src/domains/tasks/ipc/task.ipc.ts
export const taskIpc = {
  create: (data: CreateTaskRequest) => 
    ipcClient.invoke<Task>('task_crud', { operation: 'create', payload: data }),
};
```

## Protocol Rules
- **Versioning**: Not currently used; backward compatibility is maintained manually.
- **Binary Data**: Large files (photos) are handled via Tauri's custom protocol or base64 (if small).
- **Errors**: Translated from `AppError` to `ApiError` at the boundary (**ADR-019**).
- **Validation**: Frontend validates via Zod; Backend validates via `resolve_context!` and domain rules.
