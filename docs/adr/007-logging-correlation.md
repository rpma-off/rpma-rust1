# ADR-007: Logging Correlation

## Status
Accepted

## Context
Distributed tracing across IPC → application → infrastructure layers requires a consistent correlation ID.

## Decision
- Each IPC command accepts an optional `correlation_id` parameter.
- `init_correlation_context` generates or reuses a correlation ID at the command boundary.
- The correlation ID is propagated through `tracing::Span` instrumentation.
- `ApiResponse::with_correlation_id` attaches the ID to responses for frontend debugging.
- `update_correlation_context_user` enriches the context with the authenticated user ID.

## Consequences
- Every request can be traced end-to-end through logs.
- The frontend can match responses to requests via correlation IDs.
- Structured logging with `tracing` provides filtering and search capabilities.
