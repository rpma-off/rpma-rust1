# RPMA Documentation

Auto-generated index of architecture documentation. Run `node scripts/generate-docs-index.js` to update.

## Quick Links

| Document | Summary |
|----------|---------|


## Agent Knowledge Base

Fundamental guides for developers and AI agents.

| Guide | Summary |
|-------|---------|
| [Project Overview](./agent-pack/00_PROJECT_OVERVIEW.md) | High-level introduction to RPMA v2, its mission, tech stack, and core domains. |
| [Domain Model](./agent-pack/01_DOMAIN_MODEL.md) | Detailed overview of core entities, their relations, and domain rules. |
| [Architecture and Dataflows](./agent-pack/02_ARCHITECTURE_AND_DATAFLOWS.md) | Detailed explanation of the four-layer architecture and how data moves through the system. |
| [Frontend Guide](./agent-pack/03_FRONTEND_GUIDE.md) | Architecture, patterns, and standards for the Next.js frontend. |
| [Backend Guide](./agent-pack/04_BACKEND_GUIDE.md) | Rust development standards, domain patterns, and system architecture. |
| [IPC API and Contracts](./agent-pack/05_IPC_API_AND_CONTRACTS.md) | The contract between Frontend and Backend, type generation, and communication standards. |
| [Security and RBAC](./agent-pack/06_SECURITY_AND_RBAC.md) | Authentication flow, role-based access control, and data protection rules. |
| [Database and Migrations](./agent-pack/07_DATABASE_AND_MIGRATIONS.md) | SQLite configuration, migration system, and data access patterns. |
| [Development Workflows and Tooling](./agent-pack/08_DEV_WORKFLOWS_AND_TOOLING.md) | Essential commands, scripts, and verification steps for developers. |
| [User Flows and UX](./agent-pack/09_USER_FLOWS_AND_UX.md) | Standard user journeys, design system rules, and interaction patterns. |
| [Testing Guide](./agent-pack/10_TESTING_GUIDE.md) | Mandatory testing standards, strategies, and commands for all layers. |

## Architecture Decision Records

See [ADR Index](./adr/README.md) for full details.

### Core Architecture

| ADR | Title | Status |
|-----|-------|--------|
| [001](./adr/001-four-layer-architecture.md) | ADR-001: Four-Layer Architecture Pattern | ✅ |
| [002](./adr/002-bounded-context-domains.md) | ADR-002: Bounded Context Domains | ✅ |
| [003](./adr/003-cross-domain-communication.md) | ADR-003: Cross-Domain Communication Channels | ✅ |
| [004](./adr/004-service-builder-pattern.md) | ADR-004: Centralized Service Builder Pattern | ✅ |
| [005](./adr/005-repository-pattern.md) | ADR-005: Repository Pattern for Data Access | ✅ |
| [006](./adr/006-request-context-pattern.md) | ADR-006: RequestContext Pattern for Authentication Flow | ✅ |
| [007](./adr/007-rbac-hierarchy.md) | ADR-007: Role-Based Access Control Hierarchy | ✅ |
| [009](./adr/009-sqlite-wal-mode.md) | ADR-009: SQLite with WAL Mode for Persistence | ✅ |
| [011](./adr/011-soft-delete-pattern.md) | ADR-011: Soft Delete Pattern | ✅ |
| [012](./adr/012-timestamp-milliseconds.md) | ADR-012: Timestamp as Milliseconds | ✅ |
| [015](./adr/015-type-generation-ts-rs.md) | ADR-015: Type Generation via ts-rs | ✅ |

### Data & Infrastructure

| ADR | Title | Status |
|-----|-------|--------|
| [010](./adr/010-numbered-sql-migrations.md) | ADR-010: Numbered SQL Migrations with Rust Data Migrations | ✅ |
| [013](./adr/013-ipc-wrapper-pattern.md) | ADR-013: IPC Wrapper Pattern for Frontend | ✅ |
| [018](./adr/018-tauri-command-handlers.md) | ADR-018: Tauri Command Handlers (Thin IPC Layer) | ✅ |

### Frontend & State

| ADR | Title | Status |
|-----|-------|--------|
| [014](./adr/014-tanstack-query-server-state.md) | ADR-014: TanStack Query for Server State | ✅ |

### Cross-Cutting Concerns

| ADR | Title | Status |
|-----|-------|--------|
| [008](./adr/008-centralized-validation.md) | ADR-008: Centralized Validation Service | ✅ |
| [016](./adr/016-in-memory-event-bus.md) | ADR-016: In-Memory Event Bus for Decoupled Coordination | ✅ |
| [017](./adr/017-domain-event-types.md) | ADR-017: Domain Event Types and Factory Pattern | ✅ |
| [019](./adr/019-error-handling-boundary.md) | ADR-019: Error Handling at Boundary with thiserror and anyhow | ✅ |
| [020](./adr/020-correlation-ids-tracing.md) | ADR-020: Correlation IDs for Distributed Tracing | ✅ |

## When to Read What

- **Onboarding to the project**: Project Overview
- **Understanding the high-level architecture**: Project Overview
- **Identifying core business domains**: Project Overview
- **Designing new features**: Domain Model, ADR-001: Four-Layer Architecture Pattern, ADR-002: Bounded Context Domains, ADR-003: Cross-Domain Communication Channels, ADR-004: Centralized Service Builder Pattern, ADR-005: Repository Pattern for Data Access, ADR-006: RequestContext Pattern for Authentication Flow, ADR-007: Role-Based Access Control Hierarchy, ADR-008: Centralized Validation Service, ADR-009: SQLite with WAL Mode for Persistence, ADR-010: Numbered SQL Migrations with Rust Data Migrations, ADR-011: Soft Delete Pattern, ADR-012: Timestamp as Milliseconds, ADR-013: IPC Wrapper Pattern for Frontend, ADR-014: TanStack Query for Server State, ADR-015: Type Generation via ts-rs, ADR-016: In-Memory Event Bus for Decoupled Coordination, ADR-017: Domain Event Types and Factory Pattern, ADR-018: Tauri Command Handlers (Thin IPC Layer), ADR-019: Error Handling at Boundary with thiserror and anyhow, ADR-020: Correlation IDs for Distributed Tracing
- **Understanding entity relationships**: Domain Model
- **Modifying database schema**: Domain Model
- **Implementing new IPC commands**: Architecture and Dataflows
- **Tracing data from frontend to backend**: Architecture and Dataflows
- **Understanding layer boundaries**: Architecture and Dataflows
- **Adding new frontend features**: Frontend Guide
- **Modifying UI components**: Frontend Guide
- **Working with TanStack Query or Zustand**: Frontend Guide
- **Implementing new backend features**: Backend Guide
- **Writing Rust services or repositories**: Backend Guide
- **Adding new IPC commands**: Backend Guide
- **Defining new IPC commands**: IPC API and Contracts
- **Debugging communication issues**: IPC API and Contracts
- **Syncing types between Rust and TS**: IPC API and Contracts
- **Implementing role-gated features**: Security and RBAC
- **Reviewing security controls**: Security and RBAC
- **Adding new user roles**: Security and RBAC
- **Adding new database tables or columns**: Database and Migrations
- **Troubleshooting database performance**: Database and Migrations
- **Writing SQL migrations**: Database and Migrations
- **Setting up the development environment**: Development Workflows and Tooling
- **Preparing a pull request**: Development Workflows and Tooling
- **Automating repetitive tasks**: Development Workflows and Tooling
- **Designing new UI screens**: User Flows and UX
- **Implementing complex workflows**: User Flows and UX
- **Reviewing UX consistency**: User Flows and UX
- **Writing new code**: Testing Guide
- **Fixing bugs**: Testing Guide
- **Adding new features**: Testing Guide
- **Reviewing architectural decisions**: ADR-001: Four-Layer Architecture Pattern, ADR-002: Bounded Context Domains, ADR-003: Cross-Domain Communication Channels, ADR-004: Centralized Service Builder Pattern, ADR-005: Repository Pattern for Data Access, ADR-006: RequestContext Pattern for Authentication Flow, ADR-007: Role-Based Access Control Hierarchy, ADR-008: Centralized Validation Service, ADR-009: SQLite with WAL Mode for Persistence, ADR-010: Numbered SQL Migrations with Rust Data Migrations, ADR-011: Soft Delete Pattern, ADR-012: Timestamp as Milliseconds, ADR-013: IPC Wrapper Pattern for Frontend, ADR-014: TanStack Query for Server State, ADR-015: Type Generation via ts-rs, ADR-016: In-Memory Event Bus for Decoupled Coordination, ADR-017: Domain Event Types and Factory Pattern, ADR-018: Tauri Command Handlers (Thin IPC Layer), ADR-019: Error Handling at Boundary with thiserror and anyhow, ADR-020: Correlation IDs for Distributed Tracing

## Related Files

- [AGENTS.md](../AGENTS.md) - Engineering rules and conventions
- [README.md](../README.md) - Project overview

---

*Generated: 2026-03-15*
