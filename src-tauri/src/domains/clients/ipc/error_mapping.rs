//! IPC-boundary error classification and access-control helpers (ADR-018).
//!
//! These functions live in the IPC layer because they deal with
//! IPC-specific concerns — translating raw service error strings into
//! structured `AppError` variants, and enforcing rate-limiting + RBAC
//! before delegating to the application layer.
//!
//! Previously these lived on `ClientService` which blurred the boundary
//! between application logic and IPC plumbing.

use crate::shared::ipc::errors::AppError;

/// Classify a raw service error string into the appropriate `AppError` variant.
///
/// Called by IPC handlers when mapping `Result<_, String>` from the
/// application layer into a typed IPC error response.
pub fn map_service_error(context: &str, error: &str) -> AppError {
    let normalized = error.to_lowercase();
    if normalized.contains("not found") {
        AppError::NotFound(format!("{}: {}", context, error))
    } else if normalized.contains("permission")
        || normalized.contains("only update")
        || normalized.contains("only delete")
    {
        AppError::Authorization(error.to_string())
    } else if normalized.contains("validation")
        || normalized.contains("invalid")
        || normalized.contains("required")
        || normalized.contains("cannot")
        || normalized.contains("must")
        || normalized.contains("already exists")
        || normalized.contains("too long")
        || normalized.contains("duplicate")
    {
        AppError::Validation(error.to_string())
    } else {
        AppError::db_sanitized(context, error)
    }
}

/// Enforce rate-limiting and RBAC for client operations.
///
/// This is an IPC-boundary concern: it checks whether the calling user
/// is within rate limits and has the correct role before the request
/// reaches the application layer.
pub fn check_client_access(
    rate_limiter: &crate::domains::auth::infrastructure::rate_limiter::RateLimiterService,
    user_id: &str,
    role: &crate::shared::contracts::auth::UserRole,
    permission: &str,
) -> Result<(), AppError> {
    let rate_limit_key = format!("client_ops:{}", user_id);
    if !rate_limiter
        .check_and_record(&rate_limit_key, 100, 60)
        .map_err(|e| AppError::internal_sanitized("rate_limit_check", &e))?
    {
        return Err(AppError::Validation(
            "Rate limit exceeded. Please try again later.".to_string(),
        ));
    }
    if !crate::shared::auth_middleware::AuthMiddleware::can_perform_client_operation(
        role, permission,
    ) {
        return Err(AppError::Authorization(format!(
            "Insufficient permissions to {} clients",
            permission
        )));
    }
    Ok(())
}
