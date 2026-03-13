# RPMA Documentation

This directory contains architectural documentation and decision records for the RPMA (Repair/Preparation/Finishing Management Application) project.

## Architecture Documentation

Detailed documentation of the RPMA system architecture, linking ADRs to implementation.

### Index

| Document | Title | Summary |
|----------|-------|---------|
| [Overview](architecture/overview.md) | Architecture Overview | High-level summary of the RPMA desktop application architecture. |
| [Backend](architecture/backend.md) | Backend Architecture (Rust) | Detailed overview of the Rust backend and core patterns. |
| [Frontend](architecture/frontend.md) | Frontend Architecture (TypeScript) | Overview of the Next.js frontend architecture and state management. |
| [IPC](architecture/ipc-communication.md) | IPC Communication Pattern | How the frontend and backend communicate through Tauri. |
| [Cross-Domain](architecture/cross-domain-communication.md) | Cross-Domain Communication | How domains interact without violating bounded context boundaries. |
| [RBAC](architecture/rbac-and-security.md) | RBAC and Security | How role-based access control and security are implemented. |
| [Data Persistence](architecture/data-persistence.md) | Data Persistence and Migrations | Guide on SQLite, repositories, and numbered migrations. |
| [Type Safety](architecture/type-safety-and-generation.md) | Type Safety and Generation | How RPMA maintains end-to-end type safety between Rust and TS. |
| [Validation & Errors](architecture/validation-and-error-handling.md) | Validation and Error Handling | Centralized patterns for validation and error reporting. |

## Architecture Decision Records (ADRs)

ADRs document significant architectural decisions, their context, and consequences.

### Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](adr/001-four-layer-architecture.md) | Four-Layer Architecture Pattern | Accepted | 2026-03-13 |
| [002](adr/002-bounded-context-domains.md) | Bounded Context Domains | Accepted | 2026-03-13 |
| [003](adr/003-cross-domain-communication.md) | Cross-Domain Communication Channels | Accepted | 2026-03-13 |
| [004](adr/004-service-builder-pattern.md) | Centralized Service Builder Pattern | Accepted | 2026-03-13 |
| [005](adr/005-repository-pattern.md) | Repository Pattern for Data Access | Accepted | 2026-03-13 |

## When to Read ADRs

- **Adding a new feature**: Start with ADR-001 and ADR-002 to understand layer placement
- **Importing from another domain**: Read ADR-003 for communication patterns
- **Adding a new service**: Read ADR-004 for initialization order
- **Database changes**: Read ADR-005 for repository pattern

## ADR Format

Each ADR follows this structure:

```
title: "<Decision Name>"
summary: "<One-line description>"
context:
  - "<Relevant technical context, constraints, and background>"
decision:
  - "<What was chosen and why>"
consequences:
  positive:
    - "<Positive impacts>"
  negative:
    - "<Negative impacts>"
related_files:
  - "<List of relevant source or doc files>"
read_when:
  - "<When a developer or engineer should read this ADR>"
```

## Contributing

When making significant architectural changes:

1. Discuss the change with the team
2. Create a new ADR following the existing format
3. Number sequentially (next available number)
4. Update this index

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Development guidelines and coding standards
