# Frontend UX Consistency Report

> **Generated**: 2026-02-11  
> **Scope**: All routes under `frontend/src/app/**/page.tsx`

---

## 1. Route & Page Inventory

### Dashboard pages
| Route | Type | Uses `PageShell` | Uses `PageHeader` | Loading State | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|
| `/dashboard` | Client | ✅ | ❌ (delegates to `CalendarDashboard`) | ✅ `LoadingState` | via `ErrorBoundary` | N/A | Main dashboard |
| `/dashboard/interventions` | Server | ❌ | ❌ | ❌ | ❌ | ❌ | Sub-route |
| `/dashboard/operational-intelligence` | Server | ❌ | ❌ | ❌ | ❌ | ❌ | Sub-route |

### Management pages
| Route | Type | Uses `PageShell` | Uses `PageHeader` | Loading State | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|
| `/users` | Client | ✅ | ✅ | ✅ `LoadingState` | ✅ `ErrorState` | ❌ | **Refactored** |
| `/clients` | Client | ✅ | ✅ `PageHeader` + `StatCard` | Skeleton | Inline | `EnhancedEmptyState` | **Refactored** (wrapper) |
| `/clients/[id]` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Detail page |
| `/clients/[id]/edit` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Edit page |
| `/clients/new` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Create page |
| `/technicians` | Client | ✅ | ✅ | ✅ `LoadingState` | ✅ `ErrorState` | ✅ `EmptyState` | **Refactored** |
| `/team` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Redirect to `/users` |
| `/admin` | Client | ✅ | ✅ | ❌ (inline) | ✅ `ErrorState` | ❌ | **Refactored** |

### Task & Workflow pages
| Route | Type | Uses `PageShell` | Uses `PageHeader` | Loading State | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|
| `/tasks` | Client | ❌ | Custom header | Custom | Custom | Custom | Very complex multi-view page |
| `/tasks/new` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Create task form |
| `/tasks/[id]` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Task detail |
| `/tasks/[id]/completed` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Completed view |
| `/tasks/edit/[id]` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Edit task |
| `/tasks/[id]/workflow/ppf` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | PPF workflow |
| `/tasks/[id]/workflow/ppf/steps/*` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Workflow steps |
| `/tasks/[id]/workflow/steps/[step]` | Client | ❌ | ❌ | ❌ | ❌ | ❌ | Generic step |

### Tools & Analytics pages
| Route | Type | Uses `PageShell` | Uses `PageHeader` | Loading State | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|
| `/analytics` | Server | ❌ | ❌ | `Suspense` | ❌ | ❌ | Wrapper pattern |
| `/reports` | Server | ❌ | ❌ | Dynamic import | ❌ | ❌ | SSR disabled |
| `/data-explorer` | Client | ✅ | ✅ | ❌ | ❌ | ❌ | **Refactored** |
| `/inventory` | Server | ❌ | ❌ | `Suspense` | ❌ | ❌ | Wrapper pattern |
| `/audit` | Server | ✅ | ✅ | N/A | N/A | ✅ `EmptyState` | **Refactored** |

### Settings & Config pages
| Route | Type | Uses `PageShell` | Uses `PageHeader` | Loading State | Error State | Empty State | Notes |
|---|---|---|---|---|---|---|---|
| `/settings` | Client | ✅ | ✅ | ✅ `LoadingState` | ❌ | ❌ | **Refactored** |
| `/configuration` | Client | ✅ | Custom | ❌ | ❌ | ❌ | **Refactored** (wrapper) |
| `/messages` | Client | ✅ | ✅ | ❌ | ✅ `ErrorState` | ❌ | **Refactored** |

### Auth & Utility pages
| Route | Type | Uses `PageShell` | Notes |
|---|---|---|---|
| `/login` | Client | ❌ | Public auth page – excluded from dashboard shell |
| `/signup` | Client | ❌ | Public auth page – excluded |
| `/unauthorized` | Client | ❌ | Public error page – excluded |
| `/bootstrap-admin` | Client | ❌ | First-run admin setup – excluded |
| `/` (root) | Server | ❌ | Redirect to `/dashboard` |
| `/schedule` | Client | ❌ | Redirect to `/dashboard` |
| `/interventions` | Client | ❌ | Redirect to `/dashboard/interventions` |

### Layouts
| Path | Purpose |
|---|---|
| `app/layout.tsx` | Root server layout (metadata, body, RootClientLayout) |
| `app/tasks/[id]/workflow/ppf/layout.tsx` | PPF workflow step layout |

---

## 2. Conformance Assessment

### Standard Page Shell definition
A conforming dashboard page must use:
1. `PageShell` for consistent container width, padding, and spacing
2. `PageHeader` for a unified title area (H1 + subtitle + actions)
3. Standardized states: `LoadingState`, `ErrorState`, `EmptyState`
4. shadcn/ui primitives (Card, Button, Table, etc.) for content
5. RPMA design tokens (`--rpma-teal`, `--rpma-border`, `--rpma-surface`, `--rpma-shadow-soft`)

### Conformance Summary
| Category | Total | Conforming | Partial | Non-conforming | Excluded |
|---|---|---|---|---|---|
| Dashboard pages | 3 | 1 | 0 | 2 | 0 |
| Management pages | 8 | 4 | 2 | 0 | 2 (redirects) |
| Task/Workflow pages | 8 | 0 | 0 | 8 | 0 |
| Tools/Analytics pages | 5 | 2 | 1 | 2 | 0 |
| Settings/Config pages | 3 | 3 | 0 | 0 | 0 |
| Auth/Utility pages | 6 | 0 | 0 | 0 | 6 (excluded) |

---

## 3. Prioritized Refactor Plan

### P0 — Must Fix (structural inconsistencies that break UX cohesion)
1. ~~`/audit` — bare HTML, no PageShell, no PageHeader~~ ✅ Fixed
2. ~~`/users` — custom loading/error states, no PageShell~~ ✅ Fixed
3. ~~`/technicians` — bespoke header, custom loading/error/empty~~ ✅ Fixed
4. ~~`/messages` — bespoke colored header, motion wrappers~~ ✅ Fixed
5. ~~`/dashboard` — custom loading spinner~~ ✅ Fixed

### P1 — Should Fix (inconsistent but functional)
1. `/tasks` — very complex page; should use `PageShell` wrapper and standardized loading/error states. **Deferred** due to complexity (43KB file).
2. `/dashboard/interventions`, `/dashboard/operational-intelligence` — sub-routes that delegate to components; could benefit from `PageShell`.
3. `/clients/[id]`, `/clients/new`, `/clients/[id]/edit` — detail/form pages could adopt `PageShell`.
4. `/analytics`, `/inventory` — server-side wrapper pages could adopt `PageShell`.
5. `/reports` — dynamic import page could adopt `PageShell`.

### P2 — Nice to Have
1. Task workflow step pages (`/tasks/[id]/workflow/ppf/steps/*`) — specialized workflow UI; refactoring would require careful coordination with workflow layout.
2. `/tasks/[id]`, `/tasks/edit/[id]`, `/tasks/[id]/completed` — task detail pages.
3. Auth pages (`/login`, `/signup`) — excluded from dashboard shell but could benefit from consistent styling.

---

## 4. Shared Components Created / Unified

### New components (under `frontend/src/components/layout/`)
| Component | File | Purpose |
|---|---|---|
| `PageShell` | `PageShell.tsx` | Consistent page container (`max-w-7xl`, padding, vertical rhythm) |
| `Toolbar` | `Toolbar.tsx` | Search/filter/controls row with consistent styling |
| `SectionCard` | `SectionCard.tsx` | Thin wrapper around shadcn Card with title/description/actions |
| `EmptyState` | `EmptyState.tsx` | Centered empty content placeholder with icon, title, description, CTA |
| `LoadingState` | `LoadingState.tsx` | Centered loading spinner with message |
| `ErrorState` | `ErrorState.tsx` | Centered error display with retry button |
| `DataTableWrapper` | `DataTableWrapper.tsx` | Card wrapper for tables with header and overflow scroll |

### Existing components leveraged
| Component | File | Purpose |
|---|---|---|
| `PageHeader` | `ui/page-header.tsx` | Title/subtitle/icon/actions/stats header (pre-existing) |
| `StatCard` | `ui/page-header.tsx` | Stat card with trend (pre-existing) |
| `HeaderActionButton` | `ui/page-header.tsx` | Responsive action button (pre-existing) |
| `EnhancedEmptyState` | `ui/enhanced-empty-state.tsx` | Advanced empty state with tips (pre-existing, kept for `clients`) |
| `ErrorBoundary` | `ui/error-boundary.tsx` | React error boundary (pre-existing) |
| `LoadingSpinner` | `ui/loading-spinner.tsx` | Simple spinner (pre-existing) |
| `Skeleton*` | `ui/skeleton.tsx` | Context-aware skeleton components (pre-existing) |
| `Card` suite | `ui/card.tsx` | shadcn Card primitives (pre-existing) |

### Barrel export
All new layout components are re-exported from `frontend/src/components/layout/index.ts`.

---

## 5. Design Token Compliance

All new and refactored components use the RPMA design tokens:
- `--rpma-teal` — accent/brand color
- `--rpma-border` — consistent border color
- `--rpma-surface` — background surface color
- `--rpma-shadow-soft` — consistent shadow

No hardcoded colors were introduced. Existing Tailwind semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`) are used throughout.

---

## 6. Accessibility Notes

- `PageHeader` renders an `<h1>` for every page (consistent heading hierarchy)
- `EmptyState` and `ErrorState` use semantic heading levels (`<h3>`)
- All interactive elements (buttons) are natively focusable
- `LoadingState` spinner uses `aria-hidden` implicitly via Lucide icon (decorative)
- Dialog components use Radix primitives (focus trapping, escape handling)

---

## 7. What Changed (Summary)

### Files created (7)
- `frontend/src/components/layout/PageShell.tsx`
- `frontend/src/components/layout/Toolbar.tsx`
- `frontend/src/components/layout/SectionCard.tsx`
- `frontend/src/components/layout/EmptyState.tsx`
- `frontend/src/components/layout/LoadingState.tsx`
- `frontend/src/components/layout/ErrorState.tsx`
- `frontend/src/components/layout/DataTableWrapper.tsx`
- `frontend/src/components/layout/index.ts`

### Files modified (10 pages)
- `frontend/src/app/audit/page.tsx` — full rewrite to use PageShell + PageHeader + EmptyState
- `frontend/src/app/users/page.tsx` — replaced custom loading/error with shared primitives
- `frontend/src/app/technicians/page.tsx` — replaced bespoke header/loading/error/empty
- `frontend/src/app/dashboard/page.tsx` — replaced custom spinner with LoadingState
- `frontend/src/app/messages/page.tsx` — replaced bespoke header with PageShell + PageHeader
- `frontend/src/app/data-explorer/page.tsx` — replaced motion wrappers with PageShell + PageHeader + SectionCard
- `frontend/src/app/settings/page.tsx` — replaced container with PageShell, Suspense fallbacks with LoadingState
- `frontend/src/app/clients/page.tsx` — wrapped in PageShell
- `frontend/src/app/admin/page.tsx` — replaced bespoke header with PageShell + PageHeader, access-denied with ErrorState
- `frontend/src/app/configuration/page.tsx` — wrapped in PageShell, removed unused imports
