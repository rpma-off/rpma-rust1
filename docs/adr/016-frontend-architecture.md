# ADR-016: Frontend Architecture and Domain Organization

## Status
Accepted

## Context
The frontend must mirror the backend's bounded-context architecture to maintain organizational alignment and prevent "spaghetti" dependencies between unrelated features.

## Decision

### Domain-Driven Structure
- Feature-specific code is organized by domain under `frontend/src/domains/<domain>/`.
- Each domain directory follows a standardized layout:
  - `api/`: React Query hooks (the public interface for server data).
  - `components/`: Domain-specific UI components.
  - `hooks/`: Domain-specific custom hooks and Zustand stores.
  - `ipc/`: IPC wrapper functions for Tauri calls.
  - `services/`: Frontend business logic and data transformations.

### IPC Communication Layer
A two-layer IPC architecture is used to abstract Tauri details:
1. **Core Layer (`frontend/src/lib/ipc/`)**: `safeInvoke` provides the foundation, handling session injection, correlation ID propagation, and global timeouts (120s default).
2. **Domain Layer (`frontend/src/domains/<domain>/ipc/`)**: Type-safe wrappers for specific commands. Components and hooks must use these wrappers instead of calling `invoke()` or `safeInvoke` directly.

### Type Safety
- Frontend types for backend payloads are auto-generated from Rust via `ts-rs`.
- Manual redefinition of these types is prohibited.
- Generated types live in `frontend/src/types/` and are updated via `npm run types:sync`.

### Component Composition
- Shared UI primitives (shadcn/ui base) live in `frontend/src/components/ui/`.
- Cross-domain component usage is permitted only for shared primitives; one domain must not import internal components from another domain.

## Consequences
- The frontend remains modular and aligned with backend bounded contexts.
- Type safety is guaranteed across the IPC boundary.
- IPC calling patterns are consistent and easy to audit.
