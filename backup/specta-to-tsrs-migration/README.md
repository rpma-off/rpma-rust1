# Backup Files: specta to ts-rs Migration

## Overview
These files are backups created during the migration from `specta` to `ts-rs` for TypeScript type generation. The migration was completed on February 8, 2026.

## What Was Changed
The migration involved:
1. Removing all `specta` dependencies from `src-tauri/Cargo.toml`
2. Converting `ts-rs` from an optional feature to a direct dependency
3. Removing all conditional compilation attributes like `#[cfg(any(feature = "specta", feature = "ts-rs"))]`
4. Updating build scripts to not reference the `ts-rs` feature
5. Ensuring all types have `#[derive(TS)]` attribute

## Directory Structure
The backup files are organized exactly as they were in the original codebase:

```
backup/specta-to-tsrs-migration/
├── Cargo.toml.backup
├── frontend/src/hooks/useInterventionWorkflow.ts.backup
└── src-tauri/
    ├── src/commands/
    │   ├── errors.rs.bak
    │   ├── mod.rs.bak
    │   ├── notification.rs.bak
    │   └── task_types.rs.bak
    ├── src/models/
    │   ├── auth.rs.bak
    │   ├── calendar.rs.bak
    │   ├── calendar_event.rs.bak
    │   ├── client.rs.bak
    │   ├── common.rs.bak
    │   ├── intervention.rs.bak
    │   ├── material.rs.bak
    │   ├── message.rs.bak
    │   ├── notification.rs.bak
    │   ├── photo.rs.bak
    │   ├── reports.rs.bak
    │   ├── settings.rs.bak
    │   ├── status.rs.bak
    │   ├── step.rs.bak
    │   ├── sync.rs.bak
    │   ├── task.rs.bak
    │   └── user.rs.bak
    ├── src/repositories/
    │   ├── base.rs.bak
    │   └── cache.rs.bak
    └── src/services/
        ├── intervention_types.rs.bak
        └── prediction.rs.bak
```

## Verification
The migration was verified by:
- Running `npm run types:sync` successfully
- Running `npm run types:drift-check` (after fixing the script)
- Running `npm test` in the frontend (185 tests passed)
- Creating and running a validation script

## Cleanup
Once you're confident the migration is stable and no longer need these backups, you can safely delete this entire directory:
```bash
rm -rf backup/specta-to-tsrs-migration
```

## Notes
- All backup files contain the original code with `specta` conditionals
- The current codebase uses `ts-rs` exclusively for type generation
- The migration simplified the codebase by removing ~26 conditional compilation blocks