//! Property-based tests for task validation
//!
//! This module uses Proptest to verify task validation properties
//! across a wide range of inputs to ensure robust validation logic.

use crate::models::task::CreateTaskRequest;
use crate::services::task_validation::TaskValidationService;
use crate::test_utils::{test_db, TestDatabase};
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_task_title_validation_properties(title in "\\PC*") {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = CreateTaskRequest {
            title: title.clone(),
            description: Some("Valid description".to_string()),
            vehicle_plate: Some("ABC123".to_string()),
            status: "draft".to_string(),
            priority: "medium".to_string(),
            technician_id: None,
            scheduled_date: None,
            client_id: None,
            customer_name: Some("Valid Customer".to_string()),
            customer_email: Some("valid@example.com".to_string()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("Valid Address".to_string()),
            estimated_duration: Some(120),
            notes: Some("Valid notes".to_string()),
            tags: Some("test".to_string()),
            workflow_id: None,
            template_id: None,
            vin: None,
            ppf_zones: None,
            custom_ppf_zones: None,
            assigned_at: None,
            assigned_by: None,
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            actual_duration: None,
        };

        let result = service.validate_create_task_request(&task_request).unwrap();

        // Properties that should always hold:
        if title.is_empty() {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Title is required")));
        } else if title.len() > 255 {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Title too long")));
        } else {
            prop_assert!(result.is_valid);
        }
    }

    #[test]
    fn test_vehicle_plate_validation_properties(plate in "[A-Z0-9]{0,10}") {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = CreateTaskRequest {
            title: "Valid Task Title".to_string(),
            description: Some("Valid description".to_string()),
            vehicle_plate: Some(plate.clone()),
            status: "draft".to_string(),
            priority: "medium".to_string(),
            technician_id: None,
            scheduled_date: None,
            client_id: None,
            customer_name: Some("Valid Customer".to_string()),
            customer_email: Some("valid@example.com".to_string()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("Valid Address".to_string()),
            estimated_duration: Some(120),
            notes: Some("Valid notes".to_string()),
            tags: Some("test".to_string()),
            workflow_id: None,
            template_id: None,
            vin: None,
            ppf_zones: None,
            custom_ppf_zones: None,
            assigned_at: None,
            assigned_by: None,
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            actual_duration: None,
        };

        let result = service.validate_create_task_request(&task_request).unwrap();

        // Properties that should always hold:
        if plate.is_empty() {
            // Empty plate should be valid (optional field)
            prop_assert!(result.is_valid);
        } else if plate.len() > 20 {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Invalid vehicle plate")));
        } else {
            // Valid alphanumeric plates should be valid
            prop_assert!(result.is_valid);
        }
    }

    #[test]
    fn test_email_validation_properties(email_local in "[a-zA-Z0-9]{1,10}",
                                   email_domain in "[a-zA-Z0-9]{1,10}") {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let email = format!("{}@{}.com", email_local, email_domain);

        let task_request = CreateTaskRequest {
            title: "Valid Task Title".to_string(),
            description: Some("Valid description".to_string()),
            vehicle_plate: Some("ABC123".to_string()),
            status: "draft".to_string(),
            priority: "medium".to_string(),
            technician_id: None,
            scheduled_date: None,
            client_id: None,
            customer_name: Some("Valid Customer".to_string()),
            customer_email: Some(email.clone()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("Valid Address".to_string()),
            estimated_duration: Some(120),
            notes: Some("Valid notes".to_string()),
            tags: Some("test".to_string()),
            workflow_id: None,
            template_id: None,
            vin: None,
            ppf_zones: None,
            custom_ppf_zones: None,
            assigned_at: None,
            assigned_by: None,
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            actual_duration: None,
        };

        let result = service.validate_create_task_request(&task_request).unwrap();

        // Valid email pattern should always pass validation
        prop_assert!(result.is_valid);
    }

    #[test]
    fn test_duration_validation_properties(duration in 0i32..10000) {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = CreateTaskRequest {
            title: "Valid Task Title".to_string(),
            description: Some("Valid description".to_string()),
            vehicle_plate: Some("ABC123".to_string()),
            status: "draft".to_string(),
            priority: "medium".to_string(),
            technician_id: None,
            scheduled_date: None,
            client_id: None,
            customer_name: Some("Valid Customer".to_string()),
            customer_email: Some("valid@example.com".to_string()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("Valid Address".to_string()),
            estimated_duration: Some(duration),
            notes: Some("Valid notes".to_string()),
            tags: Some("test".to_string()),
            workflow_id: None,
            template_id: None,
            vin: None,
            ppf_zones: None,
            custom_ppf_zones: None,
            assigned_at: None,
            assigned_by: None,
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            actual_duration: None,
        };

        let result = service.validate_create_task_request(&task_request).unwrap();

        // Properties that should always hold:
        if duration < 0 {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Estimated duration must be positive")));
        } else if duration > 86400 { // 24 hours in seconds
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Estimated duration too long")));
        } else {
            prop_assert!(result.is_valid);
        }
    }

    #[test]
    fn test_phone_number_validation_properties(digits in "[0-9]{7,15}") {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        // Format phone numbers in different ways
        let formats = vec![
            digits.clone(),
            format!("{}-{}", &digits[..3], &digits[3..]),
            format!("({}) {}", &digits[..3], &digits[3..]),
            format!("({})-{}", &digits[..3], &digits[3..]),
        ];

        for phone in formats {
            let task_request = CreateTaskRequest {
                title: "Valid Task Title".to_string(),
                description: Some("Valid description".to_string()),
                vehicle_plate: Some("ABC123".to_string()),
                status: "draft".to_string(),
                priority: "medium".to_string(),
                technician_id: None,
                scheduled_date: None,
                client_id: None,
                customer_name: Some("Valid Customer".to_string()),
                customer_email: Some("valid@example.com".to_string()),
                customer_phone: Some(phone.clone()),
                customer_address: Some("Valid Address".to_string()),
                estimated_duration: Some(120),
                notes: Some("Valid notes".to_string()),
                tags: Some("test".to_string()),
                workflow_id: None,
                template_id: None,
                vin: None,
                ppf_zones: None,
                custom_ppf_zones: None,
                assigned_at: None,
                assigned_by: None,
                start_time: None,
                end_time: None,
                date_rdv: None,
                heure_rdv: None,
                actual_duration: None,
            };

            let result = service.validate_create_task_request(&task_request).unwrap();

            // Valid phone number formats should pass validation
            prop_assert!(result.is_valid, "Phone number {} should be valid", phone);
        }
    }

    #[test]
    fn test_status_transition_properties(
        from_status in prop_oneof!["draft", "scheduled", "assigned", "in_progress", "paused", "completed", "cancelled", "failed"],
        to_status in prop_oneof!["draft", "scheduled", "assigned", "in_progress", "paused", "completed", "cancelled", "failed"]
    ) {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let result = service.validate_status_transition(from_status, to_status).unwrap();

        // Properties that should always hold:

        // Can't transition from completed state
        if from_status == "completed" {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Invalid status transition")));
        }

        // Can't transition from cancelled state
        if from_status == "cancelled" {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Invalid status transition")));
        }

        // Can't transition to draft state (except from draft itself)
        if to_status == "draft" && from_status != "draft" {
            prop_assert!(!result.is_valid);
            prop_assert!(result.errors.iter().any(|e| e.contains("Invalid status transition")));
        }

        // Valid transitions should be allowed
        let valid_transitions = vec![
            ("draft", "scheduled"),
            ("draft", "cancelled"),
            ("scheduled", "assigned"),
            ("scheduled", "cancelled"),
            ("assigned", "in_progress"),
            ("assigned", "cancelled"),
            ("in_progress", "paused"),
            ("in_progress", "completed"),
            ("in_progress", "failed"),
            ("paused", "in_progress"),
            ("failed", "in_progress"),
        ];

        if valid_transitions.contains(&(from_status, to_status)) {
            prop_assert!(result.is_valid, "Valid transition from {} to {} should be allowed", from_status, to_status);
        }
    }

    #[test]
    fn test_task_request_roundtrip_properties(
        title in "[a-zA-Z0-9 ]{1,50}",
        description in prop_oneof![
            Just(None),
            Just(Some("Valid description".to_string())),
        ],
        priority in prop_oneof!["low", "medium", "high"]
    ) {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = CreateTaskRequest {
            title: title.clone(),
            description: description.clone(),
            vehicle_plate: Some("ABC123".to_string()),
            status: "draft".to_string(),
            priority: priority.to_string(),
            technician_id: None,
            scheduled_date: None,
            client_id: None,
            customer_name: Some("Valid Customer".to_string()),
            customer_email: Some("valid@example.com".to_string()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("Valid Address".to_string()),
            estimated_duration: Some(120),
            notes: Some("Valid notes".to_string()),
            tags: Some("test".to_string()),
            workflow_id: None,
            template_id: None,
            vin: None,
            ppf_zones: None,
            custom_ppf_zones: None,
            assigned_at: None,
            assigned_by: None,
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            actual_duration: None,
        };

        let result = service.validate_create_task_request(&task_request).unwrap();

        // Valid request should pass validation
        prop_assert!(result.is_valid);

        // Request properties should be preserved
        prop_assert_eq!(result.title, title);
        prop_assert_eq!(result.description, description);
        prop_assert_eq!(result.priority, priority);
    }

    #[test]
    fn test_validation_error_accumulation_properties(
        title_errors in prop_oneof!["", "A".repeat(256)],
        email_errors in prop_oneof!["invalid-email", "no-at-symbol.com", "@missing-local.com"],
        duration_errors in prop_oneof![-1, -100, 100000]
    ) {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = CreateTaskRequest {
            title: title_errors.clone(),
            description: Some("Valid description".to_string()),
            vehicle_plate: Some("ABC123".to_string()),
            status: "draft".to_string(),
            priority: "medium".to_string(),
            technician_id: None,
            scheduled_date: None,
            client_id: None,
            customer_name: Some("Valid Customer".to_string()),
            customer_email: Some(email_errors.clone()),
            customer_phone: Some("555-1234".to_string()),
            customer_address: Some("Valid Address".to_string()),
            estimated_duration: Some(duration_errors),
            notes: Some("Valid notes".to_string()),
            tags: Some("test".to_string()),
            workflow_id: None,
            template_id: None,
            vin: None,
            ppf_zones: None,
            custom_ppf_zones: None,
            assigned_at: None,
            assigned_by: None,
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            actual_duration: None,
        };

        let result = service.validate_create_task_request(&task_request).unwrap();

        // Should have multiple validation errors
        prop_assert!(!result.is_valid);
        prop_assert!(result.errors.len() >= 2);

        // Should have specific errors for each invalid field
        if title_errors.is_empty() {
            prop_assert!(result.errors.iter().any(|e| e.contains("Title is required")));
        } else if title_errors.len() > 255 {
            prop_assert!(result.errors.iter().any(|e| e.contains("Title too long")));
        }

        if email_errors.contains("invalid-email") {
            prop_assert!(result.errors.iter().any(|e| e.contains("Invalid email")));
        }

        if duration_errors < 0 {
            prop_assert!(result.errors.iter().any(|e| e.contains("Estimated duration must be positive")));
        }
    }
}
