//! Settings command modules
//!
//! This module contains all settings-related command operations,
//! split into specialized modules for better maintainability.

pub mod accessibility;
pub mod audit;
pub mod core;
pub mod notifications;
pub mod preferences;
pub mod profile;
pub mod security;

// Re-export all commands for backward compatibility
#[allow(unused_imports)]
pub use accessibility::*;
#[allow(unused_imports)]
pub use audit::*;
#[allow(unused_imports)]
pub use notifications::*;
#[allow(unused_imports)]
pub use preferences::*;
#[allow(unused_imports)]
pub use profile::*;
#[allow(unused_imports)]
pub use security::*;
