# ADR-007: Logging and Distributed Tracing

## Status
Accepted

## Context
Diagnosing issues in a multi-layered Tauri application requires the ability to trace a single user action from the frontend through the IPC boundary and down to the database layer.

## Decision

### Correlation ID Lifecycle
- Every request is assigned a unique `correlation_id`.
- The frontend `safeInvoke` wrapper generates or reuses this ID and injects it into every IPC payload.
- The backend initializes the `CorrelationContext` at the IPC boundary (`src-tauri/src/shared/ipc/correlation.rs`).
- Backend-generated IDs carry an `ipc-` prefix to distinguish them from client-supplied IDs.

### Propagation and Context
- The correlation ID is stored in thread-local storage and automatically propagated through `tracing::Span` instrumentation.
- All logs emitted during the request lifecycle (including SQL queries and event bus handlers) are enriched with the ID.
- The `update_correlation_context_user` helper attaches the authenticated user ID to the context after successful login validation.

### Observability API
- The `ApiResponse` envelope echoes the `correlation_id` back to the frontend.
- Backend performance metrics and slow query logs include the correlation ID for precise debugging.

## Consequences
- End-to-end tracing is possible across all layers of the stack.
- Production logs can be filtered by user session or specific request ID.
- Frontend errors can be mapped to exact backend log entries using the ID returned in the error envelope.
