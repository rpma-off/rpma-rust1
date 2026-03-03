//! Shared command context propagated from IPC handlers to facades.

use crate::shared::contracts::auth::UserSession;

#[derive(Debug, Clone)]
pub struct CommandContext {
    pub session: UserSession,
    pub correlation_id: String,
}

impl CommandContext {
    pub fn new(session: UserSession, correlation_id: String) -> Self {
        Self {
            session,
            correlation_id,
        }
    }
}
