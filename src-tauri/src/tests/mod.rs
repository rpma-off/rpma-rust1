//! Tests module entry point

#[cfg(feature = "legacy-tests")]
pub mod integration;
#[cfg(feature = "legacy-tests")]
pub mod proptests;
#[cfg(feature = "legacy-tests")]
pub mod unit;

#[cfg(feature = "legacy-tests")]
pub mod migrations;

#[cfg(feature = "legacy-tests")]
pub mod performance;
