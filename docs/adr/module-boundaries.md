# ADR: Module Boundaries

- Status: Accepted

## Context
The backend migration introduces bounded contexts and requires strict module isolation.

## Decision
Domain SQL is limited to `domains/**/infrastructure/**` (plus shared DB helpers), and each domain exposes a single public service facade.

## Consequences
Boundary violations are detected quickly via architecture checks.

## Alternatives considered
Keeping legacy service/repository cross-imports was rejected due to high coupling.
