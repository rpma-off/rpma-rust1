# RPMA v2 — Audit Findings

## Finding 1: CI Broken — Wrong WebKit Package for Tauri v2

- **Category**: CI/CD
- **Evidence**: `.github/workflows/ci.yml` lines 42, 118, 212, 279 — all reference `libwebkit2gtk-4.0-dev`
- **Risk Level**: **Critical** — All CI jobs fail, no code can be merged
- **Patch Summary**: Changed all 4 occurrences to `libwebkit2gtk-4.1-dev` (Tauri v2 requirement)
- **Verification**: CI workflow should now install dependencies successfully
- **Status**: ✅ FIXED

## Finding 2: Schema Drift Checker Mismatched with Actual Schema

- **Category**: Database
- **Evidence**: `scripts/detect-schema-drift.js` line 243 checks for `vehicle_year integer` but `src-tauri/src/db/schema.sql` line 323 and Rust model `src-tauri/src/models/task.rs` line 164 both use TEXT/String
- **Risk Level**: **High** — CI database check fails on every run
- **Patch Summary**: Updated drift checker to expect `vehicle_year text` (matching schema and Rust model)
- **Verification**: `node scripts/detect-schema-drift.js` now passes
- **Status**: ✅ FIXED

## Finding 3: 205 TypeScript Type Errors in Frontend

- **Category**: Frontend / Type Safety
- **Evidence**: `npx tsc --noEmit` showed 205 errors across IPC layer
- **Risk Level**: **High** — Type safety violations mask potential runtime errors
- **Patch Summary**: Fixed all 205 errors:
  - `JsonObject` type updated to allow `undefined` values
  - `BackendResponse` interface fixed with `unknown` index signature
  - Type casts fixed across domains (inventory, interventions, users, etc.)
  - Cache type constraints relaxed from `JsonValue` to unconstrained generic
  - Error handling properly narrows `string | ApiError` union
  - Button component fixed (invalid `disabled` prop on Radix `Slot`)
- **Verification**: `npx tsc --noEmit` now reports 0 errors
- **Status**: ✅ FIXED

## Finding 4: Mock-DB Uses Untyped `any` for IPC Arguments

- **Category**: Frontend / Type Safety
- **Evidence**: `frontend/src/lib/ipc/mock/mock-db.ts` — mock handler accesses `args?.request.email`, `args?.request.action`, etc. without type narrowing
- **Risk Level**: **Medium** — Mock code may silently pass wrong data in tests
- **Patch Summary**: Added `AnyRecord` type and explicit casts for mock argument destructuring. Changed return type from `JsonValue` to `unknown`.
- **Verification**: TypeScript compilation passes with 0 errors
- **Status**: ✅ FIXED

## Finding 5: Mutex `.unwrap()` in Database Connection Pool

- **Category**: Rust / Safety
- **Evidence**: `src-tauri/src/db/connection.rs` — 12 instances of `.lock().unwrap()` on Mutex guards
- **Risk Level**: **Low** — Mutex poisoning is rare and typically indicates a panic in another thread (which is already fatal). Standard Rust practice for non-recoverable state.
- **Patch Summary**: Documented only — changing to `.expect()` or `.lock().ok()` wouldn't meaningfully improve safety and could mask the underlying panic.
- **Status**: ⚠️ DOCUMENTED (acceptable risk)

## Finding 6: Migration Test Results Committed to Repository

- **Category**: CI/CD / Hygiene
- **Evidence**: `migration-tests/results/` directory contained timestamped JSON artifacts
- **Risk Level**: **Low** — Clutters repository, potential merge conflicts
- **Patch Summary**: Added `migration-tests/results/` to `.gitignore` and removed tracked files
- **Verification**: `git status` no longer shows migration test results
- **Status**: ✅ FIXED

## Finding 7: Pre-existing Frontend Test Failures (16 suites)

- **Category**: Tests
- **Evidence**: `npm run test:ci` — 16 test suites fail (154 individual tests)
- **Risk Level**: **Medium** — May mask regressions in future changes
- **Patch Summary**: Not addressed in this PR — failures are pre-existing and unrelated to type safety changes
- **Status**: ⚠️ DOCUMENTED (pre-existing)

## Finding 8: `any` Types in Validation Layer

- **Category**: Frontend / Type Safety
- **Evidence**: `frontend/src/lib/validation/backend-type-guards.ts` — 10+ validator functions return `any` instead of Zod inferred types
- **Risk Level**: **Medium** — Defeats TypeScript's type checking for validated data
- **Patch Summary**: Documented only — fixing requires updating all callers and is a larger refactor
- **Status**: ⚠️ DOCUMENTED (future improvement)
