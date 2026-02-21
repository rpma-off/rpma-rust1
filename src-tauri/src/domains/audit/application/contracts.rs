//! Request/response contracts for the Audit bounded context.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct SecurityMetricsResponse {
    pub total_events_today: u64,
    pub critical_alerts_today: u64,
    pub active_brute_force_attempts: u64,
    pub blocked_ips: u64,
    pub failed_auth_attempts_last_hour: u64,
    pub suspicious_activities_detected: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SecurityEventResponse {
    pub id: String,
    pub event_type: String,
    pub severity: String,
    pub timestamp: String,
    pub user_id: Option<String>,
    pub ip_address: Option<String>,
    pub details: serde_json::Value,
    pub source: String,
    pub mitigated: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SecurityAlertResponse {
    pub id: String,
    pub event_id: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub timestamp: String,
    pub acknowledged: bool,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<String>,
    pub resolved: bool,
    pub resolved_at: Option<String>,
    pub actions_taken: Vec<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetSecurityMetricsRequest {
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetSecurityEventsRequest {
    pub session_token: String,
    pub limit: Option<usize>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct GetSecurityAlertsRequest {
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct AcknowledgeSecurityAlertRequest {
    pub session_token: String,
    pub alert_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct ResolveSecurityAlertRequest {
    pub session_token: String,
    pub alert_id: String,
    pub actions_taken: Vec<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CleanupSecurityEventsRequest {
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
