---
title: "Validation and Error Handling"
summary: "Centralized patterns for input validation and consistent error reporting."
read_when:
  - "Validating user input"
  - "Designing error responses"
  - "Handling exceptions in Rust"
---

# Validation and Error Handling

RPMA uses centralized validation and consistent error boundaries to ensure data integrity and a smooth user experience.

## Centralized Validation (ADR-008)

All input validation is performed at the boundary (IPC or Service entry) before any business logic is executed.

- **Backend Location**: `src-tauri/src/shared/services/validation/`
- **Frontend Location**: `frontend/src/lib/validation/`

### Backend Strategy
The `ValidationService` in Rust uses the `validator` crate to perform structure-based validation.
- **Rule**: Never perform ad-hoc, inline validation in domain logic. Use a dedicated validator instead.

**Example Rust Validation**:
```rust
#[derive(Validate, Deserialize)]
pub struct CreateTaskRequest {
    #[validate(length(min = 1, max = 100))]
    pub title: String,
    // ...
}
```

## Error Handling Boundary (ADR-019)

We distinguish between **Domain Errors** (internal, granular) and **Application Errors** (sanitized, external).

### 1. Domain Errors
- Use `thiserror` to define domain-specific error types.
- These are internal to the Rust backend and should not be directly exposed to the frontend.

### 2. Application Errors (`AppError`)
- All IPC commands return a `Result<T, AppError>`.
- `AppError` is a wrapper that categorizes errors (Validation, Authorization, NotFound, Database, Internal).
- It sanitizes error messages to avoid leaking sensitive details (e.g., raw SQL errors) to the frontend.

**Example Rust Error Mapping**:
```rust
let result = domain_service.execute().map_err(|e| {
    match e {
        DomainError::NotFound => AppError::NotFound("Item not found".into()),
        _ => AppError::Internal("A system error occurred".into()),
    }
})?;
```

### 3. Frontend Error Handling
- The frontend receives an `ApiResponse` with an `error` field if something goes wrong.
- Use `extractAndValidate` to handle these errors consistently across all IPC calls.

## Tracing and Correlation (ADR-020)

Every request is assigned a `correlation_id` to trace errors across the frontend-backend boundary.

- **Frontend**: Generates a UUID for each operation and includes it in the IPC request.
- **Backend**: Captures the `correlation_id` in the `RequestContext` and includes it in all logs and the `ApiResponse`.

## Key Commands
- `npm run frontend:lint`: Checks for TypeScript and lint errors in the frontend.
- `npm run backend:check`: Runs Rust's compiler checks and lints.
- `cargo test`: Runs the backend test suite, which includes validation tests.
