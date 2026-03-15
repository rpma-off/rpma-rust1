# Application Architecture

This document describes the architectural patterns and data flows used in the RPMA-Rust project.

## High-Level Structure

RPMA-Rust is a desktop application built with Tauri (Rust) and Next.js (TypeScript). It follows a **Domain-Driven Design (DDD)** philosophy to manage complexity and ensure clear boundaries between different business areas.

```ascii
[Next.js Frontend] <---(Type-safe IPC)---> [Tauri Backend]
      |                                           |
[Domain-based UI]                        [Bounded Contexts]
      |                                           |
[Zustand / Query]                        [ServiceBuilder]
      |                                           |
[IPC Hooks]                              [SQLite Database]
```

## Backend: The Four-Layer Rule

Each domain in `src-tauri/src/domains/` follows a strict four-layer architecture.

| Layer | Responsibility | Constraints |
|---|---|---|
| **IPC** | Tauri command entry points. | Thin wrappers, handles only request/response mapping. |
| **Application** | Use cases, orchestration, and auth enforcement. | Coordinates multiple domain services and enforces RBAC. |
| **Domain** | Pure business rules, entities, and validation. | **Zero dependencies** on other layers. |
| **Infrastructure** | Repositories, SQL implementation, and adapters. | Implements the database-specific logic for data persistence. |

### Domain Organization

Each domain (e.g., `tasks`, `inventory`, `auth`) contains its own set of layers:
- `ipc/`: Tauri commands.
- `application/`: Service logic.
- `domain/`: Business entities and validation rules.
- `infrastructure/`: Repository implementations (SQL).

## Frontend: Domain Mirroring

The frontend architecture in `frontend/src/domains/` reflects the backend structure:
- `api/`: TanStack Query hooks.
- `components/`: Domain-specific UI components.
- `hooks/`: Domain-specific React hooks.
- `ipc/`: Low-level Tauri invoke wrappers.
- `services/`: Frontend business logic (if any).

## Cross-Domain Communication

To prevent tightly coupled code, domains communicate through three strictly defined channels:

1.  **Shared Contracts**: Common types defined in `src-tauri/src/shared/contracts/`.
2.  **Cross-Domain Services**: Services at the composition layer that coordinate multiple domains.
3.  **In-Memory Event Bus**: Decoupled coordination via asynchronous domain events.

## Data Flow: Command Execution

1.  **User Action**: User clicks "Start Intervention" in the UI.
2.  **Frontend IPC**: The UI calls a TanStack Query mutation, which uses the domain's `ipc/` wrapper to invoke a Tauri command.
3.  **Tauri Command**: The `ipc/` layer in Rust receives the command and extracts the `RequestContext` (session, role).
4.  **Application Service**: The command delegates to the `application/` service.
5.  **Authorization**: The service verifies the user has the `Technician` role for this action.
6.  **Domain Logic**: The service calls the `domain/` layer to validate business rules (e.g., "Cannot start if another is active").
7.  **Infrastructure**: If valid, the service calls the `infrastructure/` repository to save the new state in SQLite.
8.  **Success Response**: The result flows back to the frontend, and TanStack Query invalidates related caches.

## Technical Integrity & Testing

- **Type Synchronization**: `ts-rs` ensures that Rust domain models match TypeScript interfaces.
- **Repository Pattern**: All database access is abstracted behind traits to allow for easy testing with in-memory SQLite.
- **Validation**: Enforced at the domain layer to ensure business rules are never bypassed.
- **Error Boundaries**: Structured error handling ensures that technical failures are caught and reported clearly to the user.
