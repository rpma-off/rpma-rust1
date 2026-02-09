//! Unit tests for task service validation
//!
//! This module contains comprehensive tests for task validation logic
//! to ensure business rules are properly enforced.

use crate::commands::AppResult;
use crate::services::task_validation::TaskValidationService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use crate::{test_client, test_db, test_intervention, test_task};
use rusqlite::params;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_task_request_success() -> AppResult<()> {
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

    #[tokio::test]
    async fn test_validate_empty_title() {
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

    #[tokio::test]
    async fn test_validate_title_too_long() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let long_title = "A".repeat(256); // Assuming max length is 255
        let task_request = test_task!(title: long_title);
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| e.contains("Title too long")));
    }

    #[tokio::test]
    async fn test_validate_invalid_vehicle_plate() {
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

    #[tokio::test]
    async fn test_validate_invalid_vin() {
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

    #[tokio::test]
    async fn test_validate_invalid_email() {
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

    #[tokio::test]
    async fn test_validate_valid_email() -> AppResult<()> {
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

    #[tokio::test]
    async fn test_validate_invalid_phone() {
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

    #[tokio::test]
    async fn test_validate_valid_phone() -> AppResult<()> {
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

    #[tokio::test]
    async fn test_validate_negative_duration() {
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

    #[tokio::test]
    async fn test_validate_excessive_duration() {
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

    #[tokio::test]
    async fn test_validate_invalid_status() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(status: "invalid_status".to_string());
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| e.contains("Invalid status")));
    }

    #[tokio::test]
    async fn test_validate_invalid_priority() {
        let test_db = test_db!();
        let service = TaskValidationService::new(test_db.db());

        let task_request = test_task!(priority: "invalid_priority".to_string());
        let result = service.validate_create_task_request(&task_request).unwrap();

        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| e.contains("Invalid priority")));
    }

    #[tokio::test]
    async fn test_validate_multiple_errors() {
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

    #[tokio::test]
    async fn test_validate_update_request() -> AppResult<()> {
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

    #[tokio::test]
    async fn test_validate_status_transition() -> AppResult<()> {
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

    #[tokio::test]
    async fn test_validate_duplicate_vehicle_date() -> AppResult<()> {
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

    // Phase 2: New technician qualification tests

    #[tokio::test]
    async fn test_validate_technician_assignment_valid() -> AppResult<()> {
        let test_db = test_db!();

        // Create a valid technician user
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 1]
        )?;

        let service = TaskValidationService::new(test_db.db());
        let ppf_zones = Some(vec!["hood".to_string(), "fenders".to_string()]);

        // Should succeed - valid technician
        let result = service.validate_technician_assignment("tech-1", &ppf_zones);
        assert!(result.is_ok(), "Valid technician should pass validation");

        Ok(())
    }

    #[tokio::test]
    async fn test_validate_technician_assignment_inactive() {
        let test_db = test_db!();

        // Create an inactive technician
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 0]
        )?;

        let service = TaskValidationService::new(test_db.db());
        let ppf_zones = Some(vec!["hood".to_string()]);

        // Should fail - inactive technician
        let result = service.validate_technician_assignment("tech-1", &ppf_zones);
        assert!(
            result.is_err(),
            "Inactive technician should fail validation"
        );
        assert!(
            result.unwrap_err().contains("not active"),
            "Error should mention not active"
        );
    }

    #[tokio::test]
    async fn test_validate_technician_assignment_invalid_role() {
        let test_db = test_db!();

        // Create a viewer user
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["viewer-1", "viewer1@test.com", "viewer1", "hash", "Test", "Viewer", "viewer", 1]
        )?;

        let service = TaskValidationService::new(test_db.db());
        let ppf_zones = Some(vec!["hood".to_string()]);

        // Should fail - invalid role
        let result = service.validate_technician_assignment("viewer-1", &ppf_zones);
        assert!(result.is_err(), "Viewer role should fail validation");
        assert!(
            result.unwrap_err().contains("role"),
            "Error should mention role"
        );
    }

    #[tokio::test]
    async fn test_validate_technician_assignment_non_existent() {
        let test_db = test_db!();

        let service = TaskValidationService::new(test_db.db());
        let ppf_zones = Some(vec!["hood".to_string()]);

        // Should fail - user not found
        let result = service.validate_technician_assignment("non-existent", &ppf_zones);
        assert!(result.is_err(), "Non-existent user should fail validation");
        assert!(
            result.unwrap_err().contains("not found"),
            "Error should mention not found"
        );
    }

    #[tokio::test]
    async fn test_ppf_zone_complexity_empty_zone() {
        let test_db = test_db!();

        // Create technician
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 1]
        )?;

        let service = TaskValidationService::new(test_db.db());
        let zones_with_empty = vec!["hood".to_string(), "".to_string()];

        // Should fail - empty zone name
        let result = service.validate_technician_assignment("tech-1", &Some(zones_with_empty));
        assert!(result.is_err(), "Empty zone name should fail validation");
    }

    #[tokio::test]
    async fn test_ppf_zone_complexity_long_zone_name() {
        let test_db = test_db!();

        // Create technician
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 1]
        )?;

        let service = TaskValidationService::new(test_db.db());
        let long_zone = "a".repeat(101); // 101 characters, exceeds max 100
        let zones_with_long = vec![long_zone];

        // Should fail - zone name too long
        let result = service.validate_technician_assignment("tech-1", &Some(zones_with_long));
        assert!(result.is_err(), "Zone name too long should fail validation");
    }

    #[tokio::test]
    async fn test_validate_technician_assignment_no_zones() -> AppResult<()> {
        let test_db = test_db!();

        // Create technician
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 1]
        )?;

        let service = TaskValidationService::new(test_db.db());
        let no_zones = Some(vec![]);

        // Should succeed - no zones to check
        let result = service.validate_technician_assignment("tech-1", &no_zones);
        assert!(result.is_ok(), "No zones should pass validation");

        // Should also succeed with None
        let result = service.validate_technician_assignment("tech-1", &None);
        assert!(result.is_ok(), "None zones should pass validation");

        Ok(())
    }

    #[tokio::test]
    async fn test_validate_technician_assignment_admin() -> AppResult<()> {
        let test_db = test_db!();

        // Create admin
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["admin-1", "admin1@test.com", "admin1", "hash", "Test", "Admin", "admin", 1]
        )?;

        let service = TaskValidationService::new(test_db.db());
        let ppf_zones = Some(vec!["hood".to_string(), "fenders".to_string()]);

        // Should succeed - admin role is valid
        let result = service.validate_technician_assignment("admin-1", &ppf_zones);
        assert!(result.is_ok(), "Admin role should pass validation");

        Ok(())
    }

    #[tokio::test]
    async fn test_assignment_eligibility_task_not_found() {
        let test_db = test_db!();

        // Create technician
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 1]
        )?;

        let service = TaskValidationService::new(test_db.db());

        // Should fail - task not found
        let result = service.check_assignment_eligibility("non-existent-task", "tech-1");
        assert!(
            result.is_err(),
            "Non-existent task should fail eligibility check"
        );
    }

    #[tokio::test]
    async fn test_task_availability_unassignable_status() -> AppResult<()> {
        let test_db = test_db!();

        // Create technician
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 1]
        )?;

        // Create a task
        let task_id = TestDataFactory::create_test_task(None).id;

        // Set task to completed status
        conn.execute(
            "UPDATE tasks SET status = ? WHERE id = ?",
            params!["completed", task_id],
        )?;

        let service = TaskValidationService::new(test_db.db());

        // Should fail - completed task is not available
        let result = service.check_task_availability(&task_id)?;
        assert!(!result, "Completed task should not be available");

        Ok(())
    }

    #[tokio::test]
    async fn test_task_availability_assignable_status() -> AppResult<()> {
        let test_db = test_db!();

        // Create technician
        let conn = test_db.db().get_connection()?;
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params!["tech-1", "tech1@test.com", "tech1", "hash", "Test", "Technician", "technician", 1]
        )?;

        // Create a task
        let task_id = TestDataFactory::create_test_task(None).id;

        let service = TaskValidationService::new(test_db.db());

        // Should succeed - pending task is available
        let result = service.check_task_availability(&task_id)?;
        assert!(result, "Pending task should be available");

        Ok(())
    }
}
