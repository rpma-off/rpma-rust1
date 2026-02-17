//! Users domain — user accounts, roles, and profile management
//!
//! This module re-exports all user-related components across layers.

// Models
pub use crate::models::user::{User, UserRole};

// Services
pub use crate::services::user::UserService;

// Repositories
pub use crate::repositories::user_repository::UserRepository;
