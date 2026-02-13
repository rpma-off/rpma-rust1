# Frontend Connectivity Report

## Summary counts

- OK: **3**
- MOCK: **0**
- DEAD: **13**
- MISSING_BACKEND: **0**
- MISSING_WRAPPER: **0**

## Top 20 highest-impact broken actions

| Route | File path | Line range | Action/Handler | Status | Fix description |
|---|---|---|---|---|---|
| `/analytics` | `frontend/src/app/analytics/page.tsx` | `-` | `N/A / N/A` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/audit` | `frontend/src/app/audit/page.tsx` | `-` | `N/A / N/A` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/bootstrap-admin` | `frontend/src/app/bootstrap-admin/page.tsx` | `49` | `onSubmit / handleSubmit` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients/[id]/edit` | `frontend/src/app/clients/[id]/edit/page.tsx` | `93` | `onSubmit / handleSubmit` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients/[id]/edit` | `frontend/src/app/clients/[id]/edit/page.tsx` | `125` | `onClick / handleCancel` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients/[id]` | `frontend/src/app/clients/[id]/page.tsx` | `98` | `onClick / handleCreateTask` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients/[id]` | `frontend/src/app/clients/[id]/page.tsx` | `66` | `onClick / handleEdit` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients/[id]` | `frontend/src/app/clients/[id]/page.tsx` | `72` | `onClick / handleDelete` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients/new` | `frontend/src/app/clients/new/page.tsx` | `33` | `onSubmit / handleSubmit` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients/new` | `frontend/src/app/clients/new/page.tsx` | `67` | `onClick / handleCancel` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/clients` | `frontend/src/app/clients/page.tsx` | `-` | `N/A / N/A` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/configuration` | `frontend/src/app/configuration/page.tsx` | `208` | `onClick / handleRefresh` | **DEAD** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/dashboard/interventions` | `frontend/src/app/dashboard/interventions/page.tsx` | `-` | `N/A / N/A` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/dashboard/operational-intelligence` | `frontend/src/app/dashboard/operational-intelligence/page.tsx` | `83` | `onClick / handleRefresh` | **DEAD** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/dashboard/operational-intelligence` | `frontend/src/app/dashboard/operational-intelligence/page.tsx` | `90` | `onClick / handleExport` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/dashboard` | `frontend/src/app/dashboard/page.tsx` | `-` | `N/A / N/A` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/data-explorer` | `frontend/src/app/data-explorer/page.tsx` | `-` | `N/A / N/A` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |
| `/interventions` | `frontend/src/app/interventions/page.tsx` | `-` | `N/A / N/A` | **MISSING** | Wire handler to existing IPC/API wrapper and invalidate/refetch state after mutation. |

## Applied patch notes

- `frontend/src/app/tasks/page.tsx`: replaced dead toast action (`console.log` undo) with `Actualiser` action that triggers `refetch()`.
- Added `frontend/tests/e2e/connectivity-smoke.spec.ts` for core smoke flow coverage (login/tasks/task detail/intervention step/logout).
- Generated audit artifacts under `docs/audits/` as requested.
