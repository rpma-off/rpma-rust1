# IPC API & Contracts

The Tauri IPC is the strict boundary between Next.js frontend and Rust backend.

## IPC Contract Rules

| Rule | Requirement |
|------|-------------|
| **Authentication** | All protected commands MUST receive and validate `session_token` |
| **Authorization** | RBAC enforced in application layer via `AuthMiddleware` |
| **Correlation** | Pass `correlation_id` for request tracing |
| **Response Format** | `Result<T, AppError>` → JS Promise (resolve T, reject AppError) |
| **Handler Thickness** | IPC handlers must be thin; delegate to application services |

---

## Top 30 Important Commands

| Command | Purpose | Params | Auth |
|---------|---------|--------|------|
| `auth_login` | Authenticate user | `username`, `password` | Public |
| `auth_logout` | End session | `session_token` | Protected |
| `auth_validate_session` | Check token validity | `session_token` | Protected |
| `auth_create_account` | Create new account | `CreateAccountPayload` | Public |
| `user_crud` | User CRUD operations | `action`, `session_token`, `data` | Protected |
| `bootstrap_first_admin` | Setup first admin | `session_token`, `data` | Protected |
| `client_crud` | Client CRUD operations | `action`, `session_token`, `data` | Protected |
| `task_crud` | Task CRUD operations | `action`, `session_token`, `data` | Protected |
| `edit_task` | Update task details | `session_token`, `id`, `changes` | Protected |
| `task_transition_status` | Change task status | `session_token`, `id`, `new_status` | Protected |
| `intervention_start` | Begin intervention | `session_token`, `intervention_id` | Protected |
| `intervention_update` | Update intervention | `session_token`, `id`, `changes` | Protected |
| `intervention_finalize` | Complete intervention | `session_token`, `id`, `data` | Protected |
| `intervention_advance_step` | Move to next step | `session_token`, `intervention_id`, `step_data` | Protected |
| `intervention_save_step_progress` | Save step progress | `session_token`, `id`, `step_id`, `progress` | Protected |
| `material_create` | Create material | `session_token`, `data` | Protected |
| `material_list` | List materials | `session_token`, `filters` | Protected |
| `material_update_stock` | Adjust stock level | `session_token`, `id`, `quantity` | Protected |
| `material_record_consumption` | Log material use | `session_token`, `intervention_id`, `material_id`, `quantity` | Protected |
| `quote_create` | Create quote | `session_token`, `data` | Protected |
| `quote_list` | List quotes | `session_token`, `filters` | Protected |
| `quote_mark_accepted` | Accept quote | `session_token`, `quote_id` | Protected |
| `quote_convert_to_task` | Convert to task | `session_token`, `quote_id` | Protected |
| `sync_now` | Trigger sync | `session_token` | Protected |
| `sync_get_status` | Check sync status | `session_token` | Protected |
| `sync_enqueue` | Add to sync queue | `session_token`, `operation` | Protected |
| `report_generate` | Generate report | `session_token`, `report_type`, `params` | Protected |
| `report_list` | List reports | `session_token`, `filters` | Protected |
| `health_check` | System health | — | Public |
| `dashboard_get_stats` | Dashboard stats | `session_token` | Protected |

---

## Type Synchronization

**Source of Truth**: Rust models with `#[derive(TS)]`

**Generation Command**:
```bash
npm run types:sync
```

**Pipeline**:
1. Rust binary: `src-tauri/src/bin/export-types.rs` exports types to `bindings/`.
2. Node script: `scripts/write-types.js` processes and splits by domain.
3. Result: `frontend/src/lib/backend/*.ts`

**Output Structure**:
- `auth.ts`, `tasks.ts`, `interventions.ts`, `inventory.ts`, `clients.ts`, `quotes.ts`, `calendar.ts`, `reports.ts`, `sync.ts`, `settings.ts`, `documents.ts`, `notifications.ts`, `common.ts`

**Important**: `frontend/src/types/` contains **manual** types. Generated types go to `frontend/src/lib/backend/`.

---

## Validation Scripts

| Script | Purpose |
|--------|---------|
| `npm run types:validate` | Validate generated types |
| `npm run types:drift-check` | Check Rust/TS type consistency |
| `node scripts/ipc-authorization-audit.js` | Verify auth on protected commands |
| `node scripts/ipc-consistency-check.js` | Check IPC naming consistency |
