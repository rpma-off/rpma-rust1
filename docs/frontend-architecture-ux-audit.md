# Frontend Component Architecture & UX Audit (Targeted Sampling)

Date: 2026-02-03

## Executive Summary
- The frontend shows a strong breadth of UI coverage and thoughtful UX detail, but the architecture is fragmented across duplicated component libraries, duplicated hooks, and mixed data-access patterns that increase maintenance cost and inconsistency risk.
- The task creation + workflow flow is functional and well-structured in places (wizard composition, step-level validation, and some memoization), but contains encoding issues, a11y gaps in custom modals, and some navigation/validation logic risks.
- State management is inconsistent: some flows use TanStack Query, others use IPC services directly, others use API routes; authentication context is also split across two sources. This makes caching, error handling, and side effects hard to reason about.
- UX is generally rich (empty states, progress, helper text, microcopy), yet several screens display garbled French text (mojibake), indicating encoding or tooling issues that degrade trust and readability.
- Performance-wise, several large components do too much work locally (large render functions, repeated mapping and derived data). Virtualization exists in some lists and tables, but many large views are not virtualized and rely on per-render data transforms.

## Scope and Methodology
Primary flow: task creation + workflow.
Secondary coverage: dashboard, settings (including accessibility), photo management, calendar, reports data explorer, and UI primitives.

Sampling criteria:
1. Largest/most complex components and hooks by file size.
2. Core user journeys and key pages in `frontend/src/app`.
3. UI primitives in both `frontend/src/ui` and `frontend/src/components/ui`.
4. Architecture hotspots such as shared hooks, services, and state stores.

Methods:
- Static code review of sampled components/hooks/routes.
- Cross-check against local component standards (`frontend/src/lib/component-standards.ts`).
- Targeted automated checks: `npm run frontend:type-check` and `npm run frontend:lint`.

## Automated Checks Summary
Type check (FAILED):
- Conflicting type definitions in `frontend/src/lib/backend.ts` and `frontend/src/lib/backend-extensions.ts`.
- Missing generated type modules (e.g., `EventType`, `EventParticipant`, `ParticipantStatus`).
- Test mocks failing due to `globalThis` typing and `IntersectionObserver` type mismatch.

Lint (FAILED, many warnings + 1 error):
- Widespread `no-unused-vars` and `no-explicit-any` warnings across app and lib.
- Multiple missing dependencies in React hooks.
- One blocking error in test setup: `src/__tests__/globalSetup.cjs` uses `require()` disallowed by lint config.

These results indicate a noisy lint environment and type-generation/duplication issues that will mask meaningful regressions.

## Component Quality Report
Scoring: 1 (poor) to 5 (excellent). Notes include systemic vs component-local findings.

### Task Creation + Workflow
| Component | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/components/TaskForm/TaskFormWizard.tsx` | 4 | 3 | 3 | 3 | Good orchestration + memoization; auth check uses `window.location.href` (UX); error display not announced (a11y). Systemic: mixed auth sources. |
| `frontend/src/components/TaskForm/TaskForm.tsx` | 4 | 4 | 4 | 4 | Simple re-export for compatibility; good pattern. |
| `frontend/src/components/TaskForm/useTaskForm.ts` | 3 | 3 | 3 | 3 | Clear validation, but auto-save is a no-op (component-local). Uses local validation utils vs schema-based approach elsewhere (systemic). |
| `frontend/src/components/TaskForm/TaskFormSteps.tsx` | 3 | 3 | 3 | 4 | `handleStepClick` validates clicked step, not current step (possible logic bug). |
| `frontend/src/components/TaskForm/TaskFormSubmission.tsx` | 3 | 3 | 3 | 3 | Heavy mapping to backend DTO; mixed IPC + service; error handling uses toast + logger (inconsistent patterns). |
| `frontend/src/components/TaskForm/steps/VehicleStep.tsx` | 3 | 3 | 3 | 3 | UX-rich, but custom autocomplete lacks ARIA roles; mojibake text indicates encoding issue (systemic). |
| `frontend/src/components/TaskForm/steps/CustomerStep.tsx` | 3 | 4 | 2 | 3 | TanStack Query used well; custom modal lacks focus trap and `aria-modal` (a11y). Mojibake text. |
| `frontend/src/components/TaskForm/steps/PPFStep.tsx` | 3 | 3 | 3 | 3 | Custom selection grid ok; uses `onKeyPress` (deprecated). Mojibake text. |
| `frontend/src/components/TaskForm/steps/ScheduleStep.tsx` | 3 | 3 | 3 | 3 | Rich UI; time-slot buttons lack semantic group and keyboard navigation hints. Mojibake text. |
| `frontend/src/components/tasks/TaskManager.tsx` | 2 | 2 | 2 | 2 | Large monolith: data fetch + CRUD + UI + modal. Custom modal lacks a11y. Duplicate client queries. Mojibake text. |
| `frontend/src/components/tasks/TaskDetail/PoseDetail.tsx` | 2 | 2 | 3 | 2 | Very large component; heavy data normalization + UI + side effects. Multiple `any`/`unknown`. Error handling reloads page. |
| `frontend/src/components/tasks/TaskOverview/TaskOverview.tsx` | 2 | 2 | 3 | 2 | Large render + many helper functions in component; repeated formatting logic. Mojibake text. |
| `frontend/src/components/tasks/TaskActions/ActionsCard.tsx` | 2 | 2 | 3 | 2 | Many local constructors for DTOs; mixed services (`taskService`, `ipcClient`), multiple modals and toasts in one component. |
| `frontend/src/components/tasks/TaskList.tsx` | 4 | 4 | 3 | 4 | Good virtualization; clear loading/error states; minor non-null assertion on tasks. |
| `frontend/src/components/tasks/TaskCard.tsx` | 3 | 3 | 3 | 4 | Clean and small; status/priority color mapping uses CSS variables. |
| `frontend/src/app/tasks/page.tsx` | 1 | 2 | 3 | 2 | Very large route file; embeds TaskCard/TaskTable/TaskFilters inside page. Duplicates logic from components. Mojibake text; repeated log statements. |
| `frontend/src/app/tasks/new/page.tsx` | 3 | 3 | 3 | 3 | Standard page wrapper; depends on TaskForm. |
| `frontend/src/app/tasks/[id]/page.tsx` | 3 | 3 | 3 | 3 | Lint indicates `any` and unused values. |
| `frontend/src/app/tasks/[id]/workflow/steps/[step]/page.tsx` | 3 | 3 | 3 | 3 | Ok structure; depends on workflow hooks. |
| `frontend/src/app/tasks/[id]/workflow/ppf/page.tsx` | 3 | 3 | 3 | 3 | Ok; uses workflow context. |
| `frontend/src/app/tasks/[id]/workflow/ppf/steps/*/page.tsx` | 3 | 3 | 3 | 3 | Step pages are thin; workflow UI handled elsewhere. |

### Dashboard + Analytics
| Component | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/components/dashboard/Dashboard.tsx` | 2 | 3 | 3 | 2 | Very large component with many responsibilities; local computation heavy; good dynamic import for charts. Mojibake text. |
| `frontend/src/components/dashboard/StatsGrid.tsx` | 3 | 3 | 3 | 3 | Works as composition; ok. |
| `frontend/src/components/dashboard/StatCard.tsx` | 4 | 4 | 3 | 4 | Clean UI primitive for stats. |
| `frontend/src/components/dashboard/QuickActions.tsx` | 3 | 3 | 3 | 3 | OK; ensure keyboard focus. |
| `frontend/src/components/analytics/AnalyticsDashboard.tsx` | 3 | 3 | 3 | 3 | Ok structure; depends on chart logic elsewhere. |
| `frontend/src/components/analytics/AnalyticsChart.tsx` | 3 | 3 | 3 | 3 | Ok; check chart a11y (not shown). |
| `frontend/src/app/dashboard/page.tsx` | 3 | 3 | 3 | 3 | Page wrapper; depends on Dashboard component. |

### Settings (including Accessibility)
| Component | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/components/settings/AccessibilityTab.tsx` | 3 | 3 | 3 | 3 | Large but structured; uses `any` for settings; claims WCAG compliance without evidence. Mojibake text. |
| `frontend/src/components/settings/PerformanceTab.tsx` | 3 | 3 | 3 | 3 | Large; uses IPC calls, some mock stats; ok. Mojibake text. |
| `frontend/src/components/settings/PreferencesTab.tsx` | 3 | 3 | 3 | 3 | Similar pattern; check for any/unused. |
| `frontend/src/components/settings/NotificationsTab.tsx` | 3 | 3 | 3 | 3 | Similar pattern; check for any/unused. |
| `frontend/src/app/settings/page.tsx` | 3 | 3 | 3 | 3 | Page wrapper; lint shows unused values. |

### Photo Management
| Component | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/components/PhotoUpload/PhotoUpload.tsx` | 3 | 4 | 2 | 3 | Rich functionality; custom preview modal lacks focus trap; uses unused CSS module import. Mixed toasts. |
| `frontend/src/components/PhotoUpload/PhotoUploadZone.tsx` | 4 | 4 | 3 | 4 | Simple; good dropzone usage; mojibake text. |

### Calendar
| Component | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/components/calendar/CalendarView.tsx` | 3 | 3 | 3 | 3 | Uses `any` for onTaskClick/onTaskDrop; a11y for drag-drop needs review. |
| `frontend/src/components/calendar/DayView.tsx` | 3 | 3 | 3 | 3 | Not fully reviewed; relies on DnD. |
| `frontend/src/components/calendar/WeekView.tsx` | 3 | 3 | 3 | 3 | Good layout; DnD only; needs keyboard alternatives. |
| `frontend/src/components/calendar/event-sheet.tsx` | 2 | 2 | 3 | 3 | Contains mock participants and hardcoded external links; feels non-production. |

### Reports: Data Explorer
| Component | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/app/reports/components/data-explorer/DataExplorer.tsx` | 3 | 3 | 3 | 3 | Debounced search; uses `any` in result mapping; ok otherwise. |
| `frontend/src/app/reports/components/data-explorer/ResultsTable.tsx` | 3 | 3 | 3 | 3 | Clean; primarily UI mapping. |

### UI Primitives (duplication risk)
| Component | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/ui/button.tsx` | 3 | 4 | 3 | 4 | One of two button implementations. |
| `frontend/src/components/ui/button.tsx` | 3 | 4 | 3 | 4 | Another button implementation with different styles/variants. Systemic duplication. |
| `frontend/src/ui/dialog.tsx` | 3 | 4 | 4 | 4 | Standard Radix; ok. |
| `frontend/src/components/ui/dialog.tsx` | 3 | 4 | 4 | 4 | Duplicate dialog. |
| `frontend/src/ui/table.tsx` | 3 | 3 | 3 | 4 | Ok. |
| `frontend/src/components/ui/table.tsx` | 3 | 3 | 3 | 4 | Duplicate. |
| `frontend/src/ui/form.tsx` | 3 | 4 | 4 | 4 | Ok. |
| `frontend/src/components/ui/form.tsx` | 3 | 4 | 4 | 4 | Duplicate. |

### Hooks (architecture and state)
| Hook | Architecture | State | UX/A11y | Perf | Notes |
| --- | --- | --- | --- | --- | --- |
| `frontend/src/hooks/useTasks.ts` | 4 | 4 | 3 | 4 | Good layering (state/actions/sync/filters). |
| `frontend/src/hooks/useTaskForm.ts` | 3 | 3 | 3 | 3 | Duplicates `components/TaskForm/useTaskForm.ts` (systemic). |
| `frontend/src/hooks/useInterventionWorkflow.client.ts` | 3 | 3 | 3 | 3 | Good API abstraction; auto-save is stubbed; no token usage in fetch. |
| `frontend/src/hooks/useWorkflow.ts` | 3 | 3 | 3 | 3 | Uses services + toasts; some `any` and token usage inconsistent. |
| `frontend/src/hooks/useAdvancedFiltering.ts` | 3 | 3 | 3 | 3 | Large but reusable; uses `any` in some paths. |
| `frontend/src/hooks/usePhotoUpload.ts` | 4 | 4 | 3 | 4 | Strong handling; offline queue integration; uses local object URLs. |
| `frontend/src/hooks/useDashboardData.ts` | 4 | 4 | 3 | 3 | Good abstraction, but mixes IPC + service; relies on side effects for connection. |

## Architecture Patterns and Anti-patterns
Patterns observed:
- Some atomic design and component standards exist (`frontend/src/lib/component-standards.ts`) and are applied in a few places.
- Modular workflow in task creation (wizard + steps + submission hooks).
- Use of TanStack Query in some areas, and optimistic updates in others.

Anti-patterns / systemic issues:
- Duplicate UI primitives in two folders (`frontend/src/ui` and `frontend/src/components/ui`). This creates inconsistent styling, variant drift, and confused imports.
- Duplicate hooks for similar domains (two `useTaskForm` implementations) and mixed workflow data approaches.
- Mixed data-access patterns: direct IPC calls, service layer calls, and API routes are used interchangeably within the same domain.
- Mixed auth contexts (`useAuth` from `contexts/AuthContext` vs `lib/auth/compatibility`).
- Encoding issues (mojibake) across many components, suggesting file encoding or toolchain misconfiguration.

## UX Improvement Roadmap
Quick wins (less than 1 day):
- Fix mojibake text rendering by ensuring UTF-8 encoding across component files and build pipeline.
- Replace custom modals with shared Dialog/Sheet components to gain focus trap and `aria-modal` coverage.
- Remove duplicate logger calls and dead imports flagged by lint to reduce noise.
- Normalize to a single toast system (choose `sonner` or `react-hot-toast`) for consistent UX.

Medium improvements (1 to 5 days):
- Consolidate UI primitives into a single source of truth and update imports.
- Establish a single data-access pattern per domain (IPC or API route, not both).
- Align all task form logic into one hook (either `hooks/useTaskForm` or `components/TaskForm/useTaskForm`) to reduce duplication and drift.
- Add `aria-live` regions for form errors and status feedback in task creation flow.

Major enhancements (more than 1 week):
- Break down large components (`TaskManager`, `PoseDetail`, `Dashboard`, `tasks/page.tsx`) into container + presentational layers.
- Introduce typed DTO mapping helpers to avoid large inline `UpdateTaskRequest`/`CreateTaskRequest` objects.
- Add comprehensive a11y review for drag-and-drop calendar (keyboard alternatives, announcements).
- Tighten type generation pipeline to resolve backend type conflicts in `frontend/src/lib/backend.ts`.

## Accessibility Compliance Report (WCAG 2.1 AA)
Observed gaps in sampled set:
- Custom modals in `TaskManager` and `PhotoUpload` lack focus trapping and `aria-modal`.
- Some interactive sections use `div`/`button` without explicit keyboard and focus handling (e.g., custom dropdowns).
- Form error messaging lacks `aria-live` announcements in some steps.
- Drag-and-drop calendar lacks keyboard alternative interactions and screen reader announcements.
- Claims of WCAG compliance in settings are not backed by code-level checks.

Remediation priorities:
- High: Replace custom modals with `Dialog`/`Sheet`, add `aria-modal` and focus trap.
- High: Provide keyboard-only paths for task scheduling and drag-and-drop.
- Medium: Add `aria-live` for validation errors, and ensure form fields have `aria-describedby` for help text.
- Medium: Audit and fix contrast for status badges and subtler text variants.

## Performance Optimization Plan
Component-level:
- Split `TaskManager`, `PoseDetail`, and `Dashboard` into smaller subcomponents and memoized selectors.
- Extract derived task mapping into memoized helpers to avoid heavy per-render work.
- Normalize repeated data formatting (date/time) into shared utilities.

Code splitting:
- Keep dynamic import for analytics charts; consider lazy-loading heavy workflow sections and detail panels.
- Defer heavy photo galleries until interaction or in-view.

Rendering bottlenecks:
- `tasks/page.tsx` does heavy per-render work and embeds multiple subcomponents inline; move to subcomponents and memoize filtering logic.
- `PoseDetail` performs large mapping and defaulting; move normalization to a dedicated helper and memoize once in parent.

## Appendix
### Sampling rationale
- Priority given to largest and most central files by size and flow importance.
- UI primitives sampled from both `frontend/src/ui` and `frontend/src/components/ui` due to duplication risk.

### Automated check outputs (summary)
- `npm run frontend:type-check`: failed due to duplicate type declarations in backend-generated types and missing modules.
- `npm run frontend:lint`: failed with many warnings and one error (`no-require-imports` in test setup).

### Files reviewed (representative)
- Task creation flow: `frontend/src/components/TaskForm/*` and steps.
- Task details and actions: `frontend/src/components/tasks/*`.
- Tasks route: `frontend/src/app/tasks/page.tsx` and related pages.
- Dashboard: `frontend/src/components/dashboard/Dashboard.tsx` and primary widgets.
- Settings: `frontend/src/components/settings/AccessibilityTab.tsx`, `PerformanceTab.tsx`.
- Photo: `frontend/src/components/PhotoUpload/*`.
- Calendar: `frontend/src/components/calendar/*`.
- Reports: `frontend/src/app/reports/components/data-explorer/*`.
- Hooks: `frontend/src/hooks/*` sampled.

---
End of report.
