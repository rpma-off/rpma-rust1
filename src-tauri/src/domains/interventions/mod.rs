mod facade;
pub(crate) use facade::InterventionsFacade;
pub(crate) mod application;
#[cfg(feature = "export-types")]
pub mod domain;
#[cfg(not(feature = "export-types"))]
pub(crate) mod domain;
pub(crate) mod infrastructure;
#[cfg(feature = "export-types")]
pub mod ipc;
#[cfg(not(feature = "export-types"))]
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;

#[cfg(feature = "export-types")]
pub use infrastructure::intervention_types::{
    AdvanceStepRequest, AdvanceStepResponse, FinalizeInterventionRequest,
    FinalizeInterventionResponse, GpsCoordinates, InterventionMetrics, InterventionStepWithPhotos,
    InterventionWithDetails, SaveStepProgressRequest, SaveStepProgressResponse,
    StartInterventionRequest, StartInterventionResponse, StepRequirement,
    UpdateInterventionRequest,
};

#[cfg(feature = "export-types")]
pub use ipc::intervention::relationships::{
    InterventionManagementResponse, InterventionStats, TechnicianInterventionStats,
};

#[cfg(feature = "export-types")]
pub use ipc::intervention::queries::InterventionProgressResponse;
