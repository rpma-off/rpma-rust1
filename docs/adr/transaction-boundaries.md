# ADR: Transaction Boundaries in Application Use Cases

- Status: Accepted

## Context
Inventory stock updates and consumption writes must be atomic while IPC handlers stay thin.

## Decision
Define transaction boundaries in domain application services (use-cases), not in command handlers.

## Consequences
- Atomic multi-write operations are consistent.
- IPC remains orchestration-only.

## Alternatives considered
- Transactions in IPC commands (rejected)
- Distributed cross-domain transactions (rejected)
