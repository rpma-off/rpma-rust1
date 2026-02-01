//! Unit tests for task CRUD operations
//!
//! This module contains comprehensive unit tests for the task creation, update,
//! and deletion functionality to ensure data integrity and business rule compliance.

use crate::commands::AppResult;
use crate::services::task_crud::TaskCrudService;
use crate::test_utils::{test_db, test_task, TestDataFactory, TestDatabase};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_task_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(
            title: "Test Create Task".to_string(),
            description: Some("This is a test task".to_string())
        );

        let created_task = service.create_task_async(task_request, "test_user").await?;

        assert_eq!(created_task.title, "Test Create Task");
        assert_eq!(created_task.created_by, Some("test_user".to_string()));
        assert_eq!(created_task.status, "draft");
        assert!(created_task.id.is_some());

        Ok(())
    }

    #[test]
    fn test_create_task_with_required_fields_only() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(
            title: "Minimal Task".to_string(),
            description: None,
            vehicle_plate: None,
            customer_name: None
        );

        let created_task = service.create_task_async(task_request, "test_user").await?;

        assert_eq!(created_task.title, "Minimal Task");
        assert_eq!(created_task.description, None);
        assert_eq!(created_task.vehicle_plate, None);
        assert_eq!(created_task.customer_name, None);

        Ok(())
    }

    #[test]
    fn test_create_task_auto_generates_task_number() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(title: "Task Number Test".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        assert!(created_task.task_number.is_some());
        assert!(created_task.task_number.unwrap().starts_with("TASK-"));
        assert!(created_task.task_number.unwrap().len() > 4);

        Ok(())
    }

    #[test]
    fn test_create_task_with_invalid_status() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(status: "invalid_status".to_string());

        let result = service.create_task_async(task_request, "test_user").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid status"));
    }

    #[test]
    fn test_create_task_with_invalid_priority() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(priority: "invalid_priority".to_string());

        let result = service.create_task_async(task_request, "test_user").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid priority"));
    }

    #[test]
    fn test_update_task_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create initial task
        let task_request = test_task!(title: "Original Task".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Update task
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            title: Some("Updated Task".to_string()),
            description: Some("Updated description".to_string()),
            priority: Some("high".to_string()),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "test_user")
            .await?;

        assert_eq!(updated_task.title, "Updated Task");
        assert_eq!(
            updated_task.description,
            Some("Updated description".to_string())
        );
        assert_eq!(updated_task.priority, "high");
        assert_ne!(updated_task.updated_at, created_task.updated_at);

        Ok(())
    }

    #[test]
    fn test_update_nonexistent_task() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let update_request = UpdateTaskRequest {
            id: "nonexistent-id".to_string(),
            title: Some("Updated".to_string()),
            ..Default::default()
        };

        let result = service.update_task_async(update_request, "test_user").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn test_update_task_status_transition() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task in draft status
        let task_request = test_task!(status: "draft".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Update to scheduled status
        let update_request = UpdateTaskRequest {
            id: created_task.id.clone(),
            status: Some("scheduled".to_string()),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "test_user")
            .await?;
        assert_eq!(updated_task.status, "scheduled");

        // Update to in_progress status
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            status: Some("in_progress".to_string()),
            technician_id: Some("tech-123".to_string()),
            assigned_at: Some(Utc::now().timestamp_millis()),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "test_user")
            .await?;
        assert_eq!(updated_task.status, "in_progress");
        assert_eq!(updated_task.technician_id, Some("tech-123".to_string()));

        Ok(())
    }

    #[test]
    fn test_invalid_status_transition() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task in draft status
        let task_request = test_task!(status: "draft".to_string());
        let created_task = service
            .create_task_async(task_request, "test_user")
            .await
            .unwrap();

        // Try to update directly to completed (should fail)
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            status: Some("completed".to_string()),
            ..Default::default()
        };

        let result = service.update_task_async(update_request, "test_user").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid status transition"));
    }

    #[test]
    fn test_delete_task_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task
        let task_request = test_task!(title: "Task to Delete".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Delete task
        let result = service
            .delete_task_async(&created_task.id, "test_user")
            .await?;
        assert!(result);

        // Verify task is deleted
        let deleted_task = service.get_task_by_id_async(&created_task.id).await?;
        assert!(deleted_task.is_none());

        Ok(())
    }

    #[test]
    fn test_delete_nonexistent_task() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let result = service
            .delete_task_async("nonexistent-id", "test_user")
            .await?;
        assert!(!result);

        Ok(())
    }

    #[test]
    fn test_get_task_by_id() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task
        let task_request = test_task!(
            title: "Task for Get".to_string(),
            description: Some("Task description".to_string())
        );
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Get task by ID
        let retrieved_task = service.get_task_by_id_async(&created_task.id).await?;
        assert!(retrieved_task.is_some());

        let task = retrieved_task.unwrap();
        assert_eq!(task.id, created_task.id);
        assert_eq!(task.title, "Task for Get");
        assert_eq!(task.description, Some("Task description".to_string()));

        Ok(())
    }

    #[test]
    fn test_get_task_by_nonexistent_id() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let retrieved_task = service.get_task_by_id_async("nonexistent-id").await?;
        assert!(retrieved_task.is_none());

        Ok(())
    }

    #[test]
    fn test_list_tasks_empty() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let tasks = service.list_tasks_async(10, 0).await?;
        assert!(tasks.is_empty());

        Ok(())
    }

    #[test]
    fn test_list_tasks_with_data() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create multiple tasks
        for i in 1..=5 {
            let task_request = test_task!(title: format!("Task {}", i));
            service.create_task_async(task_request, "test_user").await?;
        }

        // List tasks
        let tasks = service.list_tasks_async(10, 0).await?;
        assert_eq!(tasks.len(), 5);

        // Test pagination
        let tasks_page1 = service.list_tasks_async(2, 0).await?;
        let tasks_page2 = service.list_tasks_async(2, 2).await?;
        assert_eq!(tasks_page1.len(), 2);
        assert_eq!(tasks_page2.len(), 2);

        // Verify pagination works (different task IDs)
        let page1_ids: Vec<String> = tasks_page1.iter().map(|t| t.id.clone()).collect();
        let page2_ids: Vec<String> = tasks_page2.iter().map(|t| t.id.clone()).collect();

        // Ensure no overlap between pages
        for id1 in &page1_ids {
            assert!(!page2_ids.contains(id1));
        }

        Ok(())
    }

    #[test]
    fn test_search_tasks_by_title() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create tasks with different titles
        let task1 = test_task!(title: "Important PPF Task".to_string());
        let task2 = test_task!(title: "Regular Task".to_string());
        let task3 = test_task!(title: "Another Important Task".to_string());

        service.create_task_async(task1, "test_user").await?;
        service.create_task_async(task2, "test_user").await?;
        service.create_task_async(task3, "test_user").await?;

        // Search for "Important"
        let results = service.search_tasks_async("Important", 10, 0).await?;
        assert_eq!(results.len(), 2);

        // Verify all results contain the search term
        for task in &results {
            assert!(task.title.contains("Important"));
        }

        Ok(())
    }

    #[test]
    fn test_assign_task_to_technician() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task
        let task_request = test_task!(status: "scheduled".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Assign task
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            technician_id: Some("tech-456".to_string()),
            status: Some("assigned".to_string()),
            assigned_at: Some(Utc::now().timestamp_millis()),
            assigned_by: Some("manager".to_string()),
            ..Default::default()
        };

        let updated_task = service.update_task_async(update_request, "manager").await?;

        assert_eq!(updated_task.technician_id, Some("tech-456".to_string()));
        assert_eq!(updated_task.status, "assigned");
        assert_eq!(updated_task.assigned_by, Some("manager".to_string()));
        assert!(updated_task.assigned_at.is_some());

        Ok(())
    }

    #[test]
    fn test_complete_task() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create and assign task
        let task_request = test_task!(status: "in_progress".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Complete task
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            status: Some("completed".to_string()),
            completed_at: Some(Utc::now().timestamp_millis()),
            actual_duration: Some(150),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "tech-456")
            .await?;

        assert_eq!(updated_task.status, "completed");
        assert!(updated_task.completed_at.is_some());
        assert_eq!(updated_task.actual_duration, Some(150));

        Ok(())
    }
}
