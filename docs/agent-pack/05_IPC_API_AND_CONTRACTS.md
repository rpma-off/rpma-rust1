# 05 — IPC API and Contracts

## IPC Contract Rules

1. **Response envelope**: All commands return `Result<ApiResponse<T>, AppError>`.
   `ApiResponse<T>` carries `{ success, data, error, correlation_id }`.
2. **Authentication**: Protected commands require an active session. The IPC handler always calls `resolve_context!()` first.
3. **Correlation IDs** (ADR-020): Every request DTO includes `correlation_id: Option<String>`. `safeInvoke` injects it automatically from the frontend.
4. **DTOs**: Domain types must not leak to IPC. Use request/response struct pairs in `ipc/*/types.rs`.
5. **No business logic in IPC**: Handlers only resolve context, delegate to application service, and wrap the result.

## IPC Response Envelope

```rust
// Rust
ApiResponse::success(data).with_correlation_id(Some(ctx.correlation_id))
ApiResponse::error(app_error)
```

```typescript
// TypeScript (auto-generated in frontend/src/types/)
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  correlation_id?: string;
}
```

## Key Commands Reference

### Auth (`domains/auth/ipc/auth.rs`, `auth_security.rs`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `auth_login` | Login with email+password, returns session | None (public) | `domains/auth/ipc/auth.ipc.ts` |
| `auth_logout` | Invalidate session | Any | `domains/auth/ipc/auth.ipc.ts` |
| `auth_validate_session` | Check session validity | Any | `domains/auth/ipc/auth.ipc.ts` |
| `change_password` | Update own password | Any | `domains/auth/ipc/auth.ipc.ts` |
| `has_admins` | Check if any admin exists (bootstrap) | None (public) | `domains/bootstrap/ipc/bootstrap.ipc.ts` |
| `bootstrap_first_admin` | Create first admin account | None (public) | `domains/bootstrap/ipc/bootstrap.ipc.ts` |

### Users (`domains/users/ipc/user.rs`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `user_crud` | Unified user CRUD dispatcher | Admin | `domains/users/ipc/users.ipc.ts` |
| `create_user` | Create user with role | Admin | `domains/users/ipc/users.ipc.ts` |
| `update_user` | Update user profile/role | Admin | `domains/users/ipc/users.ipc.ts` |
| `list_users` | List all users (with filters) | Admin | `domains/users/ipc/users.ipc.ts` |

### Tasks (`domains/tasks/ipc/task/facade.rs`, `ipc/status/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `task_create` | Create task | Supervisor | `domains/tasks/ipc/task.ipc.ts` |
| `task_get` | Get single task | Viewer | `domains/tasks/ipc/task.ipc.ts` |
| `task_list` | List tasks with filters | Viewer | `domains/tasks/ipc/task.ipc.ts` |
| `task_update` | Update task fields | Supervisor | `domains/tasks/ipc/task.ipc.ts` |
| `update_task_status` | Transition task status | Technician | `domains/tasks/ipc/task.ipc.ts` |
| `task_statistics` | Aggregate task stats | Viewer | `domains/tasks/ipc/task.ipc.ts` |
| `add_task_note` | Append note to history | Technician | `domains/tasks/ipc/task.ipc.ts` |

### Interventions (`domains/interventions/ipc/intervention/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `intervention_start` | Start intervention for task | Technician | `domains/interventions/ipc/interventions.ipc.ts` |
| `intervention_get` | Get intervention state | Viewer | `domains/interventions/ipc/interventions.ipc.ts` |
| `intervention_advance_step` | Advance to next step | Technician | `domains/interventions/ipc/interventions.ipc.ts` |
| `intervention_finalize` | Complete intervention | Technician | `domains/interventions/ipc/interventions.ipc.ts` |
| `document_store_photo` | Upload photo to step | Technician | `domains/interventions/ipc/photos.ipc.ts` |
| `document_get_photos` | Get step photos | Viewer | `domains/interventions/ipc/photos.ipc.ts` |

### Inventory (`domains/inventory/ipc/material/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `material_create` | Add material | Admin | `domains/inventory/ipc/material.ipc.ts` |
| `material_list` | List materials (with filters) | Viewer | `domains/inventory/ipc/material.ipc.ts` |
| `material_update_stock` | Adjust stock level | Supervisor | `domains/inventory/ipc/material.ipc.ts` |
| `material_record_consumption` | Record usage on intervention | Technician | `domains/inventory/ipc/material.ipc.ts` |

### Clients (`domains/clients/ipc/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `client_create` | Create client record | Supervisor | `domains/clients/ipc/client.ipc.ts` |
| `client_get` | Get client by ID | Viewer | `domains/clients/ipc/client.ipc.ts` |
| `client_list` | List all clients | Viewer | `domains/clients/ipc/client.ipc.ts` |
| `client_search` | Search clients by name/email | Viewer | `domains/clients/ipc/client.ipc.ts` |
| `client_get_stats` | Client aggregate statistics | Supervisor | `domains/clients/ipc/client.ipc.ts` |

### Calendar (`domains/calendar/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `get_events` | List calendar events | Viewer | `lib/ipc/calendar.ts` |
| `create_event` | Create calendar event | Supervisor | `lib/ipc/calendar.ts` |
| `calendar_schedule_task` | Schedule task on calendar | Supervisor | `lib/ipc/calendar.ts` |
| `calendar_check_conflicts` | Detect scheduling conflicts | Supervisor | `lib/ipc/calendar.ts` |

### Quotes (`domains/quotes/ipc/quote/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `quote_create` | Create new quote | Supervisor | `domains/quotes/ipc/quotes.ipc.ts` |
| `quote_update` | Update quote items/status | Supervisor | `domains/quotes/ipc/quotes.ipc.ts` |
| `quote_mark_accepted` | Mark quote as accepted | Supervisor | `domains/quotes/ipc/quotes.ipc.ts` |
| `quote_export_pdf` | Export quote as PDF | Supervisor | `domains/quotes/ipc/quotes.ipc.ts` |
| `quote_convert_to_task` | Convert accepted quote to task | Supervisor | `domains/quotes/ipc/quotes.ipc.ts` |

### Settings (`domains/settings/ipc/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `get_app_settings` | Read global app settings (from SQLite) | Admin | `domains/settings/ipc/settings.ipc.ts` |
| `update_business_hours` | Update business hours config | Admin | `domains/settings/ipc/settings.ipc.ts` |
| `update_security_policies` | Update auth/session policies | Admin | `domains/settings/ipc/settings.ipc.ts` |

### Trash (`domains/trash/ipc/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `list_trash` | List soft-deleted records | Admin | `domains/trash/ipc/trash.ipc.ts` |
| `restore_entity` | Restore soft-deleted record | Admin | `domains/trash/ipc/trash.ipc.ts` |
| `hard_delete_entity` | Permanently delete record | Admin | `domains/trash/ipc/trash.ipc.ts` |
| `empty_trash` | Purge all soft-deleted records | Admin | `domains/trash/ipc/trash.ipc.ts` |

### Reports / Documents (`domains/documents/ipc/`)
| Command | Purpose | Min Role | Frontend Caller |
|---------|---------|----------|----------------|
| `export_intervention_report` | Generate PDF report | Supervisor | `domains/reports/ipc/reports.ipc.ts` |

## Type Sync Mechanism (ADR-015, ts-rs)

**How it works:**
1. Rust structs annotated with `#[derive(TS)]` + `#[ts(export)]`
2. Binary `src-tauri/src/bin/export-types.rs` generates `.ts` files
3. Output lands in `frontend/src/types/` (auto-generated — never hand-edit)

**Commands:**
```bash
npm run types:sync          # Export types + record timestamp
npm run types:export        # Raw export only
npm run types:drift-check   # Detect if types are out of sync
```

**When to run:** After any change to a `#[derive(TS)]` struct or IPC-facing model.

## Frontend safeInvoke Pattern (`frontend/src/lib/ipc/utils.ts`)

All domain IPC wrappers call `safeInvoke` or `cachedInvoke`:

```typescript
// Write operation (no cache)
await safeInvoke('task_create', { ...payload, correlation_id: generateId() });

// Read operation (cached, TTL 60s)
await cachedInvoke(`task:${id}`, 'task_get', { id }, validateTask, 60_000);
```

`safeInvoke` automatically:
- Injects `session_token` from active auth context
- Injects `correlation_id` if not already present
- Normalizes backend `AppError` codes to French user messages
- Enforces 15-second timeout
- Records IPC call metrics
