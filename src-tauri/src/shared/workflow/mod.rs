//! Shared workflow utilities used across domain boundaries.
//!
//! This module provides workflow strategy and validation types that are shared
//! between the `interventions` and `tasks` domains, avoiding cross-domain imports.

pub mod workflow_strategy;
pub mod workflow_validation;
