//! Unit tests for task creation operations
//!
//! This module contains comprehensive unit tests for task creation functionality,
//! focusing on validation, sync queue insertion, and business rules.

use crate::commands::AppError;
use crate::models::task::{CreateTaskRequest, TaskPriority, TaskStatus};
use crate::services::task_creation::TaskCreationService;
use crate::test_utils::{test_db, TestDataFactory, TestDatabase};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_task_success() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

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

        let result = service.create_task_sync(request, "test_user");
        assert!(result.is_ok());

        let task = result.unwrap();
        assert_eq!(task.title, "Test Task");
        assert_eq!(task.status, TaskStatus::Pending);
        assert_eq!(task.priority, TaskPriority::Medium);
        assert_eq!(task.vehicle_plate, Some("ABC-123".to_string()));
        assert_eq!(task.created_by, Some("test_user".to_string()));
        assert!(task.id.is_some());
        assert!(task.task_number.is_some());
    }

    #[test]
    fn test_create_task_generates_title_if_empty() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Nouvelle tâche".to_string(), // Will be ignored as it's the default placeholder
            description: None,
            vehicle_plate: "XYZ-789".to_string(),
            vehicle_model: "Model Y".to_string(),
            vehicle_year: None,
            vehicle_make: Some("Toyota".to_string()),
            vin: None,
            ppf_zones: vec!["fender".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
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

        let task = service.create_task_sync(request, "test_user").unwrap();
        assert!(task.title.contains("Toyota"));
        assert!(task.title.contains("Model Y"));
        assert!(task.title.contains("XYZ-789"));
    }

    #[test]
    fn test_create_task_missing_vehicle_plate_fails() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "".to_string(), // Empty
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
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

        let result = service.create_task_sync(request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("Vehicle plate"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[test]
    fn test_create_task_missing_vehicle_model_fails() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "".to_string(), // Empty
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
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

        let result = service.create_task_sync(request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("Vehicle model"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[test]
    fn test_create_task_missing_scheduled_date_fails() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
            technician_id: None,
            scheduled_date: "".to_string(), // Empty
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

        let result = service.create_task_sync(request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("Scheduled date"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[test]
    fn test_create_task_empty_ppf_zones_fails() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec![], // Empty
            custom_ppf_zones: None,
            status: None,
            priority: None,
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

        let result = service.create_task_sync(request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("PPF zone"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[test]
    fn test_create_task_with_valid_client() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        // Create a test client
        let client_id = "test-client-456";
        test_db.execute(
            "INSERT INTO clients (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            &[client_id.to_string(), "Test Client".to_string(), "test@example.com".to_string(), "0", "0"]
        ).unwrap();

        let request = CreateTaskRequest {
            title: "Task with Client".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
            technician_id: None,
            scheduled_date: "2025-02-03".to_string(),
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            template_id: None,
            workflow_id: None,
            client_id: Some(client_id.to_string()),
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

        let result = service.create_task_sync(request, "test_user");
        assert!(result.is_ok());

        let task = result.unwrap();
        assert_eq!(task.client_id, Some(client_id.to_string()));
    }

    #[test]
    fn test_create_task_with_invalid_client_fails() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Task with Invalid Client".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
            technician_id: None,
            scheduled_date: "2025-02-03".to_string(),
            start_time: None,
            end_time: None,
            date_rdv: None,
            heure_rdv: None,
            template_id: None,
            workflow_id: None,
            client_id: Some("nonexistent-client".to_string()),
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

        let result = service.create_task_sync(request, "test_user");
        assert!(result.is_err());

        if let Err(AppError::Validation(msg)) = result {
            assert!(msg.contains("does not exist"));
        } else {
            panic!("Expected Validation error");
        }
    }

    #[test]
    fn test_create_task_generates_unique_task_number() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        // Create first task
        let request1 = CreateTaskRequest {
            title: "Task 1".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
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

        let task1 = service.create_task_sync(request1, "test_user").unwrap();
        let task_number1 = task1.task_number.clone();

        // Create second task
        let request2 = CreateTaskRequest {
            title: "Task 2".to_string(),
            description: None,
            vehicle_plate: "DEF-456".to_string(),
            vehicle_model: "Model Y".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["fender".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
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

        let task2 = service.create_task_sync(request2, "test_user").unwrap();
        let task_number2 = task2.task_number;

        assert_ne!(task_number1, task_number2);
    }

    #[test]
    fn test_create_task_adds_to_sync_queue() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None,
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

        let task = service.create_task_sync(request, "test_user").unwrap();

        // Check if task was added to sync queue
        let count: i64 = test_db
            .query_single_value(
                "SELECT COUNT(*) FROM sync_queue WHERE entity_type = 'task' AND entity_id = ?",
                &[&task.id],
            )
            .unwrap();

        assert_eq!(count, 1, "Task should be added to sync queue");
    }

    #[test]
    fn test_create_task_default_status_pending() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None, // Not specified
            priority: None,
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

        let task = service.create_task_sync(request, "test_user").unwrap();
        assert_eq!(task.status, TaskStatus::Pending);
    }

    #[test]
    fn test_create_task_default_priority_medium() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: None,
            priority: None, // Not specified
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

        let task = service.create_task_sync(request, "test_user").unwrap();
        assert_eq!(task.priority, TaskPriority::Medium);
    }

    #[test]
    fn test_create_task_custom_status_and_priority() {
        let test_db = test_db!();
        let service = TaskCreationService::new(test_db.db());

        let request = CreateTaskRequest {
            title: "Test Task".to_string(),
            description: None,
            vehicle_plate: "ABC-123".to_string(),
            vehicle_model: "Model X".to_string(),
            vehicle_year: None,
            vehicle_make: None,
            vin: None,
            ppf_zones: vec!["hood".to_string()],
            custom_ppf_zones: None,
            status: Some(TaskStatus::Scheduled),
            priority: Some(TaskPriority::High),
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

        let task = service.create_task_sync(request, "test_user").unwrap();
        assert_eq!(task.status, TaskStatus::Scheduled);
        assert_eq!(task.priority, TaskPriority::High);
    }
}
