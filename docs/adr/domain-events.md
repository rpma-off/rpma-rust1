# ADR: Domain Events for Cross-Context Communication

- Status: Accepted

## Context
Cross-domain calls create coupling between bounded contexts.

## Decision
Use shared domain events (`InterventionFinalized`, `MaterialConsumed`) via publish/subscribe.

## Consequences
- Looser coupling across domains.
- Event payloads must carry required IDs.

## Alternatives considered
- Direct domain-to-domain service calls (rejected)
