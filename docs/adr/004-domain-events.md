# ADR-004: Domain Events

## Status
Accepted

## Context
Cross-domain orchestration (e.g., intervention finalization triggering inventory updates) must not create tight coupling between domains.

## Decision
- A global in-memory event bus lives in `src-tauri/src/shared/services/event_bus.rs` and is wrapped by `src-tauri/src/shared/event_bus/`.
- Events are defined in `src-tauri/src/shared/event_bus/events.rs` (e.g., `InterventionFinalized`, `MaterialConsumed`).
- Events are published after successful operations (see `publish_event` usage in `src-tauri/src/domains/interventions/infrastructure/intervention_workflow.rs`).
- Handlers are registered at application startup in `src-tauri/src/service_builder.rs`.
- The inventory domain listens for `InterventionFinalized` via `InterventionFinalizedHandler` (`src-tauri/src/domains/inventory/application/handlers.rs`).

## Consequences
- Domains remain decoupled; adding new event listeners does not modify the publishing domain.
- Event delivery is in-process and asynchronous (offline-first, no external broker).
- Idempotency must be handled by the consuming domain where needed.
