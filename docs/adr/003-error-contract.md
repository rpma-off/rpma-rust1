# ADR-003: Error Contract

## Status
Accepted

## Context
Errors must be consistently structured across the IPC boundary and must never leak internal details (SQL errors, stack traces) to the frontend.

## Decision
- Each domain defines its own error enum (e.g., `InventoryError`, `InventoryDomainError`).
- IPC handlers map domain errors to `AppError` variants: `Validation`, `Authorization`, `NotFound`, `Database`, `Internal`.
- The `AppError::internal_sanitized` helper strips implementation details before returning errors to the frontend.
- All IPC responses follow the envelope pattern: `{ success: bool, data?: T, error?: string }`.

## Consequences
- Frontend receives predictable, safe error messages.
- Internal error details are logged server-side with correlation IDs for debugging.
- Each domain can evolve its error types independently.
