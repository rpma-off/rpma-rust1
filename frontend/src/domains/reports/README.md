# Reports Domain

Manages intervention report generation, preview, and export.

## Structure
- `api/` — Public API surface
- `ipc/` — IPC wrappers (report_generate, report_get_by_intervention, etc.)
- `hooks/` — React Query hooks (useInterventionReport, useInterventionReportPreview)
- `components/` — UI components (InterventionReportSection, ReportPreviewPanel)
- `services/` — Mappers and view model types (buildInterventionReportViewModel)
- `__tests__/` — Domain-level tests

