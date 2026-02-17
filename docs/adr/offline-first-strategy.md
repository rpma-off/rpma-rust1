# ADR: offline first strategy

- Status: Accepted

## Context
RPMA v2 is migrating to bounded contexts and needs enforceable architectural rules that preserve existing IPC compatibility and offline-first behavior.

## Decision
Adopt bounded-context constraints for backend/frontend boundaries and keep legacy entrypoints as thin delegates during migration.

## Consequences
- Improves isolation and maintainability.
- Requires explicit mapping layers and architecture checks.
- Legacy modules remain temporarily for compatibility.

## Alternatives considered
- Big-bang rewrite (rejected: too risky)
- Keep layered architecture without guardrails (rejected: regressions likely)
