//! Workflow utilities shared across bounded contexts.
//!
//! The canonical strategy and validation implementations live in
//! `crate::domains::interventions::infrastructure::workflow_strategy` and
//! `crate::domains::interventions::infrastructure::workflow_validation`.
//! Cleanup and progression services live here directly.

pub mod workflow_cleanup;
pub mod workflow_progression;
pub mod workflow_strategy;
pub mod workflow_validation;
