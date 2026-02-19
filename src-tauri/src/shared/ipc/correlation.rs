//! Helper utilities for correlation context management in IPC commands
//!
//! This module provides utilities to ensure consistent correlation_id propagation
//! across all IPC commands, services, and repositories.

use crate::logging::correlation::{self, CorrelationContext};
use crate::shared::ipc::errors::AppError;
use crate::shared::ipc::response::ApiResponse;

/// Initialize correlation context at the start of an IPC command
///
/// This function should be called at the beginning of every IPC command to ensure
/// that correlation_id is available in thread-local storage for logging throughout
/// the call stack.
///
/// # Arguments
/// * `correlation_id` - Optional correlation_id from the request
/// * `user_id` - Optional user_id from the authenticated session
///
/// # Returns
/// The correlation_id that was set (either from input or newly generated)
///
/// # Example
/// ```rust
/// #[tauri::command]
/// pub async fn my_command(
///     request: MyRequest,
///     state: AppState<'_>,
/// ) -> Result<ApiResponse<MyResponse>, AppError> {
///     // Set correlation context at the start
///     let correlation_id = init_correlation_context(&request.correlation_id, None);
///     
///     // ... authenticate user ...
///     let user = authenticate!(&request.session_token, &state);
///     
///     // Update context with user_id after authentication
///     update_correlation_context_user(&user.user_id);
///     
///     // ... rest of command logic ...
/// }
/// ```
pub fn init_correlation_context(correlation_id: &Option<String>, user_id: Option<&str>) -> String {
    let corr_id = correlation_id
        .as_ref()
        .map(|s| s.to_string())
        .unwrap_or_else(|| correlation::generate_correlation_id());

    let context = CorrelationContext::new(corr_id.clone(), user_id.map(|s| s.to_string()));

    correlation::set_correlation_context(context);
    corr_id
}

/// Update the correlation context with user_id after authentication
///
/// This should be called after authentication to add user_id to the correlation context.
///
/// # Arguments
/// * `user_id` - The authenticated user's ID
///
/// # Example
/// ```rust
/// let user = authenticate!(&session_token, &state);
/// update_correlation_context_user(&user.user_id);
/// ```
pub fn update_correlation_context_user(user_id: &str) {
    if let Some(mut context) = correlation::get_correlation_context() {
        context.user_id = Some(user_id.to_string());
        correlation::set_correlation_context(context);
    }
}

/// Ensure ApiResponse has correlation_id set
///
/// Helper function to ensure all ApiResponse objects include the correlation_id
/// from the current context.
///
/// # Arguments
/// * `response` - The ApiResponse to enhance with correlation_id
///
/// # Returns
/// The same response with correlation_id set from context if not already set
pub fn ensure_correlation_id<T>(response: ApiResponse<T>) -> ApiResponse<T> {
    let corr_id =
        correlation::get_correlation_context().map(|ctx| ctx.get_correlation_id().to_string());

    if corr_id.is_some() {
        return response.with_correlation_id(corr_id);
    }

    if response.correlation_id.is_some() {
        return response;
    }

    response.with_correlation_id(corr_id)
}

/// Wrap an error with correlation_id
///
/// Ensures that errors returned from commands include correlation_id for tracing.
///
/// # Arguments
/// * `error` - The AppError to enhance
///
/// # Returns
/// ApiResponse with error and correlation_id
pub fn error_with_correlation<T>(error: AppError) -> Result<ApiResponse<T>, AppError> {
    let corr_id =
        correlation::get_correlation_context().map(|ctx| ctx.get_correlation_id().to_string());

    Ok(ApiResponse::error(error).with_correlation_id(corr_id))
}

/// Execute a command with automatic correlation context setup
///
/// This is a convenience function that sets up correlation context,
/// executes the command function, and ensures the response includes correlation_id.
///
/// # Arguments
/// * `correlation_id` - Optional correlation_id from request
/// * `user_id` - Optional user_id (if already authenticated)
/// * `command_fn` - The command function to execute
///
/// # Returns
/// Result with ApiResponse that includes correlation_id
///
/// # Example
/// ```rust
/// #[tauri::command]
/// pub async fn my_command(
///     request: MyRequest,
///     state: AppState<'_>,
/// ) -> Result<ApiResponse<MyResponse>, AppError> {
///     with_correlation_context(&request.correlation_id, None, || async {
///         // Command logic here
///         let result = do_something().await?;
///         Ok(ApiResponse::success(result))
///     }).await
/// }
/// ```
pub async fn with_correlation_context<F, T, Fut>(
    correlation_id: &Option<String>,
    user_id: Option<&str>,
    command_fn: F,
) -> Result<ApiResponse<T>, AppError>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<ApiResponse<T>, AppError>>,
{
    let _corr_id = init_correlation_context(correlation_id, user_id);

    let result = command_fn().await;

    match result {
        Ok(response) => Ok(ensure_correlation_id(response)),
        Err(error) => error_with_correlation(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_correlation_context_with_id() {
        let test_id = "test-correlation-id";
        let result = init_correlation_context(&Some(test_id.to_string()), None);
        assert_eq!(result, test_id);

        let context = correlation::get_correlation_context().unwrap();
        assert_eq!(context.get_correlation_id(), test_id);
        assert_eq!(context.get_user_id(), None);

        correlation::clear_correlation_context();
    }

    #[test]
    fn test_init_correlation_context_generates_id() {
        let result = init_correlation_context(&None, None);
        assert!(result.starts_with("ipc-"));

        let context = correlation::get_correlation_context().unwrap();
        assert_eq!(context.get_correlation_id(), result);

        correlation::clear_correlation_context();
    }

    #[test]
    fn test_update_correlation_context_user() {
        let test_id = "test-id";
        let user_id = "user-123";

        init_correlation_context(&Some(test_id.to_string()), None);
        update_correlation_context_user(user_id);

        let context = correlation::get_correlation_context().unwrap();
        assert_eq!(context.get_user_id(), Some(user_id));

        correlation::clear_correlation_context();
    }

    #[test]
    fn test_ensure_correlation_id() {
        let test_id = "test-correlation-id";
        init_correlation_context(&Some(test_id.to_string()), None);

        let response: ApiResponse<String> = ApiResponse::success("test".to_string());
        let enhanced = ensure_correlation_id(response);

        assert_eq!(enhanced.correlation_id, Some(test_id.to_string()));

        correlation::clear_correlation_context();
    }
}
