//! Unit tests for security monitor service
//!
//! Focuses on event logging, metrics, IP blocking, and alert lifecycle.

use crate::domains::audit::infrastructure::security_monitor::{
    AlertSeverity, SecurityEvent, SecurityEventType, SecurityMonitorService,
};
use crate::test_db;
use chrono::{Duration, Utc};
use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_security_service() -> (SecurityMonitorService, tempfile::TempDir) {
        let test_db = test_db!();
        let db = (*test_db.db()).clone();
        let service = SecurityMonitorService::new(db);
        service
            .init()
            .expect("Failed to initialize security monitor tables");
        (service, test_db.temp_dir)
    }

    #[test]
    fn test_log_auth_failure_updates_metrics_and_events() {
        let (security_service, _temp_dir) = create_security_service();

        for i in 0..3 {
            security_service
                .log_auth_failure(
                    Some(&format!("user{}", i)),
                    Some("192.168.1.100"),
                    "invalid",
                )
                .expect("Failed to log auth failure");
        }

        let metrics = security_service.get_metrics();
        assert_eq!(
            metrics.failed_auth_attempts_last_hour, 3,
            "Should track failed auth attempts"
        );

        let events = security_service.get_recent_events(3);
        assert_eq!(events.len(), 3, "Should keep recent events in cache");
    }

    #[test]
    fn test_should_block_ip_after_threshold() {
        let (security_service, _temp_dir) = create_security_service();
        let ip_address = "192.168.1.200";

        for i in 0..10 {
            security_service
                .log_auth_failure(Some(&format!("user{}", i)), Some(ip_address), "invalid")
                .expect("Failed to log auth failure");
        }

        let result = security_service.should_block_ip(ip_address);
        assert!(
            result.unwrap_or(false),
            "IP should be blocked after threshold exceeded"
        );
    }

    #[test]
    fn test_should_not_block_ip_below_threshold() {
        let (security_service, _temp_dir) = create_security_service();
        let ip_address = "192.168.1.201";

        for i in 0..3 {
            security_service
                .log_auth_failure(Some(&format!("user{}", i)), Some(ip_address), "invalid")
                .expect("Failed to log auth failure");
        }

        let result = security_service.should_block_ip(ip_address);
        assert!(
            !result.unwrap_or(true),
            "IP should not be blocked below threshold"
        );
    }

    #[test]
    fn test_critical_event_creates_alert() {
        let (security_service, _temp_dir) = create_security_service();

        let event = SecurityEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: SecurityEventType::SqlInjectionAttempt,
            severity: AlertSeverity::Critical,
            timestamp: Utc::now(),
            user_id: Some("user123".to_string()),
            ip_address: Some("192.168.1.250".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            correlation_id: None,
            details: HashMap::new(),
            source: "test".to_string(),
            mitigated: false,
        };

        security_service
            .log_event(event)
            .expect("Failed to log critical event");

        let alerts = security_service.get_active_alerts();
        assert!(
            !alerts.is_empty(),
            "Critical event should create an active alert"
        );
        assert!(
            alerts
                .iter()
                .any(|alert| matches!(alert.severity, AlertSeverity::Critical)),
            "At least one alert should be critical"
        );
    }

    #[test]
    fn test_acknowledge_and_resolve_alert() {
        let (security_service, _temp_dir) = create_security_service();

        let event = SecurityEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: SecurityEventType::AuthenticationFailure,
            severity: AlertSeverity::Critical,
            timestamp: Utc::now(),
            user_id: Some("user123".to_string()),
            ip_address: Some("192.168.1.251".to_string()),
            user_agent: None,
            correlation_id: None,
            details: HashMap::new(),
            source: "test".to_string(),
            mitigated: false,
        };

        security_service
            .log_event(event)
            .expect("Failed to log critical event");

        let alerts = security_service.get_active_alerts();
        assert!(!alerts.is_empty(), "Should have active alerts");

        let alert_id = alerts[0].id.clone();
        security_service
            .acknowledge_alert(&alert_id, "tester")
            .expect("Failed to acknowledge alert");

        let updated_alerts = security_service.get_active_alerts();
        let acknowledged = updated_alerts
            .iter()
            .find(|alert| alert.id == alert_id)
            .map(|alert| alert.acknowledged)
            .unwrap_or(false);
        assert!(acknowledged, "Alert should be acknowledged");

        security_service
            .resolve_alert(&alert_id, vec!["Reviewed".to_string()])
            .expect("Failed to resolve alert");

        let remaining = security_service
            .get_active_alerts()
            .into_iter()
            .filter(|alert| alert.id == alert_id)
            .collect::<Vec<_>>();
        assert!(remaining.is_empty(), "Resolved alert should not be active");
    }

    #[test]
    fn test_cleanup_old_events_does_not_error() {
        let (security_service, _temp_dir) = create_security_service();

        let old_event = SecurityEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: SecurityEventType::SuspiciousActivity,
            severity: AlertSeverity::Low,
            timestamp: Utc::now() - Duration::days(40),
            user_id: None,
            ip_address: None,
            user_agent: None,
            correlation_id: None,
            details: HashMap::new(),
            source: "test".to_string(),
            mitigated: false,
        };

        security_service
            .log_event(old_event)
            .expect("Failed to log old event");

        let result = security_service.cleanup_old_events();
        assert!(result.is_ok(), "Cleanup should not error");
    }
}
