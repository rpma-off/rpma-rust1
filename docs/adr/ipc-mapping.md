# ADR: IPC Mapping Through Thin Delegates

- Status: Accepted

## Context
Existing frontend IPC command names must stay stable during migration.

## Decision
Keep legacy command entrypoints and delegate to bounded-context application services.

## Consequences
- No frontend API break.
- Migration can be incremental.

## Alternatives considered
- Immediate IPC rename/removal (rejected)
