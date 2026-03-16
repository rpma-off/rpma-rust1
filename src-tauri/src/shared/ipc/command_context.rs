//! Shared command context propagated from IPC handlers to facades.

use crate::shared::contracts::auth::UserSession;

/// Session and correlation data propagated from IPC handlers into domain facades.
#[derive(Debug, Clone)]
pub struct CommandContext {
    pub session: UserSession,
    pub correlation_id: String,
}

impl CommandContext {
    /// Creates a command context from the caller's session and a correlation identifier.
    pub fn new(session: UserSession, correlation_id: String) -> Self {
        Self {
            session,
            correlation_id,
        }
    }
}
