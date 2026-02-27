# API Documentation - RPMA v2

## Overview

RPMA v2 uses **Tauri IPC** for communication between the frontend (Next.js) and backend (Rust). This document outlines all available IPC commands, request/response patterns, authentication mechanisms, and validation schemas.

**Total Commands:** 200+
**Domains:** 16 bounded contexts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React      │  │   Domain     │  │   IPC        │      │
│  │   Components │──▶│   Hooks      │──▶│   Wrappers   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                 │            │
│                                                 ▼            │
│                                          ┌──────────────┐      │
│                                          │   SafeInvoke │      │
│                                          │   + Cache    │      │
│                                          └──────────────┘      │
└────────────────────────────────────────────────┼───────────────────┘
                                             │ Tauri.invoke()
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Rust)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   IPC        │  │   Facade     │  │   Service    │      │
│  │   Command    │──▶│   Layer      │──▶│   Layer      │      │
│  │   Handler    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                     │                        │
│                                     ▼                        │
│                            ┌──────────────┐                 │
│                            │  Repository  │                 │
│  ───────────────────────────▶│  Layer       │                 │
│                            └──────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Patterns

### Standard Response Format

All IPC commands return a standardized response envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error_code?: string;
  data?: T;
  error?: ApiError;
  correlation_id?: string;
}

interface ApiError {
  message: string;
  code: string;
  details?: JsonValue;
}
```

### Compressed Response Format

For large payloads (>1KB), responses are automatically compressed:

```typescript
interface CompressedApiResponse {
  success: boolean;
  message?: string;
  error_code?: string;
  compressed: boolean;  // Always true for compressed responses
  data?: string;  // Base64-encoded, gzipped JSON
  error?: ApiError;
  correlation_id?: string;
}
```

### Tagged Union Response Pattern

Some commands use Rust-style tagged unions:

```typescript
interface ClientResponse {
  type: "Created" | "Found" | "Updated" | "NotFound" |
        "List" | "SearchResults" | "Statistics";
  data?: Client | Client[] | ClientListResponse;
  correlation_id?: string;
}

interface TaskAction {
  action: "Create" | "Get" | "Update" | "Delete" |
          "List" | "GetStatistics";
  [key: string]: any;
}
```

---

## Authentication & Authorization

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│  Auth    │────▶│ JWT      │────▶│ Session  │
│  Request │     │  Service │     │  Token   │     │  Stored  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                                 │
                      ▼                                 ▼
               ┌──────────────┐                  ┌──────────────┐
               │   User      │                  │   Session    │
               │   Profile   │                  │   Context   │
               └──────────────┘                  └──────────────┘
```

### Session Token

All protected commands require a session token:

```typescript
interface AuthenticatedRequest {
  session_token: string;  // JWT token
  // ... other request fields
}
```

### Role-Based Access Control (RBAC)

**Roles:**

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | System administrator | Full access to all features |
| `supervisor` | Team supervisor | Create, Read, Update, Assign tasks and clients |
| `technician` | Field technician | Create, Read, Update own tasks |
| `viewer` | Read-only user | View-only access |

**Permission Matrix:**

| Operation | Admin | Supervisor | Technician | Viewer |
|-----------|--------|------------|------------|--------|
| Create tasks | ✅ | ✅ | ✅ (own) | ❌ |
| Read tasks | ✅ | ✅ | ✅ (own) | ✅ |
| Update tasks | ✅ | ✅ | ✅ (own) | ❌ |
| Delete tasks | ✅ | ✅ | ✅ (own) | ❌ |
| Assign tasks | ✅ | ✅ | ❌ | ❌ |
| Create clients | ✅ | ✅ | ✅ | ❌ |
| Read clients | ✅ | ✅ | ✅ | ✅ |
| Update clients | ✅ | ✅ | ✅ | ❌ |
| Delete clients | ✅ | ✅ | ❌ | ❌ |
| Create users | ✅ | ❌ | ❌ | ❌ |
| Update users | ✅ | ✅ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ | ❌ |
| View settings | ✅ | ✅ | ✅ | ✅ |
| Update settings | ✅ | ✅ | ✅ | ❌ |

### Authentication Macro (Backend)

Protected commands use the `authenticate!` macro:

```rust
#[tauri::command]
pub async fn protected_command(
    request: RequestType,
    state: AppState<'_>,
) -> Result<ApiResponse<DataType>, AppError> {
    // 1. Validate session token
    let current_user = authenticate!(&request.session_token, &state, UserRole::Viewer);

    // 2. Update correlation context
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // 3. Execute business logic
    // ...
}
```

### Public Commands

Commands that do NOT require authentication:

- `auth_login`
- `auth_create_account`
- `auth_logout`
- `auth_validate_session`
- `has_admins`
- `bootstrap_first_admin`
- All `ui_window_*` commands
- All `navigation_*` commands
- `health_check`
- `get_app_info`
- `get_device_info`

### Rate Limiting

| Operation Type | Limit | Period |
|----------------|-------|--------|
| Calendar operations | 200 requests | per minute per user |
| Client operations | 100 requests | per minute per user |
| Default timeout | 120 seconds | per IPC call |

---

## IPC Commands by Domain

### 1. Auth Domain (10 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `AUTH_LOGIN` | User authentication | ❌ Public |
| `AUTH_CREATE_ACCOUNT` | Create new user account | ❌ Public |
| `AUTH_REFRESH_TOKEN` | Refresh session token | ❌ Public |
| `AUTH_LOGOUT` | User logout | ❌ Public |
| `AUTH_VALIDATE_SESSION` | Validate active session | ❌ Public |
| `ENABLE_2FA` | Enable two-factor auth | ✅ Protected |
| `VERIFY_2FA_SETUP` | Verify 2FA setup | ✅ Protected |
| `DISABLE_2FA` | Disable 2FA | ✅ Protected |
| `REGENERATE_BACKUP_CODES` | Regenerate 2FA backup codes | ✅ Protected |
| `IS_2FA_ENABLED` | Check if 2FA is enabled | ✅ Protected |

**Status:** ⚠️ 2FA commands marked as NOT_IMPLEMENTED

#### Example: Login

```typescript
// Request
const response = await safeInvoke<UserSession>(
  IPC_COMMANDS.AUTH_LOGIN,
  {
    email: "user@example.com",
    password: "securepassword123"
  }
);

// Response
{
  success: true,
  data: {
    id: "uuid",
    user_id: "uuid",
    username: "technician",
    email: "user@example.com",
    role: "technician",
    token: "jwt-token-here",
    expires_at: 1234567890,
    last_activity: 1234567890,
    created_at: 1234567890
  }
}
```

---

### 2. Bootstrap Domain (2 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `BOOTSTRAP_FIRST_ADMIN` | Create first admin user (system init) | ❌ Public |
| `HAS_ADMINS` | Check if any admin users exist | ❌ Public |

---

### 3. Task Domain (14 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `TASK_CRUD` | Unified CRUD operations for tasks | ✅ Protected |
| `CHECK_TASK_ASSIGNMENT` | Validate task assignment eligibility | ✅ Protected |
| `CHECK_TASK_AVAILABILITY` | Check if task is available for assignment | ✅ Protected |
| `GET_TASK_HISTORY` | Get task change history | ✅ Protected |
| `VALIDATE_TASK_ASSIGNMENT_CHANGE` | Validate reassignment operations | ✅ Protected |
| `EDIT_TASK` | Edit task details | ✅ Protected |
| `ADD_TASK_NOTE` | Add note to task | ✅ Protected |
| `SEND_TASK_MESSAGE` | Send message about task | ✅ Protected |
| `DELAY_TASK` | Reschedule task | ✅ Protected |
| `REPORT_TASK_ISSUE` | Report task issues | ✅ Protected |
| `EXPORT_TASKS_CSV` | Export tasks to CSV | ✅ Protected |
| `IMPORT_TASKS_BULK` | Bulk import tasks | ✅ Protected |
| `TASK_TRANSITION_STATUS` | Change task status | ✅ Protected |
| `TASK_GET_STATUS_DISTRIBUTION` | Get task statistics by status | ✅ Protected |

#### Example: Create Task

```typescript
// Request
const response = await taskIpc.create(
  {
    title: "PPF Installation - BMW X5",
    vehicle_plate: "ABC-123",
    vehicle_make: "BMW",
    vehicle_model: "X5",
    vehicle_year: "2023",
    client_id: "client-uuid",
    scheduled_date: "2024-03-15",
    priority: "medium"
  },
  sessionToken
);

// Response
{
  success: true,
  data: {
    id: "task-uuid",
    task_number: "TASK-00001",
    title: "PPF Installation - BMW X5",
    status: "draft",
    priority: "medium",
    // ... more fields
  }
}
```

---

### 4. Client Domain (1 command)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `CLIENT_CRUD` | Unified CRUD operations for clients | ✅ Protected |

---

### 5. Inventory/Material Domain (26 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `MATERIAL_LIST` | List all materials | ✅ Protected |
| `MATERIAL_CREATE` | Create new material | ✅ Protected |
| `MATERIAL_UPDATE` | Update material details | ✅ Protected |
| `MATERIAL_GET` | Get material by ID | ✅ Protected |
| `MATERIAL_GET_BY_SKU` | Get material by SKU | ✅ Protected |
| `MATERIAL_DELETE` | Delete material | ✅ Protected |
| `MATERIAL_UPDATE_STOCK` | Update material stock level | ✅ Protected |
| `MATERIAL_ADJUST_STOCK` | Adjust stock with reason | ✅ Protected |
| `MATERIAL_RECORD_CONSUMPTION` | Record material consumption | ✅ Protected |
| `MATERIAL_GET_CONSUMPTION_HISTORY` | Get material usage history | ✅ Protected |
| `MATERIAL_GET_INTERVENTION_CONSUMPTION` | Get consumption by intervention | ✅ Protected |
| `MATERIAL_GET_INTERVENTION_SUMMARY` | Get summary for intervention | ✅ Protected |
| `MATERIAL_CREATE_INVENTORY_TRANSACTION` | Create inventory transaction | ✅ Protected |
| `MATERIAL_GET_TRANSACTION_HISTORY` | Get transaction history | ✅ Protected |
| `MATERIAL_CREATE_CATEGORY` | Create material category | ✅ Protected |
| `MATERIAL_LIST_CATEGORIES` | List all categories | ✅ Protected |
| `MATERIAL_CREATE_SUPPLIER` | Create supplier | ✅ Protected |
| `MATERIAL_LIST_SUPPLIERS` | List all suppliers | ✅ Protected |
| `MATERIAL_GET_STATS` | Get material statistics | ✅ Protected |
| `INVENTORY_GET_STATS` | Get overall inventory statistics | ✅ Protected |
| `MATERIAL_GET_LOW_STOCK` | Get low stock materials | ✅ Protected |
| `MATERIAL_GET_LOW_STOCK_MATERIALS` | Get detailed low stock list | ✅ Protected |
| `MATERIAL_GET_EXPIRED` | Get expired materials | ✅ Protected |
| `MATERIAL_GET_EXPIRED_MATERIALS` | Get detailed expired list | ✅ Protected |
| `MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY` | Get movement summary | ✅ Protected |

---

### 6. Reports Domain (30 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `GET_TASK_COMPLETION_REPORT` | Task completion statistics | ✅ Protected |
| `GET_TECHNICIAN_PERFORMANCE_REPORT` | Technician performance metrics | ✅ Protected |
| `GET_CLIENT_ANALYTICS_REPORT` | Client analytics | ✅ Protected |
| `GET_QUALITY_COMPLIANCE_REPORT` | Quality compliance metrics | ✅ Protected |
| `GET_MATERIAL_USAGE_REPORT` | Material usage analysis | ✅ Protected |
| `GET_GEOGRAPHIC_REPORT` | Geographic distribution | ✅ Protected |
| `GET_OVERVIEW_REPORT` | System overview statistics | ✅ Protected |
| `EXPORT_REPORT_DATA` | Export report data | ✅ Protected |
| `EXPORT_INTERVENTION_REPORT` | Export intervention reports | ✅ Protected |
| `SAVE_INTERVENTION_REPORT` | Save intervention report | ✅ Protected |
| `GET_REPORT_STATUS` | Check report generation status | ✅ Protected |
| `CANCEL_REPORT` | Cancel report generation | ✅ Protected |
| `GET_AVAILABLE_REPORT_TYPES` | List available report types | ✅ Protected |
| `SEARCH_RECORDS` | Search records across domains | ✅ Protected |
| `SEARCH_TASKS` | Search tasks | ✅ Protected |
| `SEARCH_CLIENTS` | Search clients | ✅ Protected |
| `SEARCH_INTERVENTIONS` | Search interventions | ✅ Protected |
| `GET_ENTITY_COUNTS` | Get counts of all entities | ✅ Protected |
| `GET_SEASONAL_REPORT` | Seasonal analysis | ✅ Protected |
| `GET_OPERATIONAL_INTELLIGENCE_REPORT` | Operational metrics | ✅ Protected |
| `GENERATE_INTERVENTION_PDF_REPORT` | Generate PDF report | ✅ Protected |
| `TEST_PDF_GENERATION` | Test PDF generation | ✅ Protected |
| `SUBMIT_REPORT_JOB` | Submit async report job | ✅ Protected |
| `SUBMIT_TASK_COMPLETION_REPORT_JOB` | Submit task completion job | ✅ Protected |
| `GET_REPORT_JOB_RESULT` | Get job result | ✅ Protected |

---

### 7. Documents/Photo Domain (6 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `DOCUMENT_STORE_PHOTO` | Store intervention photo | ✅ Protected |
| `DOCUMENT_GET_PHOTOS` | Get photos with filters | ✅ Protected |
| `DOCUMENT_GET_PHOTO` | Get single photo | ✅ Protected |
| `DOCUMENT_DELETE_PHOTO` | Delete photo | ✅ Protected |
| `DOCUMENT_GET_PHOTO_DATA` | Get photo binary data | ✅ Protected |
| `DOCUMENT_UPDATE_PHOTO_METADATA` | Update photo metadata | ✅ Protected |

---

### 8. Interventions Domain (13 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `INTERVENTION_WORKFLOW` | Workflow management | ✅ Protected |
| `INTERVENTION_PROGRESS` | Get intervention progress | ✅ Protected |
| `INTERVENTION_MANAGEMENT` | Intervention management | ✅ Protected |
| `INTERVENTION_GET_ACTIVE_BY_TASK` | Get active intervention by task | ✅ Protected |
| `INTERVENTION_GET_LATEST_BY_TASK` | Get latest intervention by task | ✅ Protected |
| `INTERVENTION_SAVE_STEP_PROGRESS` | Save step progress | ✅ Protected |
| `INTERVENTION_GET_STEP` | Get intervention step | ✅ Protected |
| `INTERVENTION_GET_PROGRESS` | Get overall progress | ✅ Protected |
| `INTERVENTION_START` | Start intervention | ✅ Protected |
| `INTERVENTION_GET` | Get intervention details | ✅ Protected |
| `INTERVENTION_UPDATE` | Update intervention | ✅ Protected |
| `INTERVENTION_DELETE` | Delete intervention | ✅ Protected |
| `INTERVENTION_FINALIZE` | Finalize intervention | ✅ Protected |
| `INTERVENTION_ADVANCE_STEP` | Move to next step | ✅ Protected |

---

### 9. Notification Domain (11 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `INITIALIZE_NOTIFICATION_SERVICE` | Initialize notification system | ✅ Protected |
| `SEND_NOTIFICATION` | Send notification | ✅ Protected |
| `TEST_NOTIFICATION_CONFIG` | Test notification settings | ✅ Protected |
| `GET_NOTIFICATION_STATUS` | Get notification service status | ✅ Protected |
| `GET_RECENT_ACTIVITIES` | Get recent activities | ✅ Protected |
| `MESSAGE_SEND` | Send message | ✅ Protected |
| `MESSAGE_GET_LIST` | Get message list | ✅ Protected |
| `MESSAGE_MARK_READ` | Mark message as read | ✅ Protected |
| `MESSAGE_GET_TEMPLATES` | Get message templates | ✅ Protected |
| `MESSAGE_GET_PREFERENCES` | Get message preferences | ✅ Protected |
| `MESSAGE_UPDATE_PREFERENCES` | Update message preferences | ✅ Protected |

---

### 10. Settings Domain (22 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `GET_APP_SETTINGS` | Get application settings | ✅ Protected |
| `UPDATE_GENERAL_SETTINGS` | Update general settings | ✅ Protected |
| `UPDATE_SECURITY_SETTINGS` | Update security settings | ✅ Protected |
| `UPDATE_NOTIFICATION_SETTINGS` | Update notification settings | ✅ Protected |
| `GET_USER_SETTINGS` | Get user settings | ✅ Protected |
| `UPDATE_USER_PROFILE` | Update user profile | ✅ Protected |
| `UPDATE_USER_PREFERENCES` | Update user preferences | ✅ Protected |
| `UPDATE_USER_SECURITY` | Update user security | ✅ Protected |
| `UPDATE_USER_PERFORMANCE` | Update user performance metrics | ✅ Protected |
| `UPDATE_USER_ACCESSIBILITY` | Update accessibility settings | ✅ Protected |
| `UPDATE_USER_NOTIFICATIONS` | Update user notification prefs | ✅ Protected |
| `GET_ACTIVE_SESSIONS` | Get active user sessions | ✅ Protected |
| `REVOKE_SESSION` | Revoke specific session | ✅ Protected |
| `REVOKE_ALL_SESSIONS_EXCEPT_CURRENT` | Revoke all other sessions | ✅ Protected |
| `UPDATE_SESSION_TIMEOUT` | Update session timeout | ✅ Protected |
| `GET_SESSION_TIMEOUT_CONFIG` | Get session timeout config | ✅ Protected |
| `UPLOAD_USER_AVATAR` | Upload user avatar | ✅ Protected |
| `EXPORT_USER_DATA` | Export user data | ✅ Protected |
| `DELETE_USER_ACCOUNT` | Delete user account | ✅ Protected |
| `GET_DATA_CONSENT` | Get data consent status | ✅ Protected |
| `UPDATE_DATA_CONSENT` | Update data consent | ✅ Protected |

---

### 11. Analytics Domain (1 command)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `ANALYTICS_GET_SUMMARY` | Get analytics summary | ✅ Protected |

---

### 12. Dashboard Domain (1 command)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `DASHBOARD_GET_STATS` | Get dashboard statistics | ✅ Protected |

---

### 13. User Domain (7 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `USER_CRUD` | Unified user CRUD operations | ✅ Protected |
| `GET_USERS` | Get user list | ✅ Protected |
| `CREATE_USER` | Create new user | ✅ Protected |
| `UPDATE_USER` | Update user | ✅ Protected |
| `UPDATE_USER_STATUS` | Update user status | ✅ Protected |
| `DELETE_USER` | Delete user | ✅ Protected |
| `CHANGE_USER_PASSWORD` | Change user password | ✅ Protected |

---

### 14. Sync Domain (13 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `SYNC_START_BACKGROUND_SERVICE` | Start background sync | ✅ Protected |
| `SYNC_STOP_BACKGROUND_SERVICE` | Stop background sync | ✅ Protected |
| `SYNC_GET_STATUS` | Get sync status | ✅ Protected |
| `SYNC_NOW` | Trigger immediate sync | ✅ Protected |
| `SYNC_GET_OPERATIONS_FOR_ENTITY` | Get sync operations | ✅ Protected |
| `SYNC_ENQUEUE` | Enqueue sync operation | ✅ Protected |
| `SYNC_DEQUEUE_BATCH` | Dequeue batch operations | ✅ Protected |
| `SYNC_GET_METRICS` | Get sync metrics | ✅ Protected |
| `SYNC_MARK_COMPLETED` | Mark operation complete | ✅ Protected |
| `SYNC_MARK_FAILED` | Mark operation failed | ✅ Protected |
| `SYNC_GET_OPERATION` | Get operation details | ✅ Protected |
| `SYNC_CLEANUP_OLD_OPERATIONS` | Cleanup old operations | ✅ Protected |

---

### 15. Performance Domain (6 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `GET_PERFORMANCE_STATS` | Get performance statistics | ✅ Protected |
| `GET_PERFORMANCE_METRICS` | Get performance metrics | ✅ Protected |
| `CLEANUP_PERFORMANCE_METRICS` | Cleanup old metrics | ✅ Protected |
| `GET_CACHE_STATISTICS` | Get cache statistics | ✅ Protected |
| `CLEAR_APPLICATION_CACHE` | Clear application cache | ✅ Protected |
| `CONFIGURE_CACHE_SETTINGS` | Configure cache | ✅ Protected |

---

### 16. Security/Audit Domain (6 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `GET_SECURITY_METRICS` | Get security metrics | ✅ Protected |
| `GET_SECURITY_EVENTS` | Get security events | ✅ Protected |
| `GET_SECURITY_ALERTS` | Get security alerts | ✅ Protected |
| `ACKNOWLEDGE_SECURITY_ALERT` | Acknowledge alert | ✅ Protected |
| `RESOLVE_SECURITY_ALERT` | Resolve alert | ✅ Protected |
| `CLEANUP_SECURITY_EVENTS` | Cleanup old events | ✅ Protected |

---

### 17. System Domain (10 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `HEALTH_CHECK` | System health check | ❌ Public |
| `DIAGNOSE_DATABASE` | Diagnose database issues | ✅ Protected |
| `GET_DATABASE_STATS` | Get database statistics | ✅ Protected |
| `GET_DATABASE_STATUS` | Get database status | ✅ Protected |
| `GET_DATABASE_POOL_HEALTH` | Get connection pool health | ✅ Protected |
| `GET_DATABASE_POOL_STATS` | Get pool statistics | ✅ Protected |
| `GET_APP_INFO` | Get application info | ❌ Public |
| `GET_DEVICE_INFO` | Get device info | ❌ Public |
| `VACUUM_DATABASE` | Vacuum/optimize database | ✅ Protected |
| `GET_LARGE_TEST_DATA` | Get test data for compression testing | ✅ Protected |

---

### 18. UI Domain (16 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `UI_WINDOW_MINIMIZE` | Minimize window | ❌ Public |
| `UI_WINDOW_MAXIMIZE` | Maximize window | ❌ Public |
| `UI_WINDOW_CLOSE` | Close window | ❌ Public |
| `UI_WINDOW_GET_STATE` | Get window state | ❌ Public |
| `UI_WINDOW_SET_ALWAYS_ON_TOP` | Set window z-order | ❌ Public |
| `NAVIGATION_UPDATE` | Update navigation | ❌ Public |
| `NAVIGATION_GO_BACK` | Go back | ❌ Public |
| `NAVIGATION_GO_FORWARD` | Go forward | ❌ Public |
| `NAVIGATION_GET_CURRENT` | Get current navigation | ❌ Public |
| `NAVIGATION_ADD_TO_HISTORY` | Add to history | ❌ Public |
| `NAVIGATION_REFRESH` | Refresh current view | ❌ Public |
| `SHORTCUTS_REGISTER` | Register keyboard shortcuts | ❌ Public |
| `UI_SHELL_OPEN_URL` | Open URL in system browser | ❌ Public |
| `UI_GPS_GET_CURRENT_POSITION` | Get GPS position | ❌ Public |
| `UI_INITIATE_CUSTOMER_CALL` | Initiate phone call | ❌ Public |

---

### 19. Calendar Domain (9 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `GET_EVENTS` | Get events in date range | ✅ Protected |
| `GET_EVENT_BY_ID` | Get specific event | ✅ Protected |
| `CREATE_EVENT` | Create calendar event | ✅ Protected |
| `UPDATE_EVENT` | Update event | ✅ Protected |
| `DELETE_EVENT` | Delete event | ✅ Protected |
| `GET_EVENTS_FOR_TECHNICIAN` | Get technician's events | ✅ Protected |
| `GET_EVENTS_FOR_TASK` | Get task events | ✅ Protected |
| `CALENDAR_GET_TASKS` | Get calendar tasks | ✅ Protected |
| `CALENDAR_CHECK_CONFLICTS` | Check scheduling conflicts | ✅ Protected |
| `CALENDAR_SCHEDULE_TASK` | Schedule task with conflict check | ✅ Protected |

---

### 20. Quote Domain (13 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `QUOTE_CREATE` | Create quote | ✅ Protected |
| `QUOTE_GET` | Get quote | ✅ Protected |
| `QUOTE_LIST` | List quotes | ✅ Protected |
| `QUOTE_UPDATE` | Update quote | ✅ Protected |
| `QUOTE_DELETE` | Delete quote | ✅ Protected |
| `QUOTE_ITEM_ADD` | Add quote item | ✅ Protected |
| `QUOTE_ITEM_UPDATE` | Update quote item | ✅ Protected |
| `QUOTE_ITEM_DELETE` | Delete quote item | ✅ Protected |
| `QUOTE_MARK_SENT` | Mark quote as sent | ✅ Protected |
| `QUOTE_MARK_ACCEPTED` | Mark quote as accepted | ✅ Protected |
| `QUOTE_MARK_REJECTED` | Mark quote as rejected | ✅ Protected |
| `QUOTE_EXPORT_PDF` | Export quote to PDF | ✅ Protected |

---

### 21. WebSocket Domain (10 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `INIT_WEBSOCKET_SERVER` | Initialize WebSocket server | ✅ Protected |
| `BROADCAST_WEBSOCKET_MESSAGE` | Broadcast to all clients | ✅ Protected |
| `SEND_WEBSOCKET_MESSAGE_TO_CLIENT` | Send to specific client | ✅ Protected |
| `GET_WEBSOCKET_STATS` | Get WebSocket statistics | ✅ Protected |
| `SHUTDOWN_WEBSOCKET_SERVER` | Shutdown WebSocket server | ✅ Protected |
| `BROADCAST_TASK_UPDATE` | Broadcast task updates | ✅ Protected |
| `BROADCAST_INTERVENTION_UPDATE` | Broadcast intervention updates | ✅ Protected |
| `BROADCAST_CLIENT_UPDATE` | Broadcast client updates | ✅ Protected |
| `BROADCAST_SYSTEM_NOTIFICATION` | Broadcast system notifications | ✅ Protected |

---

### 22. IPC Optimization Domain (6 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `COMPRESS_DATA_FOR_IPC` | Compress IPC data | ✅ Protected |
| `DECOMPRESS_DATA_FROM_IPC` | Decompress IPC data | ✅ Protected |
| `START_STREAM_TRANSFER` | Start data streaming | ✅ Protected |
| `SEND_STREAM_CHUNK` | Send stream chunk | ✅ Protected |
| `GET_STREAM_DATA` | Get streamed data | ✅ Protected |
| `GET_IPC_STATS` | Get IPC statistics | ✅ Protected |

---

### 23. Log Domain (3 commands)

| Command | Description | Auth Required |
|---------|-------------|---------------|
| `SEND_LOG_TO_FRONTEND` | Send log to frontend | ✅ Protected |
| `LOG_TASK_CREATION_DEBUG` | Debug task creation | ✅ Protected |
| `LOG_CLIENT_CREATION_DEBUG` | Debug client creation | ✅ Protected |

---

## Frontend IPC Client

### Safe Invoke Pattern

```typescript
import { safeInvoke, IPC_COMMANDS } from '@/lib/ipc';

// Basic invoke
const result = await safeInvoke<Task>(
  IPC_COMMANDS.TASK_CRUD,
  {
    request: {
      action: { action: 'Get', id: taskId },
      session_token: sessionToken
    }
  }
);
```

### Cached Invoke Pattern

```typescript
import { cachedInvoke, invalidatePattern } from '@/lib/ipc/cache';

// Cache with 30 second TTL
const task = await cachedInvoke(
  `task:${taskId}`,
  IPC_COMMANDS.TASK_CRUD,
  {
    request: {
      action: { action: 'Get', id: taskId },
      session_token: sessionToken
    }
  },
  validateTask,  // Type guard
  30000          // TTL in milliseconds
);

// Invalidate all task-related cache after mutation
invalidatePattern('task:');
```

### Domain IPC Wrapper Pattern

```typescript
// src/domains/tasks/ipc/task.ipc.ts
export const taskIpc = {
  create: async (data: CreateTaskRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: { action: { action: 'Create', data }, session_token: sessionToken }
    });
    invalidatePattern('task:');
    return extractAndValidate(result, validateTask) as Task;
  },

  get: async (id: string, sessionToken: string) => {
    return await cachedInvoke(
      `task:${id}`,
      IPC_COMMANDS.TASK_CRUD,
      {
        request: { action: { action: 'Get', id }, session_token: sessionToken }
      },
      validateTask
    );
  },

  update: async (id: string, data: UpdateTaskRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: { action: { action: 'Update', id, data }, session_token: sessionToken }
    });
    invalidatePattern('task:');
    return extractAndValidate(result, validateTask) as Task;
  }
};
```

---

## Input Validation

### Validation Layers

1. **Frontend Zod Schemas** - Client-side validation
2. **Backend Validation Service** - Server-side validation
3. **Type Guards** - Runtime type checking

### Example Zod Schema

```typescript
import { z } from 'zod';

const TaskSchema = z.object({
  id: z.string().uuid(),
  task_number: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'pending', 'invalid', 'archived', 'failed', 'overdue', 'assigned', 'paused']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  technician_id: z.string().uuid().nullable(),
  client_id: z.string().uuid().nullable(),
  scheduled_date: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number()
});

export type Task = z.infer<typeof TaskSchema>;
```

### Type Guard

```typescript
export function validateTask(data: unknown): data is Task {
  return TaskSchema.safeParse(data).success;
}

export function safeValidateTask(data: unknown): Task | null {
  const result = TaskSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

---

## Error Handling

### Error Codes

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `AUTH_INVALID` | Invalid credentials | 401 |
| `AUTH_TOKEN_EXPIRED` | Session token expired | 401 |
| `AUTH_INSUFFICIENT_PERMISSIONS` | Insufficient permissions | 403 |
| `AUTH_SESSION_NOT_FOUND` | Session not found | 401 |
| `VALIDATION_FAILED` | Input validation failed | 400 |
| `TASK_NOT_FOUND` | Task not found | 404 |
| `CLIENT_NOT_FOUND` | Client not found | 404 |
| `TASK_INVALID_TRANSITION` | Invalid status transition | 400 |
| `TASK_DUPLICATE_NUMBER` | Duplicate task number | 400 |
| `INTERVENTION_ALREADY_ACTIVE` | Intervention already active | 400 |
| `DATABASE_ERROR` | Database error | 500 |
| `INTERNAL_ERROR` | Internal server error | 500 |

### Error Response Example

```json
{
  "success": false,
  "error_code": "AUTH_TOKEN_EXPIRED",
  "error": {
    "message": "Session token has expired",
    "code": "AUTH_TOKEN_EXPIRED",
    "details": {
      "token": "expired-token-hash",
      "expired_at": 1234567890
    }
  },
  "correlation_id": "uuid-here"
}
```

---

## WebSocket API

### Connection

```typescript
import { connect } from '@tauri-apps/plugin-websocket';

const ws = await connect('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Broadcast Events

**Task Updates:**
```json
{
  "type": "task_update",
  "task_id": "uuid",
  "action": "updated",
  "data": { /* task data */ }
}
```

**Intervention Updates:**
```json
{
  "type": "intervention_update",
  "intervention_id": "uuid",
  "action": "step_completed",
  "step_number": 2
}
```

**System Notifications:**
```json
{
  "type": "system_notification",
  "level": "info",
  "message": "Sync completed successfully"
}
```

---

## Rate Limiting

Rate limiting is enforced on the backend for certain operations:

```typescript
interface RateLimitConfig {
  calendar: {
    maxRequests: 200,
    period: 60000  // 1 minute
  },
  clients: {
    maxRequests: 100,
    period: 60000  // 1 minute
  },
  default: {
    timeout: 120000  // 2 minutes
  }
}
```

---

## Caching Strategy

### Cache Keys

Cache keys follow a pattern-based system:

```
task:{id}
client:{id}
user:{id}
intervention:{id}
session:{token}
material:{sku}
```

### Cache Invalidation

Cache is invalidated using pattern matching:

```typescript
// Invalidate all task-related cache
invalidatePattern('task:');

// Invalidate all client-related cache
invalidatePattern('client:');

// Invalidate all cache
invalidatePattern('*');
```

---

## Summary Statistics

- **Total Commands:** 200+
- **Domains:** 16 bounded contexts
- **Public Commands:** ~20
- **Protected Commands:** ~180
- **Implemented:** ~190 commands
- **Not Implemented:** ~10 commands (mostly 2FA-related)
- **Authentication Levels:** 2 (Public, Protected)
- **User Roles:** 4 (Admin, Supervisor, Technician, Viewer)
- **Response Formats:** 3 (Standard ApiResponse, Compressed, Tagged Union)
- **Validation Schemas:** 20+ Zod schemas

---

*Document Version: 1.0*
*Last Updated: Based on codebase analysis*
