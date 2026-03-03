# API.md

## RPMA v2 - IPC API Documentation

This document details the Inter-Process Communication (IPC) API between the Next.js frontend and Rust/Tauri backend.

---

## 1. Overview

### 1.1 Architecture

The RPMA v2 application uses **Tauri IPC** for frontend-backend communication:

```
┌─────────────────────┐      IPC Commands       ┌─────────────────────┐
│   Frontend          │ ◄──────────────────────► │   Backend (Rust)    │
│   (Next.js/React)  │    safeInvoke() call    │   (Tauri 2.x)       │
│                    │                          │                     │
│  - Type-safe       │    Request/Response      │  - Command handlers │
│  - Caching         │    with correlation IDs  │  - Domain services  │
│  - Retry logic     │                          │  - SQLite database  │
└─────────────────────┘                          └─────────────────────┘
```

### 1.2 Communication Pattern

All IPC calls use the `invoke()` function from `@tauri-apps/api`:

```typescript
import { ipcClient } from '@/lib/ipc';

const result = await ipcClient.auth.login({ email, password });
```

### 1.3 Response Format

All commands return an `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId?: string;
  timestamp?: number;
}
```

---

## 2. Authentication Commands

| Command | Handler | Description | Auth Required |
|---------|---------|-------------|--------------|
| `auth_login` | `auth::ipc::auth::auth_login` | User login with email/password | No |
| `auth_create_account` | `auth::ipc::auth::auth_create_account` | Create new user account | No |
| `auth_logout` | `auth::ipc::auth::auth_logout` | End user session | Yes |
| `auth_validate_session` | `auth::ipc::auth::auth_validate_session` | Validate current session | Yes |

### 2.1 Login Request

```typescript
interface LoginRequest {
  email: string;
  password: string;
  correlationId?: string;
}
```

### 2.2 Login Response

```typescript
interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}
```

### 2.3 Not Implemented (Deprecated)

| Command | Status | Notes |
|---------|--------|-------|
| `auth_refresh_token` | ❌ Not implemented | Uses session re-validation |
| `enable_2fa` | ❌ Not implemented | 2FA backend not ready |
| `verify_2fa_setup` | ❌ Not implemented | 2FA backend not ready |
| `disable_2fa` | ❌ Not implemented | 2FA backend not ready |
| `regenerate_backup_codes` | ❌ Not implemented | 2FA backend not ready |
| `is_2fa_enabled` | ❌ Not implemented | 2FA backend not ready |

---

## 3. User Management Commands

| Command | Handler | Description | Auth Required |
|---------|---------|-------------|--------------|
| `user_crud` | `users::ipc::user::user_crud` | User CRUD operations | Yes |
| `get_users` | `users::ipc::user::get_users` | List all users | Yes |
| `create_user` | `users::ipc::user::create_user` | Create new user | Yes (admin) |
| `update_user` | `users::ipc::user::update_user` | Update user details | Yes |
| `update_user_status` | `users::ipc::user::update_user_status` | Activate/deactivate user | Yes (admin) |
| `delete_user` | `users::ipc::user::delete_user` | Soft delete user | Yes (admin) |
| `change_user_password` | `users::ipc::user::change_user_password` | Change user password | Yes |

### 3.1 User Roles

```typescript
type UserRole = 'admin' | 'supervisor' | 'technician' | 'viewer';
```

---

## 4. Client Commands

| Command | Handler | Description | Auth Required |
|---------|---------|-------------|--------------|
| `client_crud` | `clients::ipc::client::client_crud` | Client CRUD operations | Yes |

### 4.1 Client Operations

```typescript
type ClientOperation = 'create' | 'read' | 'read_all' | 'update' | 'delete';

interface ClientCrudRequest {
  operation: ClientOperation;
  data?: Partial<Client>;
  id?: string;
  filters?: ClientFilters;
}

interface ClientFilters {
  search?: string;
  customerType?: 'individual' | 'business';
  tags?: string[];
}
```

---

## 5. Task Commands

| Command | Handler | Description | Auth Required |
|---------|---------|-------------|--------------|
| `task_crud` | `tasks::ipc::task::task_crud` | Task CRUD operations | Yes |
| `check_task_assignment` | `tasks::ipc::task::check_task_assignment` | Verify task assignment | Yes |
| `check_task_availability` | `tasks::ipc::task::check_task_availability` | Check task availability | Yes |
| `get_task_history` | `tasks::ipc::task::get_task_history` | Get task change history | Yes |
| `validate_task_assignment_change` | `tasks::ipc::task::validate_task_assignment_change` | Validate reassignment | Yes |
| `edit_task` | `tasks::ipc::task::edit_task` | Edit task details | Yes |
| `add_task_note` | `tasks::ipc::task::add_task_note` | Add note to task | Yes |
| `send_task_message` | `tasks::ipc::task::send_task_message` | Send message about task | Yes |
| `delay_task` | `tasks::ipc::task::delay_task` | Report task delay | Yes |
| `report_task_issue` | `tasks::ipc::task::report_task_issue` | Report issue with task | Yes |
| `export_tasks_csv` | `tasks::ipc::task::export_tasks_csv` | Export tasks to CSV | Yes |
| `import_tasks_bulk` | `tasks::ipc::task::import_tasks_bulk` | Bulk import tasks | Yes |
| `task_transition_status` | `tasks::ipc::task::task_transition_status` | Change task status | Yes |
| `task_get_status_distribution` | `tasks::ipc::task::task_get_status_distribution` | Get status counts | Yes |

### 5.1 Task Status

```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
```

### 5.2 Task Priority

```typescript
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
```

---

## 6. Intervention Commands

| Command | Handler | Description | Auth Required |
|---------|---------|-------------|--------------|
| `intervention_start` | `interventions::ipc::intervention::intervention_start` | Start new intervention | Yes |
| `intervention_get` | `interventions::ipc::intervention::intervention_get` | Get intervention details | Yes |
| `intervention_update` | `interventions::ipc::intervention::intervention_update` | Update intervention | Yes |
| `intervention_delete` | `interventions::ipc::intervention::intervention_delete` | Delete intervention | Yes |
| `intervention_finalize` | `interventions::ipc::intervention::intervention_finalize` | Finalize intervention | Yes |
| `intervention_advance_step` | `interventions::ipc::intervention::intervention_advance_step` | Move to next step | Yes |
| `intervention_workflow` | `interventions::ipc::intervention::intervention_workflow` | Get workflow config | Yes |
| `intervention_progress` | `interventions::ipc::intervention::intervention_progress` | Get progress % | Yes |
| `intervention_management` | `interventions::ipc::intervention::intervention_management` | Composite management | Yes |
| `intervention_get_active_by_task` | `interventions::ipc::intervention::intervention_get_active_by_task` | Get active for task | Yes |
| `intervention_get_latest_by_task` | `interventions::ipc::intervention::intervention_get_latest_by_task` | Get latest for task | Yes |
| `intervention_save_step_progress` | `interventions::ipc::intervention::intervention_save_step_progress` | Save step data | Yes |
| `intervention_get_step` | `interventions::ipc::intervention::intervention_get_step` | Get step details | Yes |
| `intervention_get_progress` | `interventions::ipc::intervention::intervention_get_progress` | Get progress details | Yes |

### 6.1 PPF Workflow Steps

```typescript
type PPFStep = 'inspection' | 'preparation' | 'installation' | 'finalization';
```

### 6.2 Intervention Status

```typescript
type InterventionStatus = 'active' | 'completed' | 'cancelled';
```

---

## 7. Inventory/Material Commands

### 7.1 Material CRUD

| Command | Description |
|---------|-------------|
| `material_list` | List all materials |
| `material_create` | Create new material |
| `material_update` | Update material |
| `material_get` | Get material by ID |
| `material_get_by_sku` | Get material by SKU |
| `material_delete` | Soft delete material |

### 7.2 Stock Management

| Command | Description |
|---------|-------------|
| `material_update_stock` | Set stock level |
| `material_adjust_stock` | Adjust stock by delta |
| `material_record_consumption` | Record consumption for intervention |
| `material_get_consumption_history` | Get consumption history |
| `material_get_intervention_consumption` | Get consumption for intervention |
| `material_get_intervention_summary` | Get consumption summary |
| `material_create_inventory_transaction` | Create transaction record |
| `material_get_transaction_history` | Get transaction history |

### 7.3 Categories & Suppliers

| Command | Description |
|---------|-------------|
| `material_create_category` | Create material category |
| `material_list_categories` | List all categories |
| `material_create_supplier` | Create supplier |
| `material_list_suppliers` | List all suppliers |

### 7.4 Statistics & Alerts

| Command | Description |
|---------|-------------|
| `material_get_stats` | Get material statistics |
| `inventory_get_stats` | Get overall inventory stats |
| `material_get_low_stock` | Get low stock alert |
| `material_get_low_stock_materials` | Get materials below threshold |
| `material_get_expired` | Get expired materials alert |
| `material_get_expired_materials` | Get list of expired materials |
| `material_get_inventory_movement_summary` | Get movement summary |

---

## 8. Document/Photo Commands

| Command | Description |
|---------|-------------|
| `document_store_photo` | Store new photo |
| `document_get_photos` | Get photos for entity |
| `document_get_photo` | Get single photo |
| `document_delete_photo` | Delete photo |
| `document_get_photo_data` | Get photo binary data |
| `document_update_photo_metadata` | Update photo metadata |

---

## 9. Quote Commands

| Command | Description |
|---------|-------------|
| `quote_create` | Create new quote |
| `quote_get` | Get quote by ID |
| `quote_list` | List quotes |
| `quote_update` | Update quote |
| `quote_delete` | Delete quote |
| `quote_item_add` | Add line item |
| `quote_item_update` | Update line item |
| `quote_item_delete` | Delete line item |
| `quote_mark_sent` | Mark as sent |
| `quote_mark_accepted` | Mark as accepted |
| `quote_mark_rejected` | Mark as rejected |
| `quote_export_pdf` | Export to PDF |

---

## 10. Calendar Commands

| Command | Description |
|---------|-------------|
| `get_events` | Get calendar events |
| `get_event_by_id` | Get single event |
| `create_event` | Create event |
| `update_event` | Update event |
| `delete_event` | Delete event |
| `get_events_for_technician` | Get technician schedule |
| `get_events_for_task` | Get events for task |
| `calendar_get_tasks` | Get scheduled tasks |
| `calendar_check_conflicts` | Check for conflicts |
| `calendar_schedule_task` | Schedule a task |

---

## 11. Notification & Message Commands

### 11.1 Notifications

| Command | Description |
|---------|-------------|
| `initialize_notification_service` | Initialize notification system |
| `send_notification` | Send notification |
| `test_notification_config` | Test notification settings |
| `get_notification_status` | Get notification status |
| `get_recent_activities` | Get recent activity |

### 11.2 Messages

| Command | Description |
|---------|-------------|
| `message_send` | Send message |
| `message_get_list` | Get message list |
| `message_mark_read` | Mark as read |
| `message_get_templates` | Get message templates |
| `message_get_preferences` | Get message preferences |
| `message_update_preferences` | Update preferences |

---

## 12. Settings Commands

| Command | Description |
|---------|-------------|
| `get_app_settings` | Get app configuration |
| `update_general_settings` | Update general settings |
| `update_security_settings` | Update security settings |
| `update_notification_settings` | Update notification settings |
| `get_user_settings` | Get user settings |
| `update_user_profile` | Update user profile |
| `update_user_preferences` | Update user preferences |
| `update_user_security` | Update user security |
| `update_user_performance` | Update performance settings |
| `update_user_accessibility` | Update accessibility settings |
| `update_user_notifications` | Update notification preferences |
| `get_active_sessions` | Get active user sessions |
| `revoke_session` | Revoke a session |
| `revoke_all_sessions_except_current` | Revoke all other sessions |
| `update_session_timeout` | Update session timeout |
| `get_session_timeout_config` | Get timeout config |
| `upload_user_avatar` | Upload avatar image |
| `export_user_data` | Export user data |
| `delete_user_account` | Delete user account |
| `get_data_consent` | Get data consent status |
| `update_data_consent` | Update data consent |

---

## 13. Dashboard & Analytics Commands

| Command | Description |
|---------|-------------|
| `dashboard_get_stats` | Get dashboard statistics |
| `get_entity_counts` | Get entity counts |

---

## 14. Sync Commands

| Command | Description |
|---------|-------------|
| `sync_start_background_service` | Start background sync |
| `sync_stop_background_service` | Stop background sync |
| `sync_get_status` | Get sync status |
| `sync_now` | Trigger immediate sync |
| `sync_get_operations_for_entity` | Get sync ops for entity |
| `sync_enqueue` | Add to sync queue |
| `sync_dequeue_batch` | Get batch from queue |
| `sync_get_metrics` | Get sync metrics |
| `sync_mark_completed` | Mark operation complete |
| `sync_mark_failed` | Mark operation failed |
| `sync_get_operation` | Get operation details |
| `sync_cleanup_old_operations` | Cleanup old operations |

---

## 15. System Commands

| Command | Description |
|---------|-------------|
| `health_check` | Health check endpoint |
| `diagnose_database` | Run database diagnostics |
| `get_database_stats` | Get database statistics |
| `get_database_status` | Get database status |
| `get_database_pool_health` | Get connection pool health |
| `get_database_pool_stats` | Get pool statistics |
| `get_app_info` | Get application info |
| `get_device_info` | Get device information |
| `vacuum_database` | Vacuum database |
| `get_large_test_data` | Generate test data |

---

## 16. UI Commands

| Command | Description |
|---------|-------------|
| `ui_window_minimize` | Minimize window |
| `ui_window_maximize` | Maximize/restore window |
| `ui_window_close` | Close window |
| `ui_window_get_state` | Get window state |
| `ui_window_set_always_on_top` | Toggle always on top |
| `navigation_update` | Update navigation |
| `navigation_go_back` | Go back in history |
| `navigation_go_forward` | Go forward in history |
| `navigation_get_current` | Get current route |
| `navigation_add_to_history` | Add to history |
| `navigation_refresh` | Refresh current page |
| `shortcuts_register` | Register keyboard shortcuts |
| `ui_shell_open_url` | Open URL in browser |
| `ui_gps_get_current_position` | Get GPS position |
| `ui_initiate_customer_call` | Initiate phone call |

---

## 17. Report Commands

| Command | Description |
|---------|-------------|
| `export_intervention_report` | Export intervention report |
| `save_intervention_report` | Save report to database |

---

## 18. Performance & Security Commands

### 18.1 Performance

| Command | Description |
|---------|-------------|
| `get_performance_stats` | Get performance statistics |
| `get_performance_metrics` | Get detailed metrics |
| `cleanup_performance_metrics` | Cleanup old metrics |
| `get_cache_statistics` | Get cache statistics |
| `clear_application_cache` | Clear application cache |
| `configure_cache_settings` | Configure cache |

### 18.2 Security

| Command | Description |
|---------|-------------|
| `get_security_metrics` | Get security metrics |
| `get_security_events` | Get security events |
| `get_security_alerts` | Get security alerts |
| `acknowledge_security_alert` | Acknowledge alert |
| `resolve_security_alert` | Resolve alert |
| `cleanup_security_events` | Cleanup old events |

---

## 19. Error Handling

### 19.1 Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | User not authenticated |
| `FORBIDDEN` | User lacks permission |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input |
| `DATABASE_ERROR` | Database operation failed |
| `INTERNAL_ERROR` | Unexpected server error |

### 19.2 Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "constraint": "email"
    }
  },
  "correlationId": "abc-123-def"
}
```

---

## 20. Request/Response Correlation

All requests can include a `correlationId` for distributed tracing:

```typescript
interface RequestWithCorrelation {
  correlationId?: string;
}
```

The backend automatically attaches correlation IDs to responses for request tracking.

---

## 21. Type Safety

Types are auto-generated from Rust models using `ts-rs`:

- Run `npm run types:sync` to regenerate types
- Types are stored in `frontend/src/types/`
- **Do not edit manually** - changes will be overwritten

---

## 22. Command Statistics

| Category | Command Count |
|----------|---------------|
| Authentication | 4 (6 deprecated) |
| Users | 7 |
| Clients | 1 |
| Tasks | 14 |
| Interventions | 14 |
| Materials | 26 |
| Documents | 6 |
| Quotes | 12 |
| Calendar | 10 |
| Notifications | 5 |
| Messages | 6 |
| Settings | 20 |
| Dashboard | 2 |
| Sync | 12 |
| System | 10 |
| UI | 16 |
| Reports | 2 |
| Performance | 6 |
| Security | 6 |
| **Total** | **~163 commands** |
