//! Settings command modules
//!
//! This module contains all settings-related command operations,
//! split into specialized modules for better maintainability.

pub mod core;
pub mod profile;
pub mod preferences;
pub mod security;
pub mod accessibility;
pub mod notifications;
pub mod audit;

// Re-export all commands for backward compatibility
pub use profile::*;
pub use preferences::*;
pub use security::*;
pub use accessibility::*;
pub use notifications::*;
pub use audit::*;