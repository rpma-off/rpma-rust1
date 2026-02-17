# ADR: Offline-First Strategy in Bounded Contexts

- Status: Accepted

## Context
RPMA uses local SQLite as source of truth and must keep operating offline.

## Decision
Bounded-context migration keeps local DB persistence and avoids introducing online dependencies.

## Consequences
- Offline workflows remain intact.
- Domain boundaries do not alter local-first behavior.

## Alternatives considered
- Remote-first synchronization architecture (rejected)
