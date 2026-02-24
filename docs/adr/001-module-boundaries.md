# ADR-001: Module Boundaries

## Status
Accepted

## Context
RPMA v2 uses a bounded-context architecture where each domain is isolated into its own module under `src-tauri/src/domains/`. Shared infrastructure lives under `src-tauri/src/shared/`.

## Decision
- Each domain exposes a single public facade via `pub(crate) use` in its `mod.rs` (example: `src-tauri/src/domains/inventory/mod.rs`).
- Internal modules (`application`, `domain`, `infrastructure`, `ipc`) are declared as `pub(crate) mod` or `pub mod` where needed.
- Cross-domain communication happens only through the event bus (`src-tauri/src/shared/event_bus/*`), never by importing another domain's internals.
- The `scripts/architecture-check.js` guardrail and `scripts/enforce-backend-module-boundaries.js` hard-check enforce these rules in CI.

## Consequences
- Domains remain decoupled and independently testable.
- Adding a new domain requires following the established pattern (see `src-tauri/src/domains/inventory/`).
- Legacy services under `src-tauri/src/services/` and `src-tauri/src/repositories/` remain accessible until fully migrated.
