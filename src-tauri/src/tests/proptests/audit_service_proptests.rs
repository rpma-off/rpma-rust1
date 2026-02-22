//! Property-based tests for audit service
//!
//! This module uses Proptest to verify audit logging properties
//! across a wide range of inputs to ensure robust audit functionality.

use crate::domains::audit::infrastructure::audit_service::{ActionResult, AuditEvent, AuditEventType, AuditService};
use crate::test_utils::TestDatabase;
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::{DateTime, Duration, Utc};
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_audit_event_creation_properties(
        user_id in "[a-zA-Z0-9_-]{1,20}",
        action in "[A-Z_]{1,30}",
        resource_type in prop_oneof!["task", "intervention", "client", "user"],
        description in "[a-zA-Z0-9 ]{1,100}"
    ) {
        let test_db = test_db!();
        let audit_service = AuditService::new(test_db.db());

        // Initialize audit service
        audit_service.init().unwrap();

        let event = AuditEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: AuditEventType::TaskCreated,
            user_id: user_id.clone(),
            action: action.clone(),
            resource_id: Some("test-resource-123".to_string()),
            resource_type: Some(resource_type.to_string()),
            description: description.clone(),
            ip_address: Some("192.168.1.100".to_string()),
            user_agent: Some("Test Browser/1.0".to_string()),
            result: ActionResult::Success,
            previous_state: None,
            new_state: None,
            timestamp: Utc::now(),
            metadata: None,
            session_id: None,
            request_id: None,
        };

        // Should be able to log any valid event
        let result = audit_service.log_event(event.clone());
        prop_assert!(result.is_ok());

        // Should be able to retrieve the event
        let events = audit_service.get_resource_history(
            resource_type,
            "test-resource-123",
            Some(10)
        ).unwrap();

        prop_assert!(!events.is_empty());

        let retrieved_event = &events[0];
        prop_assert_eq!(retrieved_event.user_id, user_id);
        prop_assert_eq!(retrieved_event.action, action);
        prop_assert_eq!(retrieved_event.description, description);
        prop_assert_eq!(retrieved_event.result, ActionResult::Success);
    }

    #[test]
    fn test_audit_event_metadata_properties(
        metadata_keys in prop_oneof!["cpu_usage", "memory_usage", "response_time", "error_count"],
        metadata_values in 0i32..1000i32
    ) {
        let test_db = test_db!();
        let audit_service = AuditService::new(test_db.db());

        audit_service.init().unwrap();

        let metadata = serde_json::json!({
            metadata_keys.clone(): metadata_values
        });

        let event = AuditEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: AuditEventType::SystemError,
            user_id: "system-123".to_string(),
            action: "METRIC_COLLECTION".to_string(),
            resource_id: None,
            resource_type: Some("system".to_string()),
            description: "System metric collected".to_string(),
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("Monitor Agent/1.0".to_string()),
            result: ActionResult::Success,
            previous_state: None,
            new_state: None,
            timestamp: Utc::now(),
            metadata: Some(metadata.clone()),
            session_id: None,
            request_id: Some("metric-12345".to_string()),
        };

        let result = audit_service.log_event(event);
        prop_assert!(result.is_ok());

        // Should be able to retrieve event with metadata
        let events = audit_service.get_resource_history("system", "", Some(10)).unwrap();
        prop_assert!(!events.is_empty());

        let retrieved_event = &events[0];
        prop_assert!(retrieved_event.metadata.is_some());

        let retrieved_metadata = retrieved_event.metadata.as_ref().unwrap();
        prop_assert!(retrieved_metadata.get(metadata_keys).is_some());
    }

    #[test]
    fn test_audit_event_timestamp_properties(
        timestamp_offset in -86400i64..86400i64 // ±1 day in seconds
    ) {
        let test_db = test_db!();
        let audit_service = AuditService::new(test_db.db());

        audit_service.init().unwrap();

        let timestamp = Utc::now() + Duration::seconds(timestamp_offset);

        let event = AuditEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: AuditEventType::TaskCreated,
            user_id: "user-123".to_string(),
            action: "CREATE_TASK".to_string(),
            resource_id: Some("task-456".to_string()),
            resource_type: Some("task".to_string()),
            description: "Task created with custom timestamp".to_string(),
            ip_address: None,
            user_agent: None,
            result: ActionResult::Success,
            previous_state: None,
            new_state: None,
            timestamp,
            metadata: None,
            session_id: None,
            request_id: None,
        };

        let result = audit_service.log_event(event);
        prop_assert!(result.is_ok());

        // Should be able to retrieve event with specific timestamp
        let events = audit_service.get_resource_history("task", "task-456", Some(10)).unwrap();
        prop_assert!(!events.is_empty());

        let retrieved_event = &events[0];

        // Allow for small timing differences (within 1 second)
        let time_diff = (retrieved_event.timestamp - timestamp).num_seconds().abs();
        prop_assert!(time_diff <= 1, "Timestamp difference should be <= 1 second, got {}", time_diff);
    }

    #[test]
    fn test_audit_event_state_change_properties(
        old_status in prop_oneof!["draft", "scheduled", "assigned"],
        new_status in prop_oneof!["scheduled", "assigned", "in_progress", "completed"]
    ) {
        let test_db = test_db!();
        let audit_service = AuditService::new(test_db.db());

        audit_service.init().unwrap();

        let previous_state = serde_json::json!({
            "status": old_status,
            "updated_at": "2024-01-01T00:00:00Z"
        });

        let new_state = serde_json::json!({
            "status": new_status,
            "updated_at": Utc::now().to_rfc3339()
        });

        let event = AuditEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: AuditEventType::TaskUpdated,
            user_id: "user-123".to_string(),
            action: "UPDATE_TASK".to_string(),
            resource_id: Some("task-456".to_string()),
            resource_type: Some("task".to_string()),
            description: format!("Task status changed from {} to {}", old_status, new_status),
            ip_address: Some("192.168.1.100".to_string()),
            user_agent: Some("Test Browser/1.0".to_string()),
            result: ActionResult::Success,
            previous_state: Some(previous_state.clone()),
            new_state: Some(new_state.clone()),
            timestamp: Utc::now(),
            metadata: Some(serde_json::json!({
                "changed_fields": ["status"],
                "change_reason": "user_action"
            })),
            session_id: Some("session-789".to_string()),
            request_id: Some("req-abc123".to_string()),
        };

        let result = audit_service.log_event(event);
        prop_assert!(result.is_ok());

        // Should be able to retrieve event with state changes
        let events = audit_service.get_resource_history("task", "task-456", Some(10)).unwrap();
        prop_assert!(!events.is_empty());

        let retrieved_event = &events[0];
        prop_assert!(retrieved_event.previous_state.is_some());
        prop_assert!(retrieved_event.new_state.is_some());

        let retrieved_prev = retrieved_event.previous_state.as_ref().unwrap();
        let retrieved_new = retrieved_event.new_state.as_ref().unwrap();

        prop_assert_eq!(retrieved_prev.get("status"), previous_state.get("status"));
        prop_assert_eq!(retrieved_new.get("status"), new_state.get("status"));
    }

    #[test]
    fn test_audit_event_batch_properties(
        event_count in 1..100usize
    ) {
        let test_db = test_db!();
        let audit_service = AuditService::new(test_db.db());

        audit_service.init().unwrap();

        // Log multiple events
        for i in 0..event_count {
            let event = AuditEvent {
                id: uuid::Uuid::new_v4().to_string(),
                event_type: if i % 2 == 0 { AuditEventType::TaskCreated } else { AuditEventType::TaskUpdated },
                user_id: format!("user-{}", i % 10), // 10 different users
                action: if i % 2 == 0 { "CREATE_TASK" } else { "UPDATE_TASK" },
                resource_id: Some(format!("task-{}", i)),
                resource_type: Some("task".to_string()),
                description: format!("Batch event {}", i),
                ip_address: Some("192.168.1.100".to_string()),
                user_agent: Some("Test Browser/1.0".to_string()),
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: Utc::now(),
                metadata: None,
                session_id: None,
                request_id: Some(format!("req-{}", i)),
            };

            let result = audit_service.log_event(event);
            prop_assert!(result.is_ok(), "Event {} should log successfully", i);
        }

        // Should be able to retrieve all events
        let events = audit_service.get_resource_history("task", "", Some(1000)).unwrap();
        prop_assert_eq!(events.len(), event_count);

        // Events should be in reverse chronological order
        for i in 1..event_count {
            prop_assert!(events[i-1].timestamp >= events[i].timestamp,
                "Event {} should be newer than event {}", i-1, i);
        }
    }

    #[test]
    fn test_audit_event_pagination_properties(
        total_events in 50..200usize,
        page_size in 5..50usize,
        page_offset in 0..5usize
    ) {
        let test_db = test_db!();
        let audit_service = AuditService::new(test_db.db());

        audit_service.init().unwrap();

        // Create events with different resource IDs
        for i in 0..total_events {
            let resource_id = format!("resource-{}", i % 10); // 10 different resources
            let event = AuditEvent {
                id: uuid::Uuid::new_v4().to_string(),
                event_type: AuditEventType::TaskCreated,
                user_id: "user-123".to_string(),
                action: "CREATE_TASK".to_string(),
                resource_id: Some(resource_id),
                resource_type: Some("task".to_string()),
                description: format!("Pagination test event {}", i),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: Utc::now(),
                metadata: None,
                session_id: None,
                request_id: None,
            };

            audit_service.log_event(event).unwrap();
        }

        // Test pagination
        let events = audit_service.get_resource_history(
            "task",
            "resource-5", // One specific resource
            Some(page_size as i32)
        ).unwrap();

        let max_expected_events = (total_events / 10) + if total_events % 10 != 0 { 1 } else { 0 };

        // Should not exceed page size
        prop_assert!(events.len() <= page_size);

        // Should not exceed total events for this resource
        prop_assert!(events.len() <= max_expected_events);

        // If there are more events than page size, pagination should work
        if max_expected_events > page_size && page_offset == 0 {
            prop_assert_eq!(events.len(), page_size);
        }
    }

    #[test]
    fn test_audit_event_cleanup_properties(
        event_count in 100..500usize,
        days_to_keep in 1..365u32
    ) {
        let test_db = test_db!();
        let audit_service = AuditService::new(test_db.db());

        audit_service.init().unwrap();

        // Create events
        for i in 0..event_count {
            let event = AuditEvent {
                id: uuid::Uuid::new_v4().to_string(),
                event_type: AuditEventType::TaskCreated,
                user_id: "user-123".to_string(),
                action: "CREATE_TASK".to_string(),
                resource_id: Some(format!("task-{}", i)),
                resource_type: Some("task".to_string()),
                description: format!("Cleanup test event {}", i),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: Utc::now() - Duration::days(days_to_keep as i64 + 1), // Make them old
                metadata: None,
                session_id: None,
                request_id: None,
            };

            audit_service.log_event(event).unwrap();
        }

        // Verify events exist before cleanup
        let events_before = audit_service.get_resource_history("task", "", Some(1000)).unwrap();
        prop_assert_eq!(events_before.len(), event_count);

        // Cleanup old events
        let deleted_count = audit_service.cleanup_old_events(days_to_keep).unwrap();

        // Should delete all events since they're older than retention period
        prop_assert_eq!(deleted_count, event_count as i32);

        // Verify events are deleted
        let events_after = audit_service.get_resource_history("task", "", Some(1000)).unwrap();
        prop_assert_eq!(events_after.len(), 0);
    }
}
