//! Integration tests for audit repository
//!
//! Tests audit repository with actual database interactions including:
//! - Audit trail creation and retrieval
//! - Historical data management
//! - Event filtering and pagination
//! - Data retention policies

use crate::domains::audit::infrastructure::audit_repository::AuditRepository;
use crate::domains::audit::infrastructure::audit_service::{AuditEvent, AuditEventType};
use crate::test_db;
use chrono::Utc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_audit_repository() -> AuditRepository {
        let test_db = test_db!();
        AuditRepository::new(test_db.db())
    }

    fn create_test_audit_event() -> AuditEvent {
        AuditEvent {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: Some("test_user_123".to_string()),
            event_type: AuditEventType::LoginSuccess,
            severity: AuditSeverity::Info,
            resource_type: Some("user_session".to_string()),
            resource_id: Some("session_abc123".to_string()),
            details: Some("User logged in successfully".to_string()),
            ip_address: Some("192.168.1.100".to_string()),
            user_agent: Some("Mozilla/5.0...".to_string()),
            created_at: chrono::Utc::now().timestamp(),
        }
    }

    #[test]
    fn test_create_audit_event_success() {
        let repo = create_audit_repository();
        let event = create_test_audit_event();

        let result = repo.create(&event);

        assert!(result.is_ok(), "Audit event creation should succeed");
        let created = result.unwrap();

        assert!(!created.id.is_empty());
        assert_eq!(created.user_id, Some("test_user_123".to_string()));
        assert_eq!(created.event_type, AuditEventType::LoginSuccess);
        assert_eq!(created.severity, AuditSeverity::Info);
        assert!(created.created_at > 0);
    }

    #[test]
    fn test_get_audit_event_by_id() {
        let repo = create_audit_repository();
        let event = create_test_audit_event();
        let created = repo.create(&event).expect("Should create audit event");

        // Retrieve by ID
        let retrieved = repo
            .get_by_id(&created.id)
            .expect("Should retrieve audit event");

        assert_eq!(retrieved.id, created.id);
        assert_eq!(retrieved.user_id, created.user_id);
        assert_eq!(retrieved.event_type, created.event_type);
        assert_eq!(retrieved.details, created.details);
    }

    #[test]
    fn test_get_audit_event_not_found() {
        let repo = create_audit_repository();
        let nonexistent_id = uuid::Uuid::new_v4().to_string();

        let result = repo.get_by_id(&nonexistent_id);
        assert!(result.is_err(), "Should fail for nonexistent ID");
    }

    #[test]
    fn test_find_events_by_user() {
        let repo = create_audit_repository();
        let user_id = "user_search_test".to_string();

        // Create multiple events for user
        let event_types = vec![
            AuditEventType::LoginSuccess,
            AuditEventType::TaskCreated,
            AuditEventType::TaskUpdated,
            AuditEventType::LoginFailed,
        ];

        for event_type in event_types {
            let mut event = create_test_audit_event();
            event.user_id = Some(user_id.clone());
            event.event_type = event_type;
            event.details = Some(format!("Event for user: {:?}", event_type));

            repo.create(&event).expect("Should create audit event");
        }

        // Find events for user
        let user_events = repo
            .find_by_user(&user_id, 10, 0)
            .expect("Should find user events");

        assert_eq!(user_events.len(), 4);
        let user_event_types: Vec<_> = user_events.iter().map(|e| e.event_type).collect();
        assert!(user_event_types.contains(&AuditEventType::LoginSuccess));
        assert!(user_event_types.contains(&AuditEventType::TaskCreated));
        assert!(user_event_types.contains(&AuditEventType::TaskUpdated));
        assert!(user_event_types.contains(&AuditEventType::LoginFailed));
    }

    #[test]
    fn test_find_events_by_event_type() {
        let repo = create_audit_repository();

        // Create multiple login events
        for i in 0..5 {
            let mut event = create_test_audit_event();
            event.event_type = AuditEventType::LoginSuccess;
            event.user_id = Some(format!("user_{}", i));
            event.details = Some(format!("Login event {}", i));

            repo.create(&event).expect("Should create audit event");
        }

        // Create some task events
        for i in 0..3 {
            let mut event = create_test_audit_event();
            event.event_type = AuditEventType::TaskCreated;
            event.user_id = Some(format!("user_{}", i));
            event.details = Some(format!("Task event {}", i));

            repo.create(&event).expect("Should create audit event");
        }

        // Find only login events
        let login_events = repo
            .find_by_event_type(&AuditEventType::LoginSuccess, 10, 0)
            .expect("Should find login events");

        assert_eq!(login_events.len(), 5);
        for event in &login_events {
            assert_eq!(event.event_type, AuditEventType::LoginSuccess);
        }

        // Find only task events
        let task_events = repo
            .find_by_event_type(&AuditEventType::TaskCreated, 10, 0)
            .expect("Should find task events");

        assert_eq!(task_events.len(), 3);
        for event in &task_events {
            assert_eq!(event.event_type, AuditEventType::TaskCreated);
        }
    }

    #[test]
    fn test_find_events_by_severity() {
        let repo = create_audit_repository();

        // Create events with different severities
        let severities = vec![
            (AuditSeverity::Info, 5),
            (AuditSeverity::Warning, 3),
            (AuditSeverity::Error, 2),
            (AuditSeverity::Critical, 1),
        ];

        for (severity, count) in severities {
            for i in 0..count {
                let mut event = create_test_audit_event();
                event.severity = severity;
                event.details = Some(format!("{} severity event {:?}", severity, i));
                event.user_id = Some(format!("severity_user_{}", i));

                repo.create(&event).expect("Should create audit event");
            }
        }

        // Find only error and critical events
        let high_severity_events = repo
            .find_by_severity(&vec![AuditSeverity::Error, AuditSeverity::Critical], 10, 0)
            .expect("Should find high severity events");

        assert_eq!(high_severity_events.len(), 3); // 2 error + 1 critical

        for event in &high_severity_events {
            assert!(
                event.severity == AuditSeverity::Error || event.severity == AuditSeverity::Critical
            );
        }
    }

    #[test]
    fn test_find_events_by_date_range() {
        let repo = create_audit_repository();
        let now = chrono::Utc::now();

        // Create events at different times
        let time_offsets = vec![
            (-2, "2 days ago"),
            (-1, "1 day ago"),
            (0, "now"),
            (1, "1 day from now"),
            (2, "2 days from now"),
        ];

        for (days_offset, description) in time_offsets {
            let mut event = create_test_audit_event();
            event.created_at = (now + chrono::Duration::days(days_offset)).timestamp();
            event.details = Some(format!("Event {}", description));

            repo.create(&event).expect("Should create audit event");
        }

        // Find events from yesterday to tomorrow
        let start_date = now - chrono::Duration::days(1);
        let end_date = now + chrono::Duration::days(1);

        let date_range_events = repo
            .find_by_date_range(start_date.timestamp(), end_date.timestamp(), 10, 0)
            .expect("Should find events in date range");

        assert_eq!(date_range_events.len(), 3); // 1 day ago, now, 1 day from now

        for event in &date_range_events {
            assert!(event.created_at >= start_date.timestamp());
            assert!(event.created_at <= end_date.timestamp());
        }
    }

    #[test]
    fn test_find_events_by_resource() {
        let repo = create_audit_repository();
        let resource_id = "task_12345".to_string();
        let resource_type = "task".to_string();

        // Create events for the same resource
        let event_types = vec![
            AuditEventType::TaskCreated,
            AuditEventType::TaskUpdated,
            AuditEventType::TaskAssigned,
            AuditEventType::TaskCompleted,
        ];

        for event_type in event_types {
            let mut event = create_test_audit_event();
            event.event_type = event_type;
            event.resource_type = Some(resource_type.clone());
            event.resource_id = Some(resource_id.clone());
            event.details = Some(format!(
                "{} operation on resource",
                format!("{:?}", event_type)
            ));

            repo.create(&event).expect("Should create audit event");
        }

        // Find events for this resource
        let resource_events = repo
            .find_by_resource(&resource_type, &resource_id, 10, 0)
            .expect("Should find resource events");

        assert_eq!(resource_events.len(), 4);
        for event in &resource_events {
            assert_eq!(event.resource_type.as_ref().unwrap(), &resource_type);
            assert_eq!(event.resource_id.as_ref().unwrap(), &resource_id);
        }
    }

    #[test]
    fn test_complex_filter_combinations() {
        let repo = create_audit_repository();
        let user_id = "complex_filter_user".to_string();

        // Create events with various attributes
        for i in 0..10 {
            let mut event = create_test_audit_event();
            event.user_id = Some(user_id.clone());

            // Vary event types
            event.event_type = match i % 4 {
                0 => AuditEventType::LoginSuccess,
                1 => AuditEventType::TaskCreated,
                2 => AuditEventType::TaskUpdated,
                _ => AuditEventType::LoginFailed,
            };

            // Vary severities
            event.severity = match i % 3 {
                0 => AuditSeverity::Info,
                1 => AuditSeverity::Warning,
                _ => AuditSeverity::Error,
            };

            event.details = Some(format!("Complex filter test {}", i));

            repo.create(&event).expect("Should create audit event");
        }

        // Complex query: Find login and task events with warning or error severity
        let found = repo
            .find_with_filters(
                Some(&user_id),
                Some(&vec![
                    AuditEventType::LoginSuccess,
                    AuditEventType::TaskCreated,
                    AuditEventType::TaskUpdated,
                    AuditEventType::LoginFailed,
                ]),
                Some(&vec![AuditSeverity::Warning, AuditSeverity::Error]),
                None,
                None,
                10,
                0,
            )
            .expect("Should find events with complex filters");

        // Should find events with warning (3) and error (3) severity
        assert_eq!(found.len(), 6);

        for event in &found {
            assert!(
                event.severity == AuditSeverity::Warning || event.severity == AuditSeverity::Error
            );
            assert!(event.user_id.as_ref().unwrap() == &user_id);
        }
    }

    #[test]
    fn test_audit_event_pagination() {
        let repo = create_audit_repository();

        // Create 25 events
        for i in 0..25 {
            let mut event = create_test_audit_event();
            event.details = Some(format!("Pagination test {}", i));

            repo.create(&event).expect("Should create audit event");
        }

        // Test pagination
        let page1 = repo
            .find_with_filters(None, None, None, None, None, 10, 0)
            .expect("Should get first page");
        let page2 = repo
            .find_with_filters(None, None, None, None, None, 10, 1)
            .expect("Should get second page");
        let page3 = repo
            .find_with_filters(None, None, None, None, None, 10, 2)
            .expect("Should get third page");

        assert_eq!(page1.len(), 10);
        assert_eq!(page2.len(), 10);
        assert_eq!(page3.len(), 5);

        // Verify no duplicates across pages
        let all_ids: Vec<_> = page1
            .iter()
            .chain(page2.iter())
            .chain(page3.iter())
            .map(|e| e.id.clone())
            .collect();
        let unique_ids: std::collections::HashSet<_> = all_ids.iter().cloned().collect();
        assert_eq!(
            all_ids.len(),
            unique_ids.len(),
            "Should have no duplicate events"
        );
    }

    #[test]
    fn test_audit_event_sorting() {
        let repo = create_audit_repository();

        // Create events with different timestamps
        let now = chrono::Utc::now();
        let time_offsets = vec![
            (-5, "5 days ago"),
            (-3, "3 days ago"),
            (-1, "1 day ago"),
            (0, "now"),
            (2, "2 days from now"),
        ];

        for (days_offset, description) in time_offsets {
            let mut event = create_test_audit_event();
            event.created_at = (now + chrono::Duration::days(days_offset)).timestamp();
            event.details = Some(format!("Sort test {}", description));

            repo.create(&event).expect("Should create audit event");
        }

        // Sort by creation date ascending
        let found = repo
            .find_with_filters(
                None,
                None,
                None,
                None,
                Some("created_at"),
                Some("asc"),
                10,
                0,
            )
            .expect("Should find events");

        assert_eq!(found.len(), 5);
        let timestamps: Vec<_> = found.iter().map(|e| e.created_at).collect();
        assert!(timestamps.is_sorted(), "Should be sorted ascending");

        // Verify order
        assert!(found[0].details.as_ref().unwrap().contains("5 days ago"));
        assert!(found[2].details.as_ref().unwrap().contains("1 day ago"));
        assert!(found[4]
            .details
            .as_ref()
            .unwrap()
            .contains("2 days from now"));
    }

    #[test]
    fn test_delete_old_events() {
        let repo = create_audit_repository();
        let now = chrono::Utc::now();

        // Create old events (90 days ago)
        let old_threshold = now - chrono::Duration::days(90);

        for i in 0..5 {
            let mut event = create_test_audit_event();
            event.created_at = old_threshold.timestamp();
            event.details = Some(format!("Old event {}", i));

            repo.create(&event).expect("Should create audit event");
        }

        // Create recent events (10 days ago)
        let recent_threshold = now - chrono::Duration::days(10);

        for i in 0..3 {
            let mut event = create_test_audit_event();
            event.created_at = recent_threshold.timestamp();
            event.details = Some(format!("Recent event {}", i));

            repo.create(&event).expect("Should create audit event");
        }

        // Delete events older than 30 days
        let delete_count = repo
            .delete_before_date((now - chrono::Duration::days(30)).timestamp())
            .expect("Should delete old events");

        assert_eq!(delete_count, 5, "Should delete 5 old events");

        // Verify recent events remain
        let remaining_count = repo.count().expect("Should count remaining events");
        assert_eq!(remaining_count, 3, "Recent events should remain");
    }

    #[test]
    fn test_get_audit_statistics() {
        let repo = create_audit_repository();

        // Create events with different types and severities
        let event_data = vec![
            (AuditEventType::LoginSuccess, AuditSeverity::Info, 3),
            (AuditEventType::LoginFailed, AuditSeverity::Warning, 2),
            (AuditEventType::TaskCreated, AuditSeverity::Info, 5),
            (AuditEventType::TaskUpdated, AuditSeverity::Info, 4),
            (AuditEventType::UserDeleted, AuditSeverity::Critical, 1),
            (AuditEventType::SystemError, AuditSeverity::Error, 2),
        ];

        for (event_type, severity, count) in event_data {
            for i in 0..count {
                let mut event = create_test_audit_event();
                event.event_type = event_type;
                event.severity = severity;
                event.details = Some(format!("Stats test {} {}", format!("{:?}", event_type), i));

                repo.create(&event).expect("Should create audit event");
            }
        }

        // Get statistics
        let stats = repo.get_statistics().expect("Should get statistics");

        assert_eq!(stats.total_events, 17);
        assert_eq!(stats.login_success_events, 3);
        assert_eq!(stats.login_failed_events, 2);
        assert_eq!(stats.task_created_events, 5);
        assert_eq!(stats.task_updated_events, 4);
        assert_eq!(stats.user_deleted_events, 1);
        assert_eq!(stats.system_error_events, 2);

        assert_eq!(stats.info_events, 8); // 3 + 5 + 4
        assert_eq!(stats.warning_events, 2);
        assert_eq!(stats.error_events, 2);
        assert_eq!(stats.critical_events, 1);
    }

    #[test]
    fn test_audit_foreign_key_constraints() {
        let repo = create_audit_repository();
        let nonexistent_user_id = uuid::Uuid::new_v4().to_string();

        let mut event = create_test_audit_event();
        event.user_id = Some(nonexistent_user_id);

        let result = repo.create(&event);
        // This might not fail if user_id is nullable, but test verifies behavior
        assert!(result.is_ok(), "Should handle nonexistent user gracefully");

        let created = result.unwrap();

        // Check if the event is linked correctly or if FK is enforced
        let conn = repo.get_connection().expect("Should get connection");

        let mut stmt = conn
            .prepare(
                "
            SELECT COUNT(*) FROM audit_events a 
            LEFT JOIN users u ON a.user_id = u.id 
            WHERE a.id = ?1 AND a.user_id IS NOT NULL AND u.id IS NULL
        ",
            )
            .expect("Should prepare FK check query");

        let orphaned_events: i64 = stmt
            .query_row([&created.id], |row| row.get(0))
            .expect("Should check FK constraints");

        assert_eq!(
            orphaned_events, 0,
            "Should have proper foreign key constraints"
        );
    }

    #[test]
    fn test_performance_with_large_dataset() {
        let repo = create_audit_repository();

        // Create 1000 audit events to test performance
        let start_time = std::time::Instant::now();

        for i in 0..1000 {
            let mut event = create_test_audit_event();
            event.event_type = match i % 10 {
                0 => AuditEventType::LoginSuccess,
                1 => AuditEventType::TaskCreated,
                2 => AuditEventType::TaskUpdated,
                3 => AuditEventType::TaskAssigned,
                4 => AuditEventType::TaskCompleted,
                5 => AuditEventType::UserCreated,
                6 => AuditEventType::UserUpdated,
                7 => AuditEventType::LoginFailed,
                8 => AuditEventType::SystemError,
                _ => AuditEventType::UserDeleted,
            };
            event.details = Some(format!("Performance test {}", i));

            repo.create(&event).expect("Should create audit event");
        }

        let creation_time = start_time.elapsed();

        // Test query performance with filters
        let start_time = std::time::Instant::now();

        let found = repo
            .find_with_filters(
                None,
                Some(&vec![
                    AuditEventType::LoginSuccess,
                    AuditEventType::TaskCreated,
                ]),
                Some(&vec![AuditSeverity::Info, AuditSeverity::Warning]),
                None,
                None,
                100,
                0,
            )
            .expect("Should find events");

        let query_time = start_time.elapsed();

        assert_eq!(found.len(), 100); // 50 login + 50 task events
        assert!(
            creation_time.as_millis() < 10000,
            "Creation should be reasonable for 1000 events"
        );
        assert!(
            query_time.as_millis() < 5000,
            "Complex query should be fast"
        );
    }

    #[test]
    fn test_audit_event_integrity() {
        let repo = create_audit_repository();
        let event = create_test_audit_event();
        let created = repo.create(&event).expect("Should create audit event");

        // Verify data integrity
        let conn = repo.get_connection().expect("Should get connection");

        // Check event exists
        let event_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM audit_events WHERE id = ?1",
                [&created.id],
                |row| row.get(0),
            )
            .expect("Should count event");
        assert_eq!(event_count, 1, "Event should exist");

        // Verify required fields are not null
        let mut stmt = conn
            .prepare(
                "
            SELECT COUNT(*) FROM audit_events 
            WHERE id = ?1 AND (event_type IS NULL OR created_at IS NULL)
        ",
            )
            .expect("Should prepare integrity check query");

        let null_fields: i64 = stmt
            .query_row([&created.id], |row| row.get(0))
            .expect("Should check for null required fields");

        assert_eq!(null_fields, 0, "Required fields should not be null");

        // Verify timestamps are reasonable
        let mut stmt = conn
            .prepare(
                "
            SELECT created_at, updated_at FROM audit_events WHERE id = ?1
        ",
            )
            .expect("Should prepare timestamp check query");

        let (created_at, updated_at): (i64, i64) = stmt
            .query_row([&created.id], |row| Ok((row.get(0)?, row.get(1)?)))
            .expect("Should check timestamps");

        assert!(created_at > 0, "Created at should be valid timestamp");
        assert!(updated_at > 0, "Updated at should be valid timestamp");
    }
}
