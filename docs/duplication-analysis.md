# Duplication Analysis (Frontend + Backend)

## Top Duplication Clusters

### Frontend (tables/forms/modals)

1. **Task action modals share identical dialog + state flow**
   - Files:
     - `frontend/src/components/tasks/TaskActions/EditTaskModal.tsx`
     - `frontend/src/components/tasks/TaskActions/SendMessageModal.tsx`
     - `frontend/src/components/tasks/TaskActions/DelayTaskModal.tsx`
     - `frontend/src/components/tasks/TaskActions/ReportIssueModal.tsx`
   - Pattern: repeated `useState`/`onOpenChange` handling + `Dialog/DialogContent/DialogHeader` + similar submit footer layout.

2. **Form validation + layout duplication**
   - Files:
     - `frontend/src/components/MaterialForm.tsx`
     - `frontend/src/components/users/UserForm.tsx`
   - Pattern: separate validation + form field wiring with different local conventions (manual state vs schema-driven), but similar layout + error display.

3. **Data table components with overlapping behaviors**
   - Files:
     - `frontend/src/components/ui/DesktopTable.tsx`
     - `frontend/src/components/ui/virtualized-table.tsx`
     - `frontend/src/app/reports/components/data-explorer/ResultsTable.tsx`
   - Pattern: repeated sorting/pagination + row/column rendering scaffolding.

### Backend (commands/services/repositories)

1. **Validation services repeat similar check patterns**
   - Files:
     - `src-tauri/src/services/validation.rs`
     - `src-tauri/src/services/task_validation.rs`
     - `src-tauri/src/services/client_validation.rs`
     - `src-tauri/src/services/intervention_validation.rs`
   - Pattern: repeated `validate_*`/`check_*` helpers for empty fields, dates, and identifier formats.

2. **Repository CRUD boilerplate**
   - Files:
     - `src-tauri/src/repositories/task_repository.rs`
     - `src-tauri/src/repositories/intervention_repository.rs`
     - `src-tauri/src/repositories/client_repository.rs`
     - `src-tauri/src/repositories/material_repository.rs`
     - `src-tauri/src/repositories/user_repository.rs`
     - `src-tauri/src/repositories/message_repository.rs`
   - Pattern: same `get/create/update/delete/list` signatures + shared error handling flows.

3. **Report service pipelines follow the same structure**
   - Files:
     - `src-tauri/src/services/reports/task_report.rs`
     - `src-tauri/src/services/reports/client_report.rs`
     - `src-tauri/src/services/reports/technician_report.rs`
     - `src-tauri/src/services/reports/geographic_report.rs`
     - `src-tauri/src/services/reports/material_report.rs`
     - `src-tauri/src/services/reports/seasonal_report.rs`
   - Pattern: repeated aggregation + formatter + export shape.

## Extraction Candidates

### Frontend

- **`@/components/shared/modals`**
  - Extract a `BaseModal` wrapper and a `useModalState` hook to standardize open/close, footer layout, and form submission.
- **`@/lib/forms`**
  - Introduce a shared `useFormBuilder` hook (or `FormSchema` helper) to unify validation + field wiring for complex forms.
- **`@/components/shared/tables`**
  - Provide a `DataTable` base with optional virtualization and shared sorting/pagination helpers.

### Backend

- **`services::validation` core**
  - Create a `Validator<T>` trait with shared helpers; move common checks into `validation::core`.
- **`repositories::crud`**
  - Introduce a generic `CrudRepository<T>` trait to consolidate CRUD boilerplate + consistent error mapping.
- **`services::reports::pipeline`**
  - Extract a `ReportPipeline`/`ReportGenerator` base for shared aggregation + formatting stages.

## Proposed Module Boundaries & Naming Conventions

| Layer | Module | Naming Convention | Notes |
| --- | --- | --- | --- |
| Frontend UI | `frontend/src/components/shared/modals` | `BaseModal`, `ModalFooter`, `useModalState` | Standard dialog + footer + open state handling. |
| Frontend Forms | `frontend/src/lib/forms` | `useFormBuilder`, `FormSchema` | Shared validation + field registration conventions. |
| Frontend Tables | `frontend/src/components/shared/tables` | `DataTable`, `useSorting`, `usePagination` | Shared rendering + behavior hooks. |
| Backend Validation | `src-tauri/src/services/validation/core.rs` | `Validator<T>`, `ValidationEngine` | Centralizes validation helpers. |
| Backend Repos | `src-tauri/src/repositories/crud.rs` | `CrudRepository<T, E>` | Shared CRUD signatures + error handling. |
| Backend Reports | `src-tauri/src/services/reports/pipeline.rs` | `ReportPipeline`, `ReportFormatter<T>` | Shared report pipeline stages. |
