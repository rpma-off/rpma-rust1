# ADR-005: IPC Mapping

## Status
Accepted

## Context
Tauri IPC commands bridge the frontend and backend. They must be thin adapters that delegate to application services.

## Decision
- IPC handlers live in `domains/*/ipc/handlers.rs` or `commands/*.rs`.
- Each handler: authenticates the user, initializes correlation context, delegates to the application service, and maps errors to `AppError`.
- IPC handlers must not contain business logic, SQL, or direct repository access.
- Command names are stable and backward-compatible with the frontend.

## Consequences
- The IPC layer is a thin, testable adapter.
- Business logic changes do not require IPC layer modifications.
- Error mapping is centralized per domain.
