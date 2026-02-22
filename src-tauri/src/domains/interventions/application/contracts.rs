//! Application-layer contracts for the Interventions bounded context.
//!
//! These types define the IPC request/response contracts for intervention
//! workflow operations.

use serde::Deserialize;

/// Workflow action types
#[derive(Deserialize, Debug)]
#[serde(tag = "action")]
pub enum InterventionWorkflowAction {
    Start { data: StartInterventionRequest },
    Get { id: String },
    GetActiveByTask { task_id: String },
    Update { id: String, data: serde_json::Value },
    Delete { id: String },
    Finalize { data: FinalizeInterventionRequest },
}

/// Workflow response types
#[derive(serde::Serialize, Debug)]
#[serde(tag = "type")]
pub enum InterventionWorkflowResponse {
    Started {
        intervention: crate::domains::interventions::domain::models::intervention::Intervention,
        steps: Vec<crate::domains::interventions::domain::models::step::InterventionStep>,
    },
    Retrieved {
        intervention: crate::domains::interventions::domain::models::intervention::Intervention,
    },
    ActiveByTask {
        interventions:
            Vec<crate::domains::interventions::domain::models::intervention::Intervention>,
    },
    Updated {
        id: String,
        message: String,
    },
    Deleted {
        id: String,
        message: String,
    },
    Finalized {
        intervention: crate::domains::interventions::domain::models::intervention::Intervention,
    },
}

/// Request structure for starting an intervention
#[derive(Deserialize, Debug)]
pub struct StartInterventionRequest {
    pub task_id: String,
    pub intervention_type: String,
    pub priority: String,
    pub description: Option<String>,
    pub estimated_duration_minutes: Option<u32>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request structure for finalizing an intervention
#[derive(Deserialize, Debug)]
pub struct FinalizeInterventionRequest {
    pub intervention_id: String,
    pub collected_data: Option<serde_json::Value>,
    pub photos: Option<Vec<String>>,
    pub customer_satisfaction: Option<i32>,
    pub quality_score: Option<i32>,
    pub final_observations: Option<Vec<String>>,
    pub customer_signature: Option<String>,
    pub customer_comments: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
