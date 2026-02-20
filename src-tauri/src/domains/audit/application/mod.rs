// Application layer for the Audit bounded context.
//
// Re-exports the public IPC contracts for audit and security operations.

pub use crate::domains::audit::ipc::security::{
    AcknowledgeSecurityAlertRequest, CleanupSecurityEventsRequest,
    GetSecurityAlertsRequest, GetSecurityEventsRequest, GetSecurityMetricsRequest,
    ResolveSecurityAlertRequest, SecurityAlertResponse, SecurityEventResponse,
    SecurityMetricsResponse,
};
