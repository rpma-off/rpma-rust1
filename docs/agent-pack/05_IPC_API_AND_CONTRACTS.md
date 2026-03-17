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

All IPC commands return `ApiResponse<T>`:

```rust
// src-tauri/src/shared/ipc/response.rs
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: Option<String>,       // Human-readable message
    pub error_code: Option<String>,    // Machine-readable error code
    pub data: Option<T>,
    pub error: Option<ApiError>,
    pub correlation_id: Option<String>,
}

pub struct ApiError {
    pub message: String,
    pub code: String,
    pub details: Option<JsonValue>,
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_INVALID` | Authentication failed |
| `AUTH_FORBIDDEN` | Authorization denied |
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Entity not found |
| `DATABASE_ERROR` | Database error (sanitized) |
| `INTERNAL_ERROR` | Internal error (sanitized) |

### Correlation IDs (**ADR-020**)

Every request carries a `correlation_id` for distributed tracing. If not provided by the frontend, the backend generates one.

## Type Synchronization (**ADR-015**)

We use `ts-rs` to export Rust types to TypeScript.

| Step | Command | Output |
|------|---------|--------|
| Annotate | `#[derive(TS)] #[ts(export)]` | Marks type for export |
| Sync | `npm run types:sync` | Generates TypeScript |
| Output | `frontend/src/lib/backend.ts` | **DO NOT EDIT MANUALLY** |

## Command Implementation Pattern

### 1. Rust Command Handler

```rust
// src-tauri/src/domains/tasks/ipc/task.rs
#[tauri::command]
pub async fn task_crud(
    state: AppState<'_>,
    request: TaskCrudRequest,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Task>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = state.task_service.clone();
    service.handle_crud(request, ctx).await
}
```

### 2. Frontend Wrapper (**ADR-013**)

```typescript
// frontend/src/domains/tasks/ipc/task.ipc.ts
import { safeInvoke, extractAndValidate, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export const taskIpc = {
  create: async (data: CreateTaskRequest): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: { action: { action: 'Create', data } }
    });
    invalidatePattern('task:');
    return extractAndValidate(result, validateTask) as Task;
  },
  // ... other methods
};
```

### 3. Command Registration

```rust
// src-tauri/src/main.rs
.invoke_handler(tauri::generate_handler![
    domains::auth::ipc::auth::auth_login,
    domains::tasks::ipc::task::task_crud,
    domains::inventory::ipc::material::material_create,
    // ...
])
```

## Top30 IPC Commands

| Command | Purpose | Params | Permissions | Rust Path | Frontend Consumer |
|---------|---------|--------|-------------|-----------|-------------------|
| `auth_login` | User login | credentials | Public | `domains::auth::ipc::auth` | `authIpc.login` |
| `auth_logout` | Session termination | — | Authenticated | `domains::auth::ipc::auth` | `authIpc.logout` |
| `auth_validate_session` | Session check | — | Authenticated | `domains::auth::ipc::auth` | `authIpc.validate` |
| `task_crud` | Task CRUD operations | TaskCrudRequest | Role-based | `domains::tasks::ipc::task` | `taskIpc.create/update/delete` |
| `edit_task` | Task editing | EditTaskRequest | Technician+ | `domains::tasks::ipc::task` | `taskIpc.edit` |
| `task_transition_status` | Status change | TaskTransitionRequest | Role-based | `domains::tasks::ipc::task` | `taskIpc.transitionStatus` |
| `material_create` | Create material | CreateMaterialRequest | Technician+ | `domains::inventory::ipc::material` | `materialIpc.create` |
| `material_list` | List materials | Filters | All | `domains::inventory::ipc::material` | `materialIpc.list` |
| `material_update_stock` | Stock adjustment | StockUpdateRequest | Technician+ | `domains::inventory::ipc::material` | `materialIpc.updateStock` |
| `quote_create` | Create quote | CreateQuoteRequest | Supervisor+ | `domains::quotes::ipc::quote` | `quoteIpc.create` |
| `quote_mark_accepted` | Accept quote | QuoteId | Supervisor+ | `domains::quotes::ipc::quote` | `quoteIpc.markAccepted` |
| `quote_export_pdf` | Export PDF | QuoteId | All | `domains::quotes::ipc::quote` | `quoteIpc.exportPdf` |
| `client_crud` | Client CRUD | ClientCrudRequest | Role-based | `domains::clients::client_handler` | `clientIpc.crud` |
| `user_crud` | User management | UserCrudRequest | Admin | `domains::users::ipc::user` | `userIpc.crud` |
| `intervention_start` | Start intervention | InterventionId | Technician | `domains::interventions::ipc` | `interventionIpc.start` |
| `intervention_complete` | Complete intervention | InterventionId | Technician | `domains::interventions::ipc` | `interventionIpc.complete` |

## Frontend IPC Architecture

```
frontend/src/lib/ipc/
├── client.ts           # ipcClient object with all domain modules
├── commands.ts         # IPC_COMMANDS constant
├── utils.ts            # safeInvoke, error mapping
├── core/
│   ├── safeInvoke.ts   # Session injection, timeout, metrics
│   ├── cachedInvoke.ts # Cached invocation
│   └── invalidate.ts   # Pattern-based cache invalidation
```

## Protocol Rules

| Rule | Enforcement |
|------|-------------|
| Versioning | Not currently used; backward compatibility maintained manually |
| Binary Data | Large files (photos) via Tauri custom protocol or base64 (small) |
| Validation | Frontend: Zod schemas; Backend: `resolve_context!` + domain rules |
| Errors | Translated from `AppError` to `ApiError` at boundary (**ADR-019**) |

## Adding a New IPC Command

1. **Define types** in `domains/*/domain/models/` with `#[derive(TS)]`
2. **Create handler** in `domains/*/ipc/`
3. **Register** in `src-tauri/src/main.rs`
4. **Run** `npm run types:sync`
5. **Create wrapper** in `frontend/src/domains/*/ipc/`
6. **Add command string** to `frontend/src/lib/ipc/commands.ts`
7. **Create React Query hook** in `frontend/src/domains/*/api/`