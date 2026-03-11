# ADR-005: IPC Mapping and Protocol

## Status
Accepted

## Context
Tauri IPC commands serve as the boundary between the frontend and backend. They must remain thin and focused on transport concerns to prevent logic leakage into the command handlers.

## Decision

### Handler Responsibilities
- IPC handlers (located in `src-tauri/src/domains/*/ipc/` and `src-tauri/src/commands/`) are thin adapters.
- Their responsibilities are limited to:
  1. Initializing the `RequestContext` (including authentication and correlation ID).
  2. Delegating execution to the appropriate **Application Service**.
  3. Mapping backend results or errors into the standard `ApiResponse` envelope.
- Handlers must never contain business logic, raw SQL, or direct repository access.

### Command Classification and Invariants
- **Public Commands**: Explicitly listed in the frontend `PUBLIC_COMMANDS` set (e.g., `auth_login`, `bootstrap_first_admin`). These do not require a session token.
- **Protected Commands**: All other commands are treated as protected and require session validation via `resolve_context!` or `AuthGuard`.
- **Not Implemented**: Commands registered in the backend but not yet functional (e.g., 2FA operations) are short-circuited at the frontend via the `NOT_IMPLEMENTED_COMMANDS` list.

### Optimization and Protocol
- Large payloads use the `CompressedApiResponse` variant for efficient transport.
- The `ipc_optimization` module (`src-tauri/src/commands/ipc_optimization.rs`) provides streaming and chunking capabilities for bulk operations.
- Every command execution is wrapped with the `#[instrument]` attribute for automatic tracing.

## Consequences
- The transport layer can be modified or replaced without impacting domain logic.
- Security and observability are applied consistently across all entry points.
- Frontend developers have a predictable, type-safe API surface.
