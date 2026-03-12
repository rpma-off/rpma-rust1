# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the RPMA-Rust project. Each ADR documents a significant architectural decision, its context, and consequences.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences. ADRs help current and future developers understand why the system is built the way it is.

## ADR Index

### Core Architecture (Priority 1)

| ADR | Title | Domain | Status |
|-----|-------|--------|--------|
| [001](./001-sqlite-offline-first.md) | SQLite as Local-First Data Store with WAL Mode | persistence | ✅ Accepted |
| [002](./002-ddd-four-layer-architecture.md) | Domain-Driven Design with Four-Layer Architecture | architecture | ✅ Accepted |
| [003](./003-typescript-type-generation.md) | TypeScript Type Generation via ts-rs | types | ✅ Accepted |
| [004](./004-session-auth-rbac.md) | Session-Based Authentication with Role-Based Access Control | auth | ✅ Accepted |
| [005](./005-event-bus-pattern.md) | In-Memory Event Bus for Cross-Domain Communication | events | ✅ Accepted |

### Data & Infrastructure (Priority 2)

| ADR | Title | Domain | Status |
|-----|-------|--------|--------|
| [006](./006-repository-pattern.md) | Repository Pattern with Async Traits | data | ✅ Accepted |
| [007](./007-hybrid-migration-system.md) | Hybrid SQL + Rust Migration System | migrations | ✅ Accepted |
| [008](./008-multi-level-cache.md) | Multi-Level Cache Architecture | caching | ✅ Accepted |
| [009](./009-compressed-api-responses.md) | Compressed API Responses for Large Payloads | ipc | ✅ Accepted |

### Frontend Architecture (Priority 3)

| ADR | Title | Domain | Status |
|-----|-------|--------|--------|
| [010](./010-frontend-domain-mirroring.md) | Frontend Domain Mirroring Backend Structure | frontend | ✅ Accepted |
| [011](./011-type-safe-ipc-wrappers.md) | Type-Safe IPC Wrapper Abstraction | ipc | ✅ Accepted |
| [012](./012-tanstack-query-state.md) | TanStack Query for Backend State Management | state | ✅ Accepted |
| [013](./013-zustand-ui-state.md) | Zustand for Local UI State Management | state | ✅ Accepted |

### Cross-Cutting Concerns (Priority 4)

| ADR | Title | Domain | Status |
|-----|-------|--------|--------|
| [014](./014-request-context-propagation.md) | Request Context and Correlation ID Propagation | observability | ✅ Accepted |
| [015](./015-validation-service.md) | Centralized Validation Service with Domain-Specific Validators | validation | ✅ Accepted |
| [016](./016-domain-isolation-contracts.md) | Domain Isolation via Shared Contracts | boundaries | ✅ Accepted |
| [017](./017-streaming-queries.md) | Streaming Queries for Large Result Sets | performance | ✅ Accepted |
| [018](./018-dynamic-pool-sizing.md) | Dynamic Connection Pool Sizing | performance | ✅ Accepted |

## ADR Format

Each ADR follows this structure:

```yaml
---
title: "<Decision Name>"
summary: "<One-line description>"
domain: "<category>"
status: accepted|proposed|deprecated|superseded
created: YYYY-MM-DD
---

## Context
- Technical context, constraints, background

## Decision
- What was chosen and why

## Consequences
- Positive and negative impacts

## Related Files
- List of relevant source or doc files

## Read When
- When a developer should consult this ADR
```

## Creating a New ADR

1. Copy the template below
2. Name file as `NNN-short-title.md` (increment NNN)
3. Fill in all sections
4. Update this README index
5. Submit for review

### Template

```markdown
---
title: "<Decision Name>"
summary: "<One-line description>"
domain: "<category>"
status: proposed
created: YYYY-MM-DD
---

## Context
- What is the issue that we're seeing that is motivating this decision or change?

## Decision
- What is the change that we're proposing and/or doing?

## Consequences
- What becomes easier or more difficult to do because of this change?

## Related Files
- `path/to/file1.rs`
- `path/to/file2.ts`

## Read When
- When should a developer read this ADR?
```

## Status Definitions

| Status | Description |
|--------|-------------|
| **proposed** | Under discussion, not yet approved |
| **accepted** | Approved and in effect |
| **deprecated** | No longer applies to new code |
| **superseded** | Replaced by another ADR |

## Quick Reference by Domain

### Architecture
- [002 - DDD Four-Layer Architecture](./002-ddd-four-layer-architecture.md)

### Auth
- [004 - Session-Based Authentication with RBAC](./004-session-auth-rbac.md)

### Boundaries
- [016 - Domain Isolation via Shared Contracts](./016-domain-isolation-contracts.md)

### Caching
- [008 - Multi-Level Cache Architecture](./008-multi-level-cache.md)

### Data
- [006 - Repository Pattern with Async Traits](./006-repository-pattern.md)

### Events
- [005 - In-Memory Event Bus](./005-event-bus-pattern.md)

### Frontend
- [010 - Frontend Domain Mirroring](./010-frontend-domain-mirroring.md)
- [012 - TanStack Query for State](./012-tanstack-query-state.md)
- [013 - Zustand for UI State](./013-zustand-ui-state.md)

### IPC
- [009 - Compressed API Responses](./009-compressed-api-responses.md)
- [011 - Type-Safe IPC Wrappers](./011-type-safe-ipc-wrappers.md)

### Migrations
- [007 - Hybrid Migration System](./007-hybrid-migration-system.md)

### Observability
- [014 - Request Context Propagation](./014-request-context-propagation.md)

### Performance
- [017 - Streaming Queries](./017-streaming-queries.md)
- [018 - Dynamic Pool Sizing](./018-dynamic-pool-sizing.md)

### Persistence
- [001 - SQLite Offline-First](./001-sqlite-offline-first.md)

### State
- [012 - TanStack Query](./012-tanstack-query-state.md)
- [013 - Zustand](./013-zustand-ui-state.md)

### Types
- [003 - TypeScript Type Generation](./003-typescript-type-generation.md)

### Validation
- [015 - Centralized Validation Service](./015-validation-service.md)

## Related Documentation

- [AGENTS.md](../../AGENTS.md) - Project conventions and engineering rules
- [README.md](../../README.md) - Project overview

---

*Generated: 2026-03-12*
