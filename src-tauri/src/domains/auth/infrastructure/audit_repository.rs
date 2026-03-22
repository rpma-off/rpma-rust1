//! Audit-event repository — all rusqlite access for the audit_events table.

use rusqlite::params;
use std::sync::Arc;
use tracing::instrument;

use crate::db::Database;

/// Security KPIs derived from the audit_events table.
#[derive(Debug)]
pub struct SecurityMetricsRow {
    pub total_events_today: i64,
    pub critical_alerts_today: i64,
    pub active_brute_force_attempts: i64,
    pub blocked_ips: i64,
    pub failed_auth_attempts_last_hour: i64,
    pub suspicious_activities_detected: i64,
}

/// Raw audit-event row.
#[derive(Debug)]
pub struct AuditEventRow {
    pub id: String,
    pub event_type: String,
    pub user_id: String,
    pub action: String,
    pub description: String,
    pub result: String,
    pub timestamp_ms: i64,
    pub ip_address: Option<String>,
}

/// Raw security-alert row.
#[derive(Debug)]
pub struct SecurityAlertRow {
    pub id: String,
    pub event_type: String,
    pub description: String,
    pub timestamp_ms: i64,
}

/// Repository for audit_events table queries.
pub struct AuditRepository {
    db: Arc<Database>,
}

impl AuditRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    #[instrument(skip(self))]
    pub fn get_security_metrics(
        &self,
        today_start_ms: i64,
        last_hour_ms: i64,
    ) -> Result<SecurityMetricsRow, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        conn.query_row(
            r#"
            SELECT
                COUNT(CASE WHEN timestamp >= ?1 THEN 1 END),
                COUNT(CASE WHEN event_type IN (
                    'AuthenticationFailure','BruteForceAttempt',
                    'SecurityViolation','SuspiciousActivity'
                ) AND timestamp >= ?1 THEN 1 END),
                COUNT(CASE WHEN event_type = 'BruteForceAttempt' AND timestamp >= ?1 THEN 1 END),
                0,
                COUNT(CASE WHEN event_type = 'AuthenticationFailure' AND timestamp >= ?2 THEN 1 END),
                COUNT(CASE WHEN event_type IN ('SuspiciousActivity','SecurityViolation')
                           AND timestamp >= ?1 THEN 1 END)
            FROM audit_events
            "#,
            params![today_start_ms, last_hour_ms],
            |row| {
                Ok(SecurityMetricsRow {
                    total_events_today: row.get(0)?,
                    critical_alerts_today: row.get(1)?,
                    active_brute_force_attempts: row.get(2)?,
                    blocked_ips: row.get(3)?,
                    failed_auth_attempts_last_hour: row.get(4)?,
                    suspicious_activities_detected: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())
    }

    #[instrument(skip(self))]
    pub fn list_events(&self, limit: i64) -> Result<Vec<AuditEventRow>, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, event_type, user_id, action, description, result, timestamp, ip_address
                FROM audit_events
                ORDER BY timestamp DESC
                LIMIT ?1
                "#,
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![limit], |row| {
                Ok(AuditEventRow {
                    id: row.get(0)?,
                    event_type: row.get(1)?,
                    user_id: row.get(2)?,
                    action: row.get(3)?,
                    description: row.get(4)?,
                    result: row.get(5)?,
                    timestamp_ms: row.get(6)?,
                    ip_address: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(rows)
    }

    #[instrument(skip(self))]
    pub fn list_alerts(
        &self,
        event_types: &[&str],
        limit: i64,
    ) -> Result<Vec<SecurityAlertRow>, String> {
        let placeholders = event_types
            .iter()
            .enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect::<Vec<_>>()
            .join(",");

        let sql = format!(
            r#"
            SELECT id, event_type, description, timestamp
            FROM audit_events
            WHERE event_type IN ({placeholders})
            ORDER BY timestamp DESC
            LIMIT {}
            "#,
            limit
        );

        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(rusqlite::params_from_iter(event_types.iter()), |row| {
                Ok(SecurityAlertRow {
                    id: row.get(0)?,
                    event_type: row.get(1)?,
                    description: row.get(2)?,
                    timestamp_ms: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(rows)
    }
}
