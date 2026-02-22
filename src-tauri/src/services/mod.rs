//! Services module - Business logic layer
//!
//! Service implementations now live under their respective bounded contexts
//! in `crate::domains::<domain>::infrastructure`. This module is kept as a
//! compatibility shim that re-exports types needed by the `export-types` binary.

/// Re-exports from `domains::interventions::infrastructure` for type generation.
pub mod intervention {
    pub use crate::domains::interventions::infrastructure::intervention_types::{
        AdvanceStepRequest, FinalizeInterventionRequest, GpsCoordinates, SaveStepProgressRequest,
        StartInterventionRequest,
    };
}

/// Re-exports from `domains::interventions::infrastructure` for type generation.
pub mod intervention_types {
    pub use crate::domains::interventions::infrastructure::intervention_types::{
        AdvanceStepResponse, FinalizeInterventionResponse, InterventionMetrics,
        InterventionStepWithPhotos, InterventionWithDetails, SaveStepProgressResponse,
        StartInterventionResponse, StepRequirement,
    };
}

/// Re-exports from `shared::contracts` for type generation.
pub mod prediction {
    pub use crate::shared::contracts::prediction::CompletionTimePrediction;
}
