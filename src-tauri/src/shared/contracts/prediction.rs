use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Completion time prediction result contract shared across reporting/analytics.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CompletionTimePrediction {
    pub predicted_duration_minutes: f64,
    pub confidence_interval: (f64, f64), // (lower_bound, upper_bound)
    pub factors_influencing: Vec<String>,
    pub historical_average: f64,
    pub prediction_accuracy: f64, // percentage
}
