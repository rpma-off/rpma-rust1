//! Alerting service for system notifications and alerts

use crate::db::Database;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertChannel {
    Log,
    Database,
    UI,    // For future UI notifications
    Email, // For future email notifications
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertPriority {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub condition: String, // Simple condition expression
    pub channels: Vec<AlertChannel>,
    pub priority: AlertPriority,
    pub enabled: bool,
    pub cooldown_minutes: i32, // Minimum time between alerts
    pub last_triggered: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub rule_id: String,
    pub title: String,
    pub message: String,
    pub priority: AlertPriority,
    pub channels: Vec<AlertChannel>,
    pub timestamp: DateTime<Utc>,
    pub acknowledged: bool,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub resolved: bool,
    pub resolved_at: Option<DateTime<Utc>>,
    pub metadata: HashMap<String, serde_json::Value>,
}

pub struct AlertingService {
    db: Database,
    rules: Vec<AlertRule>,
    active_alerts: Vec<Alert>,
}

impl AlertingService {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            rules: Vec::new(),
            active_alerts: Vec::new(),
        }
    }

    /// Initialize alerting tables and default rules
    pub fn init(&mut self) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        // Create alert rules table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS alert_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                condition TEXT NOT NULL,
                channels TEXT NOT NULL,
                priority TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                cooldown_minutes INTEGER NOT NULL DEFAULT 60,
                last_triggered TEXT,
                created_at TEXT NOT NULL
            )",
            [],
        )
        .map_err(|e| format!("Failed to create alert_rules table: {}", e))?;

        // Create alerts table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                rule_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                priority TEXT NOT NULL,
                channels TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                acknowledged INTEGER NOT NULL DEFAULT 0,
                acknowledged_by TEXT,
                acknowledged_at TEXT,
                resolved INTEGER NOT NULL DEFAULT 0,
                resolved_at TEXT,
                metadata TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create alerts table: {}", e))?;

        // Load existing rules
        self.load_rules()?;

        // Create default alert rules if none exist
        if self.rules.is_empty() {
            self.create_default_rules()?;
        }

        info!(
            "Alerting service initialized with {} rules",
            self.rules.len()
        );
        Ok(())
    }

    /// Create default alert rules
    fn create_default_rules(&mut self) -> Result<(), String> {
        let default_rules = vec![
            AlertRule {
                id: "high_error_rate".to_string(),
                name: "High Error Rate".to_string(),
                description: "Alert when API error rate exceeds 10%".to_string(),
                condition: "error_rate > 0.1".to_string(),
                channels: vec![AlertChannel::Log, AlertChannel::Database],
                priority: AlertPriority::High,
                enabled: true,
                cooldown_minutes: 30,
                last_triggered: None,
            },
            AlertRule {
                id: "slow_responses".to_string(),
                name: "Slow Response Times".to_string(),
                description: "Alert when P95 response time exceeds 5 seconds".to_string(),
                condition: "p95_response_time > 5000".to_string(),
                channels: vec![AlertChannel::Log, AlertChannel::Database],
                priority: AlertPriority::Medium,
                enabled: true,
                cooldown_minutes: 60,
                last_triggered: None,
            },
            AlertRule {
                id: "security_brute_force".to_string(),
                name: "Brute Force Attack".to_string(),
                description: "Alert on potential brute force attacks".to_string(),
                condition: "brute_force_attempts > 5".to_string(),
                channels: vec![AlertChannel::Log, AlertChannel::Database],
                priority: AlertPriority::Critical,
                enabled: true,
                cooldown_minutes: 15,
                last_triggered: None,
            },
            AlertRule {
                id: "database_connection_issues".to_string(),
                name: "Database Connection Issues".to_string(),
                description: "Alert when database connections fail".to_string(),
                condition: "db_connection_errors > 3".to_string(),
                channels: vec![AlertChannel::Log, AlertChannel::Database],
                priority: AlertPriority::High,
                enabled: true,
                cooldown_minutes: 10,
                last_triggered: None,
            },
        ];

        for rule in default_rules {
            self.save_rule(&rule)?;
            self.rules.push(rule);
        }

        Ok(())
    }

    /// Load alert rules from database
    fn load_rules(&mut self) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT id, name, description, condition, channels, priority, enabled, cooldown_minutes, last_triggered
             FROM alert_rules WHERE enabled = 1"
        ).map_err(|e| format!("Failed to prepare rules query: {}", e))?;

        let rules = stmt
            .query_map([], |row| {
                let channels_str: String = row.get(4)?;
                let channels: Vec<AlertChannel> =
                    serde_json::from_str(&channels_str).unwrap_or_else(|_| vec![AlertChannel::Log]);

                Ok(AlertRule {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    condition: row.get(3)?,
                    channels,
                    priority: match row.get::<_, String>(5)?.as_str() {
                        "Critical" => AlertPriority::Critical,
                        "High" => AlertPriority::High,
                        "Medium" => AlertPriority::Medium,
                        _ => AlertPriority::Low,
                    },
                    enabled: row.get::<_, i32>(6)? != 0,
                    cooldown_minutes: row.get(7)?,
                    last_triggered: {
                        let ts_str: Option<String> = row.get(8)?;
                        ts_str.map(|s| {
                            DateTime::parse_from_rfc3339(&s)
                                .unwrap()
                                .with_timezone(&Utc)
                        })
                    },
                })
            })
            .map_err(|e| format!("Failed to query rules: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect rules: {}", e))?;

        self.rules = rules;
        Ok(())
    }

    /// Save alert rule to database
    fn save_rule(&self, rule: &AlertRule) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let channels_json = serde_json::to_string(&rule.channels)
            .map_err(|e| format!("Failed to serialize channels: {}", e))?;

        conn.execute(
            "INSERT OR REPLACE INTO alert_rules
             (id, name, description, condition, channels, priority, enabled, cooldown_minutes, last_triggered, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                rule.id,
                rule.name,
                rule.description,
                rule.condition,
                channels_json,
                serde_json::to_string(&rule.priority).map_err(|e| format!("Failed to serialize priority: {}", e))?,
                rule.enabled as i32,
                rule.cooldown_minutes,
                rule.last_triggered.map(|dt| dt.to_rfc3339()),
                Utc::now().to_rfc3339(),
            ],
        ).map_err(|e| format!("Failed to save alert rule: {}", e))?;

        Ok(())
    }

    /// Evaluate alert rules against current metrics
    pub fn evaluate_rules(&mut self, metrics: &HashMap<String, f64>) -> Result<(), String> {
        let mut rules_to_trigger = Vec::new();

        // First pass: collect rules that need triggering
        for rule in &self.rules {
            if !rule.enabled {
                continue;
            }

            // Check cooldown
            if let Some(last_triggered) = rule.last_triggered {
                let cooldown_duration = Duration::minutes(rule.cooldown_minutes as i64);
                if Utc::now().signed_duration_since(last_triggered) < cooldown_duration {
                    continue;
                }
            }

            // Evaluate condition (simple expression evaluation)
            if self.evaluate_condition(&rule.condition, metrics) {
                rules_to_trigger.push(rule.id.clone());
            }
        }

        // Second pass: trigger alerts and update rules
        for rule_id in rules_to_trigger {
            // Find the rule index
            if let Some(index) = self.rules.iter().position(|r| r.id == rule_id) {
                // Clone the rule for triggering
                let rule_clone = self.rules[index].clone();

                // Trigger alert (borrows self mutably)
                self.trigger_alert(&rule_clone)?;

                // Update the rule
                self.rules[index].last_triggered = Some(Utc::now());

                // Save the rule (borrows self immutably)
                self.save_rule(&self.rules[index])?;
            }
        }

        Ok(())
    }

    /// Evaluate a simple condition expression
    fn evaluate_condition(&self, condition: &str, metrics: &HashMap<String, f64>) -> bool {
        // Simple condition evaluation: "metric_name > value"
        let parts: Vec<&str> = condition.split_whitespace().collect();
        if parts.len() != 3 {
            return false;
        }

        let metric_name = parts[0];
        let operator = parts[1];
        let value_str = parts[2];

        if let (Some(metric_value), Ok(threshold)) =
            (metrics.get(metric_name).copied(), value_str.parse::<f64>())
        {
            match operator {
                ">" => metric_value > threshold,
                "<" => metric_value < threshold,
                ">=" => metric_value >= threshold,
                "<=" => metric_value <= threshold,
                "==" => (metric_value - threshold).abs() < f64::EPSILON,
                "!=" => (metric_value - threshold).abs() >= f64::EPSILON,
                _ => false,
            }
        } else {
            false
        }
    }

    /// Trigger an alert
    fn trigger_alert(&mut self, rule: &AlertRule) -> Result<(), String> {
        let alert = Alert {
            id: uuid::Uuid::new_v4().to_string(),
            rule_id: rule.id.clone(),
            title: rule.name.clone(),
            message: rule.description.clone(),
            priority: rule.priority.clone(),
            channels: rule.channels.clone(),
            timestamp: Utc::now(),
            acknowledged: false,
            acknowledged_by: None,
            acknowledged_at: None,
            resolved: false,
            resolved_at: None,
            metadata: HashMap::new(),
        };

        // Send alert through configured channels
        for channel in &alert.channels {
            match channel {
                AlertChannel::Log => self.send_log_alert(&alert),
                AlertChannel::Database => self.save_alert(&alert)?,
                AlertChannel::UI => self.send_ui_alert(&alert),
                AlertChannel::Email => self.send_email_alert(&alert),
            }
        }

        self.active_alerts.push(alert);
        Ok(())
    }

    /// Send alert to log
    fn send_log_alert(&self, alert: &Alert) {
        let message = format!("🚨 ALERT: {} - {}", alert.title, alert.message);
        match alert.priority {
            AlertPriority::Critical => error!("{}", message),
            AlertPriority::High => error!("{}", message),
            AlertPriority::Medium => warn!("{}", message),
            AlertPriority::Low => info!("{}", message),
        }
    }

    /// Save alert to database
    fn save_alert(&self, alert: &Alert) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let channels_json = serde_json::to_string(&alert.channels)
            .map_err(|e| format!("Failed to serialize channels: {}", e))?;
        let metadata_json = serde_json::to_string(&alert.metadata)
            .map_err(|e| format!("Failed to serialize metadata: {}", e))?;

        conn.execute(
            "INSERT INTO alerts
             (id, rule_id, title, message, priority, channels, timestamp, acknowledged, acknowledged_by, acknowledged_at, resolved, resolved_at, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                alert.id,
                alert.rule_id,
                alert.title,
                alert.message,
                serde_json::to_string(&alert.priority).map_err(|e| format!("Failed to serialize alert priority: {}", e))?,
                channels_json,
                alert.timestamp.to_rfc3339(),
                alert.acknowledged as i32,
                alert.acknowledged_by,
                alert.acknowledged_at.map(|dt| dt.to_rfc3339()),
                alert.resolved as i32,
                alert.resolved_at.map(|dt| dt.to_rfc3339()),
                metadata_json,
                Utc::now().to_rfc3339(),
            ],
        ).map_err(|e| format!("Failed to save alert: {}", e))?;

        Ok(())
    }

    /// Send alert to UI channel.
    fn send_ui_alert(&self, _alert: &Alert) {
        info!("UI alert channel invoked");
    }

    /// Send alert via email channel.
    fn send_email_alert(&self, _alert: &Alert) {
        info!("Email alert channel invoked");
    }

    /// Get active alerts
    pub fn get_active_alerts(&self) -> Vec<Alert> {
        self.active_alerts
            .iter()
            .filter(|alert| !alert.resolved)
            .cloned()
            .collect()
    }

    /// Acknowledge an alert
    pub fn acknowledge_alert(&mut self, alert_id: &str, user_id: &str) -> Result<(), String> {
        if let Some(alert) = self.active_alerts.iter_mut().find(|a| a.id == *alert_id) {
            alert.acknowledged = true;
            alert.acknowledged_by = Some(user_id.to_string());
            alert.acknowledged_at = Some(Utc::now());

            // Update in database
            let conn = self.db.get_connection()?;
            conn.execute(
                "UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?",
                rusqlite::params![
                    user_id,
                    Utc::now().to_rfc3339(),
                    alert_id
                ],
            ).map_err(|e| format!("Failed to acknowledge alert: {}", e))?;
        }

        Ok(())
    }

    /// Resolve an alert
    pub fn resolve_alert(&mut self, alert_id: &str) -> Result<(), String> {
        if let Some(alert) = self.active_alerts.iter_mut().find(|a| a.id == *alert_id) {
            alert.resolved = true;
            alert.resolved_at = Some(Utc::now());

            // Update in database
            let conn = self.db.get_connection()?;
            conn.execute(
                "UPDATE alerts SET resolved = 1, resolved_at = ? WHERE id = ?",
                rusqlite::params![Utc::now().to_rfc3339(), alert_id],
            )
            .map_err(|e| format!("Failed to resolve alert: {}", e))?;
        }

        Ok(())
    }

    /// Clean up old alerts (keep last 30 days)
    pub fn cleanup_old_alerts(&mut self) -> Result<(), String> {
        let conn = self.db.get_connection()?;
        let thirty_days_ago = Utc::now() - Duration::days(30);

        let deleted: usize = conn
            .execute(
                "DELETE FROM alerts WHERE timestamp < ?",
                [thirty_days_ago.to_rfc3339()],
            )
            .map_err(|e| format!("Failed to cleanup old alerts: {}", e))?;

        if deleted > 0 {
            info!("Cleaned up {} old alerts", deleted);
            // Remove from active alerts list
            self.active_alerts
                .retain(|alert| alert.timestamp >= thirty_days_ago);
        }

        Ok(())
    }
}
