//! Shared authentication guard for IPC command adapters.

use crate::shared::app_state::AppState;
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::{AppResult, CommandContext};

pub struct AuthGuard;

impl AuthGuard {
    pub async fn require_authenticated(
        session_token: &str,
        state: &AppState<'_>,
        correlation_id: &Option<String>,
    ) -> AppResult<CommandContext> {
        AuthMiddleware::authenticate_command(session_token, state, None, correlation_id).await
    }

    pub async fn require_role(
        session_token: &str,
        state: &AppState<'_>,
        required_role: UserRole,
        correlation_id: &Option<String>,
    ) -> AppResult<CommandContext> {
        AuthMiddleware::authenticate_command(
            session_token,
            state,
            Some(required_role),
            correlation_id,
        )
        .await
    }
}
