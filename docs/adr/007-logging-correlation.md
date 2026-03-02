# ADR-007: Logging Correlation

## Status
Accepted

## Context
Distributed tracing across IPC -> application -> infrastructure layers requires a consistent correlation ID.

## Decision
- Each IPC command accepts an optional `correlation_id` parameter.
- `init_correlation_context` generates or reuses a correlation ID at the command boundary (`src-tauri/src/shared/ipc/correlation.rs`). Generated IDs carry an `ipc-` prefix to distinguish them from caller-supplied IDs.
- The `set_correlation_context!` macro (declared in `src-tauri/src/shared/auth_middleware.rs`) is an alternative entry point for commands that need to initialize the correlation context inline before calling `authenticate!`.
- The correlation ID is propagated through `tracing::Span` instrumentation and stored in thread-local storage via `CorrelationContext`.
- `ApiResponse::with_correlation_id` attaches the ID to responses for frontend debugging.
- `update_correlation_context_user` enriches the context with the authenticated user ID after the `authenticate!` call.
- The frontend `safeInvoke` wrapper independently generates or reuses a correlation ID and injects it into every IPC call's argument payload (`correlation_id` field). If the backend echoes a `correlation_id` in the response envelope, `safeInvoke` adopts the backend value as the effective ID for its own log entries.

## Consequences
- Every request can be traced end-to-end through logs.
- The frontend can match responses to requests via correlation IDs.
- Structured logging with `tracing` provides filtering and search capabilities.
- Correlation context is thread-local; callers must ensure context is initialized before any log statement that expects a correlation ID.
