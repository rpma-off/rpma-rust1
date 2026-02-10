//! Unit tests for task update operations
//!
//! This module contains comprehensive unit tests for task update functionality,
//! focusing on status transition validation, auto-timestamps, and business rules.

use crate::commands::AppError;
use crate::models::task::{CreateTaskRequest, TaskPriority, TaskStatus, UpdateTaskRequest};
use crate::services::task_creation::TaskCreationService;
use crate::services::task_update::TaskUpdateService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_task(db: &TestDatabase) -> Result<String, String> {
        let service = TaskCreationService::new(db.db());
        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: Some("Description".to_string()),
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: Some("Tesla".to_string()),
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: Some(TaskStatus::Pending),
            priority: Some(TaskPriority::Medium),
            technician_id: None,
            scheduled_date: "2025-02-03".to_string(),
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            template_id: None,
            workflow_id: None,
            client_id: None,
            customer_name: None,
            customer_email: None,
            customer_phone: None,
            customer_address: None,
            external_id: None,
            lot_film: None,
            checklist_completed: None,
            notes: None,
            tags: None,
            estimated_duration: None,
        };

        let task = service
            .create_task_sync(request, "test_user")
            .map_err(|e| e.to_string())?;
        Ok(task.id)
    }

    #[tokio::test]
    async fn test_update_task_title_success() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id.clone()),
            title: Some("Updated Title".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_ok());

        let updated_task = result.unwrap();
        assert_eq!(updated_task.title, "Updated Title");
    }

    #[tokio::test]
    async fn test_update_task_empty_title_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            title: Some("".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("empty"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_title_too_long_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            title: Some("A".repeat(101)),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("100"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_status_pending_to_in_progress() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        // Create task with initial status
        let task = service.get_task_sync(&task_id).unwrap().unwrap();
        assert_eq!(task.status, TaskStatus::Pending);
        assert!(task.started_at.is_none());

        // Update to in_progress
        let update_request = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::InProgress),
            ..Default::default()
        };

        let updated_task = service
            .update_task_sync(update_request, "test_user")
            .unwrap();
        assert_eq!(updated_task.status, TaskStatus::InProgress);
        assert!(updated_task.started_at.is_some());
    }

    #[tokio::test]
    async fn test_update_task_status_in_progress_to_completed() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        // Set to in_progress first
        let update_request1 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::InProgress),
            ..Default::default()
        };
        service
            .update_task_sync(update_request1, "test_user")
            .unwrap();

        // Now set to completed
        let update_request2 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::Completed),
            ..Default::default()
        };

        let updated_task = service
            .update_task_sync(update_request2, "test_user")
            .unwrap();
        assert_eq!(updated_task.status, TaskStatus::Completed);
        assert!(updated_task.completed_at.is_some());
    }

    #[tokio::test]
    async fn test_update_task_status_completed_to_pending_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        // Set to completed
        let update_request1 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::Completed),
            ..Default::default()
        };
        service
            .update_task_sync(update_request1, "test_user")
            .unwrap();

        // Try to revert to pending (should fail)
        let update_request2 = UpdateTaskRequest {
            id: Some(task_id),
            status: Some(TaskStatus::Pending),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request2, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("Cannot move completed task back"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_status_cancelled_to_in_progress_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        // Set to cancelled
        let update_request1 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::Cancelled),
            ..Default::default()
        };
        service
            .update_task_sync(update_request1, "test_user")
            .unwrap();

        // Try to revert to in_progress (should fail)
        let update_request2 = UpdateTaskRequest {
            id: Some(task_id),
            status: Some(TaskStatus::InProgress),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request2, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("Cannot move cancelled task back"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_client_id_with_valid_client() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        // Create a test client
        let client_id = "test-client-123";
        test_db.execute(
            "INSERT INTO clients (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            &[client_id.to_string(), "Test Client".to_string(), "test@example.com".to_string(), "0", "0"]
        ).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            client_id: Some(client_id.to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_ok());

        let updated_task = result.unwrap();
        assert_eq!(updated_task.client_id, Some(client_id.to_string()));
    }

    #[tokio::test]
    async fn test_update_task_client_id_with_invalid_client_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            client_id: Some("nonexistent-client".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("does not exist"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_vehicle_year_valid() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            vehicle_year: Some("2024".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_ok());

        let updated_task = result.unwrap();
        assert_eq!(updated_task.vehicle_year, Some("2024".to_string()));
    }

    #[tokio::test]
    async fn test_update_task_vehicle_year_too_old_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            vehicle_year: Some("1899".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("1900"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_vehicle_year_too_new_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            vehicle_year: Some("2101".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("2100"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_vehicle_year_invalid_format_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            vehicle_year: Some("not-a-number".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("valid number"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_task_description_too_long_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        let update_request = UpdateTaskRequest {
            id: Some(task_id),
            description: Some("A".repeat(1001)),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("1000"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_update_nonexistent_task_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());

        let update_request = UpdateTaskRequest {
            id: Some("nonexistent-id".to_string()),
            title: Some("Updated".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_update_task_without_id_fails() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());

        let update_request = UpdateTaskRequest {
            title: Some("Updated".to_string()),
            ..Default::default()
        };

        let result = service.update_task_sync(update_request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("Task ID is required"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[tokio::test]
    async fn test_status_transition_workflow() {
        let test_db = test_db!();
        let service = TaskUpdateService::new(test_db.db());
        let task_id = create_test_task(&test_db).unwrap();

        // Draft -> Pending (valid)
        let update1 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::Draft),
            ..Default::default()
        };
        service.update_task_sync(update1, "test_user").unwrap();

        // Draft -> Scheduled (valid)
        let update2 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::Scheduled),
            ..Default::default()
        };
        let task = service.update_task_sync(update2, "test_user").unwrap();
        assert_eq!(task.status, TaskStatus::Scheduled);

        // Scheduled -> InProgress (valid)
        let update3 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::InProgress),
            ..Default::default()
        };
        let task = service.update_task_sync(update3, "test_user").unwrap();
        assert_eq!(task.status, TaskStatus::InProgress);
        assert!(task.started_at.is_some());

        // InProgress -> OnHold (valid)
        let update4 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::OnHold),
            ..Default::default()
        };
        let task = service.update_task_sync(update4, "test_user").unwrap();
        assert_eq!(task.status, TaskStatus::OnHold);

        // OnHold -> InProgress (valid)
        let update5 = UpdateTaskRequest {
            id: Some(task_id.clone()),
            status: Some(TaskStatus::InProgress),
            ..Default::default()
        };
        service.update_task_sync(update5, "test_user").unwrap();

        // InProgress -> Completed (valid)
        let update6 = UpdateTaskRequest {
            id: Some(task_id),
            status: Some(TaskStatus::Completed),
            ..Default::default()
        };
        let task = service.update_task_sync(update6, "test_user").unwrap();
        assert_eq!(task.status, TaskStatus::Completed);
        assert!(task.completed_at.is_some());
    }
}
