# IPC Contract Audit — GitHub Issues

> Generated from IPC contract audit on 2026-02-12.
> Each section below is a standalone GitHub issue, ready to copy-paste.

---

## Issue 1: 22 Frontend IPC Commands Reference Non-Existent Backend Handlers

**Title:** `[IPC] 22 frontend IPC commands reference non-existent Rust backend handlers`

**Labels:** `bug`, `frontend`, `backend`, `high-priority`

### Context

The frontend `IPC_COMMANDS` registry (`frontend/src/lib/ipc/commands.ts`) contains 22 command strings that have no corresponding `#[tauri::command]` handler registered in `generate_handler![]` (`src-tauri/src/main.rs`). Any frontend code that invokes these commands will fail silently or throw a Tauri "command not found" error at runtime.

### Affected Commands

| Frontend Constant | IPC String | Domain |
|---|---|---|
| `BAN_USER` | `ban_user` | User |
| `UNBAN_USER` | `unban_user` | User |
| `CHANGE_USER_ROLE` | `change_user_role` | User |
| `UPDATE_USER_EMAIL` | `update_user_email` | User |
| `BLOCK_IP_ADDRESS` | `block_ip_address` | Security |
| `UNBLOCK_IP_ADDRESS` | `unblock_ip_address` | Security |
| `GET_BLOCKED_IPS` | `get_blocked_ips` | Security |
| `GET_HEALTH_STATUS` | `get_health_status` | System |
| `GET_APPLICATION_METRICS` | `get_application_metrics` | System |
| `PHOTO_CRUD` | `photo_crud` | Photo |
| `MATERIAL_DELETE` | `material_delete` | Material |
| `MATERIAL_ADJUST_STOCK` | `material_adjust_stock` | Material |
| `MATERIAL_GET_CONSUMPTION_HISTORY` | `material_get_consumption_history` | Material |
| `MATERIAL_CREATE_INVENTORY_TRANSACTION` | `material_create_inventory_transaction` | Material |
| `MATERIAL_GET_TRANSACTION_HISTORY` | `material_get_transaction_history` | Material |
| `MATERIAL_CREATE_CATEGORY` | `material_create_category` | Material |
| `MATERIAL_LIST_CATEGORIES` | `material_list_categories` | Material |
| `MATERIAL_CREATE_SUPPLIER` | `material_create_supplier` | Material |
| `MATERIAL_LIST_SUPPLIERS` | `material_list_suppliers` | Material |
| `MATERIAL_GET_LOW_STOCK_MATERIALS` | `material_get_low_stock_materials` | Material |
| `MATERIAL_GET_EXPIRED_MATERIALS` | `material_get_expired_materials` | Material |
| `MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY` | `material_get_inventory_movement_summary` | Material |

### Steps to Reproduce

1. In the frontend, attempt to call any of the listed commands via `invoke(IPC_COMMANDS.BAN_USER, { ... })`
2. Observe that Tauri returns an error because no handler is registered

### Expected vs Actual

- **Expected:** Every command string in `IPC_COMMANDS` has a corresponding `#[tauri::command]` handler registered in `generate_handler![]`
- **Actual:** 22 commands exist only in the frontend registry with no backend implementation

### Impact

- **High** — Any frontend feature relying on these commands is broken at runtime
- Security commands (`ban_user`, `block_ip_address`) are non-functional
- Material management features (categories, suppliers, transactions) are incomplete
- Photo management (`photo_crud`) is non-functional

### Proposed Fix

For each missing command, either:
1. **Implement the backend handler** in the appropriate command module and register it in `generate_handler![]`
2. **Remove the frontend constant** if the feature is not planned (with a note in the code)

### Acceptance Criteria

- [ ] All 22 commands either have a working backend handler or are removed from `IPC_COMMANDS`
- [ ] `npm run ipc:validate:ci` passes with 0 critical errors
- [ ] No frontend feature references a non-existent backend command

---

## Issue 2: 38 Backend Commands Not Exposed to Frontend IPC Registry

**Title:** `[IPC] 38 backend commands registered in generate_handler but missing from frontend IPC_COMMANDS`

**Labels:** `enhancement`, `frontend`, `backend`

### Context

The Rust backend registers 38 commands in `generate_handler![]` (`src-tauri/src/main.rs`) that have no corresponding entry in the frontend `IPC_COMMANDS` registry (`frontend/src/lib/ipc/commands.ts`). This means the frontend cannot invoke these commands through the centralized IPC client, forcing developers to use hardcoded strings or bypassing the type-safe IPC layer.

### Affected Commands

| Rust Command | Module | Category |
|---|---|---|
| `analytics_get_summary` | analytics | Analytics |
| `verify_2fa_code` | auth | Auth |
| `create_user` | user (mod.rs) | User |
| `get_users` | user (mod.rs) | User |
| `update_user` | user (mod.rs) | User |
| `update_user_status` | user (mod.rs) | User |
| `delete_user` | user (mod.rs) | User |
| `intervention_start` | intervention | Intervention |
| `intervention_get` | intervention | Intervention |
| `intervention_update` | intervention | Intervention |
| `intervention_delete` | intervention | Intervention |
| `intervention_finalize` | intervention | Intervention |
| `intervention_advance_step` | intervention | Intervention |
| `material_get_by_sku` | material | Material |
| `material_get_low_stock` | material | Material |
| `material_get_expired` | material | Material |
| `material_get_intervention_consumption` | material | Material |
| `material_get_intervention_summary` | material | Material |
| `message_send` | message | Message |
| `message_get_list` | message | Message |
| `message_mark_read` | message | Message |
| `message_get_templates` | message | Message |
| `message_get_preferences` | message | Message |
| `message_update_preferences` | message | Message |
| `task_transition_status` | status | Task |
| `task_get_status_distribution` | status | Task |
| `navigation_refresh` | navigation | UI |
| `ui_window_get_state` | ui | UI |
| `ui_window_set_always_on_top` | ui | UI |
| `update_general_settings` | settings | Settings |
| `update_security_settings` | settings | Settings |
| `vacuum_database` | system | System |
| `get_entity_counts` | reports | Reports |
| `get_geographic_report` | reports | Reports |
| `get_seasonal_report` | reports | Reports |
| `get_operational_intelligence_report` | reports | Reports |
| `calendar_check_conflicts` | calendar | Calendar |
| `calendar_get_tasks` | calendar | Calendar |

### Steps to Reproduce

1. Look for `analytics_get_summary` in `frontend/src/lib/ipc/commands.ts` — it does not exist
2. A developer wanting to call this command must hardcode `'analytics_get_summary'` string

### Expected vs Actual

- **Expected:** Every registered backend command has a corresponding entry in `IPC_COMMANDS` (or is documented as intentionally backend-only)
- **Actual:** 38 commands are unreachable through the centralized frontend IPC layer

### Impact

- **Medium** — Developers may use hardcoded strings to invoke these commands, bypassing type safety
- Analytics, messaging, advanced reporting, and calendar conflict features are not accessible through the standard IPC client
- New features built on these commands will lack centralized command string management

### Proposed Fix

1. Add entries to `IPC_COMMANDS` in `frontend/src/lib/ipc/commands.ts` for all 38 commands
2. For commands that are intentionally backend-only, document them in the `KNOWN_BACKEND_ONLY` set of `scripts/validate-ipc-contracts.js`

### Acceptance Criteria

- [ ] All 38 commands either added to `IPC_COMMANDS` or documented as backend-only
- [ ] `npm run ipc:validate` shows 0 unexpected missing commands
- [ ] Frontend modules updated to use `IPC_COMMANDS` constants instead of hardcoded strings

---

## Issue 3: Inconsistent Command Naming Conventions Across IPC Layer

**Title:** `[IPC] Inconsistent command naming conventions: mixed domain-prefix vs verb-prefix patterns`

**Labels:** `enhancement`, `backend`, `frontend`, `tech-debt`

### Context

The IPC command naming follows two conflicting patterns across the codebase:

1. **Domain-prefixed** (72 commands): `task_crud`, `material_get`, `intervention_workflow`, `sync_get_status`
2. **Verb-prefixed** (98 commands): `get_events`, `create_user`, `update_event`, `delete_user`
3. **Non-standard** (15 commands): `health_check`, `has_admins`, `bootstrap_first_admin`, `vacuum_database`

This inconsistency creates confusion about how to name new commands and makes it harder to discover commands by domain.

### Specific Examples

**GET pattern inconsistency** — 24 commands use `domain_get_*` while 38 use `get_*`:
```
# Domain-prefixed GET:
material_get_stats
intervention_get_progress
sync_get_status
task_get_status_distribution

# Verb-prefixed GET:
get_events
get_security_metrics
get_performance_stats
get_user_settings
```

**Mixed naming in same domain:**
```
# User domain - inconsistent:
user_crud            (domain-prefix)
create_user          (verb-prefix)
get_users            (verb-prefix)
update_user          (verb-prefix)
delete_user          (verb-prefix)
change_user_password (verb-prefix)

# Calendar domain - inconsistent:
calendar_get_tasks       (domain-prefix)
calendar_check_conflicts (domain-prefix)
get_events               (verb-prefix)
create_event             (verb-prefix)
```

### Expected vs Actual

- **Expected:** A single consistent naming convention for all IPC commands
- **Actual:** Three different patterns are used without clear rules

### Impact

- **Low-Medium** — Primarily a developer experience and maintainability issue
- New developers cannot predict command names
- Command auto-completion and discovery is harder
- Increased cognitive load when working across domains

### Proposed Fix

1. Choose and document a standard naming convention (recommend: `domain_verb_target`, e.g., `user_create`, `calendar_get_events`)
2. Create a naming convention guide in `docs/`
3. Add a linting rule to `validate-ipc-contracts.js` that warns on non-conforming new commands
4. Migrate existing commands gradually (in a major version) to avoid breaking changes

### Acceptance Criteria

- [ ] Naming convention documented in `docs/IPC_NAMING.md`
- [ ] `validate-ipc-contracts.js` warns on non-conforming command names
- [ ] All new commands follow the chosen convention

---

## Issue 4: 49 Commands Use Non-Standard Response Types Instead of `ApiResponse<T>`

**Title:** `[IPC] 49 commands bypass standard ApiResponse<T> envelope — inconsistent error handling`

**Labels:** `bug`, `backend`, `frontend`, `tech-debt`

### Context

The project defines a standard response envelope `Result<ApiResponse<T>, AppError>` for IPC commands. However, 49 out of 185 commands (26%) use non-standard return types, making error handling inconsistent on the frontend.

### Non-Standard Patterns Found

**Pattern 1: `Result<T, String>` (35 commands)**
Commands returning plain `String` errors instead of structured `AppError`:
- All navigation commands (`navigation.rs`: 7 commands)
- All notification commands (`notification.rs`: 4 commands)
- All system commands (`system.rs`: 6 commands)
- All sync commands (`sync.rs`: 5 commands)
- All sync queue commands (`queue.rs`: 7 commands)
- All UI commands (`ui.rs`: 9 commands)

**Pattern 2: `Result<T, ApiError>` without `ApiResponse` wrapper (8 commands)**
Commands returning raw data without the success/error envelope:
- All message commands (`message.rs`: 6 commands)
- Status commands (`status.rs`: 2 commands — `task_transition_status`, `task_get_status_distribution`)

**Pattern 3: `AppResult<T>` (6 commands)**
Commands using the `AppResult` alias but without `ApiResponse` wrapper:
- WebSocket commands (`websocket_commands.rs`)
- IPC optimization commands (`ipc_optimization.rs`)
- Report generation (`pdf_generation.rs`)

### Steps to Reproduce

1. Call `health_check` from the frontend — returns `Result<String, String>`, not `ApiResponse<String>`
2. Frontend `ApiResponse<T>` unwrapping logic fails or requires special handling
3. Error messages are unstructured plain strings, not `AppError` objects with codes

### Expected vs Actual

- **Expected:** All commands return `Result<ApiResponse<T>, AppError>` with consistent `{ success, data, error }` envelope
- **Actual:** Three different return patterns with inconsistent error shapes

### Impact

- **High** — Frontend error handling must accommodate multiple response shapes
- Type-safe error handling is impossible for non-standard commands
- Frontend `ApiResponse<T>` type assertion may cause runtime errors
- Inconsistent user-facing error messages

### Proposed Fix

1. Migrate all `Result<T, String>` commands to `Result<ApiResponse<T>, AppError>`:
   - Replace `.map_err(|e| e.to_string())` with `.map_err(AppError::from)`
   - Wrap return values in `ApiResponse::success(data)`
2. Migrate `Result<T, ApiError>` commands to wrap in `ApiResponse<T>`
3. Add a CI check in `validate-ipc-contracts.js` that fails on non-standard return types

### Acceptance Criteria

- [ ] All registered commands use `Result<ApiResponse<T>, AppError>` pattern
- [ ] Frontend can safely unwrap all responses using a single `ApiResponse<T>` handler
- [ ] `validate-ipc-contracts.js` detects and flags non-standard return types
- [ ] No runtime response shape mismatches

---

## Issue 5: Frontend `IPC_COMMANDS` Contains Name Mismatches with Backend (Material Domain)

**Title:** `[IPC] Material domain has naming mismatches between frontend constants and backend handlers`

**Labels:** `bug`, `frontend`, `backend`

### Context

The Material domain has naming inconsistencies where the frontend uses different command names than the backend, causing some commands to appear as both "missing from frontend" and "missing from backend" when they refer to the same functionality.

### Specific Mismatches

| Frontend Constant | Frontend Value | Backend Handler | Match? |
|---|---|---|---|
| `MATERIAL_GET_LOW_STOCK_MATERIALS` | `material_get_low_stock_materials` | `material_get_low_stock` | ❌ suffix mismatch |
| `MATERIAL_GET_EXPIRED_MATERIALS` | `material_get_expired_materials` | `material_get_expired` | ❌ suffix mismatch |

The frontend appends `_materials` to the command name while the backend uses the shorter form.

### Steps to Reproduce

1. Frontend calls `invoke('material_get_low_stock_materials', ...)` 
2. Backend has no handler for `material_get_low_stock_materials` — only `material_get_low_stock`
3. Command fails at runtime

### Expected vs Actual

- **Expected:** Frontend command strings exactly match backend function names
- **Actual:** Two material commands have suffix mismatches

### Impact

- **High** — Material low-stock and expiry monitoring features are broken at runtime

### Proposed Fix

Either:
1. Rename frontend constants to match backend: `material_get_low_stock`, `material_get_expired`
2. Or rename backend handlers to match frontend (less preferred — requires Rust changes)

### Acceptance Criteria

- [ ] `MATERIAL_GET_LOW_STOCK_MATERIALS` value matches the backend handler name
- [ ] `MATERIAL_GET_EXPIRED_MATERIALS` value matches the backend handler name
- [ ] `npm run ipc:validate` shows these commands as matched

---

## Issue 6: Type Sync Workflow Does Not Validate IPC Contract Consistency

**Title:** `[CI] Add IPC contract validation to type sync workflow and CI pipeline`

**Labels:** `enhancement`, `ci`, `frontend`, `backend`

### Context

The project has a robust type sync workflow (`types:sync`, `types:validate`, `types:drift-check`) that ensures Rust model types match TypeScript types. However, there is no equivalent validation for IPC command contracts — the mapping between `generate_handler![]` registrations and `IPC_COMMANDS` constants.

A new validation script `scripts/validate-ipc-contracts.js` has been created with two modes:
- **Default mode:** Reports all issues as warnings/errors
- **CI mode (`--ci`):** Exits with code 1 on critical errors (frontend commands with no backend handler)

### Steps to Reproduce

1. Add a new command to `IPC_COMMANDS` in `frontend/src/lib/ipc/commands.ts`
2. Forget to add the corresponding `#[tauri::command]` handler in Rust
3. CI pipeline does not catch this — the broken command ships to production

### Expected vs Actual

- **Expected:** CI catches IPC contract mismatches before merge
- **Actual:** No CI gate validates IPC command consistency

### Impact

- **Medium** — Broken IPC commands can reach production undetected
- The 22 phantom frontend commands (Issue 1) were not caught by any existing check

### Proposed Fix

1. Add `npm run ipc:validate:ci` to the CI workflow in `.github/workflows/ci.yml`
2. Add it to the `quality:check` script if one exists
3. Run `npm run ipc:validate` as part of the `dev` startup to catch issues early

### Acceptance Criteria

- [ ] `npm run ipc:validate:ci` is part of the CI pipeline
- [ ] IPC contract mismatches block PR merges
- [ ] Documentation updated to include IPC validation in development workflow

---

## Issue 7: `photo_crud` Command Commented Out in Backend but Present in Frontend

**Title:** `[IPC] photo_crud handler commented out in backend but referenced in frontend`

**Labels:** `bug`, `frontend`, `backend`

### Context

The `photo_crud` command is explicitly commented out in `generate_handler![]` in `src-tauri/src/main.rs` (lines 110-112) with a TODO:

```rust
// commands::photo::photo_crud, // TODO: implement photo module
// commands::photo::store_photo_with_data, // TODO: implement photo module
// commands::photo::get_photo_data, // TODO: implement photo module
```

However, the frontend `IPC_COMMANDS` registry still has:
```typescript
PHOTO_CRUD: 'photo_crud',
```

### Steps to Reproduce

1. Navigate to any frontend feature that uses `IPC_COMMANDS.PHOTO_CRUD`
2. Invocation fails because the handler is not registered

### Expected vs Actual

- **Expected:** Commented-out backend commands should not be referenced in the frontend registry
- **Actual:** Frontend references a command that is known to be unimplemented

### Impact

- **Medium** — Photo management feature is broken; developers may not realize the handler doesn't exist

### Proposed Fix

1. Either implement the `photo_crud` backend handler and uncomment it
2. Or remove `PHOTO_CRUD` from `IPC_COMMANDS` and mark photo features as "coming soon" in the UI

### Acceptance Criteria

- [ ] `PHOTO_CRUD` is either backed by a working handler or removed from `IPC_COMMANDS`
- [ ] Frontend photo features gracefully handle the missing command or work correctly

---

## Issue 8: Duplicate User Management Commands Across Modules

**Title:** `[IPC] Duplicate user management commands: `user.rs` CRUD vs standalone `create_user/get_users/update_user/delete_user``

**Labels:** `tech-debt`, `backend`

### Context

User management has two overlapping command sets registered in `generate_handler![]`:

**Set 1 — `commands/user.rs` module (CRUD pattern):**
```rust
commands::user::user_crud,          // Multiplexed CRUD handler
commands::user::bootstrap_first_admin,
commands::user::has_admins,
```

**Set 2 — `commands/mod.rs` standalone functions:**
```rust
commands::get_users,
commands::create_user,
commands::update_user,
commands::update_user_status,
commands::delete_user,
```

The frontend only references `USER_CRUD: 'user_crud'` and specific user actions (`CHANGE_USER_ROLE`, `BAN_USER`, etc.), creating confusion about which command set is authoritative.

### Expected vs Actual

- **Expected:** A single, consistent user management command interface
- **Actual:** Two parallel command sets with overlapping functionality

### Impact

- **Medium** — Maintenance burden; unclear which commands handle which operations
- Possible data inconsistencies if both paths are used for the same operations
- RBAC checks may differ between the two implementations

### Proposed Fix

1. Consolidate on a single approach — either the CRUD multiplexer or individual commands
2. If keeping both, clearly document which is used for which purpose
3. Remove the unused set from `generate_handler![]`

### Acceptance Criteria

- [ ] Single authoritative user management command interface documented
- [ ] Unused duplicate commands removed or explicitly deprecated
- [ ] Frontend uses only the authoritative command set

---

## Issue 9: `serde_json::Value` Used as Return Type Bypasses Type Safety

**Title:** `[IPC] 8+ commands return `serde_json::Value` — bypasses compile-time type safety`

**Labels:** `tech-debt`, `backend`, `frontend`

### Context

Several commands return `serde_json::Value` (untyped JSON) instead of strongly-typed Rust structs. This bypasses the ts-rs type generation pipeline, meaning the frontend has no compile-time type information for these responses.

### Affected Commands

| Command | File | Return Type |
|---|---|---|
| `get_notification_status` | notification.rs | `Result<serde_json::Value, String>` |
| `diagnose_database` | system.rs | `Result<serde_json::Value, String>` |
| `get_database_stats` | system.rs | `Result<serde_json::Value, String>` |
| `get_app_info` | system.rs | `Result<serde_json::Value, String>` |
| `sync_get_status` | sync.rs | `Result<serde_json::Value, String>` |
| `ui_gps_get_current_position` | ui.rs | `Result<serde_json::Value, String>` |
| `ui_window_get_state` | ui.rs | `Result<serde_json::Value, String>` |
| `get_recent_activities` | ui.rs | `Result<Vec<serde_json::Value>, String>` |

### Expected vs Actual

- **Expected:** All commands return strongly-typed structs that are exported via ts-rs
- **Actual:** 8+ commands return opaque JSON, requiring manual frontend type assertions

### Impact

- **Medium** — Frontend must use `as any` or manual type guards for these responses
- Type drift for these commands is undetectable by `types:drift-check`
- Refactoring backend response shapes will silently break the frontend

### Proposed Fix

1. Define proper Rust structs for each response (e.g., `DatabaseDiagnostics`, `AppInfo`, `SyncStatusInfo`)
2. Derive `#[derive(Serialize, TS)]` on each struct
3. Replace `serde_json::Value` returns with the typed structs
4. Run `npm run types:sync` to generate corresponding TypeScript types

### Acceptance Criteria

- [ ] No commands return `serde_json::Value` as the primary response type
- [ ] All response types have corresponding TypeScript definitions in `backend.ts`
- [ ] `npm run types:drift-check` validates these new types

---

## Issue 10: CI Pipeline Missing IPC Contract and Naming Validation Gate

**Title:** `[CI] Add IPC contract validation as a required CI check`

**Labels:** `enhancement`, `ci`

### Context

The CI pipeline (`.github/workflows/ci.yml`) includes:
- Frontend: build, encoding check
- Rust: fmt, clippy, tests, MSRV check
- Security: cargo-audit, cargo-deny
- Coverage: tarpaulin

But it does **not** include:
- IPC contract validation (frontend ↔ backend command consistency)
- IPC naming convention checks
- Response type pattern validation

### Proposed Fix

Add a new CI job or step to the existing frontend job:

```yaml
- name: Validate IPC contracts
  run: npm run ipc:validate:ci
```

### Acceptance Criteria

- [ ] `npm run ipc:validate:ci` runs in CI on every PR
- [ ] Critical IPC mismatches (frontend referencing non-existent backend commands) block merge
- [ ] Warnings are reported but do not block merge
