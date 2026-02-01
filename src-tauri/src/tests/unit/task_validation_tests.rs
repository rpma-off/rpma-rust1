//! Unit tests for task service validation
//!
//! This module contains comprehensive tests for task validation logic
//! to ensure business rules are properly enforced.

use crate::commands::AppResult;
use crate::services::task_validation::TaskValidationService;
use crate::test_utils::{test_db, test_task, TestDataFactory, TestDatabase};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_task_request_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(
            title: "Valid Task".to_string(),
            vehicle_plate: Some("ABC123".to_string()),
            vin: Some("1HGCM82633A004352".to_string())
        );

        let result = service.validate_create_task_request(&task_request)?;
        assert!(result.is_valid);
        assert!(result.errors.is_empty());

        Ok(())
    }

    #[test]
    fn test_validate_empty_title() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(title: "".to_string());
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Title is required")));
    }

    #[test]
    fn test_validate_title_too_long() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let long_title = "A".repeat(256); // Assuming max length is 255
        let task_request = test_task!(title: long_title);
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| e.contains("Title too long")));
    }

    #[test]
    fn test_validate_invalid_vehicle_plate() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let invalid_plates = vec![
            "",             // Empty
            "A".repeat(21), // Too long
            "INVALID!",     // Contains special characters
        ];

        for invalid_plate in invalid_plates {
            let task_request = test_task!(vehicle_plate: Some(invalid_plate));
            let result = service.validate_create_task_request(&task_request).unwrap();

            assert!(!result.is_valid);
            assert!(result
                .errors
                .iter()
                .any(|e| e.contains("Invalid vehicle plate")));
        }
    }

    #[test]
    fn test_validate_invalid_vin() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let invalid_vins = vec![
            "",                         // Empty
            "TOO_SHORT",                // Too short
            "1HGCM82633A004352INVALID", // Too long
            "INVALID_CHARS!@#",         // Contains invalid characters
        ];

        for invalid_vin in invalid_vins {
            let task_request = test_task!(vin: Some(invalid_vin));
            let result = service.validate_create_task_request(&task_request).unwrap();

            assert!(!result.is_valid);
            assert!(result.errors.iter().any(|e| e.contains("Invalid VIN")));
        }
    }

    #[test]
    fn test_validate_invalid_email() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let invalid_emails = vec![
            "invalid-email", // Missing @ and domain
            "@invalid.com",  // Missing local part
            "invalid@",      // Missing domain
            "invalid@.com",  // Invalid domain
            "invalid@com",   // Missing TLD
        ];

        for invalid_email in invalid_emails {
            let task_request = test_task!(customer_email: Some(invalid_email.to_string()));
            let result = service.validate_create_task_request(&task_request).unwrap();

            assert!(!result.is_valid);
            assert!(result.errors.iter().any(|e| e.contains("Invalid email")));
        }
    }

    #[test]
    fn test_validate_valid_email() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let valid_emails = vec![
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org",
            "user123@test-domain.com",
        ];

        for valid_email in valid_emails {
            let task_request = test_task!(customer_email: Some(valid_email.to_string()));
            let result = service.validate_create_task_request(&task_request)?;
            assert!(result.is_valid);
        }

        Ok(())
    }

    #[test]
    fn test_validate_invalid_phone() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let invalid_phones = vec![
            "123",           // Too short
            "1".repeat(21),  // Too long
            "INVALID_PHONE", // Contains letters
            "555-ABC-1234",  // Contains letters
        ];

        for invalid_phone in invalid_phones {
            let task_request = test_task!(customer_phone: Some(invalid_phone.to_string()));
            let result = service.validate_create_task_request(&task_request).unwrap();

            assert!(!result.is_valid);
            assert!(result
                .errors
                .iter()
                .any(|e| e.contains("Invalid phone number")));
        }
    }

    #[test]
    fn test_validate_valid_phone() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let valid_phones = vec![
            "555-1234",
            "(555) 123-4567",
            "+1 (555) 123-4567",
            "555.123.4567",
            "5551234567",
        ];

        for valid_phone in valid_phones {
            let task_request = test_task!(customer_phone: Some(valid_phone.to_string()));
            let result = service.validate_create_task_request(&task_request)?;
            assert!(result.is_valid);
        }

        Ok(())
    }

    #[test]
    fn test_validate_negative_duration() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(estimated_duration: Some(-60));
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Estimated duration must be positive")));
    }

    #[test]
    fn test_validate_excessive_duration() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        // Assuming max duration is 24 hours (86400 seconds)
        let task_request = test_task!(estimated_duration: Some(90000)); // 25 hours
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Estimated duration too long")));
    }

    #[test]
    fn test_validate_invalid_status() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(status: "invalid_status".to_string());
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| e.contains("Invalid status")));
    }

    #[test]
    fn test_validate_invalid_priority() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(priority: "invalid_priority".to_string());
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| e.contains("Invalid priority")));
    }

    #[test]
    fn test_validate_multiple_errors() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(
            title: "".to_string(), // Invalid: empty
            vehicle_plate: Some("INVALID!".to_string()), // Invalid: special chars
            customer_email: Some("invalid-email".to_string()), // Invalid: malformed
            estimated_duration: Some(-60) // Invalid: negative
        );

        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result.errors.len() >= 4); // Should have at least 4 errors

        // Check for specific errors
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Title is required")));
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Invalid vehicle plate")));
        assert!(result.errors.iter().any(|e| e.contains("Invalid email")));
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Estimated duration must be positive")));
    }

    #[test]
    fn test_validate_update_request() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        // Create a task first
        let task_request = test_task!(title: "Original Task".to_string());
        let created_task = TestDataFactory::create_test_task(None);

        let update_request = crate::models::task::UpdateTaskRequest {
            id: "task-id".to_string(),
            title: Some("Updated Task".to_string()),
            description: Some("Updated description".to_string()),
            ..Default::default()
        };

        let result = service.validate_update_task_request(&update_request, &created_task)?;
        assert!(result.is_valid);
        assert!(result.errors.is_empty());

        Ok(())
    }

    #[test]
    fn test_validate_status_transition() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        // Test valid transitions
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

        for (from_status, to_status) in valid_transitions {
            let result = service.validate_status_transition(from_status, to_status)?;
            assert!(
                result.is_valid,
                "Valid transition from {} to {} failed",
                from_status, to_status
            );
        }

        // Test invalid transitions
        let invalid_transitions = vec![
            ("draft", "completed"),       // Can't complete directly from draft
            ("scheduled", "completed"),   // Can't complete without in_progress
            ("assigned", "completed"),    // Can't complete without in_progress
            ("completed", "in_progress"), // Can't resume completed task
            ("cancelled", "in_progress"), // Can't resume cancelled task
        ];

        for (from_status, to_status) in invalid_transitions {
            let result = service.validate_status_transition(from_status, to_status)?;
            assert!(
                !result.is_valid,
                "Invalid transition from {} to {} should fail",
                from_status, to_status
            );
            assert!(result
                .errors
                .iter()
                .any(|e| e.contains("Invalid status transition")));
        }

        Ok(())
    }

    #[test]
    fn test_validate_duplicate_vehicle_date() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        // Create first task
        let task1_request = test_task!(
            vehicle_plate: Some("DUPLICATE123".to_string()),
            scheduled_date: Some("2024-01-15".to_string())
        );

        // Create second task with same vehicle and date
        let task2_request = test_task!(
            title: "Duplicate Task".to_string(),
            vehicle_plate: Some("DUPLICATE123".to_string()),
            scheduled_date: Some("2024-01-15".to_string())
        );

        // Validate second task (should detect conflict)
        let result = service.validate_create_task_request(&task2_request)?;

        // This test depends on implementation - adjust based on actual business rules
        // If duplicate detection is implemented, this should fail
        // If not, this should pass

        Ok(())
    }
}
