# ADR-009: TypeScript Type Synchronization Contract

## Status
Accepted

## Context
The frontend is written in TypeScript and the backend in Rust. Keeping IPC payload types consistent across the language boundary manually is error-prone and produces silent runtime deserialization failures.

## Decision
- Rust models that cross the IPC boundary derive `ts_rs::TS` and are annotated with `#[ts(export)]`.
- A dedicated Cargo binary (`src-tauri/src/bin/export-types`) compiled under the `export-types` feature flag introspects all exported types and emits their TypeScript equivalents to stdout.
- `npm run types:sync` (defined in the root `package.json`) runs this binary and pipes the output through `scripts/write-types.js`, which writes the generated declarations to `frontend/src/types/`. These files are auto-generated and must not be edited manually.
- `npm run types:drift-check` (`scripts/check-type-drift.js`) detects divergence between the committed generated types and the current Rust model definitions. The CI pipeline runs `scripts/ci-type-drift-check.js` as part of the `check` job.
- The production `build` script (`npm run build`) calls `types:sync` before invoking the Tauri build, ensuring the shipped frontend always reflects the current Rust models.

## Consequences
- Type mismatches between Rust models and TypeScript consumers are detected before compilation.
- The `frontend/src/types/` directory is a derived artifact; changes to it outside the generation pipeline indicate a manual edit and will fail the drift check.
- Adding a new IPC payload type requires deriving `TS`, annotating with `#[ts(export)]`, and running `types:sync` before updating frontend consumers.
- Removing or renaming a Rust field is a breaking IPC change and will be surfaced by the drift check in CI.
