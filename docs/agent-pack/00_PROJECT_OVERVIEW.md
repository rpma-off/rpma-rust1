---
title: "Project Overview"
summary: "High-level introduction to RPMA v2, its mission, tech stack, and core domains."
read_when:
  - "Onboarding to the project"
  - "Understanding the high-level architecture"
  - "Identifying core business domains"
---

# 00. PROJECT OVERVIEW

RPMA v2 (Resource Planning & Management Application) is a high-performance desktop application built with **Tauri**, **Rust**, and **Next.js**. It is specifically designed for managing field service interventions, particularly in the **PPF (Paint Protection Film)** industry.

## Core Mission

To provide a reliable, offline-first (via local SQLite) platform for technicians to manage tasks, track inventory, and document interventions while giving administrators full visibility into operations.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Rust + Tauri.
- **Database**: SQLite with WAL (Write-Ahead Logging) mode and encryption support.
- **Communication**: Tauri IPC (Inter-Process Communication) with typed contracts via `ts-rs`.
- **State Management**: TanStack Query (Server state), Zustand (UI state).

## Top-Level Modules (Domains)

### Backend Domains (`src-tauri/src/domains/`)
| Domain | Purpose | Layer Compliance |
|--------|---------|------------------|
| **auth** | Authentication, login, session management | Full4-layer |
| **tasks** | Job lifecycle from creation to completion | Full4-layer |
| **clients** | Client profiles and history | Flat (handler-based) |
| **interventions** | Core workflow engine for PPF execution | Full 4-layer |
| **inventory** | Material tracking and stock management | Full 4-layer |
| **quotes** | Estimating and converting to tasks | Full 4-layer |
| **users** | User management and profiles | Full 4-layer |
| **calendar** | Scheduling and resource visualization | Flat (handler-based) |
| **documents** | Photo storage and report generation | Flat |
| **notifications** | System and user alerts | Flat (handler-based) |
| **settings** | Application and user settings | Flat |
| **trash** | Soft-deleted entity recovery | Full 4-layer |

### Frontend Domains (`frontend/src/domains/`)
16 domains mirror backend with additions: **admin**, **bootstrap**, **dashboard**, **performance**, **reports**.

## Golden Paths (Start Here)

1. [Domain Model](./01_DOMAIN_MODEL.md) — Understand the entities and their relationships.
2. [Architecture](./02_ARCHITECTURE_AND_DATAFLOWS.md) — How data moves from React to Rust to SQLite.
3. [IPC API](./05_IPC_API_AND_CONTRACTS.md) — The contract between the two worlds.
4. [Testing Guide](./10_TESTING_GUIDE.md) — Mandatory testing requirements.

## Repository Layout

```
frontend/                  # Next.js App Router application
  src/
    app/                   # Routes and layouts
    domains/               # Feature modules (mirrored from backend)
      [domain]/
        api/               # TanStack Query hooks
        components/        # Domain-specific UI
        hooks/             # React hooks
        ipc/               # typed invoke wrappers
        services/          # Frontend business logic
        stores/            # Zustand stores (where needed)
        __tests__/         # Domain tests
    lib/                   # IPC client, utilities
    types/                 # AUTO-GENERATED — DO NOT EDIT

src-tauri/
  src/
    domains/               # Backend bounded contexts
      [domain]/
        ipc/               # Tauri command handlers (thin)
        application/       # Use cases, orchestration
        domain/            # Pure business rules, entities
        infrastructure/    # Repositories, SQL
        tests/             # Unit, integration, validation
    shared/                 # Cross-domain services
      services/            # EventBus, validation, cross-domain
      contracts/           # Shared type definitions
      ipc/                 # ApiResponse, error handling
    main.rs                # Tauri builder, command registration
  migrations/              # Numbered SQL migrations
  Cargo.toml

docs/
  adr/                     # Architectural Decision Records
  agent-pack/              # This onboarding documentation

scripts/                   # Type sync, validation, scaffolding
Makefile                   # Centralized task runner
```

## Key ADRs

- **ADR-001**: Four-Layer Architecture Pattern
- **ADR-002**: Bounded Context Domains
- **ADR-004**: Centralized Service Builder Pattern
- **ADR-006**: RequestContext Pattern for Authentication
- **ADR-015**: Type Generation via ts-rs