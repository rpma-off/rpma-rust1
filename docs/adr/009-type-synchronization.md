# ADR-009: TypeScript Type Synchronization Contract

## Status
Accepted

## Context
Manual maintenance of TypeScript interfaces mirroring Rust models is error-prone and leads to runtime deserialization failures. A single source of truth is required for the IPC boundary.

## Decision

### Rust-Driven Generation
- All Rust structs and enums that cross the IPC boundary must derive `ts_rs::TS` and be marked with `#[ts(export)]`.
- These models are primarily located in `src-tauri/src/domains/*/domain/models/` and `src-tauri/src/models/`.

### Automated Pipeline
- The `export-types` binary (`src-tauri/src/bin/export-types.rs`) introspects all exported Rust types and generates their TypeScript equivalents.
- `npm run types:sync` executes this binary and writes the output to the protected `frontend/src/types/` directory.
- This sync operation is a mandatory prerequisite for `npm run dev` and `npm run build`.

### Enforcement and Drift Detection
- `npm run types:drift-check` and its CI counterpart `scripts/ci-type-drift-check.js` verify that committed TypeScript declarations exactly match the current Rust models.
- Manual edits to `frontend/src/types/` are prohibited and will be reverted by the sync process or caught by the drift check.

## Consequences
- Type safety is guaranteed between the Rust backend and TypeScript frontend.
- IPC contract changes are detected at compile-time/CI-time rather than runtime.
- Backend engineers own the API contract definition through Rust types.
