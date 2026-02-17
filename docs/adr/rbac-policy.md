# ADR: RBAC Policy Preservation During Migration

- Status: Accepted

## Context
Security checks already rely on session validation and role checks in command handlers.

## Decision
Retain existing authentication/RBAC checks (`authenticate!` and permission guards) while delegating business logic.

## Consequences
- Security posture remains unchanged.
- New domain modules do not bypass auth checks.

## Alternatives considered
- Moving auth checks into repositories (rejected)
