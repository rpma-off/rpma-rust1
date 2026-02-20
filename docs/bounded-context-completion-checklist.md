# Bounded-Context Completion Checklist

This tracker is the execution baseline for the strict bounded-context completion plan.

## Modes
- Strict mode (default): checks fail on strict findings.
- Optional progressive runs are available only by invoking scripts without `--strict` manually.

## Wave Status
- [x] Wave 0 - Foundation and strictness scaffolding
- [x] Wave 1 - Auth + Users
- [x] Wave 2 - Tasks + Clients
- [x] Wave 3 - Interventions + Inventory + Documents
- [x] Wave 4 - Reports + Analytics + Quotes
- [x] Wave 5 - Settings + Calendar + Notifications + Sync + Audit
- [x] Wave 6 - Model ownership completion + global cleanup

## Wave 0 Deliverables
- [x] Shared backend IPC module scaffold: `src-tauri/src/shared/ipc/`
- [x] Shared backend app state module: `src-tauri/src/shared/app_state.rs`
- [x] Command compatibility shims for shared IPC modules
- [x] Strict-mode scaffolding in architecture validators
- [x] Migration audit script with strict/progressive behavior
- [x] Tracker document added

## Wave 1 Progress (Auth + Users)
- [x] Replaced trivial `auth/users` facades with orchestration and validation logic
- [x] Replaced scaffold-only `application/domain/mod.rs` in `auth/users`
- [x] Moved user IPC contracts to `domains/users/application/contracts.rs`
- [x] Replaced trivial `auth/users` facade tests with behavior-focused tests
- [x] Frontend `domains/auth/server` and `domains/users/server` now use domain-owned `server/services/*`
- [x] Moved authentication middleware to shared cross-domain module: `src-tauri/src/shared/auth_middleware.rs`
- [x] Removed auth/user legacy command shims from `src-tauri/src/commands/*`

## Wave 2 Progress (Tasks + Clients)
- [x] Removed legacy `commands/task/**`, `commands/client.rs`, `commands/task_types.rs`, and `commands/status.rs` shim files
- [x] Updated invoke registrations to domain IPC handlers for tasks/clients/status commands
- [x] Repointed remaining task/client type references from `crate::commands::*` to `domains::tasks::ipc::*`
- [x] Removed `services/task*.rs`, `services/client*.rs`, `repositories/task*.rs`, and `repositories/client_repository.rs` shim files
- [x] Updated task/client call sites to bounded-context paths while keeping architecture checks green

## Wave 3 Progress (Interventions + Inventory + Documents)
- [x] Removed legacy `commands/intervention/**` and `commands/material.rs` shim files
- [x] Updated invoke registrations and integration test imports to domain IPC paths for interventions/inventory
- [x] Removed intervention/inventory/documents service + repository shim files and rewired Rust imports to domain infrastructure modules

## Wave 4 Progress (Reports + Analytics + Quotes)
- [x] Removed legacy `commands/reports/**` shim files and rewired invoke registrations to `domains::reports::ipc::reports::*`
- [x] Repointed reports domain/internal export helpers from `crate::commands::reports::*` to domain-owned IPC utility/generation paths
- [x] Removed legacy `commands/analytics.rs` and `commands/quote.rs` shims and kept IPC command names/signatures stable

## Wave 5 Progress (Settings + Calendar + Notifications + Sync + Audit)
- [x] Removed legacy command shims for `calendar`, `message`, `notification`, `security`, `sync`, `queue`, `settings/**`, and `reports_tests`
- [x] Repointed settings IPC cross-file imports from `crate::commands::settings::core::*` to `domains::settings::ipc::settings::core::*`
- [x] Removed legacy backend sync module `src-tauri/src/sync/**` and rewired references to `domains::sync::infrastructure::sync::*`
- [x] Updated `export-types` notification DTO imports to domain-owned exports (`domains::notifications`)
- [x] Added frontend parity domains `quotes`, `calendar`, `documents`, and `sync` under `frontend/src/domains/*`
- [x] Rewired route/feature consumers to domain APIs (`app/quotes/**`, workflow calendar/photo features, sync indicators)

## Wave 6 Progress (Model Ownership + Global Cleanup)
- [x] Replaced file-based backend service/repository shim modules with in-module alias exports in `services/mod.rs` and `repositories/mod.rs`
- [x] Deleted all remaining backend shim files under `src-tauri/src/services/**` and `src-tauri/src/repositories/**`
- [x] `backend_legacy_shims` reached `0` in migration audit
- [x] Removed `@/lib/services` and `@/lib/ipc/domains` imports from all domain server facade files (`frontend_legacy_imports = 0`)
- [x] Removed scaffold marker text (`Domain layer module index.`) from domain module indices (`backend_scaffold_modules = 0`)
- [x] Moved legacy backend model files from `src-tauri/src/models/*.rs` into bounded contexts and shared contracts (`src-tauri/src/domains/*/domain/models`, `src-tauri/src/shared/contracts`)
- [x] Removed `scripts/legacy-domain-allowlist.json` and dropped allowlist dependency from `scripts/architecture-check.js`
- [x] Switched default architecture/boundary/migration validation scripts to strict mode

## Migration Counters
Run:
```bash
npm run migration:audit
```

Strict gate preview:
```bash
npm run migration:audit:strict
```

Target at Wave 6 completion:
- `backend_legacy_shims = 0`
- `backend_scaffold_modules = 0`
- `backend_trivial_facades = 0`
- `backend_trivial_facade_tests = 0`
- `frontend_legacy_imports = 0`

Latest snapshot (2026-02-20):
- `backend_legacy_shims = 0`
- `backend_scaffold_modules = 0`
- `backend_trivial_facades = 0`
- `backend_trivial_facade_tests = 0`
- `frontend_legacy_imports = 0`

## Strict Checks
Default (strict):
```bash
npm run architecture:check
npm run validate:bounded-contexts
npm run boundary:enforce
npm run migration:audit
```

Explicit strict aliases:
```bash
npm run architecture:check:strict
npm run validate:bounded-contexts:strict
npm run boundary:enforce:strict
npm run migration:audit:strict
```
