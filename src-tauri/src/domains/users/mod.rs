//! Users domain — user management, profiles, roles.

// Public facade
pub use crate::services::user::UserService;

// Models
pub(crate) use crate::models::auth::{UserAccount, UserRole, UserSession};

// Repositories
pub(crate) use crate::repositories::user_repository::UserRepository;
