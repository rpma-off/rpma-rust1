//! Task command modules
//!
//! This module contains all task-related command operations,
//! split into specialized modules for better maintainability.

// Refactored task command modules
pub mod client_integration;
pub mod facade;
pub mod history;
pub mod queries;
pub mod statistics;
pub mod validation;

// Re-export the main facade for backward compatibility
#[allow(unused_imports)]
pub use facade::*;
#[allow(unused_imports)]
pub use history::*;
#[allow(unused_imports)]
pub use validation::*;
