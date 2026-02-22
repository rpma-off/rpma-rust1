//! Workflow validation service — re-exported from shared module.
//!
//! The actual implementation lives in `crate::shared::workflow::workflow_validation`
//! to avoid cross-domain imports between interventions and tasks.
pub use crate::shared::workflow::workflow_validation::*;
