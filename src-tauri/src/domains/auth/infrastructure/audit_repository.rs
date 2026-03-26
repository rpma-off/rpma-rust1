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

/// Result of activity log query with user join.
#[derive(Debug)]
pub struct ActivityLogQueryResult {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub event_type: String,
    pub action: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub description: String,
    pub result: String,
    pub timestamp_ms: i64,
    pub ip_address: Option<String>,
}

/// Repository for audit_events table queries.
pub struct AuditRepository {
    db: Arc<Database>,
}

impl AuditRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Query activity logs with filters and pagination, joining with users table.
    #[instrument(skip(self))]
    pub fn get_activity_logs(
        &self,
        user_id: Option<String>,
        event_type: Option<String>,
        resource_type: Option<String>,
        start_date: Option<i64>,
        end_date: Option<i64>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<ActivityLogQueryResult>, i64), String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;

        let mut where_clauses = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(uid) = user_id {
            where_clauses.push("a.user_id = ?");
            params.push(Box::new(uid));
        }
        if let Some(et) = event_type {
            where_clauses.push("a.event_type = ?");
            params.push(Box::new(et));
        }
        if let Some(rt) = resource_type {
            where_clauses.push("a.resource_type = ?");
            params.push(Box::new(rt));
        }
        if let Some(sd) = start_date {
            where_clauses.push("a.timestamp >= ?");
            params.push(Box::new(sd));
        }
        if let Some(ed) = end_date {
            where_clauses.push("a.timestamp <= ?");
            params.push(Box::new(ed));
        }

        let where_sql = if where_clauses.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", where_clauses.join(" AND "))
        };

        // Get total count
        let count_sql = format!("SELECT COUNT(*) FROM audit_events a {}", where_sql);
        let total: i64 = conn
            .query_row(&count_sql, rusqlite::params_from_iter(params.iter()), |r| {
                r.get(0)
            })
            .map_err(|e| e.to_string())?;

        // Get records with join
        let select_sql = format!(
            r#"
            SELECT 
                a.id, a.user_id, 
                COALESCE(u.first_name || ' ' || u.last_name, a.user_id) as username,
                a.event_type, a.action, a.resource_type, a.resource_id, 
                a.description, a.result, a.timestamp, a.ip_address
            FROM audit_events a
            LEFT JOIN users u ON a.user_id = u.id
            {}
            ORDER BY a.timestamp DESC
            LIMIT ? OFFSET ?
            "#,
            where_sql
        );

        let mut select_params = params;
        select_params.push(Box::new(limit));
        select_params.push(Box::new(offset));

        let mut stmt = conn.prepare(&select_sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params_from_iter(select_params.iter()), |row| {
                Ok(ActivityLogQueryResult {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    username: row.get(2)?,
                    event_type: row.get(3)?,
                    action: row.get(4)?,
                    resource_type: row.get(5)?,
                    resource_id: row.get(6)?,
                    description: row.get(7)?,
                    result: row.get(8)?,
                    timestamp_ms: row.get(9)?,
                    ip_address: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok((rows, total))
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
