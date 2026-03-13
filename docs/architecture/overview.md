---
title: "Architecture Overview"
summary: "High-level summary of the RPMA desktop application architecture, linking ADRs to implementation."
read_when:
  - "Onboarding to the project"
  - "Designing new features"
  - "Understanding system boundaries"
---

# RPMA Architecture Overview

RPMA is a desktop application built with **Tauri**, using a **Rust backend** and a **Next.js frontend**. The system is designed around **Domain-Driven Design (DDD)** and a **Four-Layer Architecture** pattern.

## Core Principles

1.  **Domain Isolation**: Each business capability (Tasks, Clients, Inventory) lives in its own bounded context.
2.  **Layered Separation**: Strict separation between IPC, Application, Domain, and Infrastructure layers.
3.  **Type Safety**: Shared types between Rust and TypeScript via `ts-rs` (ADR-015).
4.  **Security First**: RBAC enforcement at the IPC boundary and within the Application layer (ADR-007).

## Technology Stack

- **Backend**: Rust, Tauri, SQLite (WAL mode - ADR-009).
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query (ADR-014).
- **Communication**: Tauri IPC with typed wrappers (ADR-013).

## System Map

### Backend (`src-tauri/src/`)
- `domains/`: Bounded contexts following the 4-layer rule (ADR-001).
- `shared/`: Cross-cutting concerns like `contracts`, `services`, `db`, and `context`.
- `main.rs`: Entry point and command registration (ADR-018).

### Frontend (`frontend/src/`)
- `domains/`: Mirror of backend domains containing `api`, `components`, `hooks`, `ipc`, and `services`.
- `lib/`: Shared utilities and core IPC client.
- `types/`: Auto-generated types from Rust (DO NOT EDIT).

## Key Architectural Decisions

- **ADR-001 (Four-Layer Architecture)**: Implemented in all backend domains.
  - *Reference*: `src-tauri/src/domains/tasks/`
- **ADR-003 (Cross-Domain Communication)**: Uses shared contracts, cross-domain services, and an event bus.
  - *Reference*: `src-tauri/src/shared/services/event_bus.rs`
- **ADR-006 (Request Context Pattern)**: Every IPC command starts with `resolve_context!`.
  - *Reference*: `src-tauri/src/domains/tasks/ipc/task/facade.rs`
- **ADR-013 (IPC Wrapper Pattern)**: Typed wrappers in frontend to avoid raw `invoke`.
  - *Reference*: `frontend/src/domains/tasks/ipc/task.ipc.ts`

## Communication Flow

1.  User interacts with a Component.
2.  Component calls a Domain Hook (TanStack Query).
3.  Hook calls Domain IPC wrapper.
4.  IPC wrapper calls `safeInvoke` to Tauri.
5.  Rust `#[tauri::command]` receives the request.
6.  Command calls `resolve_context!` and delegates to Application Facade.
7.  Facade enforces RBAC and calls Domain/Infrastructure.
8.  Result flows back through the same layers.
