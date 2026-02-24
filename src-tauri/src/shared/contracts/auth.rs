//! Shared authentication contracts used across bounded contexts.
//!
//! These types originate in the `auth` domain but are re-exported here
//! so that other domains can reference them without creating a
//! cross-domain dependency on `auth::domain`.

pub use crate::domains::auth::domain::models::auth::{
    SessionTimeoutConfig, UserAccount, UserRole, UserSession,
};
