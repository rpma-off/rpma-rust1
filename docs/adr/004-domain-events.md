# ADR-004: Domain Events

## Status
Accepted

## Context
Cross-domain orchestration (e.g., intervention finalization triggering inventory updates) must not create tight coupling between domains.

## Decision
- A global in-memory event bus lives in `shared/event_bus/`.
- Events are defined in `shared/event_bus/events.rs` (e.g., `InterventionFinalized`, `MaterialConsumed`).
- Events are published after successful transaction commit to prevent side effects on rollback.
- Handlers are registered at application startup in `service_builder.rs`.
- The inventory domain listens for `InterventionFinalized` via `InterventionFinalizedHandler`.
- Idempotency is enforced via `reference_type` + `reference_number` unique checks in the inventory transaction repository.

## Consequences
- Domains remain decoupled; adding new event listeners does not modify the publishing domain.
- Event delivery is synchronous and in-process (offline-first, no external message broker).
- Idempotency guards prevent duplicate processing if events are replayed.
