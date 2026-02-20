# Bounded-Context Completion Checklist

This tracker is the execution baseline for the strict bounded-context completion plan.

## Modes
- Progressive mode (default): strict checks report findings but do not fail.
- Strict mode: set `BOUNDED_CONTEXT_STRICT=1` or pass `--strict` to fail on strict findings.

## Wave Status
- [x] Wave 0 - Foundation and strictness scaffolding
- [ ] Wave 1 - Auth + Users (in progress)
- [ ] Wave 2 - Tasks + Clients
- [ ] Wave 3 - Interventions + Inventory + Documents
- [ ] Wave 4 - Reports + Analytics + Quotes
- [ ] Wave 5 - Settings + Calendar + Notifications + Sync + Audit
- [ ] Wave 6 - Model ownership completion + global cleanup

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

## Strict Checks
Progressive:
```bash
npm run architecture:check
npm run validate:bounded-contexts
npm run boundary:enforce
```

Strict:
```bash
npm run architecture:check:strict
npm run validate:bounded-contexts:strict
npm run boundary:enforce:strict
npm run migration:audit:strict
```
