//! Task command modules
//!
//! This module contains all task-related command operations,
//! split into specialized modules for better maintainability.



// Refactored task command modules
pub mod validation;
pub mod queries;
pub mod statistics;
pub mod client_integration;
pub mod facade;

// Re-export the main facade for backward compatibility
pub use facade::*;