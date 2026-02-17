# ADR: Domain Events

- Status: Accepted

## Context
Cross-domain direct calls violate bounded-context rules.

## Decision
Cross-domain integration uses domain events (`InterventionFinalized`, `MaterialConsumed`) over the shared event bus.

## Consequences
Producers and consumers remain decoupled and side effects can be made idempotent.

## Alternatives considered
Direct domain-to-domain service calls were rejected as architectural coupling.
