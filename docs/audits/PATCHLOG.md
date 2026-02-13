# RPMA v2 — Patch Log

## Patch 1: Fix CI WebKit Package

- **Why**: All CI jobs fail because `libwebkit2gtk-4.0-dev` doesn't exist on Ubuntu 24.04. Tauri v2 requires `libwebkit2gtk-4.1-dev`.
- **Files changed**: `.github/workflows/ci.yml` (4 locations)
- **How verified**: Checked all instances replaced; confirmed Tauri v2 docs require 4.1.

## Patch 2: Fix Schema Drift Checker

- **Why**: Drift checker expected `vehicle_year INTEGER` in tasks table, but both schema.sql and Rust model use TEXT/String.
- **Files changed**: `scripts/detect-schema-drift.js` (line 243)
- **How verified**: `node scripts/detect-schema-drift.js` — now reports "No schema drift detected".

## Patch 3: Add migration-tests/results to .gitignore

- **Why**: Timestamped JSON result files were being committed, causing repo clutter.
- **Files changed**: `.gitignore`, removed tracked files via `git rm --cached`
- **How verified**: `git status` no longer shows migration test results.

## Patch 4: Fix 205 TypeScript Type Errors

- **Why**: TypeScript compilation (`tsc --noEmit`) reported 205 errors across the IPC layer and components.
- **Files changed** (22 files):
  - `frontend/src/types/json.ts` — JsonObject allows undefined
  - `frontend/src/lib/ipc/core/types.ts` — BackendResponse uses `unknown` index
  - `frontend/src/lib/ipc/mock/mock-db.ts` — AnyRecord type, return type fix
  - `frontend/src/lib/ipc/client.ts` — intermediate unknown casts, event input casts
  - `frontend/src/lib/ipc/secure-client.ts` — same pattern as client.ts
  - `frontend/src/lib/ipc/cache.ts` — remove JsonValue constraint
  - `frontend/src/lib/ipc/utils.ts` — error narrowing, details type
  - `frontend/src/lib/ipc/utils/crud-helpers.ts` — generic request casting
  - `frontend/src/lib/ipc/core/response-handlers.ts` — unknown intermediate cast
  - `frontend/src/lib/ipc/domains/inventory.ts` — all type casts
  - `frontend/src/lib/ipc/domains/interventions.ts` — all type casts
  - `frontend/src/lib/ipc/domains/users.ts` — UserAccount cast
  - `frontend/src/lib/ipc/mock/mock-controls.ts` — Promise<JsonValue> cast
  - `frontend/src/lib/services/entities/user.service.ts` — User casts
  - `frontend/src/lib/services/entities/settings.service.ts` — JsonObject import/cast
  - `frontend/src/components/dashboard/SecurityDashboard.tsx` — domain type casts
  - `frontend/src/components/settings/PerformanceTab.tsx` — CacheStats cast
  - `frontend/src/components/settings/SecurityTab.tsx` — SessionResponse cast
  - `frontend/src/components/tasks/TaskActions/EditTaskModal.tsx` — JsonObject cast
  - `frontend/src/components/ui/button.tsx` — remove invalid disabled on Slot
  - `frontend/src/hooks/useSyncStatus.ts` — BackendSyncStatus cast
- **How verified**: `npx tsc --noEmit` reports 0 errors. Frontend tests: 16 failed / 48 passed (same as before — no regressions).
