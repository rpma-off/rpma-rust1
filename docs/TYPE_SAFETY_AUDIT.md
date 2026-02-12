# Type Safety Audit

**Date**: 2026-02-12
**Scope**: Full-stack type safety analysis across IPC boundary, frontend (hooks, components, lib), and backend (models, commands, services)
**Goal**: Identify type holes, prioritize them by risk, and propose minimal safe PR slices to eliminate them

---

## 1. Executive Summary

| Layer | Metric | Count |
|-------|--------|-------|
| **Frontend** | `: any` annotations | ~106 across 63 files |
| **Frontend** | `as any` assertions | ~82 across 47 files |
| **Frontend** | Validation functions returning `any` | 20 in `backend-type-guards.ts` |
| **Backend** | `serde_json::Value` usages | ~155 across 50 files |
| **Backend** | Model fields typed as `serde_json::Value` | 12 across 5 models |
| **Backend** | Commands returning `ApiResponse<serde_json::Value>` | ~72 across 21 files |
| **Backend** | Models missing `#[derive(TS)]` | 2 structs in `user.rs` |

**Risk assessment**: The IPC boundary is the highest-risk area. Commands return `serde_json::Value` wrapped in `ApiResponse`, which means the frontend receives untyped JSON and must use `as any` casts or `unknown` with manual validation to process responses. This creates a chain of type unsafety from command → IPC → hook → component.

---

## 2. Prioritized List of Type Holes

### Priority 1 — IPC Boundary (Critical)

These holes cross the Rust↔TypeScript boundary and cause cascading type unsafety in every downstream consumer.

| # | Location | Issue | Impact |
|---|----------|-------|--------|
| 1.1 | `src-tauri/src/commands/client.rs` (10 uses) | All 10 client CRUD operations return `ApiResponse<serde_json::Value>` instead of typed response structs | Frontend cannot discriminate response variants; forces `as any` in hooks |
| 1.2 | `src-tauri/src/commands/ui.rs` (11 uses) | UI commands (`ui_gps_get_current_position`, `ui_window_get_state`, `get_ui_stats`, etc.) return raw `Value` | No TS type exists for GPS, window state, or UI stats responses |
| 1.3 | `src-tauri/src/commands/system.rs` (4 uses) | `diagnose_database`, `get_database_stats`, `get_app_info` return raw JSON | Dashboard consumes untyped data |
| 1.4 | `src-tauri/src/commands/websocket.rs` + `websocket_commands.rs` (10 uses) | WebSocket message payloads and stats are `Value` | Real-time message handling has no compile-time safety |
| 1.5 | `src-tauri/src/commands/reports/` (7 uses) | Report generation returns `Value` | Report rendering components use `any` downstream |
| 1.6 | `src-tauri/src/commands/intervention/` (8 uses) | Workflow, queries, and relationship commands use `Value` | Intervention workflows lose type safety at IPC |
| 1.7 | `src-tauri/src/commands/ipc_optimization.rs` (4 uses) | `decompress_and_validate_json`, `get_ipc_stats` return `Value` | Meta-IPC operations are themselves untyped |
| 1.8 | `src-tauri/src/commands/settings/profile.rs` (4 uses) | Profile setup and log events use `Value` | Settings page consumes untyped responses |
| 1.9 | `src-tauri/src/commands/navigation.rs` (2 uses) | Navigation update and shortcut registration use `Value` params | Navigation parameters lack compile-time type checking; callers cannot rely on parameter structure |
| 1.10 | `src-tauri/src/models/user.rs` | `UserRole` and `User` structs missing `#[derive(TS)]` | No auto-generated TypeScript types for user model |

### Priority 2 — Model Layer (High)

These `serde_json::Value` fields in models propagate type unsafety to every layer that touches them.

| # | File | Field(s) | Suggested Typed Replacement |
|---|------|----------|---------------------------|
| 2.1 | `models/step.rs` | `instructions`, `step_data`, `collected_data`, `measurements`, `validation_data` (5 fields) | Define `StepInstructions`, `StepData`, `CollectedData`, `Measurements`, `ValidationData` structs |
| 2.2 | `models/intervention.rs` | `ppf_zones_extended`, `metadata`, `device_info` (3 fields) | Define `PpfZoneConfig`, `InterventionMetadata`, `DeviceInfo` structs |
| 2.3 | `models/material.rs` | `specifications` (1 field) | Define `MaterialSpecifications` struct |
| 2.4 | `models/photo.rs` | `annotations` (1 field) | Define `PhotoAnnotations` struct |
| 2.5 | `models/user.rs` | `preferences` (1 field) | Define `UserPreferences` struct |
| 2.6 | `models/sync.rs` | `data` (1 field) | Define `SyncPayload` enum with typed variants |

### Priority 3 — Frontend Validation Layer (High)

Functions in `lib/validation/` that return `any` defeat the purpose of runtime validation.

| # | File | Issue | Count |
|---|------|-------|-------|
| 3.1 | `backend-type-guards.ts` | 10 `validate*()` functions return `: any` instead of their validated type | 10 |
| 3.2 | `backend-type-guards.ts` | 10 `safeValidate*()` wrapper functions also return `: any` | 10 |
| 3.3 | `api-schemas.ts` | `validateApiResponse()` and `validateAndSanitizeInput()` accept `data: any` | 2 |

### Priority 4 — Frontend Hooks (Medium)

Hooks bridge IPC responses to components; `any` here means components receive untyped data.

| # | File | `: any` | `as any` | Key Issue |
|---|------|---------|----------|-----------|
| 4.1 | `useMaterialForm.ts` | 3 | 0 | `specifications: any`, `initialMaterial: any`, `updateFormData: any` |
| 4.2 | `useInterventionData.ts` | 3 | 0 | `collected_data: any`, intervention types |
| 4.3 | `useMaterials.ts` | 2 | 0 | `specifications` field and filter callback |
| 4.4 | `useTranslation.ts` | 2 | 0 | Object traversal params typed as `any` |
| 4.5 | `useInterventionSync.ts` | 2 | 2 | `status as any`, `weather_condition as any` |
| 4.6 | `useTaskActions.ts` | 1 | 2 | `updateData: any`, `sanitizedTaskData as any` |
| 4.7 | `useWorkflowActions.ts` | 1 | 0 | `step` parameter typed as `any` |
| 4.8 | `useInventory.ts` | 1 | 0 | `specifications` field |
| 4.9 | `useOfflineQueue.ts` | 1 | 0 | `user` field |
| 4.10 | `useWorkflow.ts` | 0 | 1 | `timing as any` |
| 4.11 | `useKeyboardShortcuts.ts` | 0 | 1 | `shortcuts as any` |
| 4.12 | `useDesktopNavigation.ts` | 0 | 1 | `options as any` |

### Priority 5 — Frontend Components (Medium)

Components that accept or manipulate `any`-typed data.

| # | File | `: any` | `as any` | Key Issue |
|---|------|---------|----------|-----------|
| 5.1 | `navigation/ClientFilters.tsx` | 5 | 0 | Filter state and callbacks typed as `any` |
| 5.2 | `tasks/TaskDetail/PhotoSummaryCard.tsx` | 4 | 0 | Photo annotation data untyped |
| 5.3 | `messages/MessageInbox.tsx` | 3 | 0 | Message data untyped |
| 5.4 | `messages/MessageComposer.tsx` | 3 | 1 | Compose form data untyped |
| 5.5 | `calendar/CalendarView.tsx` | 2 | 0 | Calendar event data untyped |
| 5.6 | `navigation/TaskFilters.tsx` | 2 | 0 | Filter callbacks untyped |
| 5.7 | `messages/NotificationPreferences.tsx` | 2 | 3 | Notification config untyped |
| 5.8 | `layout/Sidebar.tsx` | 2 | 0 | Navigation items untyped |
| 5.9 | `ui/mobile-components.tsx` | 2 | 0 | Mobile-specific props untyped |
| 5.10 | `ui/virtualized-table.tsx` | 1 | 0 | Row data untyped |
| 5.11 | `app/reports/components/charts/DashboardOverviewChart.tsx` | 9 | 0 | Chart data props all `any` |
| 5.12 | `app/reports/components/charts/TaskCompletionChart.tsx` | 4 | 0 | Chart data untyped |

### Priority 6 — Frontend Services & Utilities (Low)

Library code with `any` that is consumed by hooks and components.

| # | File | `: any` | `as any` | Key Issue |
|---|------|---------|----------|-----------|
| 6.1 | `lib/services/ppf/intervention-workflow.service.ts` | 8 | 0 | Workflow step data untyped throughout |
| 6.2 | `lib/websocket.ts` | 6 | 0 | WebSocket message payloads untyped |
| 6.3 | `lib/services/auth/mfa.service.ts` | 0 | 6 | MFA setup casts to `any` |
| 6.4 | `lib/services/entities/reports.service.ts` | 3 | 3 | Report generation params/results untyped |
| 6.5 | `lib/services/entities/client.service.ts` | 0 | 3 | Client operations cast to `any` |
| 6.6 | `lib/stores/calendarStore.ts` | 2 | 0 | Calendar event store untyped |
| 6.7 | `lib/types.ts` | 3 | 1 | Legacy type file with `any` fallbacks |
| 6.8 | `lib/tauri/ipc.ts` | 2 | 3 | Core IPC wrapper uses `any` |
| 6.9 | `lib/ipc/domains/inventory.ts` | 2 | 0 | `pagination: any` in return type |

### Priority 7 — Backend Services (Low)

Internal service layer — no direct IPC exposure but propagates untyped data to commands.

| # | File | `serde_json::Value` uses | Key Issue |
|---|------|--------------------------|-----------|
| 7.1 | `services/event_system.rs` | 29 | All audit event metadata is `Option<serde_json::Value>` |
| 7.2 | `services/intervention_data.rs` | 4 | Intervention data access uses `Value` |
| 7.3 | `services/intervention_workflow.rs` | 4 | Workflow progression uses `Value` |
| 7.4 | `services/performance_monitor.rs` | 3 | Performance metrics metadata untyped |
| 7.5 | `services/audit_service.rs` | 3 | Audit log entries untyped |
| 7.6 | `services/intervention_types.rs` | 3 | Intervention type definitions use `Value` |
| 7.7 | `services/security_monitor.rs` | 2 | Security event details untyped |
| 7.8 | `services/system.rs` | 2 | System info returns `Value` |
| 7.9 | `services/settings.rs` | 2 | Settings values untyped |
| 7.10 | `logging/mod.rs` | 10 | Log context and metadata untyped |

---

## 3. Step-by-Step Remediation Plan

### Phase 1: IPC Boundary — Type the Command Responses (Highest ROI)

**Goal**: Replace `ApiResponse<serde_json::Value>` with `ApiResponse<TypedStruct>` in all command handlers.

**Step 1.1**: Add `#[derive(TS)]` to `UserRole` and `User` in `models/user.rs`
- **Risk**: None — additive change
- **Scope**: 1 file, 2 derive additions
- **Verification**: Run `npm run types:sync` and confirm `User`/`UserRole` appear in generated types

**Step 1.2**: Create response structs for `commands/client.rs`
- Define `ClientResponse` enum (or use existing `Client` model) with `#[derive(Serialize, TS)]`
- Replace `ApiResponse<serde_json::Value>` → `ApiResponse<ClientResponse>` in all 10 functions
- **Risk**: Low — response shape stays the same, just typed
- **Scope**: 1 backend file, 1 new response type
- **Verification**: Run `cargo check`, then `npm run types:sync`

**Step 1.3**: Create response structs for `commands/system.rs`
- Define `DatabaseDiagnostics`, `DatabaseStats`, `AppInfo` structs
- **Scope**: 1 backend file, 3 new types

**Step 1.4**: Create response structs for `commands/ui.rs`
- Define `GpsPosition`, `WindowState`, `UiStats` structs
- **Scope**: 1 backend file, 3 new types

**Step 1.5**: Create response structs for remaining command files
- `websocket.rs`, `websocket_commands.rs`, `reports/`, `intervention/`, `ipc_optimization.rs`, `settings/profile.rs`, `navigation.rs`
- **Scope**: ~10 backend files, ~15 new types

### Phase 2: Model Layer — Type the `serde_json::Value` Fields

**Goal**: Replace `Option<serde_json::Value>` model fields with typed structs.

**Step 2.1**: Type `models/step.rs` fields (highest usage)
- Create `StepInstructions`, `StepData`, `CollectedData`, `Measurements`, `ValidationData` structs
- Add `#[derive(Serialize, Deserialize, TS)]` to each
- **Risk**: Medium — requires migration for existing JSON data; use `#[serde(default)]` for backward compatibility
- **Scope**: 1 model file, 5 new types
- **Migration**: Add a compatibility migration that validates existing JSON against new schema

**Step 2.2**: Type `models/intervention.rs` fields
- Create `PpfZoneConfig`, `InterventionMetadata`, `DeviceInfo` structs
- **Scope**: 1 model file, 3 new types

**Step 2.3**: Type remaining model fields
- `material.rs` → `MaterialSpecifications`
- `photo.rs` → `PhotoAnnotations`
- `user.rs` → `UserPreferences`
- `sync.rs` → `SyncPayload` enum
- **Scope**: 4 model files, 4 new types

### Phase 3: Frontend Validation Layer

**Goal**: Replace `any` return types in validation functions with proper TypeScript types.

**Step 3.1**: Fix `backend-type-guards.ts` return types
- Change all `validate*(): any` → `validate*(data: unknown): ValidatedType`
- Change all `safeValidate*(): any` → `safeValidate*(data: unknown): ValidatedType | null`
- **Scope**: 1 file, 20 function signatures
- **Risk**: Low — callers already treat returns as the validated type

**Step 3.2**: Fix `api-schemas.ts` parameter types
- Change `data: any` → `data: unknown` (forces callers to narrow)
- **Scope**: 1 file, 2 function signatures

### Phase 4: Frontend Hooks

**Goal**: Replace `: any` and `as any` in hooks with proper types from generated backend types.

**Step 4.1**: Fix material-related hooks (`useMaterials.ts`, `useMaterialForm.ts`, `useInventory.ts`)
- Replace `specifications: any` with `MaterialSpecifications` (from Phase 2.3)
- **Scope**: 3 files
- **Depends on**: Phase 2.3

**Step 4.2**: Fix intervention-related hooks (`useInterventionData.ts`, `useInterventionSync.ts`, `useWorkflowActions.ts`)
- Replace `collected_data: any` with `CollectedData` (from Phase 2.1)
- Replace `status as any` with proper enum cast
- **Scope**: 3 files
- **Depends on**: Phase 2.1, 2.2

**Step 4.3**: Fix remaining hooks (`useTaskActions.ts`, `useTranslation.ts`, `useOfflineQueue.ts`, etc.)
- **Scope**: 6 files

### Phase 5: Frontend Components & Services

**Goal**: Propagate typed data through to UI components.

**Step 5.1**: Fix chart components (`DashboardOverviewChart.tsx`, `TaskCompletionChart.tsx`)
- Define chart data interfaces
- **Scope**: 2 files

**Step 5.2**: Fix filter components (`ClientFilters.tsx`, `TaskFilters.tsx`)
- Define filter state interfaces
- **Scope**: 2 files

**Step 5.3**: Fix message components (`MessageInbox.tsx`, `MessageComposer.tsx`, `NotificationPreferences.tsx`)
- Use generated notification/message types
- **Scope**: 3 files

**Step 5.4**: Fix remaining components and services
- **Scope**: ~15 files

### Phase 6: Backend Services (Internal)

**Goal**: Reduce `serde_json::Value` usage in services that construct command responses.

**Step 6.1**: Type `event_system.rs` audit metadata (29 occurrences)
- Define `AuditEventMetadata` enum with typed variants per event type
- **Risk**: Medium — high-traffic code path
- **Scope**: 1 file, 1 enum with ~10 variants

**Step 6.2**: Type remaining service files
- `intervention_data.rs`, `intervention_workflow.rs`, `performance_monitor.rs`, etc.
- **Scope**: ~10 files

---

## 4. Proposed PR Slices

Each PR is designed to be independently mergeable, small, and safe.

### PR 1: `user.rs` — Add `#[derive(TS)]` to User and UserRole
- **Files**: `src-tauri/src/models/user.rs`
- **Risk**: Zero — purely additive
- **Size**: ~2 line changes
- **Verification**: `cargo check` + `npm run types:sync` + `npm run types:drift-check`

### PR 2: Type `commands/client.rs` responses
- **Files**: `src-tauri/src/commands/client.rs`, possibly new response type file
- **Risk**: Low
- **Size**: ~50 lines
- **Verification**: `cargo check` + `cargo test` + `npm run types:sync`

### PR 3: Type `commands/system.rs` and `commands/ui.rs` responses
- **Files**: 2 command files + new response structs
- **Risk**: Low
- **Size**: ~80 lines
- **Verification**: `cargo check` + `cargo test` + `npm run types:sync`

### PR 4: Type `commands/websocket*.rs` responses
- **Files**: 2 command files + new response structs
- **Risk**: Low
- **Size**: ~60 lines

### PR 5: Type `commands/intervention/*.rs` responses
- **Files**: 3 command files + new response structs
- **Risk**: Low-Medium
- **Size**: ~100 lines

### PR 6: Type `commands/reports/*.rs` and remaining command responses
- **Files**: ~5 command files + new response structs
- **Risk**: Low
- **Size**: ~80 lines

### PR 7: Type `models/step.rs` Value fields
- **Files**: `models/step.rs` + 5 new type definitions
- **Risk**: Medium — requires data compatibility testing
- **Size**: ~100 lines
- **Prerequisite**: Validate existing JSON data matches proposed schemas

### PR 8: Type `models/intervention.rs` and remaining model Value fields
- **Files**: 4 model files + ~8 new type definitions
- **Risk**: Medium
- **Size**: ~120 lines

### PR 9: Fix `backend-type-guards.ts` return types
- **Files**: `frontend/src/lib/validation/backend-type-guards.ts`, `api-schemas.ts`
- **Risk**: Low
- **Size**: ~40 lines

### PR 10: Fix hook type annotations (materials, interventions)
- **Files**: ~6 hook files
- **Risk**: Low
- **Size**: ~30 lines
- **Prerequisite**: PRs 7-8 (typed models available)

### PR 11: Fix component type annotations
- **Files**: ~15 component files
- **Risk**: Low
- **Size**: ~60 lines

### PR 12: Type `services/event_system.rs` audit metadata
- **Files**: `event_system.rs` + audit metadata enum
- **Risk**: Medium
- **Size**: ~150 lines

### PR 13: Type remaining backend services
- **Files**: ~10 service files
- **Risk**: Low-Medium
- **Size**: ~100 lines

---

## 5. Dependency Graph

```
PR 1 (user.rs TS derive)
  ↓
PR 2 (client.rs responses)
  ↓
PR 3 (system.rs + ui.rs responses)  →  PR 4 (websocket responses)
  ↓                                       ↓
PR 5 (intervention responses)         PR 6 (reports + remaining)
  ↓
PR 7 (step.rs model fields)  →  PR 8 (remaining model fields)
  ↓                                ↓
PR 9 (validation return types)    PR 10 (hook type fixes)
  ↓                                ↓
PR 11 (component type fixes)     PR 12 (event_system metadata)
                                    ↓
                                 PR 13 (remaining services)
```

PRs 1-6 can proceed immediately. PRs 7-8 require schema analysis of existing data. PRs 9-13 depend on earlier PRs for the types they reference.

---

## 6. Verification Strategy

After each PR:

1. **Backend**: `cargo check && cargo clippy && cargo test`
2. **Type sync**: `npm run types:sync && npm run types:drift-check`
3. **Frontend**: `npm run frontend:type-check && npm run frontend:lint`
4. **Tests**: `npm test`
5. **Full gate**: `npm run quality:check`

### Type coverage tracking

After all PRs are merged, validate with:

```bash
# Frontend: should return 0 matches (excluding test files)
grep -rn ": any\b" frontend/src/lib/ipc/ frontend/src/hooks/ frontend/src/components/ --include="*.ts" --include="*.tsx" | grep -v ".test."
grep -rn "as any" frontend/src/lib/ipc/ frontend/src/hooks/ frontend/src/components/ --include="*.ts" --include="*.tsx" | grep -v ".test."

# Backend: should return 0 matches in commands/ (excluding intentional uses)
grep -rn "serde_json::Value" src-tauri/src/commands/ | grep -v "type-safety: intentional Value"

# Backend models: only acceptable where marked intentional
grep -rn "serde_json::Value" src-tauri/src/models/ | grep -v "type-safety: intentional Value"
```

### Convention for intentional `serde_json::Value` usage

Some uses of `serde_json::Value` are intentionally flexible (e.g., `sync.rs` generic payload for arbitrary sync data). Mark these with an inline comment so future audits can automatically exclude them:

```rust
pub data: serde_json::Value, // type-safety: intentional Value — sync payload is heterogeneous by design
```

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Existing JSON data doesn't match new typed schemas | Use `#[serde(default)]` and `Option<>` wrappers; add migration tests |
| Frontend breaks after backend type changes | Run `npm run types:sync` immediately after each backend PR |
| Too many PRs cause merge conflicts | Keep PRs small and merge quickly; use dependency graph to sequence |
| `serde_json::Value` is intentionally flexible in some cases | Mark acceptable uses with `// type-safety: intentional Value` comment and exclude from future audits (see Section 6 verification patterns) |
| Test files contain `as any` for mocking purposes | Test files are acceptable — focus auditing on production code only |
