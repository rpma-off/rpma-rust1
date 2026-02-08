//! Unit tests for task validation service
//!
//! Tests the core task validation logic including:
//! - Status transition validation
//! - Technician assignment validation
//! - Workload capacity checks
//! - PPF zone validation

use crate::models::task::{Task, TaskPriority, TaskStatus};
use crate::services::task_validation::TaskValidationService;
use crate::test_utils::{test_db, test_task, TestDataFactory};

#[cfg(test)]
mod tests {
    use super::*;

    fn create_validation_service() -> TaskValidationService {
        let test_db = test_db!();
        TaskValidationService::new(test_db.db())
    }

    #[test]
    fn test_validate_status_transition_draft_to_scheduled() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Draft));

        let result = validation_service.validate_status_transition(&task, TaskStatus::Scheduled);
        assert!(result.is_ok(), "Draft to Scheduled should be valid");
    }

    #[test]
    fn test_validate_status_transition_scheduled_to_in_progress() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Scheduled));

        let result = validation_service.validate_status_transition(&task, TaskStatus::InProgress);
        assert!(result.is_ok(), "Scheduled to InProgress should be valid");
    }

    #[test]
    fn test_validate_status_transition_in_progress_to_completed() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::InProgress));

        let result = validation_service.validate_status_transition(&task, TaskStatus::Completed);
        assert!(result.is_ok(), "InProgress to Completed should be valid");
    }

    #[test]
    fn test_validate_status_transition_invalid_draft_to_completed() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Draft));

        let result = validation_service.validate_status_transition(&task, TaskStatus::Completed);
        assert!(result.is_err(), "Draft to Completed should be invalid");
        let error = result.unwrap_err();
        assert!(error.contains("Cannot transition from Draft to Completed"));
    }

    #[test]
    fn test_validate_status_transition_invalid_completed_to_draft() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Completed));

        let result = validation_service.validate_status_transition(&task, TaskStatus::Draft);
        assert!(result.is_err(), "Completed to Draft should be invalid");
        let error = result.unwrap_err();
        assert!(error.contains("Cannot transition from Completed to Draft"));
    }

    #[test]
    fn test_validate_status_transition_all_valid_paths() {
        let validation_service = create_validation_service();

        // Test all valid transitions
        let valid_transitions = vec![
            (TaskStatus::Draft, TaskStatus::Scheduled),
            (TaskStatus::Draft, TaskStatus::Cancelled),
            (TaskStatus::Scheduled, TaskStatus::InProgress),
            (TaskStatus::Scheduled, TaskStatus::Cancelled),
            (TaskStatus::Scheduled, TaskStatus::Draft),
            (TaskStatus::InProgress, TaskStatus::Completed),
            (TaskStatus::InProgress, TaskStatus::Paused),
            (TaskStatus::InProgress, TaskStatus::Cancelled),
            (TaskStatus::Paused, TaskStatus::InProgress),
            (TaskStatus::Paused, TaskStatus::Cancelled),
        ];

        for (from_status, to_status) in valid_transitions {
            let task = test_task!(status: Some(from_status));
            let result = validation_service.validate_status_transition(&task, to_status);
            assert!(
                result.is_ok(),
                "Transition from {:?} to {:?} should be valid",
                from_status,
                to_status
            );
        }
    }

    #[test]
    fn test_validate_technician_assignment_valid() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Scheduled));

        // Create a test technician user
        let technician_id = uuid::Uuid::new_v4().to_string();
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                technician_id.clone(),
                "tech_user".to_string(),
                "tech@example.com".to_string(),
                "Test".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        ).expect("Failed to create test technician");

        let result = validation_service.validate_technician_assignment(&task, Some(&technician_id));
        assert!(result.is_ok(), "Valid technician assignment should succeed");
    }

    #[test]
    fn test_validate_technician_assignment_nonexistent_user() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Scheduled));

        let nonexistent_id = uuid::Uuid::new_v4().to_string();
        let result =
            validation_service.validate_technician_assignment(&task, Some(&nonexistent_id));

        assert!(
            result.is_err(),
            "Non-existent technician should fail validation"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Technician not found"));
    }

    #[test]
    fn test_validate_technician_assignment_wrong_role() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Scheduled));

        // Create a test user with wrong role
        let user_id = uuid::Uuid::new_v4().to_string();
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                user_id.clone(),
                "client_user".to_string(),
                "client@example.com".to_string(),
                "Test".to_string(),
                "Client".to_string(),
                "hashed_password".to_string(),
                "client".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        ).expect("Failed to create test client user");

        let result = validation_service.validate_technician_assignment(&task, Some(&user_id));
        assert!(
            result.is_err(),
            "Client user should not be assignable as technician"
        );
        let error = result.unwrap_err();
        assert!(error.contains("User is not a technician"));
    }

    #[test]
    fn test_validate_technician_assignment_banned_user() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Scheduled));

        // Create a banned technician user
        let technician_id = uuid::Uuid::new_v4().to_string();
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, banned, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                technician_id.clone(),
                "banned_tech".to_string(),
                "banned@example.com".to_string(),
                "Banned".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                "true".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        ).expect("Failed to create banned technician");

        let result = validation_service.validate_technician_assignment(&task, Some(&technician_id));
        assert!(
            result.is_err(),
            "Banned technician should not be assignable"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Technician is banned"));
    }

    #[test]
    fn test_check_workload_capacity_available() {
        let validation_service = create_validation_service();
        let technician_id = uuid::Uuid::new_v4().to_string();

        // Create a test technician with no existing tasks
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                technician_id.clone(),
                "available_tech".to_string(),
                "available@example.com".to_string(),
                "Available".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        ).expect("Failed to create test technician");

        let result = validation_service.check_workload_capacity(&technician_id);
        assert!(
            result.is_ok(),
            "Technician with no tasks should have available capacity"
        );
    }

    #[test]
    fn test_check_workload_capacity_overloaded() {
        let validation_service = create_validation_service();
        let technician_id = uuid::Uuid::new_v4().to_string();

        // Create a test technician
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                technician_id.clone(),
                "busy_tech".to_string(),
                "busy@example.com".to_string(),
                "Busy".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        ).expect("Failed to create test technician");

        // Create multiple tasks for this technician
        for i in 0..15 {
            // Exceeds default capacity limit
            let task_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, technician_id, status, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    task_id,
                    format!("PLATE{}", i),
                    "Test Model".to_string(),
                    "front,rear".to_string(),
                    chrono::Utc::now().to_string(),
                    technician_id.clone(),
                    "scheduled".to_string(),
                    chrono::Utc::now().to_string(),
                    chrono::Utc::now().to_string(),
                ],
            ).expect("Failed to create test task");
        }

        let result = validation_service.check_workload_capacity(&technician_id);
        assert!(
            result.is_err(),
            "Overloaded technician should fail capacity check"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Technician workload capacity exceeded"));
    }

    #[test]
    fn test_validate_ppf_zones_basic() {
        let validation_service = create_validation_service();
        let task = test_task!(ppf_zones: vec!["front".to_string(), "rear".to_string()]);

        let result = validation_service.validate_ppf_zones(&task);
        assert!(result.is_ok(), "Valid PPF zones should pass");
    }

    #[test]
    fn test_validate_ppf_zones_invalid_zone() {
        let validation_service = create_validation_service();
        let task = test_task!(ppf_zones: vec!["invalid_zone".to_string()]);

        let result = validation_service.validate_ppf_zones(&task);
        assert!(result.is_err(), "Invalid PPF zone should fail");
        let error = result.unwrap_err();
        assert!(error.contains("Invalid PPF zone"));
    }

    #[test]
    fn test_validate_ppf_zones_empty() {
        let validation_service = create_validation_service();
        let task = test_task!(ppf_zones: vec![]);

        let result = validation_service.validate_ppf_zones(&task);
        assert!(result.is_err(), "Empty PPF zones should fail");
        let error = result.unwrap_err();
        assert!(error.contains("At least one PPF zone is required"));
    }

    #[test]
    fn test_validate_ppf_zones_complex_configuration() {
        let validation_service = create_validation_service();

        // Test complex valid configurations
        let valid_configs = vec![
            vec!["front", "rear", "hood", "trunk"],
            vec!["full_car"],
            vec!["front_bumper", "rear_bumper", "roof"],
        ];

        for zones in valid_configs {
            let zones_string = zones.iter().map(|z| z.to_string()).collect();
            let task = test_task!(ppf_zones: zones_string);
            let result = validation_service.validate_ppf_zones(&task);
            assert!(
                result.is_ok(),
                "Valid PPF configuration should pass: {:?}",
                zones
            );
        }
    }

    #[test]
    fn test_validate_task_comprehensive() {
        let validation_service = create_validation_service();

        // Create a valid task
        let technician_id = uuid::Uuid::new_v4().to_string();
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        // Create technician
        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                technician_id.clone(),
                "valid_tech".to_string(),
                "valid@example.com".to_string(),
                "Valid".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        ).expect("Failed to create test technician");

        // Create comprehensive valid task
        let task = test_task!(
            status: Some(TaskStatus::Scheduled),
            technician_id: Some(technician_id),
            ppf_zones: vec!["front".to_string(), "rear".to_string()],
            priority: Some(TaskPriority::Medium),
            vehicle_plate: Some("VALID123".to_string()),
            vehicle_model: Some("Valid Model".to_string()),
            customer_name: Some("Valid Customer".to_string())
        );

        let result = validation_service.validate_task_comprehensive(&task);
        assert!(
            result.is_ok(),
            "Comprehensive valid task should pass all validations"
        );
    }

    #[test]
    fn test_validate_task_multiple_invalidations() {
        let validation_service = create_validation_service();

        // Create task with multiple invalidations
        let task = test_task!(
            status: Some(TaskStatus::Completed), // Invalid for scheduled task
            ppf_zones: vec!["invalid_zone".to_string()], // Invalid zone
            vehicle_plate: None, // Missing required field
            customer_name: None  // Missing required field
        );

        let result = validation_service.validate_task_comprehensive(&task);
        assert!(
            result.is_err(),
            "Task with multiple invalidations should fail"
        );
        let error = result.unwrap_err();

        // Should contain information about all validation failures
        assert!(
            error.contains("vehicle_plate")
                || error.contains("ppf_zones")
                || error.contains("customer_name")
        );
    }

    #[test]
    fn test_validate_task_edge_cases() {
        let validation_service = create_validation_service();

        // Test with very long values
        let long_string = "a".repeat(1000);
        let task = test_task!(
            vehicle_plate: Some(long_string.clone()),
            vehicle_model: Some(long_string),
            customer_name: Some(long_string)
        );

        let result = validation_service.validate_task_comprehensive(&task);
        assert!(
            result.is_err(),
            "Excessively long values should fail validation"
        );

        // Test with special characters in vehicle plate
        let task = test_task!(vehicle_plate: Some("PLATE-@#$%".to_string()));
        let result = validation_service.validate_task_comprehensive(&task);
        assert!(
            result.is_err(),
            "Special characters in vehicle plate should fail"
        );
    }
}
