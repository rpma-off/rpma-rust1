# IPC API & Contracts

The Tauri IPC is the strict boundary between Next.js frontend and Rust backend.

## IPC Contract Rules

| Rule | Requirement |
|------|-------------|
| **Authentication** | All protected commands MUST receive and validate `session_token` |
| **Authorization** | RBAC enforced via `AuthMiddleware` in application layer |
| **Correlation** | Pass `correlation_id` for request tracing |
| **Response Format** | `Result<T, AppError>` → JS Promise (resolve T, reject AppError) |
| **Handler Thickness** | IPC handlers must be thin; delegate to application services |
| **Error Sanitization** | Server errors (Database, Internal, Io, Network, Sync) are sanitized |

---

## Public vs Protected Commands

### Public Commands (No Session Required)
Defined in `frontend/src/lib/ipc/utils.ts`:
- `auth_login`, `auth_create_account`, `auth_validate_session`, `auth_logout`
- `has_admins`, `bootstrap_first_admin`
- `ui_window_minimize`, `ui_window_maximize`, `ui_window_close`
- `navigation_update`, `navigation_go_back`, `navigation_go_forward`, `navigation_get_current`, `navigation_add_to_history`
- `shortcuts_register`, `ui_shell_open_url`, `ui_gps_get_current_position`, `ui_initiate_customer_call`
- `get_app_info`

### Protected Commands (Session Required)
All other commands require a valid `session_token`.

---

## Top 30 Important Commands

| Command | Purpose | Params | Auth |
|---------|---------|--------|------|
| `auth_login` | Authenticate user | `username`, `password` | Public |
| `auth_logout` | End session | `session_token` | Protected |
| `auth_validate_session` | Check token validity | `session_token` | Protected |
| `auth_create_account` | Create new account | `CreateAccountPayload` | Public |
| `user_crud` | User CRUD operations | `action`, `session_token`, `data` | Protected |
| `bootstrap_first_admin` | First admin setup | `BootstrapAdminRequest` | Public |
| `has_admins` | Check if admins exist | — | Public |
| `client_crud` | Client CRUD operations | `action`, `session_token`, `data` | Protected |
| `task_crud` | Task CRUD (unified) | `action`, `session_token`, `data` | Protected |
| `edit_task` | Update task details | `request` (EditTaskRequest) | Protected |
| `add_task_note` | Add note to task | `request` (AddTaskNoteRequest) | Protected |
| `send_task_message` | Send task-scoped message | `request` (SendTaskMessageRequest) | Protected |
| `report_task_issue` | Log task issue | `request` (ReportTaskIssueRequest) | Protected |
| `task_transition_status` | Change task status | `id`, `new_status`, `session_token` | Protected |
| `intervention_start` | Begin intervention | `request` (StartInterventionRequest) | Protected |
| `intervention_advance_step` | Move to next step | `request` (AdvanceStepRequest) | Protected |
| `intervention_save_step_progress` | Save progress | `request` (SaveStepProgressRequest) | Protected |
| `intervention_finalize` | Complete intervention | `request` (FinalizeInterventionRequest) | Protected |
| `intervention_get` | Get intervention | `id`, `session_token` | Protected |
| `intervention_workflow` | Workflow operations | `request` | Protected |
| `material_create` | Create material | `session_token`, `data` | Protected |
| `material_list` | List materials | `session_token`, `filters` | Protected |
| `material_update_stock` | Adjust stock level | `session_token`, `id`, `quantity` | Protected |
| `material_record_consumption` | Record usage | `session_token`, `data` | Protected |
| `quote_create` | Create quote | `session_token`, `data` | Protected |
| `quote_list` | List quotes | `session_token`, `filters` | Protected |
| `quote_mark_accepted` | Accept quote | `session_token`, `quote_id` | Protected |
| `quote_convert_to_task` | Convert to task | `session_token`, `quote_id` | Protected |
| `sync_enqueue` | Enqueue sync operation | `session_token`, `operation` | Protected |
| `sync_now` | Trigger sync | `session_token` | Protected |
| `sync_get_metrics` | Check sync metrics | `session_token` | Protected |
| `health_check` | System health | — | Public |
| `dashboard_get_stats` | Dashboard stats | `session_token` | Protected |
| `get_performance_stats` | Performance metrics | `session_token` | Protected |

---

## Type Synchronization

**Source of Truth**: Rust models with `#[derive(TS)]`

**Generation Command**:
```bash
npm run types:sync
```

**Pipeline**:
1. Rust binary: `src-tauri/src/bin/export-types.rs` exports types via `ts-rs`
2. Node script: `scripts/write-types.js` processes and splits by domain
3. Result: `frontend/src/types/*.ts`

**Output Files**:
- `auth.ts`, `tasks.ts`, `interventions.ts`, `inventory.ts`, `clients.ts`
- `quotes.ts`, `calendar.ts`, `reports.ts`, `sync.ts`, `settings.ts`
- `documents.ts`, `notifications.ts`, `common.ts`, `index.ts`

**Important**: 
- `frontend/src/types/` contains **generated** types
- **DO NOT EDIT** generated type files manually

---

## Validation Scripts

| Script | Purpose |
|--------|---------|
| `npm run types:validate` | Validate generated types |
| `npm run types:drift-check` | Check Rust/TS type consistency |
| `node scripts/ipc-authorization-audit.js` | Verify auth on protected commands |
| `node scripts/ipc-consistency-check.js` | Check IPC naming consistency |
| `node scripts/ipc-production-gate.js` | Production readiness gate |

---

## Request/Response Patterns

### Standard Request Pattern
```typescript
// Frontend
const result = await safeInvoke('task_crud', {
  action: 'create',
  token: sessionToken,
  data: taskData,
  correlation_id: uuidv4()
});
```

### Standard Response Pattern
```rust
// Backend
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub correlation_id: Option<String>,
}
```

### Error Response
When an error occurs, the Promise rejects with an `AppError` that includes:
- `code` — Error code (e.g., `AUTH_INVALID`, `VALIDATION_ERROR`)
- `message` — User-friendly message
- Original error details are sanitized for server errors
