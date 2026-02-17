# ADR: IPC Mapping

- Status: Accepted

## Context
IPC command names and DTO contracts are already used by the frontend typed client.

## Decision
Existing command names remain stable; command handlers perform DTO-to-application mapping and centralized error mapping.

## Consequences
Frontend compatibility is preserved during internal backend refactors.

## Alternatives considered
Renaming IPC commands during migration was rejected due to breaking changes.
