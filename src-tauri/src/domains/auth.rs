//! Auth domain — authentication, sessions, tokens, 2FA
//!
//! This module re-exports all auth-related components across layers.

// Public facade
pub use crate::services::auth::AuthService;

// Models
pub(crate) use crate::models::auth::{UserAccount, UserRole, UserSession};

// Services
pub(crate) use crate::services::session::SessionService;
pub(crate) use crate::services::token;
pub(crate) use crate::services::two_factor::TwoFactorService;
