# ADR: Logging Correlation

- Status: Accepted

## Context
Cross-layer and event-driven flows require traceability for diagnostics and audits.

## Decision
Correlation IDs are propagated across IPC, application use-cases, and event handling paths.

## Consequences
Operational troubleshooting and audit reconstruction are improved.

## Alternatives considered
Uncorrelated logs were rejected as insufficient for workflow debugging.
