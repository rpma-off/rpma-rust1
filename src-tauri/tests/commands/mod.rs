// Integration tests for Tauri IPC command handlers
//!
//! These tests verify that frontend-backend communication works correctly,
//! including validation, authentication, and error handling.

pub mod auth_commands_simple_test;
pub mod auth_commands_test;
pub mod client_commands_test;
pub mod user_commands_test;

// Legacy suites depend on pre-migration command/test harness APIs.
// Keep them available behind an explicit feature while domain tests take over.
#[cfg(feature = "legacy-tests")]
pub mod intervention_commands_test;
#[cfg(feature = "legacy-tests")]
pub mod task_commands_test;
#[cfg(feature = "legacy-tests")]
pub mod test_utils;
