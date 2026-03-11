# ADR-003: Error Contract and Sanitization

## Status
Accepted

## Context
Consistent error handling across the IPC boundary is essential for frontend stability and security. Internal implementation details (SQL errors, stack traces, filesystem paths) must not be exposed to the client.

## Decision

### Error Classification
The `AppError` enum (`src-tauri/src/shared/ipc/errors.rs`) centralizes all system and domain errors:

- **System Variants**: `Authentication`, `Authorization`, `Validation`, `NotFound`, `Database`, `Internal`, `Network`, `Io`, `Configuration`, `RateLimit`, `Sync`, `NotImplemented`.
- **Domain Variants**: Resource-specific errors such as `InterventionStepNotFound`, `TaskInvalidTransition`, `MaterialInsufficientStock`.

### Sanitization Policy
Sensitive error variants are automatically sanitized before transmission to the frontend:
- `Database`, `Internal`, `Io`, `Network`, `Sync`, and `Configuration` errors are stripped of technical details and returned with generic messages.
- Full technical details are preserved in server-side logs, linked to the request via `correlation_id`.

### Response Envelope
All IPC responses conform to the `ApiResponse<T>` or `CompressedApiResponse` structure:
- `success`: boolean status.
- `message`: user-friendly summary.
- `error_code`: stable string identifier for frontend logic.
- `error`: structured object `{ message, code, details? }`.

### Helpers
- Use `validation_error!`, `auth_error!`, `authz_error!`, `not_found_error!`, and `internal_error!` macros for idiomatic error generation.
- `AppError::internal_sanitized` is the mandatory transformation point for internal failures.

## Consequences
- The frontend receives predictable error contracts regardless of the failing layer.
- Security risk is mitigated by preventing information leakage in error payloads.
- Debugging remains efficient through correlation of generic frontend errors with detailed backend logs.
