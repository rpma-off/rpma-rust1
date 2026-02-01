//! Unit tests for task service

use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::task::{CreateTaskRequest, Task, UpdateTaskRequest};
use rpma_ppf_intervention::services::task::TaskService;
use std::sync::Arc;
use tokio::runtime::Runtime;

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Database {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let mut db = Database::new(temp_file.path()).unwrap();
        db.init().unwrap();
        db
    }

    #[test]
    fn test_task_creation() {
        let db = setup_test_db();
        let task_service = TaskService::new(Arc::new(db));

        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            let request = CreateTaskRequest {
                title: "Test Task".to_string(),
                description: Some("Test description".to_string()),
                priority: "medium".to_string(),
                technician_id: None,
                client_id: None,
                vehicle_plate: Some("ABC123".to_string()),
            };

            let result = task_service
                .create_task(request, "test-user".to_string())
                .await;
            assert!(result.is_ok(), "Task creation should succeed");

            let task = result.unwrap();
            assert_eq!(task.title, "Test Task");
            assert_eq!(task.priority, "medium");
            assert_eq!(task.status, "draft");
        });
    }

    #[test]
    fn test_task_retrieval() {
        let db = setup_test_db();
        let task_service = TaskService::new(Arc::new(db));

        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            // Create task first
            let create_request = CreateTaskRequest {
                title: "Test Task".to_string(),
                description: Some("Test description".to_string()),
                priority: "high".to_string(),
                technician_id: None,
                client_id: None,
                vehicle_plate: Some("XYZ789".to_string()),
            };
            let created_task = task_service
                .create_task(create_request, "test-user".to_string())
                .await
                .unwrap();

            // Retrieve task
            let retrieved_task = task_service.get_task_by_id(created_task.id.clone()).await;
            assert!(retrieved_task.is_ok(), "Task retrieval should succeed");

            let task = retrieved_task.unwrap();
            assert_eq!(task.id, created_task.id);
            assert_eq!(task.title, "Test Task");
        });
    }

    #[test]
    fn test_task_update() {
        let db = setup_test_db();
        let task_service = TaskService::new(Arc::new(db));

        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            // Create task first
            let create_request = CreateTaskRequest {
                title: "Original Title".to_string(),
                description: Some("Original description".to_string()),
                priority: "low".to_string(),
                technician_id: None,
                client_id: None,
                vehicle_plate: None,
            };
            let created_task = task_service
                .create_task(create_request, "test-user".to_string())
                .await
                .unwrap();

            // Update task
            let update_request = UpdateTaskRequest {
                title: Some("Updated Title".to_string()),
                status: Some("in_progress".to_string()),
                priority: Some("urgent".to_string()),
            };
            let update_result = task_service
                .update_task(
                    created_task.id.clone(),
                    update_request,
                    "test-user".to_string(),
                )
                .await;
            assert!(update_result.is_ok(), "Task update should succeed");

            let updated_task = update_result.unwrap();
            assert_eq!(updated_task.title, "Updated Title");
            assert_eq!(updated_task.status, "in_progress");
            assert_eq!(updated_task.priority, "urgent");
        });
    }
}
