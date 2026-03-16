//! Common types and enums - Re-exports for backward compatibility
//!
//! This module re-exports types from focused sub-modules.
//! Types have been split by responsibility:
//! - intervention_enums: Weather, lighting, work location, film type
//! - location: GPS coordinates
//! - timestamp: Time-related types and serialization

pub use super::intervention_enums::*;
pub use super::location::*;
pub use super::timestamp::*;
