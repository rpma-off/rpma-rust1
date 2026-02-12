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

## IPC Commands Reference

### Authentication & Authorization Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `auth_login` | Authenticate user and create session | Public |
| `auth_create_account` | Create new user account | Public |
| `auth_logout` | Invalidate session token | Authenticated |
| `auth_validate_session` | Check if session token is valid | Any |
| `auth_refresh_token` | Extend session using refresh token | Public |
| `enable_2fa` | Generate 2FA setup for current user | Authenticated |
| `verify_2fa_setup` | Verify 2FA setup and enable 2FA | Authenticated |
| `disable_2fa` | Disable 2FA for current user | Authenticated |
| `verify_2fa_code` | Verify 2FA code during sensitive operations | Authenticated |
| `is_2fa_enabled` | Check if 2FA is enabled for current user | Authenticated |
| `regenerate_backup_codes` | Regenerate 2FA backup codes | Authenticated |

#### `auth_login`

**Purpose**: Authenticate user and create session

**Parameters**:
```typescript
{
  email: string,
  password: string,
  correlation_id?: string
}
```

**Returns**: `ApiResponse<UserSession>`

**Backend**: `src-tauri/src/commands/auth.rs::auth_login`

---

#### `enable_2fa`

**Purpose**: Generate 2FA setup data for the current user

**Parameters**:
```typescript
{
  session_token: string
}
```

**Returns**: `ApiResponse<TwoFactorSetup>`

**Backend**: `src-tauri/src/commands/auth.rs::enable_2fa`

---

### Task Management Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `task_crud` | Unified CRUD for tasks (Create, Get, Update, Delete, List, GetStatistics) | Role-based |
| `edit_task` | Edit an existing task | Admin, Supervisor, Assigned Technician |
| `delay_task` | Reschedule a task with reason | Admin, Supervisor, Assigned Technician |
| `add_task_note` | Add a note to a task | Authenticated |
| `send_task_message` | Send message related to a task | Authenticated |
| `report_task_issue` | Report an issue with a task | Authenticated |
| `export_tasks_csv` | Export tasks to CSV format | Authenticated |
| `import_tasks_bulk` | Bulk import tasks from CSV | Admin, Supervisor |
| `get_tasks_with_clients` | Get tasks with client information | Authenticated |
| `get_user_assigned_tasks` | Get tasks assigned to a user | Authenticated |
| `get_task_statistics` | Get task statistics | Authenticated |
| `get_completion_rate` | Get task completion rate | Authenticated |
| `get_average_duration_by_status` | Get average duration by status | Authenticated |
| `get_priority_distribution` | Get task priority distribution | Authenticated |
| `check_task_assignment` | Check if task is assigned to user | Authenticated |
| `check_task_availability` | Check task availability | Authenticated |
| `validate_task_assignment_change` | Validate task assignment change | Authenticated |

#### `task_crud`

**Purpose**: Unified CRUD operations for tasks

**Parameters**:
```typescript
{
  session_token: string,
  action: TaskAction,
  correlation_id?: string
}

// TaskAction variants:
// - Create { data: CreateTaskRequest }
// - Get { id: string }
// - Update { id: string, data: UpdateTaskRequest }
// - Delete { id: string }
// - List { filters: TaskQuery }
// - GetStatistics
```

**Returns**: `ApiResponse<TaskResponse>`

**Backend**: `src-tauri/src/commands/task/facade.rs::task_crud`

---

#### `edit_task`

**Purpose**: Edit an existing task

**Parameters**:
```typescript
{
  session_token: string,
  task_id: string,
  data: UpdateTaskRequest,
  correlation_id?: string
}
```

**Returns**: `ApiResponse<Task>`

**Backend**: `src-tauri/src/commands/task/facade.rs::edit_task`

---

#### `export_tasks_csv`

**Purpose**: Export tasks to CSV format

**Parameters**:
```typescript
{
  session_token: string,
  filter?: TaskFilter,
  include_client_data?: boolean,
  correlation_id?: string
}
```

**Returns**: `ApiResponse<string>` (CSV content)

**Backend**: `src-tauri/src/commands/task/facade.rs::export_tasks_csv`

---

### Client Management Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `client_crud` | Unified CRUD for clients | Role-based |

#### `client_crud`

**Purpose**: Unified CRUD operations for clients

**Parameters**:
```typescript
{
  session_token: string,
  action: ClientAction
}

// ClientAction variants:
// - Create { data: CreateClientRequest }
// - Get { id: string }
// - GetWithTasks { id: string }
// - Update { id: string, data: UpdateClientRequest }
// - Delete { id: string }
// - List { filters: ClientQuery }
// - ListWithTasks { filters: ClientQuery, limit_tasks?: number }
// - Search { query: string, limit: number }
// - Stats
```

**Returns**: `ApiResponse<serde_json::Value>`

**Backend**: `src-tauri/src/commands/client.rs::client_crud`

---

### Intervention Workflow Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `intervention_workflow` | Unified workflow (Start, Get, GetActiveByTask, Update, Delete, Finalize) | Role-based |
| `intervention_start` | Start a new intervention | Technician, Supervisor, Admin |
| `intervention_get` | Get intervention by ID | Authenticated |
| `intervention_get_active_by_task` | Get active intervention for a task | Authenticated |
| `intervention_get_latest_by_task` | Get latest intervention for a task | Authenticated |
| `intervention_update` | Update intervention data | Assigned Technician, Supervisor, Admin |
| `intervention_delete` | Delete an intervention | Assigned Technician, Supervisor, Admin |
| `intervention_finalize` | Mark intervention as completed | Assigned Technician, Supervisor, Admin |
| `intervention_advance_step` | Advance to next workflow step | Assigned Technician, Supervisor, Admin |
| `intervention_save_step_progress` | Save progress for current step | Assigned Technician, Supervisor, Admin |
| `intervention_get_progress` | Get intervention progress | Authenticated |
| `intervention_get_step` | Get a specific intervention step | Authenticated |
| `intervention_management` | Management operations | Admin, Supervisor |

#### `intervention_start`

**Purpose**: Start a new intervention for a task

**Parameters**:
```typescript
{
  session_token: string,
  request: {
    task_id: string,
    intervention_type: string,
    priority: string,
    description?: string,
    estimated_duration_minutes?: number
  }
}
```

**Returns**: `ApiResponse<Intervention>`

**Backend**: `src-tauri/src/commands/intervention/workflow.rs::intervention_start`

---

#### `intervention_finalize`

**Purpose**: Mark intervention as completed

**Parameters**:
```typescript
{
  session_token: string,
  request: {
    intervention_id: string,
    collected_data?: any,
    photos?: string[],
    customer_satisfaction?: number,
    quality_score?: number,
    final_observations?: string[],
    customer_signature?: string,
    customer_comments?: string
  }
}
```

**Returns**: `ApiResponse<FinalizeInterventionResponse>`

**Backend**: `src-tauri/src/commands/intervention/workflow.rs::intervention_finalize`

---

### Material/Inventory Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `material_create` | Create a new material | Authenticated |
| `material_get` | Get material by ID | Authenticated |
| `material_get_by_sku` | Get material by SKU | Authenticated |
| `material_list` | List materials with filtering | Authenticated |
| `material_update` | Update material | Authenticated |
| `material_update_stock` | Adjust material stock level | Authenticated |
| `material_record_consumption` | Record material usage | Authenticated |
| `material_get_intervention_consumption` | Get consumption for an intervention | Authenticated |
| `material_get_intervention_summary` | Get consumption summary for intervention | Authenticated |
| `material_get_stats` | Get material statistics | Authenticated |
| `material_get_low_stock` | Get low stock materials | Authenticated |
| `material_get_expired` | Get expired materials | Authenticated |

#### `material_create`

**Purpose**: Create a new material/inventory item

**Parameters**:
```typescript
{
  session_token: string,
  request: CreateMaterialRequest
}
```

**Returns**: `ApiResponse<Material>`

**Backend**: `src-tauri/src/commands/material.rs::material_create`

---

#### `material_list`

**Purpose**: List materials with filtering

**Parameters**:
```typescript
{
  session_token: string,
  material_type?: string,  // "ppf_film", "adhesive", "cleaning_solution", "tool", "consumable"
  category?: string,
  active_only?: boolean,
  limit?: number,
  offset?: number
}
```

**Returns**: `ApiResponse<Material[]>`

**Backend**: `src-tauri/src/commands/material.rs::material_list`

---

### Reports Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `get_task_completion_report` | Task completion report for date range | Admin, Supervisor (Technicians see own) |
| `get_technician_performance_report` | Technician performance metrics | Admin, Supervisor (Technicians see own) |
| `get_client_analytics_report` | Client analytics and statistics | Admin, Supervisor |
| `get_quality_compliance_report` | Quality compliance metrics | Admin, Supervisor |
| `get_geographic_report` | Geographic distribution analysis | Admin, Supervisor |
| `get_material_usage_report` | Material consumption summary | Admin, Supervisor |
| `get_overview_report` | Combined dashboard overview | Admin, Supervisor |
| `get_seasonal_report` | Seasonal trend analysis | Admin, Supervisor |
| `get_operational_intelligence_report` | Operational insights and metrics | Admin, Supervisor |
| `get_available_report_types` | List available report types for user | Authenticated |
| `search_records` | Search records across entities | Authenticated |
| `get_entity_counts` | Get counts for all entity types | Authenticated |
| `export_report_data` | Export report data | Admin, Supervisor |
| `export_intervention_report` | Export intervention report | Authenticated |
| `save_intervention_report` | Save intervention report | Authenticated |
| `get_report_status` | Get report generation status | Authenticated |
| `cancel_report` | Cancel ongoing report generation | Authenticated |

#### `get_task_completion_report`

**Purpose**: Generate task completion report for date range

**Parameters**:
```typescript
{
  session_token: string,
  date_range: DateRange,
  filters: ReportFilters
}
```

**Returns**: `ApiResponse<TaskCompletionReport>`

**Backend**: `src-tauri/src/commands/reports/core.rs::get_task_completion_report`

---

### Calendar Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `get_events` | Get events within date range | Authenticated |
| `get_event_by_id` | Get a single event by ID | Authenticated |
| `create_event` | Create a new calendar event | Authenticated |
| `update_event` | Update an existing event | Authenticated |
| `delete_event` | Delete a calendar event | Authenticated |
| `get_events_for_technician` | Get events for a technician | Authenticated |
| `get_events_for_task` | Get events linked to a task | Authenticated |
| `calendar_get_tasks` | Get calendar tasks with filtering | Authenticated |
| `calendar_check_conflicts` | Check for scheduling conflicts | Authenticated |

#### `calendar_get_tasks`

**Purpose**: Get calendar tasks with filtering

**Parameters**:
```typescript
{
  session_token: string,
  date_range: CalendarDateRange,
  technician_ids?: string[],
  statuses?: string[],
  correlation_id?: string
}
```

**Returns**: `ApiResponse<CalendarTask[]>`

**Backend**: `src-tauri/src/commands/calendar.rs::calendar_get_tasks`

---

### User Management Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `user_crud` | Unified CRUD for users (Create, Get, Update, Delete, List, ChangePassword, ChangeRole, Ban, Unban) | Role-based |
| `bootstrap_first_admin` | Bootstrap first admin if none exists | Any |
| `has_admins` | Check if admin users exist | Any |
| `get_users` | List all users | Admin, Supervisor |
| `create_user` | Create a new user | Admin, Supervisor |
| `update_user` | Update user information | Admin, Supervisor |
| `update_user_status` | Update user active status | Admin |
| `delete_user` | Delete a user | Admin |

#### `user_crud`

**Purpose**: Unified CRUD operations for users

**Parameters**:
```typescript
{
  session_token: string,
  action: UserAction
}

// UserAction variants:
// - Create { data: CreateUserRequest }
// - Get { id: string }
// - Update { id: string, data: UpdateUserRequest }
// - Delete { id: string }
// - List { limit?: number, offset?: number }
// - ChangePassword { id: string, new_password: string }
// - ChangeRole { id: string, new_role: string }
// - Ban { id: string }
// - Unban { id: string }
```

**Returns**: `ApiResponse<UserResponse>`

**Backend**: `src-tauri/src/commands/user.rs::user_crud`

---

### Performance Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `get_performance_stats` | Get performance statistics | Admin |
| `get_performance_metrics` | Get recent performance metrics | Admin |
| `cleanup_performance_metrics` | Clean up old metrics | Admin |
| `get_cache_statistics` | Get cache statistics | Admin |
| `clear_application_cache` | Clear application cache | Admin |
| `configure_cache_settings` | Configure cache settings | Admin |

#### `get_performance_stats`

**Purpose**: Get performance statistics for the application

**Parameters**:
```typescript
{
  session_token: string
}
```

**Returns**: `ApiResponse<PerformanceStatsResponse>`

**Backend**: `src-tauri/src/commands/performance.rs::get_performance_stats`

---

### System Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `health_check` | Database health check | Any |
| `diagnose_database` | Database diagnostics | Any |
| `get_database_stats` | Database statistics | Any |
| `get_app_info` | Application version and build info | Any |
| `get_device_info` | Device information for fingerprinting | Any |
| `get_database_pool_health` | Database connection pool health | Any |
| `get_large_test_data` | Get large test data for testing | Any |
| `vacuum_database` | Vacuum database | Any |
| `force_wal_checkpoint` | Force WAL checkpoint | Any |

#### `get_app_info`

**Purpose**: Get application version and build information

**Parameters**: None

**Returns**: `ApiResponse<{ version, name, description, build_time, git_sha, rustc_version, platform, arch }>`

**Backend**: `src-tauri/src/commands/system.rs::get_app_info`

---

### Security Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `get_security_metrics` | Get security metrics | Admin |
| `get_security_events` | Get security events | Admin |
| `get_security_alerts` | Get security alerts | Admin |
| `acknowledge_security_alert` | Acknowledge a security alert | Admin |
| `resolve_security_alert` | Resolve a security alert | Admin |
| `cleanup_security_events` | Clean up old security events | Admin |
| `get_active_sessions` | Get active user sessions | Admin |
| `revoke_session` | Revoke a user session | Admin |
| `revoke_all_sessions_except_current` | Revoke all sessions except current | Authenticated |
| `update_session_timeout` | Update session timeout | Admin |
| `get_session_timeout_config` | Get session timeout configuration | Authenticated |

---

### Notification Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `initialize_notification_service` | Initialize notification service | Authenticated |
| `send_notification` | Send a notification | Authenticated |
| `test_notification_config` | Test notification configuration | Authenticated |
| `get_notification_status` | Get notification service status | Authenticated |

---

### Message Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `message_send` | Send a message | Authenticated |
| `message_get_list` | Get list of messages | Authenticated |
| `message_mark_read` | Mark message as read | Authenticated |
| `message_get_templates` | Get message templates | Authenticated |
| `message_get_preferences` | Get message preferences | Authenticated |
| `message_update_preferences` | Update message preferences | Authenticated |

---

### Sync Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `sync_start_background_service` | Start background sync service | Authenticated |
| `sync_stop_background_service` | Stop background sync service | Authenticated |
| `sync_now` | Trigger immediate sync | Authenticated |
| `sync_get_status` | Get sync status | Authenticated |
| `sync_get_operations_for_entity` | Get sync operations for entity | Authenticated |

---

### Queue Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `sync_enqueue` | Enqueue a sync operation | Authenticated |
| `sync_dequeue_batch` | Dequeue batch of operations | Authenticated |
| `sync_get_metrics` | Get queue metrics | Authenticated |
| `sync_mark_completed` | Mark operation as completed | Authenticated |
| `sync_mark_failed` | Mark operation as failed | Authenticated |
| `sync_get_operation` | Get operation by ID | Authenticated |
| `sync_cleanup_old_operations` | Clean up old operations | Authenticated |

---

### Status Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `task_transition_status` | Transition task status | Authenticated |
| `task_get_status_distribution` | Get status distribution | Authenticated |

---

### Navigation Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `navigation_update` | Update current navigation | Authenticated |
| `navigation_add_to_history` | Add to navigation history | Authenticated |
| `navigation_go_back` | Go back in history | Authenticated |
| `navigation_go_forward` | Go forward in history | Authenticated |
| `navigation_get_current` | Get current navigation | Authenticated |
| `navigation_refresh` | Refresh current navigation | Authenticated |
| `shortcuts_register` | Register keyboard shortcuts | Authenticated |

---

### UI Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `ui_window_minimize` | Minimize window | Any |
| `ui_window_maximize` | Maximize window | Any |
| `ui_window_close` | Close window | Any |
| `ui_shell_open_url` | Open URL in shell | Any |
| `ui_initiate_customer_call` | Initiate customer call | Authenticated |
| `get_recent_activities` | Get recent activities | Authenticated |
| `ui_gps_get_current_position` | Get current GPS position | Authenticated |
| `ui_window_get_state` | Get window state | Any |
| `ui_window_set_always_on_top` | Set window always on top | Any |
| `dashboard_get_stats` | Get dashboard statistics | Authenticated |

---

### WebSocket Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `init_websocket_server` | Initialize WebSocket server | Admin |
| `broadcast_websocket_message` | Broadcast message to all clients | Admin |
| `send_websocket_message_to_client` | Send message to specific client | Admin |
| `get_websocket_stats` | Get WebSocket statistics | Admin |
| `shutdown_websocket_server` | Shutdown WebSocket server | Admin |
| `broadcast_task_update` | Broadcast task update | Authenticated |
| `broadcast_intervention_update` | Broadcast intervention update | Authenticated |
| `broadcast_client_update` | Broadcast client update | Authenticated |
| `broadcast_system_notification` | Broadcast system notification | Admin |

---

### IPC Optimization Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `compress_data_for_ipc` | Compress data for IPC transfer | Authenticated |
| `decompress_data_from_ipc` | Decompress IPC data | Authenticated |
| `start_stream_transfer` | Start streaming transfer | Authenticated |
| `send_stream_chunk` | Send a stream chunk | Authenticated |
| `get_stream_data` | Get stream data | Authenticated |
| `get_ipc_stats` | Get IPC statistics | Authenticated |

---

### Settings Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `get_app_settings` | Get application settings | Authenticated |
| `update_general_settings` | Update general settings | Authenticated |
| `update_security_settings` | Update security settings | Authenticated |
| `update_notification_settings` | Update notification settings | Authenticated |
| `get_user_settings` | Get user-specific settings | Authenticated |
| `update_user_profile` | Update user profile | Authenticated |
| `update_user_preferences` | Update user preferences | Authenticated |
| `update_user_security` | Update user security settings | Authenticated |
| `update_user_performance` | Update user performance settings | Authenticated |
| `update_user_accessibility` | Update accessibility settings | Authenticated |
| `update_user_notifications` | Update user notification settings | Authenticated |
| `change_user_password` | Change user password | Authenticated |
| `export_user_data` | Export user data | Authenticated |
| `delete_user_account` | Delete user account | Authenticated |
| `get_data_consent` | Get data consent status | Authenticated |
| `update_data_consent` | Update data consent | Authenticated |
| `upload_user_avatar` | Upload user avatar | Authenticated |

---

### Analytics Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `analytics_get_summary` | Get analytics summary | Authenticated |

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
    return await invoke<ApiResponse<Task>>('task_crud', {
      request: {
        session_token: sessionToken,
        action: { Create: { data } }
      }
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
