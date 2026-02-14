//! Auth domain — authentication, sessions, tokens, 2FA
//!
//! This module re-exports all auth-related components across layers.

// Models
pub use crate::models::auth::{UserAccount, UserRole, UserSession};

// Services
pub use crate::services::auth::AuthService;
pub use crate::services::session::SessionService;
pub use crate::services::token;
pub use crate::services::two_factor::TwoFactorService;

// Repositories
pub use crate::repositories::session_repository::SessionRepository;
