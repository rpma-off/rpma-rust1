//! Unit tests for task creation service
//!
//! Tests the task creation functionality including:
//! - Task validation and creation
//! - Unique task number generation
//! - Client existence validation
//! - Assignment and scheduling validation

use crate::domains::tasks::infrastructure::task_creation::TaskCreationService;
use crate::models::task::{Task, TaskStatus};
use crate::test_utils::TestDataFactory;
use crate::{test_client, test_db, test_intervention, test_task};

#[cfg(test)]
mod tests {
    use super::*;

    fn create_task_creation_service() -> TaskCreationService {
        let test_db = test_db!();
        TaskCreationService::new(test_db.db())
    }

    #[tokio::test]
    async fn test_create_task_success() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Test Task Creation".to_string()),
            vehicle_plate: Some("ABC123".to_string()),
            customer_name: Some("Test Customer".to_string())
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_ok(),
            "Task creation should succeed with valid data"
        );
        let task = result.unwrap();

        assert_eq!(task.title, "Test Task Creation");
        assert_eq!(task.vehicle_plate, "ABC123");
        assert_eq!(task.customer_name, Some("Test Customer".to_string()));
        assert_eq!(task.created_by, Some("test_user".to_string()));
        assert!(task.id.is_some());
        assert!(task.task_number.is_some());
        assert!(task.created_at > 0);
    }

    #[tokio::test]
    async fn test_create_task_minimal_valid_data() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Minimal Task".to_string()),
            vehicle_plate: None,
            customer_name: None,
            ppf_zones: vec!["front".to_string()]
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_ok(),
            "Task creation should succeed with minimal valid data"
        );
        let task = result.unwrap();

        assert_eq!(task.title, "Minimal Task");
        assert_eq!(task.vehicle_plate, "");
        assert_eq!(task.customer_name, None);
    }

    #[tokio::test]
    async fn test_create_task_missing_required_fields() {
        let task_service = create_task_creation_service();
        let mut task_request = test_task!();
        task_request.title = None; // Remove required field

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with missing required title"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("title") || error.contains("Title"),
            "Error should mention title field"
        );
    }

    #[tokio::test]
    async fn test_create_task_invalid_ppf_zones() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Invalid PPF Task".to_string()),
            ppf_zones: vec!["invalid_zone".to_string()]
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with invalid PPF zones"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("ppf_zones") || error.contains("zone"),
            "Error should mention PPF zones"
        );
    }

    #[tokio::test]
    async fn test_create_task_empty_ppf_zones() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Empty PPF Task".to_string()),
            ppf_zones: vec![]
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with empty PPF zones"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("ppf_zones") || error.contains("zone"),
            "Error should mention PPF zones"
        );
    }

    #[tokio::test]
    async fn test_create_task_invalid_vehicle_plate_format() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Invalid Plate Task".to_string()),
            vehicle_plate: Some("PLATE-@#$%".to_string())
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with invalid vehicle plate format"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("vehicle_plate") || error.contains("plate"),
            "Error should mention vehicle plate"
        );
    }

    #[tokio::test]
    async fn test_create_task_invalid_email() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Invalid Email Task".to_string()),
            customer_email: Some("invalid-email".to_string())
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with invalid email"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("email") || error.contains("Email"),
            "Error should mention email"
        );
    }

    #[tokio::test]
    async fn test_generate_task_number_unique() {
        let task_service = create_task_creation_service();

        // Generate multiple task numbers
        let task_numbers = (0..10)
            .map(|_| task_service.generate_task_number())
            .collect::<Vec<_>>();

        // All task numbers should be unique
        let mut unique_numbers = task_numbers.clone();
        unique_numbers.sort();
        unique_numbers.dedup();

        assert_eq!(
            task_numbers.len(),
            unique_numbers.len(),
            "All task numbers should be unique"
        );

        // All should follow the expected format
        for task_number in &task_numbers {
            assert!(
                task_number.starts_with("TASK-"),
                "Task number should start with TASK-"
            );
            assert!(
                task_number.len() > 5,
                "Task number should have sufficient length"
            );

            // Extract numeric part and verify it's a valid number
            let numeric_part = &task_number[5..];
            assert!(
                numeric_part.parse::<u32>().is_ok(),
                "Task number should end with valid number"
            );
        }
    }

    #[tokio::test]
    async fn test_create_task_with_existing_client() {
        let task_service = create_task_creation_service();

        // First, create a client
        let client_request = TestDataFactory::create_test_client(None);
        let conn = task_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        let client_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO clients (id, name, email, phone, customer_type, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            [
                client_id.clone(),
                client_request.name,
                client_request.email.unwrap_or_default(),
                client_request.phone.unwrap_or_default(),
                client_request.customer_type.to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        )
        .expect("Failed to insert test client");

        // Create task with existing client
        let task_request = test_task!(
            title: Some("Task with Existing Client".to_string()),
            client_id: Some(client_id.clone())
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_ok(),
            "Task creation should succeed with existing client"
        );
        let task = result.unwrap();
        assert_eq!(task.client_id, Some(client_id));
    }

    #[tokio::test]
    async fn test_create_task_with_nonexistent_client() {
        let task_service = create_task_creation_service();
        let nonexistent_client_id = uuid::Uuid::new_v4().to_string();

        let task_request = test_task!(
            title: Some("Task with Nonexistent Client".to_string()),
            client_id: Some(nonexistent_client_id)
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with nonexistent client"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("client") || error.contains("Client"),
            "Error should mention client"
        );
    }

    #[tokio::test]
    async fn test_create_task_with_valid_technician() {
        let task_service = create_task_creation_service();

        // Create a technician user
        let technician_id = uuid::Uuid::new_v4().to_string();
        let conn = task_service
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

        // Create task with valid technician
        let task_request = test_task!(
            title: Some("Task with Valid Technician".to_string()),
            technician_id: Some(technician_id.clone())
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_ok(),
            "Task creation should succeed with valid technician"
        );
        let task = result.unwrap();
        assert_eq!(task.technician_id, Some(technician_id));
    }

    #[tokio::test]
    async fn test_create_task_with_nonexistent_technician() {
        let task_service = create_task_creation_service();
        let nonexistent_technician_id = uuid::Uuid::new_v4().to_string();

        let task_request = test_task!(
            title: Some("Task with Nonexistent Technician".to_string()),
            technician_id: Some(nonexistent_technician_id)
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with nonexistent technician"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("technician") || error.contains("Technician"),
            "Error should mention technician"
        );
    }

    #[tokio::test]
    async fn test_create_task_with_banned_technician() {
        let task_service = create_task_creation_service();

        // Create a banned technician user
        let technician_id = uuid::Uuid::new_v4().to_string();
        let conn = task_service
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

        // Create task with banned technician
        let task_request = test_task!(
            title: Some("Task with Banned Technician".to_string()),
            technician_id: Some(technician_id)
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with banned technician"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("technician") || error.contains("banned"),
            "Error should mention banned technician"
        );
    }

    #[tokio::test]
    async fn test_create_task_with_valid_date() {
        let task_service = create_task_creation_service();
        let future_date = (chrono::Utc::now() + chrono::Duration::days(7))
            .format("%Y-%m-%d")
            .to_string();

        let task_request = test_task!(
            title: Some("Future Task".to_string()),
            scheduled_date: future_date
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_ok(),
            "Task creation should succeed with valid future date"
        );
        let task = result.unwrap();
        assert_eq!(task.scheduled_date, future_date);
    }

    #[tokio::test]
    async fn test_create_task_with_past_date() {
        let task_service = create_task_creation_service();
        let past_date = (chrono::Utc::now() - chrono::Duration::days(7))
            .format("%Y-%m-%d")
            .to_string();

        let task_request = test_task!(
            title: Some("Past Date Task".to_string()),
            scheduled_date: past_date
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(result.is_err(), "Task creation should fail with past date");
        let error = result.unwrap_err();
        assert!(
            error.contains("date") || error.contains("scheduled"),
            "Error should mention scheduled date"
        );
    }

    #[tokio::test]
    async fn test_create_task_with_invalid_date_format() {
        let task_service = create_task_creation_service();
        let invalid_date = "not-a-date".to_string();

        let task_request = test_task!(
            title: Some("Invalid Date Task".to_string()),
            scheduled_date: invalid_date
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with invalid date format"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("date") || error.contains("scheduled"),
            "Error should mention scheduled date"
        );
    }

    #[tokio::test]
    async fn test_create_task_priority_validation() {
        let task_service = create_task_creation_service();

        // Test valid priorities
        let valid_priorities = vec!["low", "medium", "high", "urgent"];
        for priority in valid_priorities {
            let task_request = test_task!(
                title: Some(format!("Priority {} Task", priority)),
                priority: Some(priority.parse().unwrap())
            );

            let result = task_service.create_task_sync(task_request, "test_user");
            assert!(
                result.is_ok(),
                "Task creation should succeed with {} priority",
                priority
            );
        }
    }

    #[tokio::test]
    async fn test_create_task_with_long_values() {
        let task_service = create_task_creation_service();
        let long_string = "a".repeat(1000);

        let task_request = test_task!(
            title: Some(long_string.clone()),
            vehicle_model: Some(long_string.clone()),
            notes: Some(long_string),
            description: Some(long_string.clone())
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_err(),
            "Task creation should fail with excessively long values"
        );
        let error = result.unwrap_err();
        assert!(
            error.contains("title") || error.contains("too long"),
            "Error should mention length issue"
        );
    }

    #[tokio::test]
    async fn test_create_task_automatically_sets_defaults() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Default Values Task".to_string()),
            status: None, // Not setting status
            priority: None, // Not setting priority
            created_by: None, // Not setting creator
            created_at: None // Not setting creation time
        );

        let result = task_service.create_task_sync(task_request, "auto_user");

        assert!(
            result.is_ok(),
            "Task creation should succeed with automatic defaults"
        );
        let task = result.unwrap();

        assert_eq!(
            task.status,
            TaskStatus::Draft,
            "Should default to Draft status"
        );
        assert_eq!(
            task.created_by,
            Some("auto_user".to_string()),
            "Should set creator from parameter"
        );
        assert!(task.created_at > 0, "Should set creation timestamp");
        assert!(task.task_number.is_some(), "Should generate task number");
    }

    #[tokio::test]
    async fn test_create_task_handles_concurrent_creation() {
        let task_service = create_task_creation_service();

        // Create multiple tasks concurrently
        let handles: Vec<_> = (0..10)
            .map(|i| {
                let service = task_service.clone(); // This would require Clone implementation
                std::thread::spawn(move || {
                    let task_request = test_task!(title: Some(format!("Concurrent Task {}", i)));
                    service.create_task_sync(task_request, "concurrent_user")
                })
            })
            .collect();

        // Wait for all tasks to be created
        let results: Vec<_> = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect();

        // All should succeed
        for (i, result) in results.into_iter().enumerate() {
            assert!(
                result.is_ok(),
                "Concurrent task {} should be created successfully",
                i
            );
            let task = result.unwrap();
            assert_eq!(task.title, format!("Concurrent Task {}", i));
            assert!(
                task.task_number.is_some(),
                "Task {} should have task number",
                i
            );
        }
    }

    #[tokio::test]
    async fn test_create_task_edge_case_characters() {
        let task_service = create_task_creation_service();
        let task_request = test_task!(
            title: Some("Task with ÃƒÂ©mojis Ã°Å¸â€Â§ and accents ÃƒÂ©".to_string()),
            vehicle_plate: Some("PLATE-123".to_string()),
            customer_name: Some("JosÃƒÂ© GarcÃƒÂ­a".to_string()),
            notes: Some("Special characters: @#$%^&*()".to_string())
        );

        let result = task_service.create_task_sync(task_request, "test_user");

        assert!(
            result.is_ok(),
            "Task creation should handle special characters and emojis"
        );
        let task = result.unwrap();
        assert_eq!(task.title, "Task with ÃƒÂ©mojis Ã°Å¸â€Â§ and accents ÃƒÂ©");
        assert_eq!(task.customer_name, Some("JosÃƒÂ© GarcÃƒÂ­a".to_string()));
        assert_eq!(
            task.notes,
            Some("Special characters: @#$%^&*()".to_string())
        );
    }
}
