# ADR: RBAC Policy

- Status: Accepted

## Context
Architecture migration must not weaken existing auth/RBAC enforcement.

## Decision
All protected commands keep `authenticate!` and existing role checks; domain migration does not bypass command-level security gates.

## Consequences
Security posture remains unchanged while internals evolve.

## Alternatives considered
Moving all RBAC checks to repositories was rejected because it weakens command boundary enforcement.
