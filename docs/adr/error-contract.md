# ADR: Shared Error Contract and Mapping

- Status: Accepted

## Context
Bounded contexts must not leak SQL/internal errors across IPC boundaries.

## Decision
Map domain/infrastructure errors to shared app error contracts in IPC mapping layers.

## Consequences
- Stable frontend-facing errors.
- Reduced leakage of persistence details.

## Alternatives considered
- Returning raw repository/database errors (rejected)
