//! Application service for security audit operations.
//!
//! Orchestrates queries against `AuditRepository` (infrastructure) and
//! maps raw DB rows to the response DTOs used by the IPC layer.
//!
//! ADR-001: No upward dependencies — this module does NOT import from
//! infrastructure types beyond the repository itself.

use std::sync::Arc;

use chrono::Utc;
use serde::Serialize;
use tracing::instrument;
use ts_rs::TS;

use crate::db::Database;
use crate::domains::auth::infrastructure::audit_repository::AuditRepository;

// ── Domain policy constants ───────────────────────────────────────────────────

/// Alert-event types that constitute actionable security alerts (domain policy).
const SECURITY_ALERT_EVENT_TYPES: &[&str] = &[
    "AuthenticationFailure",
    "BruteForceAttempt",
    "SecurityViolation",
    "SuspiciousActivity",
    "RateLimitExceeded",
    "SqlInjectionAttempt",
    "XssAttempt",
    "PathTraversalAttempt",
];

/// Map an audit `event_type` to its display severity (domain policy).
pub fn severity_for(event_type: &str) -> &'static str {
    match event_type {
        "BruteForceAttempt"
        | "SecurityViolation"
        | "SqlInjectionAttempt"
        | "XssAttempt"
        | "PathTraversalAttempt" => "critical",
        "AuthenticationFailure" | "SuspiciousActivity" | "RateLimitExceeded" => "warning",
        _ => "info",
    }
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

/// Security KPI counters for the admin dashboard.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SecurityMetrics {
    pub total_events_today: i64,
    pub critical_alerts_today: i64,
    pub active_brute_force_attempts: i64,
    pub blocked_ips: i64,
    pub failed_auth_attempts_last_hour: i64,
    pub suspicious_activities_detected: i64,
}

/// A single audit event record.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SecurityEventRecord {
    pub id: String,
    pub event_type: String,
    pub user_id: String,
    pub action: String,
    pub description: String,
    pub result: String,
    pub timestamp: String,
    pub ip_address: Option<String>,
}

/// A derived security alert.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct SecurityAlert {
    pub id: String,
    pub event_id: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub timestamp: String,
    pub acknowledged: bool,
    pub resolved: bool,
}

/// User activity record for the audit page.
/// ADR-012: timestamp is i64 (milliseconds).
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct UserActivityRecord {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub event_type: String,
    pub action: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub description: String,
    pub result: String,
    pub timestamp: i64,
    pub ip_address: Option<String>,
}

/// Filter parameters for activity queries.
#[derive(Debug, serde::Deserialize, TS)]
#[ts(export)]
pub struct AuditActivityFilter {
    pub user_id: Option<String>,
    pub event_type: Option<String>,
    pub resource_type: Option<String>,
    pub start_date: Option<i64>,
    pub end_date: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Paginated response for activity queries.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct PaginatedUserActivity {
    pub records: Vec<UserActivityRecord>,
    pub total: i64,
    pub has_more: bool,
}

// ── Service ───────────────────────────────────────────────────────────────────

/// Application service that surfaces security audit data to the IPC layer.
pub struct AuditService {
    repo: AuditRepository,
}

impl AuditService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            repo: AuditRepository::new(db),
        }
    }

    /// Return today's security KPIs.
    #[instrument(skip(self))]
    pub fn security_metrics(&self) -> Result<SecurityMetrics, String> {
        let now_ms = Utc::now().timestamp_millis();
        let today_start_ms = now_ms - (now_ms % 86_400_000);
        let last_hour_ms = now_ms - 3_600_000;

        let row = self
            .repo
            .get_security_metrics(today_start_ms, last_hour_ms)?;

        Ok(SecurityMetrics {
            total_events_today: row.total_events_today,
            critical_alerts_today: row.critical_alerts_today,
            active_brute_force_attempts: row.active_brute_force_attempts,
            blocked_ips: row.blocked_ips,
            failed_auth_attempts_last_hour: row.failed_auth_attempts_last_hour,
            suspicious_activities_detected: row.suspicious_activities_detected,
        })
    }

    /// Return up to `limit` recent audit events, newest first.
    #[instrument(skip(self))]
    pub fn list_events(&self, limit: i64) -> Result<Vec<SecurityEventRecord>, String> {
        let rows = self.repo.list_events(limit)?;

        let records = rows
            .into_iter()
            .map(|r| {
                let ts = chrono::DateTime::from_timestamp_millis(r.timestamp_ms)
                    .unwrap_or_else(Utc::now)
                    .to_rfc3339();
                SecurityEventRecord {
                    id: r.id,
                    event_type: r.event_type,
                    user_id: r.user_id,
                    action: r.action,
                    description: r.description,
                    result: r.result,
                    timestamp: ts,
                    ip_address: r.ip_address,
                }
            })
            .collect();

        Ok(records)
    }

    /// Return recent security-class alert events (up to 100), newest first.
    #[instrument(skip(self))]
    pub fn list_alerts(&self) -> Result<Vec<SecurityAlert>, String> {
        let rows = self.repo.list_alerts(SECURITY_ALERT_EVENT_TYPES, 100)?;

        let alerts = rows
            .into_iter()
            .map(|r| {
                let ts = chrono::DateTime::from_timestamp_millis(r.timestamp_ms)
                    .unwrap_or_else(Utc::now)
                    .to_rfc3339();
                let severity = severity_for(&r.event_type).to_string();
                let title = r.event_type.clone();
                SecurityAlert {
                    id: r.id.clone(),
                    event_id: r.id,
                    title,
                    description: r.description,
                    severity,
                    timestamp: ts,
                    acknowledged: false,
                    resolved: false,
                }
            })
            .collect();

        Ok(alerts)
    }

    /// Return paginated activity logs across all users with optional filters.
    #[instrument(skip(self))]
    pub fn get_all_activity(
        &self,
        filter: AuditActivityFilter,
    ) -> Result<PaginatedUserActivity, String> {
        let limit = filter.limit.unwrap_or(50);
        let offset = filter.offset.unwrap_or(0);

        let (rows, total) = self.repo.get_activity_logs(
            filter.user_id,
            filter.event_type,
            filter.resource_type,
            filter.start_date,
            filter.end_date,
            limit,
            offset,
        )?;

        let records = rows
            .into_iter()
            .map(|r| UserActivityRecord {
                id: r.id,
                user_id: r.user_id,
                username: r.username,
                event_type: r.event_type,
                action: r.action,
                resource_type: r.resource_type,
                resource_id: r.resource_id,
                description: r.description,
                result: r.result,
                timestamp: r.timestamp_ms,
                ip_address: r.ip_address,
            })
            .collect();

        Ok(PaginatedUserActivity {
            records,
            total,
            has_more: offset + limit < total,
        })
    }

    /// Return available event types for activity audit filtering.
    pub fn get_audit_event_types(&self) -> Vec<String> {
        vec![
            "AuthenticationSuccess".to_string(),
            "AuthenticationFailure".to_string(),
            "AuthorizationGranted".to_string(),
            "AuthorizationDenied".to_string(),
            "SessionCreated".to_string(),
            "SessionExpired".to_string(),
            "SessionInvalidated".to_string(),
            "PasswordChanged".to_string(),
            "PasswordResetRequested".to_string(),
            "PasswordResetCompleted".to_string(),
            "DataRead".to_string(),
            "DataCreated".to_string(),
            "DataUpdated".to_string(),
            "DataDeleted".to_string(),
            "DataExported".to_string(),
            "DataImported".to_string(),
            "TaskCreated".to_string(),
            "TaskUpdated".to_string(),
            "TaskDeleted".to_string(),
            "TaskAssigned".to_string(),
            "TaskCompleted".to_string(),
            "TaskCancelled".to_string(),
            "TaskStatusChanged".to_string(),
            "ClientCreated".to_string(),
            "ClientUpdated".to_string(),
            "ClientDeleted".to_string(),
            "ClientContactChanged".to_string(),
            "InterventionCreated".to_string(),
            "InterventionUpdated".to_string(),
            "InterventionStarted".to_string(),
            "InterventionCompleted".to_string(),
            "InterventionStepCompleted".to_string(),
            "InterventionWorkflowChanged".to_string(),
            "SystemStartup".to_string(),
            "SystemShutdown".to_string(),
            "BackupStarted".to_string(),
            "BackupCompleted".to_string(),
            "BackupFailed".to_string(),
            "MaintenanceStarted".to_string(),
            "MaintenanceCompleted".to_string(),
            "SecurityViolation".to_string(),
            "SuspiciousActivity".to_string(),
            "RateLimitExceeded".to_string(),
            "BruteForceAttempt".to_string(),
            "SqlInjectionAttempt".to_string(),
            "XssAttempt".to_string(),
            "PathTraversalAttempt".to_string(),
            "SystemError".to_string(),
            "DatabaseError".to_string(),
            "NetworkError".to_string(),
            "ValidationError".to_string(),
            "ConfigurationChanged".to_string(),
            "SettingUpdated".to_string(),
            "RoleChanged".to_string(),
            "PermissionChanged".to_string(),
        ]
    }
}
