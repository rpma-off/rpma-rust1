//! Unit tests for security monitor service
//!
//! Tests the security monitoring functionality including:
//! - Event logging and threshold checking
//! - IP blocking and rate limiting
//! - Alert generation and cleanup
//! - Security metrics aggregation

use crate::services::security_monitor::SecurityMonitorService;
use crate::test_utils::test_db;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_security_service() -> (SecurityMonitorService, tempfile::TempDir) {
        let test_db = test_db!();
        let service = SecurityMonitorService::new(test_db.db());
        (service, test_db.temp_dir)
    }

    #[test]
    fn test_log_successful_login() {
        let (security_service, _temp_dir) = create_security_service();

        // Log a successful login event
        let result = security_service.log_event(
            "login_success",
            "user123",
            Some("192.168.1.100"),
            Some("Mozilla/5.0..."),
            None,
        );

        assert!(
            result.is_ok(),
            "Successful login event should log without error"
        );
    }

    #[test]
    fn test_log_failed_login() {
        let (security_service, _temp_dir) = create_security_service();

        // Log a failed login event
        let result = security_service.log_event(
            "login_failed",
            "user123",
            Some("192.168.1.100"),
            Some("Mozilla/5.0..."),
            Some("Invalid password"),
        );

        assert!(
            result.is_ok(),
            "Failed login event should log without error"
        );
    }

    #[test]
    fn test_log_suspicious_activity() {
        let (security_service, _temp_dir) = create_security_service();

        // Log suspicious activity
        let result = security_service.log_event(
            "suspicious_activity",
            "user123",
            Some("192.168.1.100"),
            Some("Mozilla/5.0..."),
            Some("Multiple failed attempts from different IPs"),
        );

        assert!(
            result.is_ok(),
            "Suspicious activity should log without error"
        );
    }

    #[test]
    fn test_should_block_ip_after_threshold() {
        let (security_service, _temp_dir) = create_security_service();
        let ip_address = "192.168.1.200";

        // Log multiple failed attempts to exceed threshold
        for i in 0..15 {
            security_service
                .log_event(
                    "login_failed",
                    &format!("user{}", i),
                    Some(ip_address),
                    None,
                    None,
                )
                .expect("Failed to log login attempt");
        }

        // Should now block the IP
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

        // Log few failed attempts (below threshold)
        for i in 0..3 {
            security_service
                .log_event(
                    "login_failed",
                    &format!("user{}", i),
                    Some(ip_address),
                    None,
                    None,
                )
                .expect("Failed to log login attempt");
        }

        // Should not block the IP
        let result = security_service.should_block_ip(ip_address);
        assert!(
            !result.unwrap_or(true),
            "IP should not be blocked below threshold"
        );
    }

    #[test]
    fn test_different_ip_addresses_independent_blocking() {
        let (security_service, _temp_dir) = create_security_service();
        let ip1 = "192.168.1.210";
        let ip2 = "192.168.1.211";

        // Exceed threshold for IP1 only
        for i in 0..15 {
            security_service
                .log_event("login_failed", &format!("user{}", i), Some(ip1), None, None)
                .expect("Failed to log login attempt");
        }

        // IP1 should be blocked
        assert!(
            security_service.should_block_ip(ip1).unwrap_or(false),
            "IP1 should be blocked"
        );

        // IP2 should not be blocked
        assert!(
            !security_service.should_block_ip(ip2).unwrap_or(true),
            "IP2 should not be blocked"
        );
    }

    #[test]
    fn test_check_alert_thresholds() {
        let (security_service, _temp_dir) = create_security_service();

        // Generate various security events
        for i in 0..20 {
            security_service
                .log_event(
                    "login_failed",
                    &format!("user{}", i),
                    Some("192.168.1.220"),
                    None,
                    None,
                )
                .expect("Failed to log login attempt");
        }

        for i in 0..5 {
            security_service
                .log_event(
                    "suspicious_activity",
                    &format!("user{}", i),
                    Some("192.168.1.220"),
                    None,
                    Some("Suspicious pattern detected"),
                )
                .expect("Failed to log suspicious activity");
        }

        // Check for alerts
        let alerts = security_service
            .check_alert_thresholds()
            .expect("Failed to check alert thresholds");

        assert!(
            !alerts.is_empty(),
            "Should generate alerts for high activity"
        );

        // Should have alerts for failed login threshold
        let failed_login_alerts: Vec<_> = alerts
            .iter()
            .filter(|alert| alert.alert_type.contains("failed_login"))
            .collect();
        assert!(
            !failed_login_alerts.is_empty(),
            "Should have failed login alerts"
        );
    }

    #[test]
    fn test_get_security_metrics() {
        let (security_service, _temp_dir) = create_security_service();

        // Generate various events with timestamps
        let now = chrono::Utc::now();

        // Events from last hour
        for i in 0..10 {
            security_service
                .log_event(
                    "login_success",
                    &format!("user{}", i),
                    Some("192.168.1.230"),
                    None,
                    None,
                )
                .expect("Failed to log success event");
        }

        // Events from 2 hours ago (by manually inserting)
        let conn = security_service
            .db
            .get_connection()
            .expect("Failed to get connection");
        for i in 10..15 {
            conn.execute(
                "INSERT INTO security_events (id, event_type, user_id, ip_address, user_agent, details, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    "login_failed".to_string(),
                    format!("user{}", i),
                    "192.168.1.231".to_string(),
                    None::<String>,
                    None::<String>,
                    (now - chrono::Duration::hours(2)).timestamp().to_string(),
                    (now - chrono::Duration::hours(2)).timestamp().to_string(),
                ],
            ).expect("Failed to insert old security event");
        }

        // Get metrics for last hour
        let metrics = security_service
            .get_security_metrics(60)
            .expect("Failed to get security metrics");

        assert_eq!(
            metrics.successful_logins, 10,
            "Should count 10 successful logins from last hour"
        );
        assert_eq!(
            metrics.failed_logins, 0,
            "Should count 0 failed logins from last hour"
        );
        assert!(metrics.unique_ips.len() > 0, "Should have unique IPs");
        assert!(metrics.total_events > 0, "Should have total events");
    }

    #[test]
    fn test_cleanup_old_events() {
        let (security_service, _temp_dir) = create_security_service();

        // Insert old events (30 days ago)
        let old_time = chrono::Utc::now() - chrono::Duration::days(30);
        let conn = security_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        for i in 0..20 {
            conn.execute(
                "INSERT INTO security_events (id, event_type, user_id, ip_address, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    "login_success".to_string(),
                    format!("user{}", i),
                    "192.168.1.240".to_string(),
                    old_time.timestamp().to_string(),
                    old_time.timestamp().to_string(),
                ],
            ).expect("Failed to insert old security event");
        }

        // Insert recent events
        for i in 20..25 {
            security_service
                .log_event(
                    "login_success",
                    &format!("user{}", i),
                    Some("192.168.1.241"),
                    None,
                    None,
                )
                .expect("Failed to log recent event");
        }

        // Count before cleanup
        let count_before: i64 = conn
            .query_row("SELECT COUNT(*) FROM security_events", [], |row| row.get(0))
            .expect("Failed to count events before cleanup");
        assert_eq!(
            count_before, 25,
            "Should have 25 total events before cleanup"
        );

        // Run cleanup (cleanup events older than 7 days)
        let cleanup_count = security_service
            .cleanup_old_events(7)
            .expect("Failed to cleanup old events");

        assert_eq!(cleanup_count, 20, "Should cleanup 20 old events");

        // Count after cleanup
        let count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM security_events", [], |row| row.get(0))
            .expect("Failed to count events after cleanup");
        assert_eq!(
            count_after, 5,
            "Should have 5 remaining events after cleanup"
        );
    }

    #[test]
    fn test_cleanup_old_alerts() {
        let (security_service, _temp_dir) = create_security_service();

        // Insert old alerts (30 days ago)
        let old_time = chrono::Utc::now() - chrono::Duration::days(30);
        let conn = security_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        for i in 0..10 {
            conn.execute(
                "INSERT INTO security_alerts (id, alert_type, severity, details, ip_address, user_id, resolved, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    "high_failed_login_rate".to_string(),
                    "high".to_string(),
                    format!("Alert {}", i),
                    Some("192.168.1.250".to_string()),
                    Some(format!("user{}", i)),
                    "false".to_string(),
                    old_time.timestamp().to_string(),
                    old_time.timestamp().to_string(),
                ],
            ).expect("Failed to insert old security alert");
        }

        // Insert recent alerts
        for i in 10..12 {
            conn.execute(
                "INSERT INTO security_alerts (id, alert_type, severity, details, ip_address, user_id, resolved, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    "suspicious_activity".to_string(),
                    "medium".to_string(),
                    format!("Recent Alert {}", i),
                    Some("192.168.1.251".to_string()),
                    Some(format!("user{}", i)),
                    "false".to_string(),
                    chrono::Utc::now().timestamp().to_string(),
                    chrono::Utc::now().timestamp().to_string(),
                ],
            ).expect("Failed to insert recent security alert");
        }

        // Count before cleanup
        let count_before: i64 = conn
            .query_row("SELECT COUNT(*) FROM security_alerts", [], |row| row.get(0))
            .expect("Failed to count alerts before cleanup");
        assert_eq!(
            count_before, 12,
            "Should have 12 total alerts before cleanup"
        );

        // Run cleanup (cleanup alerts older than 7 days)
        let cleanup_count = security_service
            .cleanup_old_alerts(7)
            .expect("Failed to cleanup old alerts");

        assert_eq!(cleanup_count, 10, "Should cleanup 10 old alerts");

        // Count after cleanup
        let count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM security_alerts", [], |row| row.get(0))
            .expect("Failed to count alerts after cleanup");
        assert_eq!(
            count_after, 2,
            "Should have 2 remaining alerts after cleanup"
        );
    }

    #[test]
    fn test_get_active_alerts() {
        let (security_service, _temp_dir) = create_security_service();

        // Generate some events to trigger alerts
        for i in 0..20 {
            security_service
                .log_event(
                    "login_failed",
                    &format!("user{}", i),
                    Some("192.168.1.260"),
                    None,
                    None,
                )
                .expect("Failed to log failed login");
        }

        // Check for alerts
        let alerts = security_service
            .check_alert_thresholds()
            .expect("Failed to check alert thresholds");

        // Get active alerts
        let active_alerts = security_service
            .get_active_alerts()
            .expect("Failed to get active alerts");

        assert!(!active_alerts.is_empty(), "Should have active alerts");

        // Verify alert properties
        for alert in &active_alerts {
            assert!(!alert.alert_type.is_empty(), "Alert should have type");
            assert!(!alert.severity.is_empty(), "Alert should have severity");
            assert!(!alert.id.is_empty(), "Alert should have ID");
            assert_eq!(
                alert.resolved, false,
                "Active alerts should not be resolved"
            );
        }
    }

    #[test]
    fn test_resolve_alert() {
        let (security_service, _temp_dir) = create_security_service();

        // Generate events and create alert
        for i in 0..20 {
            security_service
                .log_event(
                    "login_failed",
                    &format!("user{}", i),
                    Some("192.168.1.270"),
                    None,
                    None,
                )
                .expect("Failed to log failed login");
        }

        let alerts = security_service
            .check_alert_thresholds()
            .expect("Failed to check alert thresholds");
        let active_alerts = security_service
            .get_active_alerts()
            .expect("Failed to get active alerts");

        assert!(
            !active_alerts.is_empty(),
            "Should have active alerts to resolve"
        );

        // Resolve the first alert
        let alert_id = &active_alerts[0].id;
        let result =
            security_service.resolve_alert(alert_id, "False positive - legitimate testing");

        assert!(result.is_ok(), "Should successfully resolve alert");

        // Verify alert is resolved
        let updated_alerts = security_service
            .get_active_alerts()
            .expect("Failed to get active alerts");

        let resolved_alerts: Vec<_> = updated_alerts
            .iter()
            .filter(|alert| alert.id == *alert_id)
            .collect();

        assert_eq!(
            resolved_alerts.len(),
            0,
            "Resolved alert should not appear in active alerts"
        );
    }

    #[test]
    fn test_get_security_metrics_time_ranges() {
        let (security_service, _temp_dir) = create_security_service();
        let now = chrono::Utc::now();

        // Create events at different times
        let conn = security_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        // 1 hour ago
        conn.execute(
            "INSERT INTO security_events (id, event_type, user_id, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            [
                uuid::Uuid::new_v4().to_string(),
                "login_success".to_string(),
                "user1".to_string(),
                (now - chrono::Duration::minutes(30))
                    .timestamp()
                    .to_string(),
                (now - chrono::Duration::minutes(30))
                    .timestamp()
                    .to_string(),
            ],
        )
        .expect("Failed to insert 1-hour event");

        // 2 hours ago
        conn.execute(
            "INSERT INTO security_events (id, event_type, user_id, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            [
                uuid::Uuid::new_v4().to_string(),
                "login_failed".to_string(),
                "user2".to_string(),
                (now - chrono::Duration::hours(2)).timestamp().to_string(),
                (now - chrono::Duration::hours(2)).timestamp().to_string(),
            ],
        )
        .expect("Failed to insert 2-hour event");

        // Test different time ranges
        let metrics_1h = security_service
            .get_security_metrics(60)
            .expect("Failed to get 1h metrics");
        let metrics_3h = security_service
            .get_security_metrics(180)
            .expect("Failed to get 3h metrics");

        assert_eq!(
            metrics_1h.successful_logins, 1,
            "1h metrics should show 1 successful login"
        );
        assert_eq!(
            metrics_1h.failed_logins, 0,
            "1h metrics should show 0 failed logins"
        );

        assert_eq!(
            metrics_3h.successful_logins, 1,
            "3h metrics should show 1 successful login"
        );
        assert_eq!(
            metrics_3h.failed_logins, 1,
            "3h metrics should show 1 failed login"
        );
    }

    #[test]
    fn test_security_service_error_handling() {
        let (security_service, _temp_dir) = create_security_service();

        // Test with null values
        let result = security_service.log_event("test_event", "", None, None, None);
        assert!(result.is_ok(), "Should handle null values gracefully");

        // Test with very long strings
        let long_string = "a".repeat(10000);
        let result = security_service.log_event(
            &long_string,
            &long_string,
            Some(&long_string),
            Some(&long_string),
            Some(&long_string),
        );
        assert!(result.is_ok(), "Should handle long strings gracefully");

        // Test with special characters
        let result = security_service.log_event(
            "test_event_特殊字符_🔒",
            "user_特殊字符",
            Some("192.168.1.测试"),
            Some("Mozilla/5.0...🦊"),
            Some("Details with émojis 🔐 and accents"),
        );
        assert!(
            result.is_ok(),
            "Should handle special characters and emojis gracefully"
        );
    }
}
