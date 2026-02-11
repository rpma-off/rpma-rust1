# 05 - IPC API and Contracts

## IPC Contract Rules

RPMA v2 uses **Tauri's IPC** mechanism for communication between the Next.js frontend and the Rust backend.

### Core Principles

1. **Session Token Required**: All protected commands require a `session_token` parameter
2. **Typed Requests/Responses**: All data structures are strictly typed via `ts-rs` (Rust → TypeScript)
3. **Standard Response Envelope**: Commands return `ApiResponse<T>` with consistent structure
4. **Error Handling**: Errors follow the `AppError` enum with specific error codes

---

### IPC Response Envelope

**Standard Response**:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;                 // Present if success = true
  error?: {                 // Present if success = false
    message: string;
    code: string;
    details?: any;
  };
}
```

**Example Success Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "title": "Install PPF on BMW",
    "status": "assigned"
  }
}
```

**Example Error Response**:
```json
{
  "success": false,
  "error": {
    "message": "Only admins and supervisors can create tasks",
    "code": "AUTHORIZATION_ERROR"
  }
}
```

---

### Compression & Streaming

**Large Payloads** (>1KB) can use **CompressedApiResponse**:
- `compressed: boolean` - Indicates if data is compressed
- `data: string` - base64-encoded gzip data (if compressed)

**Streaming** is available for large lists (e.g., 10,000+ tasks):
- Backend sends data in chunks
- Frontend processes incrementally
- Use `ChunkedQuery` API

---

## Type Sync Mechanism

**Workflow**:
1. Rust models are annotated with `#[derive(Serialize, TS)]` and `#[ts(export)]`
2. Running `npm run types:sync` invokes `cargo run --bin export-types`
3. Rust binary exports all TS-annotated types to JSON
4. Script `scripts/write-types.js` converts JSON → TypeScript files
5. Generated files appear in `frontend/src/types/`

**Where Types Are Generated**:
- `frontend/src/types/database.types.ts` - Auto-generated from Rust models
- `frontend/src/types/unified.ts` - Aggregated types

**⚠️  WARNING**: **NEVER manually edit these files!** Changes will be overwritten on next `types:sync`.

---

##  Top 30 Most Important IPC Commands

### Authentication & Authorization (5 commands)

#### 1. `login`

**Purpose**: Authenticate user and create session

**Parameters**:
```typescript
{
  email: string,
  password: string
}
```

**Returns**: `ApiResponse<{ user: UserAccount, session_token: string, refresh_token: string }>`

**Permissions**: Public (no session required)

**Backend**: `src-tauri/src/commands/auth.rs::login`

**Frontend**: `frontend/src/lib/ipc/domains/auth.ts::login`

---

#### 2. `logout`

**Purpose**: Invalidate session token

**Parameters**:
```typescript
{
  session_token: string
}
```

**Returns**: `ApiResponse<void>`

**Permissions**: Authenticated user

**Backend**: `src-tauri/src/commands/auth.rs::logout`

---

#### 3. `validate_session`

**Purpose**: Check if session token is still valid

**Parameters**:
```typescript
{
  session_token: string
}
```

**Returns**: `ApiResponse<{ valid: boolean, user?: UserAccount }>`

**Permissions**: Any

**Backend**: `src-tauri/src/commands/auth.rs::validate_session`

---

#### 4. `refresh_session`

**Purpose**: Extend session using refresh token

**Parameters**:
```typescript
{
  refresh_token: string
}
```

**Returns**: `ApiResponse<{ session_token: string, refresh_token: string }>`

**Permissions**: Public

**Backend**: `src-tauri/src/commands/auth.rs::refresh_session`

---

#### 5. `get_current_user`

**Purpose**: Get authenticated user details

**Parameters**:
```typescript
{
  session_token: string
}
```

**Returns**: `ApiResponse<UserAccount>`

**Permissions**: Authenticated

**Backend**: `src-tauri/src/commands/auth.rs::get_current_user`

---

### Task Management (8 commands)

#### 6. `task_create`

**Purpose**: Create a new task

**Parameters**:
```typescript
{
  session_token: string,
  data: {
    title: string,
    description?: string,
    client_id?: string,
    vehicle_plate: string,
    vehicle_model?: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent',
    ppf_zones?: string[],
    scheduled_date?: string  // ISO 8601
  }
}
```

**Returns**: `ApiResponse<Task>`

**Permissions**: Admin, Supervisor

**Backend**: `src-tauri/src/commands/task/facade.rs::task_create`

**Frontend**: `frontend/src/lib/ipc/domains/task.ts::createTask`

---

#### 7. `task_update`

**Purpose**: Update an existing task

**Parameters**:
```typescript
{
  session_token: string,
  task_id: string,
  data: {
    title?: string,
    description?: string,
    status?: TaskStatus,
    priority?: TaskPriority,
    technician_id?: string,
    scheduled_date?: string
  }
}
```

**Returns**: `ApiResponse<Task>`

**Permissions**: Admin, Supervisor (or assigned Technician for limited fields)

**Backend**: `src-tauri/src/commands/task/facade.rs::task_update`

---

#### 8. `task_get`

**Purpose**: Get task by ID

**Parameters**:
```typescript
{
  session_token: string,
  task_id: string
}
```

**Returns**: `ApiResponse<Task>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/task/facade.rs::task_get`

---

#### 9. `task_list`

**Purpose**: List tasks with filtering and pagination

**Parameters**:
```typescript
{
  session_token: string,
  filters?: {
    status?: TaskStatus,
    priority?: TaskPriority,
    technician_id?: string,
    client_id?: string,
    search?: string,
    limit?: number,
    offset?: number,
    sort_field?: string,
    sort_order?: 'asc' | 'desc'
  }
}
```

**Returns**: `ApiResponse<{ data: Task[], total: number, limit: number, offset: number }>`

**Permissions**: All authenticated (Technicians see only assigned tasks unless Admin/Supervisor)

**Backend**: `src-tauri/src/commands/task/facade.rs::task_list`

---

#### 10. `task_delete`

**Purpose**: Delete a task (soft or hard delete)

**Parameters**:
```typescript
{
  session_token: string,
  task_id: string
}
```

**Returns**: `ApiResponse<void>`

**Permissions**: Admin only

**Backend**: `src-tauri/src/commands/task/facade.rs::task_delete`

---

#### 11. `task_assign`

**Purpose**: Assign task to technician

**Parameters**:
```typescript
{
  session_token: string,
  task_id: string,
  technician_id: string,
  scheduled_date?: string
}
```

**Returns**: `ApiResponse<Task>`

**Permissions**: Admin, Supervisor

**Backend**: `src-tauri/src/commands/task/facade.rs::task_assign`

---

#### 12. `task_get_statistics`

**Purpose**: Get task statistics (counts by status, priority, etc.)

**Parameters**:
```typescript
{
  session_token: string,
  filters?: { ... }
}
```

**Returns**: `ApiResponse<TaskStatistics>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/task/facade.rs::task_get_statistics`

---

#### 13. `task_import_batch`

**Purpose**: Bulk import tasks from external data (CSV, Excel)

**Parameters**:
```typescript
{
  session_token: string,
  tasks: CreateTaskRequest[],
  validation_mode?: 'strict' | 'lenient'
}
```

**Returns**: `ApiResponse<{ imported: number, failed: number, errors?: string[] }>`

**Permissions**: Admin, Supervisor

**Backend**: `src-tauri/src/commands/task/facade.rs::task_import_batch`

---

### Client Management (4 commands)

#### 14. `client_create`

**Purpose**: Create a new client

**Parameters**:
```typescript
{
  session_token: string,
  data: {
    name: string,
    email?: string,
    phone?: string,
    address?: string,
    customer_type?: 'individual' | 'business',
    company_name?: string,
    siret?: string
  }
}
```

**Returns**: `ApiResponse<Client>`

**Permissions**: Admin, Supervisor, Technician

**Backend**: `src-tauri/src/commands/client.rs::client_create`

**Frontend**: `frontend/src/lib/ipc/domains/client.ts::createClient`

---

#### 15. `client_update`

**Purpose**: Update client information

**Parameters**:
```typescript
{
  session_token: string,
  client_id: string,
  data: { name?: string, email?: string, ... }
}
```

**Returns**: `ApiResponse<Client>`

**Permissions**: Admin, Supervisor, Technician

**Backend**: `src-tauri/src/commands/client.rs::client_update`

---

#### 16. `client_get`

**Purpose**: Get client by ID

**Parameters**:
```typescript
{
  session_token: string,
  client_id: string
}
```

**Returns**: `ApiResponse<Client>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/client.rs::client_get`

---

#### 17. `client_list`

**Purpose**: List clients with pagination

**Parameters**:
```typescript
{
  session_token: string,
  filters?: {
    search?: string,
    customer_type?: CustomerType,
    limit?: number,
    offset?: number
  }
}
```

**Returns**: `ApiResponse<{ data: Client[], total: number }>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/client.rs::client_list`

---

### Intervention Workflow (7 commands)

#### 18. `intervention_start`

**Purpose**: Start an intervention for a task

**Parameters**:
```typescript
{
  session_token: string,
  task_id: string,
  task_number: string,
  vehicle_plate: string
}
```

**Returns**: `ApiResponse<Intervention>`

**Permissions**: Assigned Technician, Supervisor, Admin

**Backend**: `src-tauri/src/commands/intervention/start.rs::intervention_start`

**Frontend**: `frontend/src/lib/ipc/domains/intervention.ts::startIntervention`

---

#### 19. `intervention_get`

**Purpose**: Get intervention details

**Parameters**:
```typescript
{
  session_token: string,
  intervention_id: string
}
```

**Returns**: `ApiResponse<Intervention>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/intervention/get.rs::intervention_get`

---

#### 20. `intervention_get_active_by_task`

**Purpose**: Get active intervention for a task (if any)

**Parameters**:
```typescript
{
  session_token: string,
  task_id: string
}
```

**Returns**: `ApiResponse<Intervention | null>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/intervention/get.rs::intervention_get_active_by_task`

---

#### 21. `intervention_advance_step`

**Purpose**: Mark current step as complete and advance to next step

**Parameters**:
```typescript
{
  session_token: string,
  intervention_id: string,
  step_id: string,
  notes?: string,
  photo_file?: string,  // base64-encoded image
  material_consumption?: { material_id: string, quantity: number }[]
}
```

**Returns**: `ApiResponse<Intervention>`

**Permissions**: Assigned Technician, Supervisor, Admin

**Backend**: `src-tauri/src/commands/intervention/advance_step.rs::intervention_advance_step`

---

#### 22. `intervention_pause`

**Purpose**: Pause an in-progress intervention

**Parameters**:
```typescript
{
  session_token: string,
  intervention_id: string,
  pause_reason?: string
}
```

**Returns**: `ApiResponse<Intervention>`

**Permissions**: Assigned Technician, Supervisor, Admin

**Backend**: `src-tauri/src/commands/intervention/pause.rs::intervention_pause`

---

#### 23. `intervention_resume`

**Purpose**: Resume a paused intervention

**Parameters**:
```typescript
{
  session_token: string,
  intervention_id: string
}
```

**Returns**: `ApiResponse<Intervention>`

**Permissions**: Assigned Technician, Supervisor, Admin

**Backend**: `src-tauri/src/commands/intervention/resume.rs::intervention_resume`

---

#### 24. `intervention_finalize`

**Purpose**: Mark intervention as completed

**Parameters**:
```typescript
{
  session_token: string,
  intervention_id: string,
  quality_score?: number,  // 0-100
  final_notes?: string
}
```

**Returns**: `ApiResponse<Intervention>`

**Permissions**: Assigned Technician, Supervisor, Admin

**Backend**: `src-tauri/src/commands/intervention/finalize.rs::intervention_finalize`

---

### Material Management (3 commands)

#### 25. `material_list`

**Purpose**: List all materials/inventory items

**Parameters**:
```typescript
{
  session_token: string,
  filters?: {
    category?: 'film' | 'tool' | 'consumable' | 'accessory',
    low_stock?: boolean,
    limit?: number,
    offset?: number
  }
}
```

**Returns**: `ApiResponse<Material[]>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/material.rs::material_list`

---

#### 26. `material_update_stock`

**Purpose**: Adjust material stock level

**Parameters**:
```typescript
{
  session_token: string,
  material_id: string,
  quantity_delta: number,  // Can be negative
  reason?: string
}
```

**Returns**: `ApiResponse<Material>`

**Permissions**: Admin, Supervisor

**Backend**: `src-tauri/src/commands/material.rs::material_update_stock`

---

#### 27. `material_record_consumption`

**Purpose**: Record material usage during an intervention

**Parameters**:
```typescript
{
  session_token: string,
  intervention_id: string,
  material_id: string,
  quantity: number
}
```

**Returns**: `ApiResponse<void>`

**Permissions**: Assigned Technician, Supervisor, Admin

**Backend**: `src-tauri/src/commands/material.rs::material_record_consumption`

---

### Reports & Analytics (3 commands)

#### 28. `get_task_completion_report`

**Purpose**: Generate task completion report for date range

**Parameters**:
```typescript
{
  session_token: string,
  start_date: string,  // ISO 8601
  end_date: string,
  format?: 'json' | 'pdf',
  filters?: { technician_id?: string, status?: TaskStatus }
}
```

**Returns**: `ApiResponse<TaskCompletionReport>` or PDF file URL

**Permissions**: Admin, Supervisor

**Backend**: `src-tauri/src/commands/reports/task_completion.rs::get_task_completion_report`

---

#### 29. `get_material_usage_report`

**Purpose**: Get material consumption summary

**Parameters**:
```typescript
{
  session_token: string,
  start_date: string,
  end_date: string,
  material_ids?: string[]
}
```

**Returns**: `ApiResponse<MaterialUsageReport>`

**Permissions**: Admin, Supervisor

**Backend**: `src-tauri/src/commands/reports/material_usage.rs::get_material_usage_report`

---

#### 30. `get_dashboard_analytics`

**Purpose**: Get dashboard summary (task counts, interventions, alerts)

**Parameters**:
```typescript
{
  session_token: string
}
```

**Returns**: `ApiResponse<DashboardAnalytics>`

**Permissions**: All authenticated

**Backend**: `src-tauri/src/commands/analytics.rs::get_dashboard_analytics`

---

## IPC Error Codes

| Error Code | HTTP Equivalent | Description |
|------------|-----------------|-------------|
| `AUTH_ERROR` | 401 | Invalid or missing session token |
| `AUTHORIZATION_ERROR` | 403 | User lacks required permissions |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `NOT_FOUND` | 404 | Entity not found |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERVENTION_ALREADY_ACTIVE` | 409 | Conflict: intervention already active |
| `INTERVENTION_INVALID_STATE` | 409 | Invalid state transition |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Frontend IPC Client Pattern

**Recommended Pattern**:
```typescript
// frontend/src/lib/ipc/domains/task.ts

import { invoke } from '@tauri-apps/api/core';
import type { ApiResponse, Task, CreateTaskRequest } from '@/types';

export async function createTask(
  sessionToken: string,
  data: CreateTaskRequest
): Promise<ApiResponse<Task>> {
  try {
    return await invoke<ApiResponse<Task>>('task_create', {
      session_token: sessionToken,
      data
    });
  } catch (error) {
    // Network or serialization error (not business logic error)
    console.error('IPC call failed:', error);
    throw error;
  }
}
```

**Error Handling in Component**:
```typescript
const response = await createTask(sessionToken, data);
if (response.success) {
  // Handle success
  toast.success('Task created!');
  navigate(`/tasks/${response.data.id}`);
} else {
  // Handle business error
  toast.error(response.error?.message || 'Unknown error');
}
```

---

## Next Steps

- **Security & RBAC**: [06_SECURITY_AND_RBAC.md](./06_SECURITY_AND_RBAC.md)
- **Database & migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
- **Dev workflows**: [08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)
