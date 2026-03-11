# ADR-004: Domain Events and Cross-Domain Orchestration

## Status
Accepted

## Context
Cross-domain interactions (e.g., updating inventory after a task is completed) must be handled without creating direct, circular, or tight coupling between bounded contexts.

## Decision

### Event Bus Architecture
- A global, in-memory, asynchronous event bus provides the communication backbone (`src-tauri/src/shared/services/event_bus.rs`).
- Events are defined centrally in `src-tauri/src/shared/event_bus/events.rs` as plain Rust structs (e.g., `InterventionFinalized`, `MaterialConsumed`).

### Publishing and Subscription
- Bounded contexts publish events immediately following successful state changes (e.g., `InterventionFinalized` published from the interventions domain).
- Subscriptions and handlers are registered during application startup in `src-tauri/src/service_builder.rs`.
- Handlers (e.g., `InterventionFinalizedHandler` in the inventory domain) translate external events into local commands or queries.

### Delivery Semantics
- Event delivery is in-process and asynchronous, aligning with the offline-first requirement.
- No external message broker (RabbitMQ, Redis) is permitted.
- Consuming domains are responsible for ensuring idempotency if an event is processed multiple times.

## Consequences
- Adding new side effects to a business operation does not require modifying the origin domain.
- Domain boundaries are respected while allowing rich system-wide workflows.
- The system remains responsive as cross-domain logic is executed out-of-band relative to the primary IPC request.
