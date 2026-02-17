//! Users domain — user management, profiles, roles.

// Public facade
pub use crate::services::user::UserService;

// Models
pub(crate) use crate::models::auth::{UserAccount, UserRole, UserSession};

// Note: UserRepository lives in the legacy repositories layer.
// Access it through UserService to maintain boundary rules.
