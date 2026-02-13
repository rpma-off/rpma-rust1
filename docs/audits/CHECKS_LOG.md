# RPMA v2 — Checks Log

## Date: 2026-02-13

### CI Workflow Analysis

**Workflow runs checked**: Latest 5 runs on main branch.

**Failure analysis** (Run ID: 22003570781):
- **All 4 jobs failed** with the same root cause.
- **Root cause**: `E: Unable to locate package libwebkit2gtk-4.0-dev`
  - Tauri v2 requires `libwebkit2gtk-4.1-dev`, not `4.0-dev`
  - Ubuntu 24.04 (`ubuntu-latest`) does not ship `libwebkit2gtk-4.0-dev`
- **Additional failure**: Database schema drift check
  - Drift checker expected `vehicle_year INTEGER` in `tasks` table
  - Schema and Rust model both use `TEXT/String` — checker was wrong

### Frontend Checks

#### TypeScript Type Check (`tsc --noEmit`)
- **Before fixes**: 205 errors
- **After fixes**: 0 errors
- **Key issues fixed**:
  - `JsonObject` type didn't allow `undefined` values (breaks optional properties)
  - `BackendResponse` had overly strict index signature
  - Type casts from `JsonObject` to domain types needed `unknown` intermediate
  - `cachedInvoke` had unnecessarily strict `T extends JsonValue` constraint
  - Button component passed `disabled` to Radix `Slot` (invalid prop)
  - Error handling didn't narrow `string | ApiError` union properly

#### ESLint (`next lint`)
- **Errors**: 2 pre-existing (unescaped apostrophes in error boundaries)
- **Warnings**: 583 (mostly unused vars in test files, `any` types)
- **No new issues introduced** by our changes.

#### Frontend Tests (`npm run test:ci`)
- **Before changes**: 16 failed, 48 passed (64 total)
- **After changes**: 16 failed, 48 passed (64 total)
- **No regressions** — all failures are pre-existing.

### Rust Checks

**Note**: Full Rust compilation requires Tauri system dependencies (`libwebkit2gtk-4.1-dev`, etc.) which are not available in this sandbox. Static analysis was performed instead.

### Schema Drift Check
- **Before fix**: FAIL — `vehicle_year` type mismatch
- **After fix**: PASS — `✅ No schema drift detected`
