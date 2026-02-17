# ADR: Offline-First Strategy

- Status: Accepted

## Context
RPMA v2 is an offline-first desktop product with local SQLite as source of truth.

## Decision
Bounded-context migration keeps local persistence authoritative and introduces no online-only dependencies.

## Consequences
Core workflows remain available offline and resilient to connectivity loss.

## Alternatives considered
Remote-first data authority was rejected as incompatible with product constraints.
