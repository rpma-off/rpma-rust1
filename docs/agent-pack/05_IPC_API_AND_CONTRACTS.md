# 05 - IPC API and Contracts

## IPC Contract Rules

RPMA v2 uses **Tauri's IPC** mechanism for communication between the Next.js frontend and the Rust backend.

### Core Principles

1. **Session Token Required**: All protected commands require `session_token` parameter
2. **Typed Requests/Responses**: All data structures typed via `ts-rs` (Rust → TypeScript)
3. **Standard Response Envelope**: Commands return `ApiResponse<T>` with consistent structure
4. **Error Handling**: Errors follow the `AppError` enum with specific error codes

---

## IPC Response Envelope

All IPC commands return a consistent response structure defined in `src-tauri/src/commands/mod.rs`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;                 // Present if success = true
  error?: {                 // Present if success = false
    message: string;
    code: string;           // AppError variant name
  };
  metadata?: {              // Optional performance/debug info
    duration_ms?: number;
    correlation_id?: string;
  };
}
```

**Compressed Response**: For payloads >1KB, backend can return `CompressedApiResponse` using MessagePack serialization (`commands/mod.rs:377-522`).

---

## Type Sync Mechanism

**Command**: `npm run types:sync`

**Flow**:
1. Rust models annotated with `#[derive(Serialize, Deserialize, TS)]` and `#[ts(export)]`
2. `cargo run --bin export-types` (located at `src-tauri/src/bin/export-types.rs`) exports types to stdout as JSON
3. `scripts/write-types.js` converts JSON to TypeScript and writes to `frontend/src/lib/backend.ts`
4. Frontend imports types from `@/lib/backend`

**⚠️ CRITICAL**: **NEVER manually edit** `frontend/src/lib/backend.ts`! Always regenerate with `npm run types:sync`

**Validation Commands**:
```bash
npm run types:validate       # Validates generated types
npm run types:drift-check    # Detects Rust/TS mismatches
npm run types:generate-docs  # Generates type documentation
```

---

## Top 30 Important Commands

| Command | Purpose | Params | Permissions | Rust Impl | Frontend |
|---------|---------|--------|-------------|-----------|----------|
| `auth_login` | Authenticate user | email, password, correlation_id? | Public | `commands/auth.rs:31-77` | `lib/ipc/domains/auth.ts` |
| `auth_logout` | Invalidate session | session_token | Authenticated | `commands/auth.rs:153-172` | `lib/ipc/domains/auth.ts` |
| `auth_validate_session` | Check session validity | session_token | Any | `commands/auth.rs:174-193` | `lib/ipc/domains/auth.ts` |
| `auth_refresh_token` | Extend session | refresh_token | Public | `commands/auth.rs:195-214` | `lib/ipc/domains/auth.ts` |
| `enable_2fa` | Generate 2FA setup | session_token | Authenticated | `commands/auth.rs:216-243` | `lib/ipc/domains/auth.ts` |
| `verify_2fa_setup` | Verify and enable 2FA | session_token, code | Authenticated | `commands/auth.rs:245-276` | `lib/ipc/domains/auth.ts` |
| `disable_2fa` | Disable 2FA | session_token, password | Authenticated | `commands/auth.rs:278-306` | `lib/ipc/domains/auth.ts` |
| `verify_2fa_code` | Verify TOTP code | session_token, code | Authenticated | `commands/auth.rs:352-387` | `lib/ipc/domains/auth.ts` |
| `task_crud` | Unified task CRUD | action: TaskAction | Role-based | `commands/task/facade.rs` | `lib/ipc/domains/tasks.ts` |
| `edit_task` | Edit existing task | task_id, data | Admin/Supervisor/Assigned | `commands/task/facade.rs` | `lib/ipc/domains/tasks.ts` |
| `delay_task` | Reschedule task | task_id, reason | Admin/Supervisor/Assigned | `commands/task/facade.rs` | `lib/ipc/domains/tasks.ts` |
| `export_tasks_csv` | Export to CSV | filter | Authenticated | `commands/task/facade.rs` | `lib/ipc/domains/tasks.ts` |
| `import_tasks_bulk` | Bulk import | data | Admin/Supervisor | `commands/task/facade.rs` | `lib/ipc/domains/tasks.ts` |
| `client_crud` | Unified client CRUD | action: ClientAction | Role-based | `commands/client.rs` | `lib/ipc/domains/clients.ts` |
| `intervention_start` | Start intervention | task_id, request | Technician+ | `commands/intervention/workflow.rs` | `lib/ipc/domains/interventions.ts` |
| `intervention_workflow` | Advance/pause/resume | intervention_id, action | Assigned Technician | `commands/intervention/workflow.rs` | `lib/ipc/domains/interventions.ts` |
| `intervention_finalize` | Mark completed | intervention_id, data | Assigned Technician | `commands/intervention/workflow.rs` | `lib/ipc/domains/interventions.ts` |
| `intervention_get` | Get by ID | id | Authenticated | `commands/intervention/queries.rs` | `lib/ipc/domains/interventions.ts` |
| `intervention_get_active_by_task` | Get active for task | task_id | Authenticated | `commands/intervention/queries.rs` | `lib/ipc/domains/interventions.ts` |
| `material_create` | Create material | request | Authenticated | `commands/material.rs` | `lib/ipc/domains/material.ts` |
| `material_list` | List materials | filters | Authenticated | `commands/material.rs` | `lib/ipc/domains/material.ts` |
| `material_record_consumption` | Record usage | data | Authenticated | `commands/material.rs` | `lib/ipc/domains/material.ts` |
| `quote_create` | Create quote | request | Technician+ | `commands/quote.rs` | `lib/ipc/domains/quotes.ts` |
| `quote_export_pdf` | Export as PDF | quote_id | Technician+ | `commands/quote.rs` | `lib/ipc/domains/quotes.ts` |
| `calendar_get_tasks` | Calendar tasks | date_range, filters | Authenticated | `commands/calendar.rs` | `lib/ipc/domains/calendar.ts` |
| `calendar_check_conflicts` | Check conflicts | technician_id, start, end | Authenticated | `commands/calendar.rs` | `lib/ipc/domains/calendar.ts` |
| `get_task_completion_report` | Task report | date_range, filters | Admin/Supervisor | `commands/reports/core.rs` | `lib/ipc/domains/reports.ts` |
| `get_entity_counts` | Entity counts | - | Authenticated | `commands/reports/mod.rs` | `lib/ipc/domains/reports.ts` |
| `user_crud` | Unified user CRUD | action: UserAction | Role-based | `commands/user.rs` | `lib/ipc/domains/users.ts` |
| `get_app_info` | App version | - | Any | `commands/system.rs` | `lib/ipc/domains/system.ts` |
| `health_check` | DB health | - | Any | `commands/system.rs` | `lib/ipc/domains/system.ts` |
| `get_security_metrics` | Security stats | session_token | Admin | `commands/security.rs` | `lib/ipc/domains/security.ts` |
| `sync_get_status` | Sync status | session_token | Authenticated | `commands/sync.rs` | `lib/ipc/domains/sync.ts` |
| `sync_now` | Trigger sync | session_token | Authenticated | `commands/sync.rs` | `lib/ipc/domains/sync.ts` |

**Total Commands Registered**: **236 commands** in `src-tauri/src/main.rs:69-306`

---

## Command Details

### Authentication Commands

#### `auth_login`

**Parameters**:
```typescript
{ email: string, password: string, correlation_id?: string }
```

**Returns**: `ApiResponse<UserSession>`

**Backend**: `src-tauri/src/commands/auth.rs:31`

**Service**: `src-tauri/src/services/auth.rs:449-666` (authenticate method)

---

#### 2FA Commands

| Command | Purpose | Backend |
|---------|---------|---------|
| `enable_2fa` | Generate 2FA setup | `auth.rs:216` |
| `verify_2fa_setup` | Verify and enable | `auth.rs:245` |
| `disable_2fa` | Disable 2FA | `auth.rs:278` |
| `verify_2fa_code` | Verify code | `auth.rs:352` |

**2FA Service**: `src-tauri/src/services/two_factor.rs`
- Algorithm: TOTP (SHA-1)
- Code length: 6 digits
- Time window: 30 seconds

---

### Task Commands

#### `task_crud` (Unified)

**Action Variants**:
```typescript
type TaskAction =
  | { Create: { data: CreateTaskRequest } }
  | { Get: { id: string } }
  | { Update: { id: string, data: UpdateTaskRequest } }
  | { Delete: { id: string } }
  | { List: { filters: TaskQuery } }
  | { GetStatistics };
```

**Backend**: `src-tauri/src/commands/task/facade.rs`

---

### Intervention Commands

#### `intervention_start`

**Parameters**:
```typescript
{
  session_token: string,
  request: {
    task_id: string,
    intervention_type: string,
    priority: string,
    estimated_duration_minutes?: number
  }
}
```

**Returns**: `ApiResponse<Intervention>`

**Backend**: `src-tauri/src/commands/intervention/workflow.rs`

---

#### `intervention_finalize`

**Parameters**:
```typescript
{
  session_token: string,
  request: {
    intervention_id: string,
    collected_data?: any,
    photos?: string[],
    quality_score?: number,
    customer_signature?: string
  }
}
```

**Backend**: `src-tauri/src/commands/intervention/workflow.rs`

---

### Client Commands

#### `client_crud` (Unified)

**Action Variants**:
```typescript
type ClientAction =
  | { Create: { data: CreateClientRequest } }
  | { Get: { id: string } }
  | { GetWithTasks: { id: string } }
  | { Update: { id: string, data: UpdateClientRequest } }
  | { Delete: { id: string } }
  | { List: { filters: ClientQuery } }
  | { ListWithTasks: { filters: ClientQuery, limit_tasks?: number } }
  | { Search: { query: string, limit: number } }
  | { Stats };
```

**Backend**: `src-tauri/src/commands/client.rs`

---

### Material Commands

| Command | Purpose |
|---------|---------|
| `material_create` | Create material |
| `material_get` | Get by ID |
| `material_get_by_sku` | Get by SKU |
| `material_list` | List with filters |
| `material_update` | Update |
| `material_update_stock` | Adjust stock |
| `material_record_consumption` | Record usage |
| `material_get_low_stock` | Low stock alerts |
| `material_get_expired` | Expired materials |
| `material_get_stats` | Statistics |

**Backend**: `src-tauri/src/commands/material.rs`

---

### Reports Commands

| Command | Purpose |
|---------|---------|
| `get_task_completion_report` | Task completion metrics |
| `get_technician_performance_report` | Performance |
| `get_client_analytics_report` | Client analytics |
| `get_quality_compliance_report` | Quality metrics |
| `get_material_usage_report` | Material usage |
| `get_entity_counts` | All entity counts |
| `search_records` | Cross-entity search |
| `export_report_data` | Export |
| `export_intervention_report` | Intervention export |

**Backend**: `src-tauri/src/commands/reports/`

---

### System Commands

| Command | Purpose | Backend |
|---------|---------|---------|
| `health_check` | Database health | `system.rs` |
| `get_app_info` | Version, build info | `system.rs` |
| `get_database_stats` | DB statistics | `system.rs` |
| `diagnose_database` | DB diagnostics | `system.rs` |

---

### Sync Commands

| Command | Purpose | Backend |
|---------|---------|---------|
| `sync_start_background_service` | Start sync (30s interval) | `sync.rs` |
| `sync_stop_background_service` | Stop sync | `sync.rs` |
| `sync_now` | Immediate sync | `sync.rs` |
| `sync_get_status` | Status + metrics | `sync.rs` |
| `sync_get_operations_for_entity` | Entity operations | `sync.rs` |

---

## IPC Error Codes

| Error Code | Description |
|------------|-------------|
| `AUTH_ERROR` | Invalid/missing session token |
| `AUTHORIZATION_ERROR` | Lacks required permissions |
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Entity not found |
| `DATABASE_ERROR` | Database operation failed |
| `INTERVENTION_ALREADY_ACTIVE` | Conflict |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Frontend IPC Client Pattern

```typescript
// frontend/src/lib/ipc/domains/tasks.ts
import { invoke } from '@tauri-apps/api/core';
import { ipcClient } from '@/lib/ipc/client';

// Using ipcClient (recommended)
const task = await ipcClient.tasks.create(data, sessionToken);

// Direct invoke
const response = await invoke<ApiResponse<Task>>('task_crud', {
  request: { session_token, action: { Create: { data } } }
});

// Error handling
if (response.success) {
  toast.success('Task created!');
} else {
  toast.error(response.error?.message || 'Unknown error');
}
```

---

## Next Steps

- **Security & RBAC**: [06_SECURITY_AND_RBAC.md](./06_SECURITY_AND_RBAC.md)
- **Database & migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
- **Dev workflows**: [08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)
