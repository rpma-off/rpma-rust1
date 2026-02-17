# ADR: Logging Correlation Across Domain Boundaries

- Status: Accepted

## Context
Observability requires traceable request/event flow across commands and domain services.

## Decision
Keep correlation IDs at command boundaries and preserve them through service calls and event publication.

## Consequences
- Better operational debugging.
- Consistent telemetry for workflows.

## Alternatives considered
- Local per-layer IDs only (rejected)
