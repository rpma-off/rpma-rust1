//! Unit tests for task validation service
//!
//! Tests the core task validation logic including:
//! - Status transition validation
//! - Technician assignment validation
//! - Workload capacity checks
//! - PPF zone validation

use crate::models::task::{Task, TaskPriority, TaskStatus};
use crate::services::task_validation::TaskValidationService;
use crate::test_utils::TestDataFactory;
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_validation_service() -> TaskValidationService {
        let test_db = test_db!();
        TaskValidationService::new(test_db.db())
    }

    #[tokio::test]
    async fn test_validate_status_transition_draft_to_scheduled() {
        let validation_service = create_validation_service();
        let result = validation_service
            .validate_status_transition(&TaskStatus::Draft, &TaskStatus::Scheduled);
        assert!(result.is_ok(), "Draft to Scheduled should be valid");
    }

    #[tokio::test]
    async fn test_validate_status_transition_scheduled_to_in_progress() {
        let validation_service = create_validation_service();
        let result = validation_service
            .validate_status_transition(&TaskStatus::Scheduled, &TaskStatus::InProgress);
        assert!(result.is_ok(), "Scheduled to InProgress should be valid");
    }

    #[tokio::test]
    async fn test_validate_status_transition_in_progress_to_completed() {
        let validation_service = create_validation_service();
        let result = validation_service
            .validate_status_transition(&TaskStatus::InProgress, &TaskStatus::Completed);
        assert!(result.is_ok(), "InProgress to Completed should be valid");
    }

    #[tokio::test]
    async fn test_validate_status_transition_invalid_draft_to_completed() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Draft));

        let result = validation_service.validate_status_transition(&task, TaskStatus::Completed);
        assert!(result.is_err(), "Draft to Completed should be invalid");
        let error = result.unwrap_err();
        assert!(error.contains("Cannot transition from Draft to Completed"));
    }

    #[tokio::test]
    async fn test_validate_status_transition_invalid_completed_to_draft() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Completed));

        let result = validation_service.validate_status_transition(&task, TaskStatus::Draft);
        assert!(result.is_err(), "Completed to Draft should be invalid");
        let error = result.unwrap_err();
        assert!(error.contains("Cannot transition from Completed to Draft"));
    }

    #[tokio::test]
    async fn test_validate_status_transition_all_valid_paths() {
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

    #[tokio::test]
    async fn test_validate_technician_assignment_valid() {
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

        let ppf_zones = task.ppf_zones.clone();
        let result =
            validation_service.validate_technician_assignment(&technician_id, &Some(ppf_zones));
        assert!(result.is_ok(), "Valid technician assignment should succeed");
    }

    #[tokio::test]
    async fn test_validate_technician_assignment_nonexistent_user() {
        let validation_service = create_validation_service();
        let task = test_task!(status: Some(TaskStatus::Scheduled));

        let nonexistent_id = uuid::Uuid::new_v4().to_string();
        let ppf_zones = task.ppf_zones.clone();
        let result =
            validation_service.validate_technician_assignment(&nonexistent_id, &Some(ppf_zones));

        assert!(
            result.is_err(),
            "Non-existent technician should fail validation"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Technician not found"));
    }

    #[tokio::test]
    async fn test_validate_technician_assignment_wrong_role() {
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

    #[tokio::test]
    async fn test_validate_technician_assignment_banned_user() {
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

    #[tokio::test]
    async fn test_check_workload_capacity_available() {
        let validation_service = create_validation_service();
        let technician_id = uuid::Uuid::new_v4().to_string();
        let task = test_task!(
            title: "Test Task".to_string(),
            scheduled_date: Some(chrono::Utc::now().to_rfc3339())
        );

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

        let result =
            validation_service.check_workload_capacity(&technician_id, &task.scheduled_date);
        assert!(
            result.is_ok(),
            "Technician with no tasks should have available capacity"
        );
    }

    #[tokio::test]
    async fn test_check_workload_capacity_overloaded() {
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

        let result = validation_service
            .check_workload_capacity(&technician_id, &Some("2024-01-15".to_string()));
        assert!(
            result.is_err(),
            "Overloaded technician should fail capacity check"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Technician workload capacity exceeded"));
    }

    #[tokio::test]
    async fn test_validate_ppf_zones_basic() {
        let validation_service = create_validation_service();
        let task = test_task!(ppf_zones: vec!["front".to_string(), "rear".to_string()]);

        let result = validation_service.validate_ppf_zones(&task);
        assert!(result.is_ok(), "Valid PPF zones should pass");
    }

    #[tokio::test]
    async fn test_validate_ppf_zones_invalid_zone() {
        let validation_service = create_validation_service();
        let task = test_task!(ppf_zones: vec!["invalid_zone".to_string()]);

        let result = validation_service.validate_ppf_zones(&task);
        assert!(result.is_err(), "Invalid PPF zone should fail");
        let error = result.unwrap_err();
        assert!(error.contains("Invalid PPF zone"));
    }

    #[tokio::test]
    async fn test_validate_ppf_zones_empty() {
        let validation_service = create_validation_service();
        let task = test_task!(ppf_zones: vec![]);

        let result = validation_service.validate_ppf_zones(&task);
        assert!(result.is_err(), "Empty PPF zones should fail");
        let error = result.unwrap_err();
        assert!(error.contains("At least one PPF zone is required"));
    }

    #[tokio::test]
    async fn test_validate_ppf_zones_complex_configuration() {
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

    #[tokio::test]
    async fn test_validate_task_comprehensive() {
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

    #[tokio::test]
    async fn test_validate_task_multiple_invalidations() {
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

    #[tokio::test]
    async fn test_validate_task_edge_cases() {
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

    // === Tests for previously uncovered methods ===

    #[tokio::test]
    async fn test_check_assignment_eligibility_eligible_technician() {
        let validation_service = create_validation_service();

        // Create a test technician
        let technician_id = uuid::Uuid::new_v4().to_string();
        let conn = validation_service.db.get_connection().unwrap();

        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                technician_id.clone(),
                "eligible_tech".to_string(),
                "eligible@example.com".to_string(),
                "Eligible".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                "1".to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ],
        ).unwrap();

        // Create a task in assignable status
        let task = test_task!(
            status: Some(TaskStatus::Pending),
            technician_id: None,
            ppf_zones: Some(vec!["front".to_string(), "rear".to_string()]),
            scheduled_date: Some(Utc::now().to_rfc3339())
        );
        let task_id = &task.id;

        // Insert the task
        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            [
                task_id.clone(),
                task.vehicle_plate.clone(),
                task.vehicle_model.unwrap_or_default(),
                task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                task.scheduled_date.clone().unwrap_or_default(),
                serde_json::to_string(&task.status).unwrap(),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.check_assignment_eligibility(task_id, &technician_id);
        assert!(result.is_ok(), "Should return Ok result");
        assert!(result.unwrap(), "Eligible technician should be assignable");
    }

    #[tokio::test]
    async fn test_check_assignment_eligibility_non_assignable_status() {
        let validation_service = create_validation_service();

        // Create a test technician
        let technician_id = uuid::Uuid::new_v4().to_string();
        let conn = validation_service.db.get_connection().unwrap();

        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                technician_id.clone(),
                "ineligible_tech".to_string(),
                "ineligible@example.com".to_string(),
                "Ineligible".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                "1".to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ],
        ).unwrap();

        // Create a task in non-assignable status
        let task = test_task!(
            status: Some(TaskStatus::Completed),
            technician_id: None,
            ppf_zones: Some(vec!["front".to_string()]),
            scheduled_date: Some(Utc::now().to_rfc3339())
        );
        let task_id = &task.id;

        // Insert the task
        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            [
                task_id.clone(),
                task.vehicle_plate.clone(),
                task.vehicle_model.unwrap_or_default(),
                task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                task.scheduled_date.clone().unwrap_or_default(),
                serde_json::to_string(&task.status).unwrap(),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.check_assignment_eligibility(task_id, &technician_id);
        assert!(result.is_ok(), "Should return Ok result");
        assert!(
            !result.unwrap(),
            "Non-assignable status should return false"
        );
    }

    #[tokio::test]
    async fn test_check_assignment_eligibility_nonexistent_task() {
        let validation_service = create_validation_service();
        let technician_id = uuid::Uuid::new_v4().to_string();
        let nonexistent_task_id = uuid::Uuid::new_v4().to_string();

        let result =
            validation_service.check_assignment_eligibility(&nonexistent_task_id, &technician_id);
        assert!(result.is_err(), "Nonexistent task should return error");
        assert!(result.unwrap_err().contains("not found"));
    }

    #[tokio::test]
    async fn test_check_assignment_eligibility_workload_exceeded() {
        let validation_service = create_validation_service();
        let technician_id = uuid::Uuid::new_v4().to_string();
        let scheduled_date = Utc::now().to_rfc3339();

        // Create a test technician
        let conn = validation_service.db.get_connection().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                technician_id.clone(),
                "busy_tech".to_string(),
                "busy@example.com".to_string(),
                "Busy".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                "1".to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ],
        ).unwrap();

        // Create 3 tasks already assigned to this technician (at capacity)
        for i in 0..3 {
            let task_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, technician_id, status, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    task_id,
                    format!("PLATE{}", i),
                    "Test Model".to_string(),
                    "front".to_string(),
                    scheduled_date.clone(),
                    technician_id.clone(),
                    "scheduled".to_string(),
                    Utc::now().to_rfc3339(),
                    Utc::now().to_rfc3339(),
                ],
            ).unwrap();
        }

        // Create a new task for the same date
        let new_task = test_task!(
            status: Some(TaskStatus::Pending),
            technician_id: None,
            ppf_zones: Some(vec!["front".to_string()]),
            scheduled_date: Some(scheduled_date)
        );
        let new_task_id = &new_task.id;

        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            [
                new_task_id.clone(),
                new_task.vehicle_plate.clone(),
                new_task.vehicle_model.unwrap_or_default(),
                new_task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                new_task.scheduled_date.clone().unwrap_or_default(),
                serde_json::to_string(&new_task.status).unwrap(),
                new_task.created_at.to_rfc3339(),
                new_task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.check_assignment_eligibility(new_task_id, &technician_id);
        assert!(result.is_ok(), "Should return Ok result");
        assert!(
            !result.unwrap(),
            "Technician at capacity should not be eligible"
        );
    }

    #[tokio::test]
    async fn test_check_task_availability_available() {
        let validation_service = create_validation_service();

        // Create a task with no conflicts
        let task = test_task!(
            status: Some(TaskStatus::Pending),
            technician_id: None,
            ppf_zones: Some(vec!["front".to_string()]),
            scheduled_date: Some(Utc::now().to_rfc3339()),
            start_time: Some("09:00".to_string()),
            end_time: Some("10:00".to_string())
        );
        let task_id = &task.id;

        // Insert the task
        let conn = validation_service.db.get_connection().unwrap();
        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, start_time, end_time, status, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                task_id.clone(),
                task.vehicle_plate.clone(),
                task.vehicle_model.unwrap_or_default(),
                task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                task.scheduled_date.clone().unwrap_or_default(),
                task.start_time.clone().unwrap_or_default(),
                task.end_time.clone().unwrap_or_default(),
                serde_json::to_string(&task.status).unwrap(),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.check_task_availability(task_id);
        assert!(result.is_ok(), "Should return Ok result");
        assert!(result.unwrap(), "Available task should return true");
    }

    #[tokio::test]
    async fn test_check_task_availability_nonexistent_task() {
        let validation_service = create_validation_service();
        let nonexistent_task_id = uuid::Uuid::new_v4().to_string();

        let result = validation_service.check_task_availability(&nonexistent_task_id);
        assert!(result.is_err(), "Nonexistent task should return error");
        assert!(result.unwrap_err().contains("not found"));
    }

    #[tokio::test]
    async fn test_check_task_availability_non_assignable_status() {
        let validation_service = create_validation_service();

        // Create a task in completed status
        let task = test_task!(
            status: Some(TaskStatus::Completed),
            technician_id: None,
            ppf_zones: Some(vec!["front".to_string()])
        );
        let task_id = &task.id;

        // Insert the task
        let conn = validation_service.db.get_connection().unwrap();
        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, status, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            [
                task_id.clone(),
                task.vehicle_plate.clone(),
                task.vehicle_model.unwrap_or_default(),
                task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                serde_json::to_string(&task.status).unwrap(),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.check_task_availability(task_id);
        assert!(result.is_ok(), "Should return Ok result");
        assert!(!result.unwrap(), "Completed task should not be available");
    }

    #[tokio::test]
    async fn test_validate_assignment_change_valid() {
        let validation_service = create_validation_service();
        let old_user_id = uuid::Uuid::new_v4().to_string();
        let new_user_id = uuid::Uuid::new_v4().to_string();

        // Create both technicians
        let conn = validation_service.db.get_connection().unwrap();

        for (id, username) in [(&old_user_id, "old_tech"), (&new_user_id, "new_tech")] {
            conn.execute(
                "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                [
                    id.clone(),
                    username.to_string(),
                    format!("{}@example.com", username),
                    "Test".to_string(),
                    "Technician".to_string(),
                    "hashed_password".to_string(),
                    "technician".to_string(),
                    "1".to_string(),
                    Utc::now().to_rfc3339(),
                    Utc::now().to_rfc3339(),
                ],
            ).unwrap();
        }

        // Create a task
        let task = test_task!(
            status: Some(TaskStatus::Pending),
            technician_id: Some(old_user_id.clone()),
            ppf_zones: Some(vec!["front".to_string()]),
            scheduled_date: Some(Utc::now().to_rfc3339()),
            priority: Some(TaskPriority::Normal)
        );
        let task_id = &task.id;

        // Insert the task
        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, technician_id, status, priority, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            [
                task_id.clone(),
                task.vehicle_plate.clone(),
                task.vehicle_model.unwrap_or_default(),
                task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                task.scheduled_date.clone().unwrap_or_default(),
                task.technician_id.clone().unwrap_or_default(),
                serde_json::to_string(&task.status).unwrap(),
                serde_json::to_string(&task.priority.unwrap_or(TaskPriority::Normal)).unwrap(),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.validate_assignment_change(
            task_id,
            Some(&old_user_id),
            &new_user_id,
        );

        assert!(result.is_ok(), "Valid assignment change should succeed");
        assert!(
            result.unwrap().is_empty(),
            "Valid change should have no warnings"
        );
    }

    #[tokio::test]
    async fn test_validate_assignment_change_ineligible_user() {
        let validation_service = create_validation_service();
        let old_user_id = uuid::Uuid::new_v4().to_string();
        let new_user_id = uuid::Uuid::new_v4().to_string();

        // Create old technician
        let conn = validation_service.db.get_connection().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                old_user_id.clone(),
                "old_tech".to_string(),
                "old@example.com".to_string(),
                "Old".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                "1".to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ],
        ).unwrap();

        // Don't create the new user (non-existent)

        // Create a task
        let task = test_task!(
            status: Some(TaskStatus::Pending),
            technician_id: Some(old_user_id.clone()),
            ppf_zones: Some(vec!["front".to_string()])
        );
        let task_id = &task.id;

        // Insert the task
        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, technician_id, status, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            [
                task_id.clone(),
                task.vehicle_plate.clone(),
                task.vehicle_model.unwrap_or_default(),
                task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                task.technician_id.clone().unwrap_or_default(),
                serde_json::to_string(&task.status).unwrap(),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.validate_assignment_change(
            task_id,
            Some(&old_user_id),
            &new_user_id,
        );

        assert!(result.is_ok(), "Should return Ok result");
        let warnings = result.unwrap();
        assert!(
            !warnings.is_empty(),
            "Should have warnings for ineligible user"
        );
        assert!(warnings[0].contains("not eligible"));
    }

    #[tokio::test]
    async fn test_validate_assignment_change_urgent_priority() {
        let validation_service = create_validation_service();
        let old_user_id = uuid::Uuid::new_v4().to_string();
        let new_user_id = uuid::Uuid::new_v4().to_string();

        // Create both technicians
        let conn = validation_service.db.get_connection().unwrap();

        for (id, username) in [(&old_user_id, "old_tech"), (&new_user_id, "new_tech")] {
            conn.execute(
                "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                [
                    id.clone(),
                    username.to_string(),
                    format!("{}@example.com", username),
                    "Test".to_string(),
                    "Technician".to_string(),
                    "hashed_password".to_string(),
                    "technician".to_string(),
                    "1".to_string(),
                    Utc::now().to_rfc3339(),
                    Utc::now().to_rfc3339(),
                ],
            ).unwrap();
        }

        // Create an urgent task
        let task = test_task!(
            status: Some(TaskStatus::Pending),
            technician_id: Some(old_user_id.clone()),
            ppf_zones: Some(vec!["front".to_string()]),
            priority: Some(TaskPriority::Urgent)
        );
        let task_id = &task.id;

        // Insert the task
        conn.execute(
            "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, technician_id, status, priority, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                task_id.clone(),
                task.vehicle_plate.clone(),
                task.vehicle_model.unwrap_or_default(),
                task.ppf_zones.as_ref().map(|z| z.join(",")).unwrap_or_default(),
                task.technician_id.clone().unwrap_or_default(),
                serde_json::to_string(&task.status).unwrap(),
                serde_json::to_string(&task.priority.unwrap_or(TaskPriority::Normal)).unwrap(),
                task.created_at.to_rfc3339(),
                task.updated_at.to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.validate_assignment_change(
            task_id,
            Some(&old_user_id),
            &new_user_id,
        );

        assert!(result.is_ok(), "Should return Ok result");
        let warnings = result.unwrap();
        assert!(
            !warnings.is_empty(),
            "Should have warnings for urgent task reassignment"
        );
        assert!(warnings[0].contains("urgent priority task"));
    }

    #[tokio::test]
    async fn test_check_schedule_conflicts_no_conflicts() {
        let validation_service = create_validation_service();
        let user_id = uuid::Uuid::new_v4().to_string();
        let scheduled_date = Utc::now().to_rfc3339();

        // Create a technician
        let conn = validation_service.db.get_connection().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                user_id.clone(),
                "available_tech".to_string(),
                "available@example.com".to_string(),
                "Available".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                "1".to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ],
        ).unwrap();

        let result = validation_service.check_schedule_conflicts(
            &user_id,
            Some(scheduled_date),
            &Some(60), // 1 hour duration
        );

        assert!(result.is_ok(), "Should return Ok result");
        assert!(
            !result.unwrap(),
            "No conflicts should exist for available technician"
        );
    }

    #[tokio::test]
    async fn test_check_schedule_conflicts_at_capacity() {
        let validation_service = create_validation_service();
        let user_id = uuid::Uuid::new_v4().to_string();
        let scheduled_date = Utc::now().to_rfc3339();

        // Create a technician
        let conn = validation_service.db.get_connection().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            [
                user_id.clone(),
                "busy_tech".to_string(),
                "busy@example.com".to_string(),
                "Busy".to_string(),
                "Technician".to_string(),
                "hashed_password".to_string(),
                "technician".to_string(),
                "1".to_string(),
                Utc::now().to_rfc3339(),
                Utc::now().to_rfc3339(),
            ],
        ).unwrap();

        // Create 3 tasks for this technician on the same day
        for i in 0..3 {
            let task_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tasks (id, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, technician_id, status, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    task_id,
                    format!("PLATE{}", i),
                    "Test Model".to_string(),
                    "front".to_string(),
                    scheduled_date.clone(),
                    user_id.clone(),
                    "scheduled".to_string(),
                    Utc::now().to_rfc3339(),
                    Utc::now().to_rfc3339(),
                ],
            ).unwrap();
        }

        let result =
            validation_service.check_schedule_conflicts(&user_id, Some(scheduled_date), &Some(60));

        assert!(result.is_ok(), "Should return Ok result");
        assert!(result.unwrap(), "Should have conflicts (at capacity)");
    }

    #[tokio::test]
    async fn test_check_dependencies_satisfied() {
        let validation_service = create_validation_service();
        let task_id = uuid::Uuid::new_v4().to_string();

        // Currently just returns true as dependencies are not implemented
        let result = validation_service.check_dependencies_satisfied(&task_id);
        assert!(result.is_ok(), "Should return Ok result");
        assert!(result.unwrap(), "Should return true (stub implementation)");
    }

    #[tokio::test]
    async fn test_check_schedule_conflicts_no_date() {
        let validation_service = create_validation_service();
        let user_id = uuid::Uuid::new_v4().to_string();

        let result = validation_service.check_schedule_conflicts(
            &user_id,
            None, // No date
            &Some(60),
        );

        assert!(result.is_ok(), "Should return Ok result");
        assert!(
            !result.unwrap(),
            "Should return false when no date provided"
        );
    }
}
