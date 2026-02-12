# Functional Verification Matrix

> **Generated from documented user flows:**
> Login → Create Task → Assign → Start Intervention → Advance Steps → Finalize → Reports

This document maps each user flow to the IPC commands, services, repositories, and database tables involved; identifies key invariants and failure modes; and highlights missing validations, inconsistent status transitions, and missing UX states.

---

## Table of Contents

1. [Flow → Commands → Services → Repos → Tables](#1-flow-mapping-table)
2. [Key Invariants and Failure Modes](#2-key-invariants-and-failure-modes)
3. [Missing Validations and Inconsistent Status Transitions](#3-missing-validations-and-inconsistent-status-transitions)
4. [Missing UX States](#4-missing-ux-states)

---

## 1. Flow Mapping Table

### Flow 1 — Login / Authentication

| Layer | Component | Details |
|-------|-----------|---------|
| **IPC Commands** | `auth_login`, `auth_validate_session`, `auth_refresh_token`, `auth_logout` | `session_token` returned on success; required by all subsequent commands |
| **Frontend Hooks** | `useAuth` (Context), `useSession` | Manages token storage, auto-refresh, redirect on expiry |
| **Frontend IPC** | `ipcClient.auth.login()`, `ipcClient.auth.validateSession()` | Via `safeInvoke` → Tauri `invoke()` |
| **Command Handler** | `src-tauri/src/commands/auth.rs` | Rate limiting, 2FA verification, device info capture |
| **Service** | `AuthService` (`src-tauri/src/services/auth.rs`) | Password hashing (bcrypt/argon2), JWT generation, session creation |
| **Service** | `TokenService` (`src-tauri/src/services/token.rs`) | JWT encode/decode, token refresh, expiry management |
| **Repository** | `UserRepository` (`src-tauri/src/repositories/user_repository.rs`) | `find_by_email()`, `find_by_id()` |
| **DB Tables** | `users`, `user_sessions` | `users` for credential lookup; `user_sessions` for active session tracking |

### Flow 2 — Create Task

| Layer | Component | Details |
|-------|-----------|---------|
| **IPC Commands** | `task_create` | Requires `session_token`, `TaskCrudRequest` payload |
| **Frontend Hooks** | `useTaskActions.createTask()` | Calls `taskService.createTask()`, shows toast on success/error |
| **Frontend IPC** | `ipcClient.tasks.create()` | Via `safeInvoke` with auth header |
| **Command Handler** | `src-tauri/src/commands/task/facade.rs` → `task_crud()` | RBAC check (Admin/Supervisor), dispatches to `TaskCrudService` |
| **Validation** | `src-tauri/src/commands/task/validation.rs` | Field validation: vehicle_plate, model, ppf_zones, scheduled_date required |
| **Service** | `TaskCrudService` (`src-tauri/src/services/task_crud.rs`) | Generates task_number (`T-YYYYMMDD-XXX`), sets initial status `Draft` |
| **Service** | `TaskCreationService` (`src-tauri/src/services/task_creation.rs`) | Orchestrates creation, client linking, notification dispatch |
| **Repository** | `TaskRepository` (`src-tauri/src/repositories/task_repository.rs`) | `INSERT INTO tasks` |
| **DB Tables** | `tasks`, `clients` (if client linked), `task_history` (audit) | Task created with status `Draft` or `Pending` |

### Flow 3 — Assign Task to Technician

| Layer | Component | Details |
|-------|-----------|---------|
| **IPC Commands** | `task_crud` (update action with assignment) | Requires `session_token`, technician_id |
| **Frontend Hooks** | `useTaskActions.updateTask()` | Sets `technician_id`, `assigned_at`, `assigned_by` fields |
| **Frontend IPC** | `ipcClient.tasks.update()` or API route `POST /tasks/[id]/assign` | Dual path: IPC for desktop, API route for web |
| **Command Handler** | `src-tauri/src/commands/task/validation.rs` → `check_task_assignment()` | RBAC (Admin/Supervisor only), workload limit check, schedule conflict detection |
| **Service** | `TaskUpdateService` (`src-tauri/src/services/task_update.rs`) | Validates status transition → `Assigned`, updates task record |
| **Service** | `TaskValidationService` (`src-tauri/src/services/task_validation.rs`) | `validate_status_transition()` enforces allowed transitions |
| **Repository** | `TaskRepository` | `UPDATE tasks SET technician_id, status = 'assigned', assigned_at` |
| **Repository** | `UserRepository` | `find_by_id()` to validate technician exists and is active |
| **DB Tables** | `tasks`, `users`, `task_history` | Task status → `Assigned`; `task_history` records transition |

### Flow 4 — Start Intervention

| Layer | Component | Details |
|-------|-----------|---------|
| **IPC Commands** | `intervention_start` (via `intervention_workflow` dispatch) | Requires `session_token`, `task_id`, `StartInterventionDTO` |
| **Frontend Hooks** | `useInterventionActions.createInterventionMutation` | Calls `ipcClient.interventions.startIntervention()` |
| **Frontend IPC** | `ipcClient.interventions.startIntervention()` | Maps backend steps to `PPFInterventionStep[]` |
| **Command Handler** | `src-tauri/src/commands/intervention/workflow.rs` → `intervention_start()` | Checks no active intervention exists; checks technician assignment |
| **Service** | `InterventionWorkflowService` (`src-tauri/src/services/intervention_workflow.rs`) | Creates intervention (status `InProgress`), generates workflow steps (1–10+ based on PPF zones) |
| **Service** | `InterventionValidationService` (`src-tauri/src/services/intervention_validation.rs`) | Validates PPF zone configuration |
| **Repository** | `InterventionRepository` (`src-tauri/src/repositories/intervention_repository.rs`) | `INSERT INTO interventions`, `INSERT INTO intervention_steps` |
| **DB Tables** | `interventions`, `intervention_steps`, `tasks` | Intervention created as `InProgress`; steps created as `Pending`; task updated to `InProgress` |

### Flow 5 — Advance Steps (Execute Intervention)

| Layer | Component | Details |
|-------|-----------|---------|
| **IPC Commands** | `intervention_advance_step`, `intervention_save_step_progress` | Requires `session_token`, `intervention_id`, step data, optional photo IDs |
| **Frontend Hooks** | `useInterventionActions.advanceStepMutation`, `useWorkflowActions` | Step navigation (next/prev/goToStep), progress tracking |
| **Frontend IPC** | `ipcClient.interventions.advanceStep()`, `ipcClient.interventions.saveStepProgress()` | Advance = complete + move; save = persist without advancing |
| **Command Handler** | `src-tauri/src/commands/intervention/workflow.rs` | Routes to workflow service |
| **Service** | `InterventionWorkflowService.advance_step()` | Validates: intervention `InProgress`, step `Pending`/`InProgress`, previous step `Completed`, photo requirements met |
| **Service** | `WorkflowValidationService` (`src-tauri/src/services/workflow_validation.rs`) | `validate_step_advancement()`: sequential order, status checks |
| **Repository** | `InterventionRepository` | `UPDATE intervention_steps SET step_status, completed_at`; `UPDATE interventions SET current_step, completion_percentage` |
| **DB Tables** | `intervention_steps`, `interventions`, `photos` (if photos attached), `material_consumption` (if materials recorded) | Step → `Completed`; intervention `completion_percentage` updated |

### Flow 6 — Finalize Intervention

| Layer | Component | Details |
|-------|-----------|---------|
| **IPC Commands** | `intervention_finalize` | Requires `session_token`, `FinalizeInterventionRequest` (satisfaction, quality scores, signature, observations) |
| **Frontend Hooks** | `useInterventionActions.finalizeInterventionMutation` | Captures customer signature (base64), satisfaction rating (1–10), quality score (0–100), final observations |
| **Frontend IPC** | `ipcClient.interventions.finalizeIntervention()` | Sends finalization payload |
| **Command Handler** | `src-tauri/src/commands/intervention/workflow.rs` → `intervention_finalize()` | Permission check, delegates to service |
| **Service** | `InterventionWorkflowService.finalize_intervention()` | Validates all mandatory steps completed; completes finalization step; sets intervention → `Completed`; updates task → `Completed` |
| **Service** | `WorkflowValidationService.validate_intervention_finalization()` | Checks all mandatory steps `Completed` (excludes finalization step itself) |
| **Repository** | `InterventionRepository` | `UPDATE interventions SET status = 'completed', customer_satisfaction, quality_score, completed_at`; `UPDATE tasks SET status = 'completed'` |
| **DB Tables** | `interventions`, `intervention_steps`, `tasks`, `photos` (signature photo) | Intervention → `Completed`; Task → `Completed`; metrics calculated |

### Flow 7 — Reports

| Layer | Component | Details |
|-------|-----------|---------|
| **IPC Commands** | `get_task_completion_report`, `get_technician_performance_report`, `export_report_data`, `export_intervention_report`, `get_report_status`, `cancel_report` | Role-gated: Admin/Supervisor see all; Technician sees own data only |
| **Frontend Hooks** | `useReports` (if exists), direct IPC calls | Report data fetching with date range filters |
| **Frontend IPC** | `ipcClient.reports.getTaskCompletionReport()`, `ipcClient.reports.getQualityComplianceReport()` | Report queries with filters |
| **Command Handler** | `src-tauri/src/commands/reports/core.rs` | RBAC enforcement per report type; delegates to generation services |
| **Service** | Report generation services (`src-tauri/src/services/`) | Aggregation queries across tasks, interventions, materials |
| **Repository** | `TaskRepository`, `InterventionRepository`, `MaterialRepository` | Read-only aggregate queries |
| **DB Tables** | `tasks`, `interventions`, `intervention_steps`, `materials`, `material_consumption`, `users`, `clients`, `photos` | Read-only aggregation; no writes |

---

## 2. Key Invariants and Failure Modes

### Per-Flow Invariants

| Flow | Invariant | Failure Mode |
|------|-----------|--------------|
| **Login** | Valid credentials produce exactly one session token | Brute-force attempts → rate limiter blocks IP/account |
| **Login** | Session tokens expire after configured timeout | Expired token → `AUTH_ERROR`, frontend must redirect to login |
| **Login** | 2FA (if enabled) must be verified before session is fully active | Missing 2FA verification → session marked `two_factor_verified = false` |
| **Create Task** | `task_number` is unique (`T-YYYYMMDD-XXX` format) | Concurrent creation race → SQLite unique constraint violation |
| **Create Task** | Required fields enforced: `vehicle_plate`, `model`, `ppf_zones`, `scheduled_date` | Missing fields → `VALIDATION_ERROR` returned |
| **Create Task** | Only Admin/Supervisor can create tasks | Technician/Viewer attempt → `AUTHORIZATION_ERROR` |
| **Assign** | Technician must exist, be active, and not exceed workload limit | Inactive/overloaded technician → assignment rejected |
| **Assign** | Task must be in assignable state (`Draft`, `Pending`, `Scheduled`) | Assigning a `Completed`/`Cancelled` task → rejected |
| **Assign** | Only one technician per task at a time | Double-assignment → previous assignment overwritten |
| **Start Intervention** | Only one active intervention per task | Second `intervention_start` on same task → `INTERVENTION_ALREADY_ACTIVE` |
| **Start Intervention** | Technician must be assigned to the task (if role is Technician) | Unassigned technician attempt → permission denied |
| **Advance Steps** | Steps must be completed in sequential order | Skipping step N when step N-1 is incomplete → validation error |
| **Advance Steps** | Photo requirements must be met before advancing (if `requires_photos = true`) | Insufficient photos → step cannot be marked `Completed` |
| **Advance Steps** | Intervention must be `InProgress` (not `Paused` or `Completed`) | Advancing on paused intervention → blocked |
| **Finalize** | All mandatory steps must be `Completed` before finalization | Incomplete mandatory steps → error with list of missing steps |
| **Finalize** | Finalization updates both intervention and parent task to `Completed` | DB failure during task update → intervention completed but task stuck in `InProgress` (no transaction) |
| **Reports** | Role-based data scoping: Technicians see only their own data | Missing RBAC filter → data leak of other technicians' metrics |
| **Reports** | Reports are read-only; no mutations occur | N/A |

### Cross-Flow Invariants

| Invariant | Description | Risk |
|-----------|-------------|------|
| **Session continuity** | Every protected IPC call requires valid `session_token` | Token expiry mid-workflow → intervention progress may be lost if not auto-saved |
| **Task → Intervention link** | `intervention.task_id` references `tasks.id` | Orphaned intervention if task is deleted while intervention is active |
| **Status consistency** | Task status must reflect intervention state (`InProgress` when intervention active, `Completed` when finalized) | Status desync if finalization partially fails |
| **Offline queue ordering** | Queued commands must replay in order | Out-of-order replay → invalid state transitions on sync |

---

## 3. Missing Validations and Inconsistent Status Transitions

### 3.1 Missing Status Transition Validation

| Issue | Severity | Location | Detail |
|-------|----------|----------|--------|
| **`InterventionStatus` lacks `can_transition_to()`** | 🔴 High | `src-tauri/src/models/intervention.rs` | Unlike `TaskStatus`, `InterventionStatus` has no formal transition validation method. Transitions are checked inline in the workflow service but not enforced at the model level. Invalid transitions (e.g., `Completed → InProgress`) are possible if a new code path skips the service layer. |
| **`StepStatus` lacks transition validation** | 🔴 High | `src-tauri/src/models/step.rs` | `StepStatus` (Pending, InProgress, Completed, Failed, Skipped, Rework) has no `can_transition_to()` or state machine. A step could be moved from `Completed` back to `Pending` without enforcement. |
| **`intervention_start` does not validate task status** | 🟡 Medium | `src-tauri/src/commands/intervention/workflow.rs` | The command checks for existing active interventions and technician assignment but does **not** verify the parent task is in an appropriate state (`Assigned` or `InProgress`). An intervention can be started on a `Draft`, `Cancelled`, or `Completed` task. |
| **Finalize task update is not transactional** | 🟡 Medium | `src-tauri/src/services/intervention_workflow.rs` | The `finalize_intervention()` function updates the intervention to `Completed` and then updates the task to `Completed` in a separate SQL statement. If the second update fails, the system enters an inconsistent state: intervention is completed but task remains `InProgress`. |
| **No validation on task deletion with active intervention** | 🟡 Medium | `src-tauri/src/commands/task/facade.rs` | A task can be soft-deleted while it has an active `InProgress` intervention, leaving an orphaned intervention. |

### 3.2 Inconsistent Status Transitions

| Current State | Transition | Issue |
|---------------|------------|-------|
| `Task: Completed` | → `Archived` | ✅ Only valid transition. Correct. |
| `Task: Cancelled` | → any | ✅ Terminal state. Correct. |
| `Task: Draft` | → `InProgress` | ❌ Not allowed by `validate_status_transition()`, but no guard prevents starting an intervention on a `Draft` task, which would implicitly move the task to `InProgress`. |
| `Intervention: Completed` | → `InProgress` | ⚠️ No model-level guard. Workflow service checks inline, but direct repository calls could bypass this. |
| `Step: Completed` | → `Rework` | ⚠️ Allowed by the `StepStatus` enum (the `Rework` variant exists) but no transition rules define when this is valid. |

### 3.3 Missing Validations

| Validation | Where Expected | Current State |
|------------|----------------|---------------|
| Task status check before `intervention_start` | Command handler or service | ❌ Missing — any task state allows starting an intervention |
| Duplicate technician assignment guard | Assignment command | ⚠️ Partial — reassignment overwrites without confirmation |
| Material stock check before recording consumption | `material_record_consumption` service | ⚠️ Not verified — consumption may drive stock negative |
| Step `requires_supervisor_approval` enforcement | `advance_step` service | ⚠️ Schema has `requires_supervisor_approval` and `approved_by` fields but no enforcement logic found in the workflow service |
| Photo minimum count enforcement on finalization | `finalize_intervention` | ⚠️ Photo requirements checked during `advance_step` but not re-validated during finalization |
| Customer signature requirement | `finalize_intervention` | ⚠️ `customer_signature` is `Option<String>` — finalization succeeds without a signature |

---

## 4. Missing UX States

### 4.1 Disabled Button States

| Context | Expected Behavior | Current State |
|---------|-------------------|---------------|
| "Start Intervention" button when task is `Draft` or `Cancelled` | Button should be **disabled** with tooltip explaining why | ⚠️ No frontend guard — backend will reject but UX allows the attempt |
| "Advance Step" button when intervention is `Paused` | Button should be **disabled** | ⚠️ Loading state prevents double-click, but no status-based disabling |
| "Finalize" button when mandatory steps are incomplete | Button should be **disabled** with list of incomplete steps | ⚠️ No pre-check — user must attempt finalization and read the error |
| "Assign" button for Technician/Viewer roles | Button should be **hidden** or **disabled** | ⚠️ RBAC is enforced on backend but button visibility not role-gated in all views |
| "Delete Task" button when intervention is active | Button should be **disabled** or show confirmation with warning | ⚠️ No guard — task can be deleted leaving orphaned intervention |
| "Create Task" for non-Admin/Supervisor | Button should be **hidden** | ⚠️ Backend rejects but frontend may show the option |

### 4.2 Optimistic Updates

| Action | Expected Behavior | Current State |
|--------|-------------------|---------------|
| Step advancement | Show step as completed immediately, revert on error | ❌ No optimistic updates — waits for backend response |
| Task status change | Update task card immediately in list view | ❌ No optimistic updates — full refetch after mutation |
| Photo upload | Show thumbnail immediately with upload progress | ⚠️ Partial — progress shown but no optimistic list update |
| Material consumption recording | Update stock count immediately | ❌ No optimistic updates |

### 4.3 Error Messaging

| Error Scenario | Expected UX | Current State |
|----------------|-------------|---------------|
| Session expired mid-workflow | Modal with "Session expired, please log in again" + auto-save progress | ⚠️ Toast notification only — no auto-save of in-progress step data |
| Network error during step save | Retry button with offline queue indicator | ⚠️ `useOfflineQueue` exists but no visible retry UI for step operations |
| Concurrent intervention conflict | "Another technician has started an intervention on this task" | ✅ Backend returns `INTERVENTION_ALREADY_ACTIVE` — toast shown |
| Validation errors on task creation | Inline field-level error messages | ⚠️ Generic toast error — no per-field inline validation feedback |
| Photo upload failure | Retry button per photo with error badge | ⚠️ Upload retry tracking exists in DB schema (`upload_retry_count`) but no visible retry UI |
| Finalization with incomplete steps | List of incomplete steps with navigation links | ⚠️ Backend returns step names but frontend shows generic error toast |

### 4.4 Loading and Progress States

| State | Expected UX | Current State |
|-------|-------------|---------------|
| Intervention step list loading | Skeleton loader per step card | ⚠️ Generic loading spinner — no skeleton UI |
| Report generation (background job) | Progress bar with estimated time + cancel button | ✅ `get_report_status` + `cancel_report` commands exist — UI integration unclear |
| Photo upload in progress | Per-photo progress bar with cancel option | ⚠️ Partial — overall progress shown, not per-photo |
| Offline sync in progress | Sync status indicator with pending count | ✅ `useSyncStatus` hook provides sync state — UI indicator exists |
| Task list pagination | Infinite scroll with loading indicator | ⚠️ Pagination exists but no infinite scroll pattern found |

---

## Summary

### Coverage by Flow

| Flow | Commands | Services | Repos | Tables | Validation | UX |
|------|----------|----------|-------|--------|------------|-----|
| Login | ✅ Complete | ✅ Complete | ✅ Complete | ✅ `users`, `user_sessions` | ✅ Rate limiting, 2FA | ⚠️ Session expiry UX |
| Create Task | ✅ Complete | ✅ Complete | ✅ Complete | ✅ `tasks`, `clients`, `task_history` | ✅ Field validation | ⚠️ No inline field errors |
| Assign | ✅ Complete | ✅ Complete | ✅ Complete | ✅ `tasks`, `users`, `task_history` | ⚠️ No duplicate guard | ⚠️ Missing role-gated buttons |
| Start Intervention | ✅ Complete | ✅ Complete | ✅ Complete | ✅ `interventions`, `intervention_steps`, `tasks` | 🔴 No task status check | ⚠️ No disabled state |
| Advance Steps | ✅ Complete | ✅ Complete | ✅ Complete | ✅ `intervention_steps`, `interventions`, `photos`, `material_consumption` | ⚠️ No supervisor approval enforcement | ❌ No optimistic updates |
| Finalize | ✅ Complete | ✅ Complete | ✅ Complete | ✅ `interventions`, `intervention_steps`, `tasks`, `photos` | ⚠️ Non-transactional dual update | ⚠️ No pre-check UX |
| Reports | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Read-only across all tables | ✅ RBAC scoping | ✅ Adequate |

### Top Priority Fixes

1. **🔴 Add `InterventionStatus::can_transition_to()` and `StepStatus::can_transition_to()`** — model-level state machine enforcement
2. **🔴 Validate task status in `intervention_start`** — prevent interventions on Draft/Cancelled/Completed tasks
3. **🟡 Wrap finalization in a transaction** — prevent task/intervention status desync
4. **🟡 Add frontend disabled-button guards** — prevent invalid actions before backend round-trip
5. **🟡 Add inline field validation on task creation form** — improve error discoverability
6. **🟡 Implement optimistic updates for step advancement** — reduce perceived latency
