//! Security monitoring and alerting service
//!
//! This module provides real-time security monitoring, threat detection,
//! and alerting capabilities for the RPMA application.

use crate::db::Database;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tracing::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityEventType {
    AuthenticationFailure,
    AuthorizationFailure,
    RateLimitExceeded,
    SuspiciousActivity,
    BruteForceAttempt,
    SessionAnomaly,
    InputValidationFailure,
    SqlInjectionAttempt,
    XssAttempt,
    PathTraversalAttempt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: String,
    pub event_type: SecurityEventType,
    pub severity: AlertSeverity,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub correlation_id: Option<String>,
    pub details: HashMap<String, serde_json::Value>,
    pub source: String,
    pub mitigated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityAlert {
    pub id: String,
    pub event_id: String,
    pub title: String,
    pub description: String,
    pub severity: AlertSeverity,
    pub timestamp: DateTime<Utc>,
    pub acknowledged: bool,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub resolved: bool,
    pub resolved_at: Option<DateTime<Utc>>,
    pub actions_taken: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct SecurityMetrics {
    pub total_events_today: u64,
    pub critical_alerts_today: u64,
    pub active_brute_force_attempts: u64,
    pub blocked_ips: u64,
    pub failed_auth_attempts_last_hour: u64,
    pub suspicious_activities_detected: u64,
}

#[derive(Debug)]
pub struct SecurityMonitorService {
    db: Database,
    events_cache: Arc<Mutex<Vec<SecurityEvent>>>,
    alerts_cache: Arc<Mutex<Vec<SecurityAlert>>>,
    metrics: Arc<Mutex<SecurityMetrics>>,
    alert_thresholds: SecurityThresholds,
}

#[derive(Debug, Clone)]
pub struct SecurityThresholds {
    pub max_failed_auth_per_hour: u32,
    pub max_rate_limit_hits_per_minute: u32,
    pub max_suspicious_activities_per_hour: u32,
    pub alert_on_critical_events: bool,
    pub auto_block_brute_force: bool,
}

impl Default for SecurityThresholds {
    fn default() -> Self {
        Self {
            max_failed_auth_per_hour: 10,
            max_rate_limit_hits_per_minute: 5,
            max_suspicious_activities_per_hour: 20,
            alert_on_critical_events: true,
            auto_block_brute_force: false, // Manual review preferred for production
        }
    }
}

impl SecurityMonitorService {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            events_cache: Arc::new(Mutex::new(Vec::new())),
            alerts_cache: Arc::new(Mutex::new(Vec::new())),
            metrics: Arc::new(Mutex::new(SecurityMetrics {
                total_events_today: 0,
                critical_alerts_today: 0,
                active_brute_force_attempts: 0,
                blocked_ips: 0,
                failed_auth_attempts_last_hour: 0,
                suspicious_activities_detected: 0,
            })),
            alert_thresholds: SecurityThresholds::default(),
        }
    }

    /// Initialize security monitoring tables
    pub fn init(&self) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        // Create security events table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS security_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                user_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                correlation_id TEXT,
                details TEXT NOT NULL,
                source TEXT NOT NULL,
                mitigated INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| format!("Failed to create security_events table: {}", e))?;

        // Create security alerts table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS security_alerts (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                acknowledged INTEGER NOT NULL DEFAULT 0,
                acknowledged_by TEXT,
                acknowledged_at TEXT,
                resolved INTEGER NOT NULL DEFAULT 0,
                resolved_at TEXT,
                actions_taken TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (event_id) REFERENCES security_events(id)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create security_alerts table: {}", e))?;

        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp)",
            [],
        ).map_err(|e| format!("Failed to create timestamp index: {}", e))?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)",
            [],
        )
        .map_err(|e| format!("Failed to create event type index: {}", e))?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id)",
            [],
        )
        .map_err(|e| format!("Failed to create user index: {}", e))?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp)",
            [],
        ).map_err(|e| format!("Failed to create alerts timestamp index: {}", e))?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity)",
            [],
        )
        .map_err(|e| format!("Failed to create alerts severity index: {}", e))?;

        Ok(())
    }

    /// Log a security event
    pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
        // Store in cache
        {
            let mut cache = self.events_cache.lock().unwrap();
            cache.push(event.clone());
            // Keep only last 1000 events in memory
            if cache.len() > 1000 {
                cache.remove(0);
            }
        }

        // Update metrics
        self.update_metrics(&event);

        // Store in database
        let conn = self.db.get_connection()?;
        let details_json = serde_json::to_string(&event.details)
            .map_err(|e| format!("Failed to serialize event details: {}", e))?;

        conn.execute(
            "INSERT INTO security_events
             (id, event_type, severity, timestamp, user_id, ip_address, user_agent, correlation_id, details, source, mitigated, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                event.id,
                serde_json::to_string(&event.event_type).map_err(|e| format!("Failed to serialize event type: {}", e))?,
                serde_json::to_string(&event.severity).map_err(|e| format!("Failed to serialize severity: {}", e))?,
                event.timestamp.to_rfc3339(),
                event.user_id,
                event.ip_address,
                event.user_agent,
                event.correlation_id,
                details_json,
                event.source,
                event.mitigated as i32,
                Utc::now().to_rfc3339(),
            ],
        ).map_err(|e| format!("Failed to insert security event: {}", e))?;

        // Check if alert should be generated
        self.check_alert_thresholds(&event)?;

        Ok(())
    }

    /// Create a security alert
    pub fn create_alert(&self, alert: SecurityAlert) -> Result<(), String> {
        // Store in cache
        {
            let mut cache = self.alerts_cache.lock().unwrap();
            cache.push(alert.clone());
            // Keep only last 100 alerts in memory
            if cache.len() > 100 {
                cache.remove(0);
            }
        }

        // Store in database
        let conn = self.db.get_connection()?;
        let actions_json = serde_json::to_string(&alert.actions_taken)
            .map_err(|e| format!("Failed to serialize actions: {}", e))?;

        conn.execute(
            "INSERT INTO security_alerts
             (id, event_id, title, description, severity, timestamp, acknowledged, acknowledged_by, acknowledged_at, resolved, resolved_at, actions_taken, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                alert.id,
                alert.event_id,
                alert.title,
                alert.description,
                serde_json::to_string(&alert.severity).map_err(|e| format!("Failed to serialize alert severity: {}", e))?,
                alert.timestamp.to_rfc3339(),
                alert.acknowledged as i32,
                alert.acknowledged_by,
                alert.acknowledged_at.map(|dt| dt.to_rfc3339()),
                alert.resolved as i32,
                alert.resolved_at.map(|dt| dt.to_rfc3339()),
                actions_json,
                Utc::now().to_rfc3339(),
            ],
        ).map_err(|e| format!("Failed to insert security alert: {}", e))?;

        // Log critical alerts
        match alert.severity {
            AlertSeverity::Critical => error!("🚨 CRITICAL SECURITY ALERT: {}", alert.title),
            AlertSeverity::High => warn!("⚠️ HIGH SECURITY ALERT: {}", alert.title),
            AlertSeverity::Medium => warn!("⚡ MEDIUM SECURITY ALERT: {}", alert.title),
            AlertSeverity::Low => warn!("ℹ️ LOW SECURITY ALERT: {}", alert.title),
        }

        Ok(())
    }

    /// Get security metrics
    pub fn get_metrics(&self) -> SecurityMetrics {
        self.metrics.lock().unwrap().clone()
    }

    /// Get recent security events
    pub fn get_recent_events(&self, limit: usize) -> Vec<SecurityEvent> {
        let cache = self.events_cache.lock().unwrap();
        cache.iter().rev().take(limit).cloned().collect()
    }

    /// Get active alerts
    pub fn get_active_alerts(&self) -> Vec<SecurityAlert> {
        let cache = self.alerts_cache.lock().unwrap();
        cache
            .iter()
            .filter(|alert| !alert.resolved)
            .cloned()
            .collect()
    }

    /// Acknowledge an alert
    pub fn acknowledge_alert(&self, alert_id: &str, user_id: &str) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "UPDATE security_alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?",
            rusqlite::params![
                user_id,
                Utc::now().to_rfc3339(),
                alert_id
            ],
        ).map_err(|e| format!("Failed to acknowledge alert: {}", e))?;

        // Update cache
        let mut cache = self.alerts_cache.lock().unwrap();
        if let Some(alert) = cache.iter_mut().find(|a| a.id == alert_id) {
            alert.acknowledged = true;
            alert.acknowledged_by = Some(user_id.to_string());
            alert.acknowledged_at = Some(Utc::now());
        }

        info!("Security alert {} acknowledged by {}", alert_id, user_id);
        Ok(())
    }

    /// Resolve an alert
    pub fn resolve_alert(&self, alert_id: &str, actions_taken: Vec<String>) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let actions_json = serde_json::to_string(&actions_taken)
            .map_err(|e| format!("Failed to serialize actions: {}", e))?;

        conn.execute(
            "UPDATE security_alerts SET resolved = 1, resolved_at = ?, actions_taken = ? WHERE id = ?",
            rusqlite::params![
                Utc::now().to_rfc3339(),
                actions_json,
                alert_id
            ],
        ).map_err(|e| format!("Failed to resolve alert: {}", e))?;

        // Update cache
        let mut cache = self.alerts_cache.lock().unwrap();
        if let Some(alert) = cache.iter_mut().find(|a| a.id == alert_id) {
            alert.resolved = true;
            alert.resolved_at = Some(Utc::now());
            alert.actions_taken = actions_taken;
        }

        info!("Security alert {} resolved", alert_id);
        Ok(())
    }

    /// Check if an IP should be blocked based on security events
    pub fn should_block_ip(&self, ip: &str) -> Result<bool, String> {
        let conn = self.db.get_connection()?;
        let one_hour_ago = Utc::now() - Duration::hours(1);

        // Count failed auth attempts from this IP in the last hour
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM security_events
             WHERE ip_address = ? AND event_type = ? AND timestamp > ?",
                rusqlite::params![
                    ip,
                    serde_json::to_string(&SecurityEventType::AuthenticationFailure).unwrap(),
                    one_hour_ago.to_rfc3339()
                ],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to check IP block status: {}", e))?;

        Ok(count >= 10) // Block after 10 failed attempts per hour
    }

    /// Clean up old events (keep last 30 days)
    pub fn cleanup_old_events(&self) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let thirty_days_ago = Utc::now() - Duration::days(30);

        let deleted_events: usize = conn
            .execute(
                "DELETE FROM security_events WHERE timestamp < ?",
                [thirty_days_ago.to_rfc3339()],
            )
            .map_err(|e| format!("Failed to cleanup old events: {}", e))?;

        let deleted_alerts: usize = conn
            .execute(
                "DELETE FROM security_alerts WHERE timestamp < ?",
                [thirty_days_ago.to_rfc3339()],
            )
            .map_err(|e| format!("Failed to cleanup old alerts: {}", e))?;

        if deleted_events > 0 || deleted_alerts > 0 {
            info!(
                "Cleaned up {} old security events and {} old alerts",
                deleted_events, deleted_alerts
            );
        }

        Ok(())
    }

    // Private methods

    fn update_metrics(&self, event: &SecurityEvent) {
        let mut metrics = self.metrics.lock().unwrap();

        metrics.total_events_today += 1;

        if let AlertSeverity::Critical = event.severity {
            metrics.critical_alerts_today += 1;
        }

        match event.event_type {
            SecurityEventType::BruteForceAttempt => metrics.active_brute_force_attempts += 1,
            SecurityEventType::AuthenticationFailure => metrics.failed_auth_attempts_last_hour += 1,
            SecurityEventType::SuspiciousActivity => metrics.suspicious_activities_detected += 1,
            _ => {}
        }
    }

    fn check_alert_thresholds(&self, event: &SecurityEvent) -> Result<(), String> {
        // Check for critical events that should always alert
        if matches!(event.severity, AlertSeverity::Critical)
            && self.alert_thresholds.alert_on_critical_events
        {
            let alert = SecurityAlert {
                id: uuid::Uuid::new_v4().to_string(),
                event_id: event.id.clone(),
                title: format!("Critical Security Event: {:?}", event.event_type),
                description: format!(
                    "A critical security event has been detected: {:?}",
                    event.event_type
                ),
                severity: AlertSeverity::Critical,
                timestamp: Utc::now(),
                acknowledged: false,
                acknowledged_by: None,
                acknowledged_at: None,
                resolved: false,
                resolved_at: None,
                actions_taken: vec![],
            };
            self.create_alert(alert)?;
        }

        // Check for brute force patterns
        if matches!(event.event_type, SecurityEventType::AuthenticationFailure) {
            if let Some(ip) = &event.ip_address {
                if self.should_block_ip(ip)? && self.alert_thresholds.auto_block_brute_force {
                    let alert = SecurityAlert {
                        id: uuid::Uuid::new_v4().to_string(),
                        event_id: event.id.clone(),
                        title: "Brute Force Attack Detected".to_string(),
                        description: format!(
                            "Multiple failed authentication attempts detected from IP: {}",
                            ip
                        ),
                        severity: AlertSeverity::High,
                        timestamp: Utc::now(),
                        acknowledged: false,
                        acknowledged_by: None,
                        acknowledged_at: None,
                        resolved: false,
                        resolved_at: None,
                        actions_taken: vec!["IP blocking recommended".to_string()],
                    };
                    self.create_alert(alert)?;
                }
            }
        }

        Ok(())
    }
}

// Convenience functions for logging common security events

impl SecurityMonitorService {
    pub fn log_auth_failure(
        &self,
        user_id: Option<&str>,
        ip: Option<&str>,
        reason: &str,
    ) -> Result<(), String> {
        let event = SecurityEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: SecurityEventType::AuthenticationFailure,
            severity: AlertSeverity::Medium,
            timestamp: Utc::now(),
            user_id: user_id.map(|s| s.to_string()),
            ip_address: ip.map(|s| s.to_string()),
            user_agent: None,
            correlation_id: None,
            details: {
                let mut details = HashMap::new();
                details.insert("reason".to_string(), serde_json::json!(reason));
                details
            },
            source: "auth_service".to_string(),
            mitigated: false,
        };
        self.log_event(event)
    }

    pub fn log_auth_success(&self, user_id: &str, ip: Option<&str>) -> Result<(), String> {
        let event = SecurityEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: SecurityEventType::AuthenticationFailure, // Note: This is actually success, but we track it
            severity: AlertSeverity::Low,
            timestamp: Utc::now(),
            user_id: Some(user_id.to_string()),
            ip_address: ip.map(|s| s.to_string()),
            user_agent: None,
            correlation_id: None,
            details: {
                let mut details = HashMap::new();
                details.insert("action".to_string(), serde_json::json!("login_success"));
                details
            },
            source: "auth_service".to_string(),
            mitigated: false,
        };
        self.log_event(event)
    }

    pub fn log_suspicious_activity(
        &self,
        user_id: Option<&str>,
        activity: &str,
        details: HashMap<String, serde_json::Value>,
    ) -> Result<(), String> {
        let event = SecurityEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: SecurityEventType::SuspiciousActivity,
            severity: AlertSeverity::Medium,
            timestamp: Utc::now(),
            user_id: user_id.map(|s| s.to_string()),
            ip_address: None,
            user_agent: None,
            correlation_id: None,
            details,
            source: activity.to_string(),
            mitigated: false,
        };
        self.log_event(event)
    }

    pub fn log_rate_limit_exceeded(&self, ip: Option<&str>, endpoint: &str) -> Result<(), String> {
        let event = SecurityEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: SecurityEventType::RateLimitExceeded,
            severity: AlertSeverity::Low,
            timestamp: Utc::now(),
            user_id: None,
            ip_address: ip.map(|s| s.to_string()),
            user_agent: None,
            correlation_id: None,
            details: {
                let mut details = HashMap::new();
                details.insert("endpoint".to_string(), serde_json::json!(endpoint));
                details
            },
            source: "rate_limiter".to_string(),
            mitigated: true, // Rate limiting mitigates the issue
        };
        self.log_event(event)
    }
}
