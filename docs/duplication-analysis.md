# Duplication Analysis (Frontend + Backend)

> Run `npm run duplication:detect` to regenerate this analysis from the live codebase.

## Summary

| Metric | Value |
|--------|-------|
| Total duplication clusters | 14 |
| 🔴 HIGH severity | 7 |
| 🟡 MEDIUM severity | 7 |
| Estimated duplicate lines | ~3,230 |
| Extraction candidates | 7 |

---

## Top Duplication Clusters

### Frontend (tables / forms / modals)

#### 1. Task action modals share identical dialog + state flow 🔴

- **Files:**
  - `frontend/src/components/tasks/TaskActions/EditTaskModal.tsx`
  - `frontend/src/components/tasks/TaskActions/SendMessageModal.tsx`
  - `frontend/src/components/tasks/TaskActions/DelayTaskModal.tsx`
  - `frontend/src/components/tasks/TaskActions/ReportIssueModal.tsx`
  - `frontend/src/components/tasks/TaskActions/EditTaskDialog.tsx`
  - `frontend/src/components/calendar/QuickAddDialog.tsx`
  - `frontend/src/components/calendar/CreateEventDialog.tsx`
  - `frontend/src/app/admin/components/ChangeRoleDialog.tsx`
- **Shared patterns:**
  - `Dialog`/`DialogContent`/`DialogHeader` layout from shadcn
  - `useState` for open/close + form field state
  - `useMutation` or manual async submit handler
  - Form reset logic on cancel/success
  - Mixed toast libraries (`sonner` vs `react-hot-toast`)
- **Est. duplicate lines:** ~125

#### 2. Table sorting / column / virtualization duplication 🔴

- **Files:**
  - `frontend/src/components/ui/DesktopTable.tsx` — full-featured table with inline sort + search
  - `frontend/src/components/ui/virtualized-table.tsx` — virtual rows with identical sort logic
  - `frontend/src/components/tasks/TaskList.tsx` — hardcoded columns with `@tanstack/react-virtual`
  - `frontend/src/components/users/UserList.tsx` — hardcoded HTML table, no abstraction
  - `frontend/src/app/reports/components/data-explorer/ResultsTable.tsx` — card-based entity list
- **Shared patterns:**
  - Identical `sortColumn + sortDirection` state + `useMemo` comparator (DesktopTable ↔ VirtualizedTable)
  - Overlapping `Column<T>` interface definitions (`key`, `header/label`, `render`, `sortable`)
  - Two different virtualization libraries (`VirtualizedList` vs `@tanstack/react-virtual`)
  - Hardcoded column definitions per entity with no shared column schema
- **Est. duplicate lines:** ~170

#### 3. Inconsistent form validation + state management 🔴

- **Files (10):**
  - `frontend/src/components/auth/LoginForm.tsx` — Zod + react-hook-form
  - `frontend/src/components/auth/SignupForm.tsx` — Zod + useState mix
  - `frontend/src/components/users/UserForm.tsx` — manual `validateForm()` + useState
  - `frontend/src/clients/ClientForm.tsx` — Zod + react-hook-form
  - `frontend/src/components/MaterialForm.tsx` — Zod + react-hook-form (**duplicate file**)
  - `frontend/src/components/inventory/MaterialForm.tsx` — Zod + custom hook
  - `frontend/src/components/TaskForm/TaskFormWizard.tsx` — multi-step wizard + localStorage
  - `frontend/src/components/forms/DesktopForm.tsx` — generic form wrapper
  - `frontend/src/components/settings/PerformanceTab.tsx` — minimal validation
- **Shared patterns:**
  - 3 validation strategies: `zod` (7), `manual` (1), `minimal` (2)
  - 2 state management approaches: `react-hook-form` (7), `useState` (3)
  - Redundant error display patterns (formState.errors vs manual errors dict vs toast)
  - Duplicate `MaterialForm.tsx` (root copy vs inventory copy)
- **Est. duplicate lines:** ~450

---

### Backend (commands / services / repositories)

#### 4. Repository CRUD boilerplate 🔴

- **Files (11 repositories):**
  - `src-tauri/src/repositories/task_repository.rs`
  - `src-tauri/src/repositories/client_repository.rs`
  - `src-tauri/src/repositories/intervention_repository.rs`
  - `src-tauri/src/repositories/material_repository.rs`
  - `src-tauri/src/repositories/user_repository.rs`
  - `src-tauri/src/repositories/message_repository.rs`
  - `src-tauri/src/repositories/audit_repository.rs`
  - `src-tauri/src/repositories/calendar_event_repository.rs`
  - `src-tauri/src/repositories/notification_repository.rs`
  - `src-tauri/src/repositories/notification_preferences_repository.rs`
  - `src-tauri/src/repositories/photo_repository.rs`
- **Shared patterns:**
  - `find_by_id()` with cache lookup → SQL → cache set
  - `save()` with cache invalidation
  - `delete_by_id()` with soft delete
  - `find_all()` with query builder
  - `exists_by_id()` helper
  - `validate_sort_column()` with allowed-column list
  - `build_where_clause()` with `conditions.push()` + `params.push()`
  - Cache key construction via `cache_key_builder`
- **Est. duplicate lines:** ~1,220

#### 5. Command handler authentication / RBAC boilerplate 🔴

- **Files (28 command modules):**
  - `src-tauri/src/commands/client.rs`
  - `src-tauri/src/commands/material.rs`
  - `src-tauri/src/commands/user.rs`
  - `src-tauri/src/commands/calendar.rs`
  - `src-tauri/src/commands/analytics.rs`
  - `src-tauri/src/commands/task/facade.rs`
  - `src-tauri/src/commands/task/queries.rs`
  - `src-tauri/src/commands/task/statistics.rs`
  - `src-tauri/src/commands/intervention/data_access.rs`
  - `src-tauri/src/commands/intervention/workflow.rs`
  - `src-tauri/src/commands/reports/core.rs`
  - `src-tauri/src/commands/settings/*.rs`
  - *(and 16 more)*
- **Shared patterns:**
  - `authenticate!(&session_token, &state)` macro call
  - `rate_limiter.check_and_record()` boilerplate
  - RBAC permission check via `AuthMiddleware::can_perform_*`
  - `tokio::time::timeout(Duration::from_secs(30), ...)` wrapper
  - `ApiResponse::success(data)` / `Err(AppError::...)` envelope
  - Inline `ValidationService::new()` + `sanitize_text_input()` calls (22 files)
- **Est. duplicate lines:** ~860

#### 6. Validation service duplication 🔴

- **Files:**
  - `src-tauri/src/services/validation.rs` — generic helpers
  - `src-tauri/src/services/task_validation.rs` — task-specific
  - `src-tauri/src/services/client_validation.rs` — client-specific
  - `src-tauri/src/services/intervention_validation.rs` — intervention-specific
  - `src-tauri/src/services/workflow_validation.rs` — workflow-specific
- **Shared patterns:**
  - Identical `validate_email()` with same regex, empty check, length limit
  - Identical `validate_phone()` format checks
  - Repeated `validate_required_fields()` / `is_empty()` helpers
  - Duplicated `validate_status_transition()` state machine pattern
  - Identical error message formatting
- **Est. duplicate lines:** ~80

#### 7. Report service pipeline duplication 🔴

- **Files (9 report services):**
  - `src-tauri/src/services/reports/task_report.rs`
  - `src-tauri/src/services/reports/client_report.rs`
  - `src-tauri/src/services/reports/technician_report.rs`
  - `src-tauri/src/services/reports/geographic_report.rs`
  - `src-tauri/src/services/reports/material_report.rs`
  - `src-tauri/src/services/reports/seasonal_report.rs`
  - `src-tauri/src/services/reports/quality_report.rs`
  - `src-tauri/src/services/reports/intelligence_report.rs`
  - `src-tauri/src/services/reports/overview_orchestrator.rs`
- **Shared patterns:**
  - `validate_date_range()` + `validate_filters()` calls
  - `DateTime::<Utc>::from_timestamp()` conversion
  - Dynamic `where_clauses` + `params` construction with filter binding
  - SQL aggregation (`SUM`/`COUNT`/`AVG`/`GROUP BY`)
  - Derived metric calculation (cost per task, averages, percentages)
- **Est. duplicate lines:** ~450

---

## Extraction Candidates

### Frontend

| Priority | Module | Key Exports | Description | Reduces Files | Est. Line Reduction |
|----------|--------|-------------|-------------|---------------|---------------------|
| **P0** | `frontend/src/components/shared/tables` | `DataTable`, `useSorting`, `usePagination`, `ColumnDef` | Unified data table with optional virtualization and shared sorting/pagination hooks | 6 | ~170 |
| **P1** | `frontend/src/components/shared/modals` | `BaseModal`, `ModalFooter`, `useModalState` | Standard dialog wrapper + footer layout + open/close state hook | 8 | ~125 |
| **P1** | `frontend/src/lib/forms` | `useFormBuilder`, `FormSchema`, `useFormValidation` | Shared form builder with unified Zod validation, state management, and error display | 10 | ~450 |

### Backend

| Priority | Module | Key Exports | Description | Reduces Files | Est. Line Reduction |
|----------|--------|-------------|-------------|---------------|---------------------|
| **P0** | `src-tauri/src/repositories/crud.rs` | `CrudRepository<T>`, `FilterBuilder`, `CacheableRepository` | Generic CRUD trait with shared cache pattern, WHERE clause builder, and sort validation | 11 | ~1,220 |
| **P1** | `src-tauri/src/commands/middleware.rs` | `CommandMiddleware`, `with_auth`, `with_rbac`, `with_rate_limit` | Consolidated middleware stack for authentication, RBAC, rate limiting, and timeout | 28 | ~860 |
| **P1** | `src-tauri/src/services/validation/core.rs` | `Validator<T>`, `ValidationEngine`, `CommonValidators` | Centralized validation trait with shared email/phone/required field helpers | 5 | ~80 |
| **P1** | `src-tauri/src/services/reports/pipeline.rs` | `ReportPipeline`, `ReportGenerator<T>`, `ReportFormatter` | Shared report generation pipeline: validate → filter → query → aggregate stages | 9 | ~450 |

---

## Proposed Module Boundaries & Naming Conventions

| Layer | Module | Naming Convention | Notes |
|-------|--------|-------------------|-------|
| Frontend UI | `frontend/src/components/shared/modals` | `BaseModal`, `ModalFooter`, `useModalState` | Standard dialog + footer + open state handling. All modals extend `BaseModal` instead of raw `Dialog`. |
| Frontend Forms | `frontend/src/lib/forms` | `useFormBuilder`, `FormSchema`, `useFormValidation` | Shared Zod-based validation + react-hook-form registration. Replaces manual `useState` form state. |
| Frontend Tables | `frontend/src/components/shared/tables` | `DataTable`, `useSorting`, `usePagination`, `ColumnDef` | Single table component with declarative features config. Auto-virtualizes above 1,000 rows. |
| Backend Validation | `src-tauri/src/services/validation/core.rs` | `Validator<T>`, `ValidationEngine`, `CommonValidators` | Domain validators compose common validators via trait. Email/phone/date checks live in `CommonValidators`. |
| Backend Repos | `src-tauri/src/repositories/crud.rs` | `CrudRepository<T, E>`, `FilterBuilder`, `CacheableRepository` | Shared CRUD signatures + error handling. Domain repos implement `CrudRepository` and add domain-specific queries. |
| Backend Commands | `src-tauri/src/commands/middleware.rs` | `CommandMiddleware`, `with_auth`, `with_rbac`, `with_rate_limit` | Composable middleware functions wrapping handler bodies. Replaces inline auth/RBAC/timeout boilerplate. |
| Backend Reports | `src-tauri/src/services/reports/pipeline.rs` | `ReportPipeline`, `ReportGenerator<T>`, `ReportFormatter` | Generic pipeline: validate inputs → build filters → execute query → aggregate results → format output. |

### Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Shared frontend components | `PascalCase` in `shared/` | `BaseModal`, `DataTable` |
| Frontend hooks | `use` prefix, camelCase | `useModalState`, `useSorting`, `useFormBuilder` |
| Frontend types | `PascalCase` with `Def` suffix for schemas | `ColumnDef<T>`, `FormSchema` |
| Backend traits | `PascalCase` with generic params | `CrudRepository<T>`, `Validator<T>` |
| Backend modules | `snake_case` | `crud.rs`, `pipeline.rs`, `middleware.rs` |
| Backend helpers | `snake_case` functions | `validate_sort_column`, `build_where_clause` |

---

## Running the Analysis

```bash
# Run the automated detection script
npm run duplication:detect

# Or directly
node scripts/detect-duplication.js
```

The script produces:
- Console output with severity-ranked clusters
- `docs/duplication-report.json` with machine-readable results
