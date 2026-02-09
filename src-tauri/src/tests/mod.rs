//! Tests module entry point

pub mod integration;
pub mod proptests;
pub mod unit;

#[cfg(test)]
pub mod migrations;

#[cfg(test)]
pub mod performance;