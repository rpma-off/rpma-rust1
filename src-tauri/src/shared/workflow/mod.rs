//! Workflow utilities — re-exported from the interventions bounded context.
//!
//! The canonical implementations now live in
//! `crate::domains::interventions::infrastructure::workflow_strategy` and
//! `crate::domains::interventions::infrastructure::workflow_validation`.
//! This module re-exports them for backward compatibility.

pub mod workflow_strategy;
pub mod workflow_validation;
