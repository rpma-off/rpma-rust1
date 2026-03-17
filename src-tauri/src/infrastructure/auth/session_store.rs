use crate::shared::contracts::auth::UserSession;
use crate::shared::ipc::{AppError, AppResult};
use std::sync::RwLock;

#[derive(Debug, Default)]
pub struct SessionStore {
    session: RwLock<Option<UserSession>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set(&self, session: UserSession) {
        *self.session.write().expect("session store lock poisoned") = Some(session);
    }

    pub fn clear(&self) {
        *self.session.write().expect("session store lock poisoned") = None;
    }

    pub fn get(&self) -> AppResult<UserSession> {
        let session = self
            .session
            .read()
            .expect("session store lock poisoned")
            .clone()
            .ok_or_else(|| AppError::Authentication("Not authenticated".to_string()))?;

        if session.is_expired() {
            self.clear();
            return Err(AppError::Authentication("Session expired".to_string()));
        }

        Ok(session)
    }
}
