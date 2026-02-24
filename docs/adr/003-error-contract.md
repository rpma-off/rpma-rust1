# ADR-003: Error Contract

## Status
Accepted

## Context
Errors must be consistently structured across the IPC boundary and must never leak internal details (SQL errors, stack traces) to the frontend.

## Decision
- IPC handlers map domain errors to `AppError` variants: `Validation`, `Authorization`, `NotFound`, `Database`, `Internal`.
- The `AppError::internal_sanitized` helper strips implementation details before returning errors to the frontend.
- IPC responses use `ApiResponse<T>` (and `CompressedApiResponse` for large payloads) from `src-tauri/src/shared/ipc/response.rs`.
- Error envelopes include `success`, `message`, `error_code`, and a structured `error` object with `{ message, code, details? }`.

## Consequences
- Frontend receives predictable, safe error messages.
- Internal error details are logged server-side with correlation IDs for debugging.
- Each domain can evolve its error types independently as long as they map to `AppError`.
