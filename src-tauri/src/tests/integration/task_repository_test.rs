//! Integration tests for task repository
//!
//! Tests repository layer with actual database interactions including:
//! - CRUD operations with complex queries
//! - Dynamic query building and filtering
//! - Pagination and sorting
//! - Performance with large datasets

use crate::domains::tasks::infrastructure::task_repository::TaskRepository;
use crate::models::task::{Task, TaskPriority, TaskStatus};
use crate::test_utils::TestDataFactory;
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_task_repository() -> TaskRepository {
        let test_db = test_db!();
        TaskRepository::new(test_db.db())
    }

    #[test]
    fn test_create_task_with_all_fields() {
        let repo = create_task_repository();
        let task_request = test_task!(
            title: Some("Complete Task Test".to_string()),
            vehicle_plate: Some("ABC123".to_string()),
            vehicle_make: Some("Toyota".to_string()),
            vehicle_model: Some("Camry".to_string()),
            customer_name: Some("John Doe".to_string()),
            customer_email: Some("john@example.com".to_string()),
            priority: Some(TaskPriority::High),
            status: Some(TaskStatus::Draft)
        );

        let result = repo.create(&task_request);

        assert!(result.is_ok(), "Task creation should succeed");
        let created = result.unwrap();

        assert_eq!(created.title, "Complete Task Test");
        assert_eq!(created.vehicle_plate, "ABC123");
        assert_eq!(created.vehicle_make, Some("Toyota"));
        assert_eq!(created.customer_name, Some("John Doe"));
        assert_eq!(created.priority, Some(TaskPriority::High));
        assert_eq!(created.status, TaskStatus::Draft);
        assert!(!created.id.is_empty());
        assert!(created.created_at > 0);
    }

    #[test]
    fn test_create_task_minimal_fields() {
        let repo = create_task_repository();
        let task_request = test_task!(
            title: Some("Minimal Task".to_string()),
            ppf_zones: vec!["front".to_string()]
        );

        let result = repo.create(&task_request);

        assert!(result.is_ok(), "Minimal task creation should succeed");
        let created = result.unwrap();

        assert_eq!(created.title, "Minimal Task");
        assert_eq!(created.vehicle_plate, "");
        assert_eq!(created.customer_name, None);
        assert_eq!(created.priority, Some(TaskPriority::Medium)); // Default value
    }

    #[test]
    fn test_get_task_by_id() {
        let repo = create_task_repository();
        let task_request = test_task!(title: Some("Get Test".to_string()));
        let created = repo.create(&task_request).expect("Should create task");

        let retrieved = repo.get_by_id(&created.id).expect("Should retrieve task");

        assert_eq!(retrieved.id, created.id);
        assert_eq!(retrieved.title, created.title);
        assert_eq!(retrieved.vehicle_plate, created.vehicle_plate);
    }

    #[test]
    fn test_get_task_not_found() {
        let repo = create_task_repository();
        let nonexistent_id = uuid::Uuid::new_v4().to_string();

        let result = repo.get_by_id(&nonexistent_id);
        assert!(result.is_err(), "Should fail for nonexistent ID");
    }

    #[test]
    fn test_update_task() {
        let repo = create_task_repository();
        let task_request = test_task!(title: Some("Original Title".to_string()));
        let created = repo.create(&task_request).expect("Should create task");

        // Update task
        let mut update_request = task_request;
        update_request.title = Some("Updated Title".to_string());
        update_request.priority = Some(TaskPriority::Urgent);
        update_request.notes = Some("Updated notes".to_string());

        let updated = repo
            .update(&created.id, &update_request)
            .expect("Should update task");

        assert_eq!(updated.id, created.id);
        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.priority, Some(TaskPriority::Urgent));
        assert_eq!(updated.notes, Some("Updated notes"));
        assert!(updated.updated_at > created.updated_at);
    }

    #[test]
    fn test_delete_task() {
        let repo = create_task_repository();
        let task_request = test_task!(title: Some("Delete Test".to_string()));
        let created = repo.create(&task_request).expect("Should create task");

        // Delete task
        let result = repo.delete(&created.id);
        assert!(result.is_ok(), "Delete should succeed");

        // Verify deletion
        let retrieve_result = repo.get_by_id(&created.id);
        assert!(retrieve_result.is_err(), "Should not find deleted task");
    }

    #[test]
    fn test_find_with_filters_status() {
        let repo = create_task_repository();

        // Create tasks with different statuses
        let statuses = vec![
            TaskStatus::Draft,
            TaskStatus::Scheduled,
            TaskStatus::InProgress,
            TaskStatus::Completed,
        ];

        for (i, status) in statuses.iter().enumerate() {
            let task_request = test_task!(
                title: Some(format!("Task {}", i)),
                status: Some(*status)
            );
            repo.create(&task_request).expect("Should create task");
        }

        // Filter by status
        let found = repo
            .find_with_filters(
                Some(&vec!["scheduled".to_string(), "in_progress".to_string()]),
                None,
                None,
                None,
                None,
                10,
                0,
            )
            .expect("Should find tasks");

        assert_eq!(found.len(), 2);
        let found_statuses: Vec<_> = found.iter().map(|t| t.status.clone()).collect();
        assert!(found_statuses.contains(&TaskStatus::Scheduled));
        assert!(found_statuses.contains(&TaskStatus::InProgress));
        assert!(!found_statuses.contains(&TaskStatus::Draft));
        assert!(!found_statuses.contains(&TaskStatus::Completed));
    }

    #[test]
    fn test_find_with_filters_priority() {
        let repo = create_task_repository();

        // Create tasks with different priorities
        let priorities = vec![
            TaskPriority::Low,
            TaskPriority::Medium,
            TaskPriority::High,
            TaskPriority::Urgent,
        ];

        for (i, priority) in priorities.iter().enumerate() {
            let task_request = test_task!(
                title: Some(format!("Priority Task {}", i)),
                priority: Some(*priority)
            );
            repo.create(&task_request).expect("Should create task");
        }

        // Filter by priority
        let found = repo
            .find_with_filters(
                None,
                Some(&vec!["high".to_string(), "urgent".to_string()]),
                None,
                None,
                None,
                10,
                0,
            )
            .expect("Should find tasks");

        assert_eq!(found.len(), 2);
        let found_priorities: Vec<_> = found.iter().filter_map(|t| t.priority).collect();
        assert!(found_priorities.contains(&TaskPriority::High));
        assert!(found_priorities.contains(&TaskPriority::Urgent));
        assert!(!found_priorities.contains(&TaskPriority::Low));
        assert!(!found_priorities.contains(&TaskPriority::Medium));
    }

    #[test]
    fn test_find_with_filters_search() {
        let repo = create_task_repository();

        // Create tasks with searchable content
        let tasks_data = vec![
            ("Toyota Camry PPF", "Front bumper repair"),
            ("Honda Civic Protection", "Full car PPF"),
            ("Tesla Model 3", "R windshield film"),
            ("BMW X5", "Full paint protection"),
        ];

        for (i, (title, description)) in tasks_data.iter().enumerate() {
            let task_request = test_task!(
                title: Some(title.to_string()),
                description: Some(description.to_string())
            );
            repo.create(&task_request).expect("Should create task");
        }

        // Search for "PPF"
        let found = repo
            .find_with_filters(None, None, Some("PPF"), None, None, 10, 0)
            .expect("Should find tasks");

        assert_eq!(found.len(), 2);
        let found_titles: Vec<_> = found.iter().map(|t| t.title.as_ref().unwrap()).collect();
        assert!(found_titles.iter().any(|title| title.contains("PPF")));

        // Search for "Tesla"
        let found = repo
            .find_with_filters(None, None, Some("Tesla"), None, None, 10, 0)
            .expect("Should find tasks");

        assert_eq!(found.len(), 1);
        assert_eq!(found[0].title.as_ref().unwrap(), "Tesla Model 3");
    }

    #[test]
    fn test_find_with_pagination() {
        let repo = create_task_repository();

        // Create 25 tasks
        for i in 0..25 {
            let task_request = test_task!(
                title: Some(format!("Pagination Test {}", i))
            );
            repo.create(&task_request).expect("Should create task");
        }

        // Test pagination
        let page1 = repo
            .find_with_filters(None, None, None, None, None, 10, 0)
            .expect("Should get first page");
        let page2 = repo
            .find_with_filters(None, None, None, None, None, 10, 1)
            .expect("Should get second page");
        let page3 = repo
            .find_with_filters(None, None, None, None, None, 10, 2)
            .expect("Should get third page");

        assert_eq!(page1.len(), 10);
        assert_eq!(page2.len(), 10);
        assert_eq!(page3.len(), 5);

        // Verify no duplicates across pages
        let all_ids: Vec<_> = page1
            .iter()
            .chain(page2.iter())
            .chain(page3.iter())
            .map(|t| t.id.clone())
            .collect();
        let unique_ids: std::collections::HashSet<_> = all_ids.iter().cloned().collect();
        assert_eq!(
            all_ids.len(),
            unique_ids.len(),
            "Should have no duplicate tasks"
        );
    }

    #[test]
    fn test_find_with_sorting() {
        let repo = create_task_repository();

        // Create tasks with different creation times
        let tasks_data = vec![
            ("Old Task", -2),    // 2 days ago
            ("New Task", 1),     // 1 day in future
            ("Current Task", 0), // Now
        ];

        for (title, day_offset) in tasks_data {
            let task_request = test_task!(
                title: Some(title.to_string()),
                scheduled_date: (chrono::Utc::now() + chrono::Duration::days(day_offset))
                    .format("%Y-%m-%d").to_string()
            );
            repo.create(&task_request).expect("Should create task");
        }

        // Sort by creation date ascending
        let found = repo
            .find_with_filters(None, None, None, Some("created_at"), Some("asc"), 10, 0)
            .expect("Should find tasks");

        assert_eq!(found.len(), 3);
        assert!(found[0].title.as_ref().unwrap() == "Old Task");
        assert!(found[1].title.as_ref().unwrap() == "Current Task");
        assert!(found[2].title.as_ref().unwrap() == "New Task");

        // Sort by creation date descending
        let found = repo
            .find_with_filters(None, None, None, Some("created_at"), Some("desc"), 10, 0)
            .expect("Should find tasks");

        assert_eq!(found.len(), 3);
        assert!(found[0].title.as_ref().unwrap() == "New Task");
        assert!(found[1].title.as_ref().unwrap() == "Current Task");
        assert!(found[2].title.as_ref().unwrap() == "Old Task");
    }

    #[test]
    fn test_count_tasks() {
        let repo = create_task_repository();

        // Create tasks with different statuses
        let statuses = vec![
            TaskStatus::Draft,
            TaskStatus::Scheduled,
            TaskStatus::InProgress,
            TaskStatus::Completed,
        ];

        for status in &statuses {
            for _ in 0..3 {
                let task_request = test_task!(status: Some(*status));
                repo.create(&task_request).expect("Should create task");
            }
        }

        // Count all tasks
        let total_count = repo.count(None, None).expect("Should count all tasks");
        assert_eq!(total_count, 12);

        // Count by status
        let draft_count = repo
            .count(Some(&vec!["draft".to_string()]), None)
            .expect("Should count draft tasks");
        assert_eq!(draft_count, 3);

        let completed_count = repo
            .count(Some(&vec!["completed".to_string()]), None)
            .expect("Should count completed tasks");
        assert_eq!(completed_count, 3);
    }

    #[test]
    fn test_get_task_statistics() {
        let repo = create_task_repository();

        // Create tasks with different statuses and priorities
        for status in [
            TaskStatus::Draft,
            TaskStatus::Scheduled,
            TaskStatus::InProgress,
            TaskStatus::Completed,
        ] {
            for priority in [TaskPriority::Low, TaskPriority::Medium, TaskPriority::High] {
                let task_request = test_task!(
                    status: Some(status),
                    priority: Some(priority)
                );
                repo.create(&task_request).expect("Should create task");
            }
        }

        let stats = repo.get_statistics().expect("Should get statistics");

        assert_eq!(stats.total_tasks, 12);
        assert_eq!(stats.draft_tasks, 3);
        assert_eq!(stats.scheduled_tasks, 3);
        assert_eq!(stats.in_progress_tasks, 3);
        assert_eq!(stats.completed_tasks, 3);
        assert_eq!(stats.high_priority_tasks, 3);
        assert_eq!(stats.medium_priority_tasks, 3);
        assert_eq!(stats.low_priority_tasks, 3);
    }

    #[test]
    fn test_complex_query_combinations() {
        let repo = create_task_repository();

        // Create tasks with various attributes
        let tasks_data = vec![
            (
                "Toyota PPF Task",
                TaskStatus::Scheduled,
                TaskPriority::High,
                "front,rear",
            ),
            (
                "Honda Window Film",
                TaskStatus::InProgress,
                TaskPriority::Medium,
                "front",
            ),
            (
                "BMW Detailing",
                TaskStatus::Completed,
                TaskPriority::Low,
                "full_car",
            ),
            (
                "Tesla Protection",
                TaskStatus::Draft,
                TaskPriority::Urgent,
                "hood,trunk",
            ),
        ];

        for (title, status, priority, ppf_zones) in tasks_data {
            let task_request = test_task!(
                title: Some(title.to_string()),
                status: Some(status),
                priority: Some(priority),
                ppf_zones: ppf_zones.split(',').map(|s| s.to_string()).collect()
            );
            repo.create(&task_request).expect("Should create task");
        }

        // Complex query: high/urgent priority tasks that contain "PPF" or "Protection"
        let found = repo
            .find_with_filters(
                Some(&vec!["scheduled".to_string(), "in_progress".to_string()]),
                Some(&vec!["high".to_string(), "urgent".to_string()]),
                Some("PPF OR Protection"),
                Some("created_at"),
                Some("desc"),
                10,
                0,
            )
            .expect("Should find tasks");

        assert_eq!(found.len(), 2);
        let found_titles: Vec<_> = found.iter().map(|t| t.title.as_ref().unwrap()).collect();
        assert!(found_titles.contains(&"Toyota PPF Task"));
        assert!(found_titles.contains(&"Honda Window Film"));
        assert!(!found_titles.contains(&"BMW Detailing"));
        assert!(!found_titles.contains(&"Tesla Protection"));
    }

    #[test]
    fn test_foreign_key_constraints() {
        let repo = create_task_repository();
        let nonexistent_client_id = uuid::Uuid::new_v4().to_string();
        let nonexistent_technician_id = uuid::Uuid::new_v4().to_string();

        // Test with nonexistent client
        let task_request = test_task!(
            title: Some("Invalid Client Task".to_string()),
            client_id: Some(nonexistent_client_id)
        );

        let result = repo.create(&task_request);
        assert!(result.is_err(), "Should fail with foreign key constraint");

        // Test with nonexistent technician
        let task_request = test_task!(
            title: Some("Invalid Technician Task".to_string()),
            technician_id: Some(nonexistent_technician_id)
        );

        let result = repo.create(&task_request);
        assert!(result.is_err(), "Should fail with foreign key constraint");
    }

    #[test]
    fn test_data_integrity_checks() {
        let repo = create_task_repository();

        // Create task with related data
        let task_request = test_task!(title: Some("Integrity Test".to_string()));
        let created = repo.create(&task_request).expect("Should create task");

        // Check database integrity
        let conn = repo.get_connection().expect("Should get connection");

        // Verify task exists
        let task_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE id = ?1",
                [&created.id],
                |row| row.get(0),
            )
            .expect("Should count task");
        assert_eq!(task_count, 1, "Task should exist");

        // Verify foreign key constraints are enforced
        let mut stmt = conn
            .prepare(
                "
            SELECT COUNT(*) FROM tasks t 
            LEFT JOIN clients c ON t.client_id = c.id 
            WHERE t.client_id IS NOT NULL AND c.id IS NULL
        ",
            )
            .expect("Should prepare FK check query");

        let orphaned_clients: i64 = stmt
            .query_row([], |row| row.get(0))
            .expect("Should check FK constraints");

        assert_eq!(
            orphaned_clients, 0,
            "Should have no orphaned client references"
        );
    }

    #[test]
    fn test_performance_with_large_dataset() {
        let repo = create_task_repository();

        // Create 100 tasks to test performance
        let start_time = std::time::Instant::now();

        for i in 0..100 {
            let task_request = test_task!(
                title: Some(format!("Performance Task {}", i))
            );
            repo.create(&task_request).expect("Should create task");
        }

        let creation_time = start_time.elapsed();

        // Test query performance
        let start_time = std::time::Instant::now();

        let found = repo
            .find_with_filters(None, None, None, None, None, 50, 0)
            .expect("Should find tasks");

        let query_time = start_time.elapsed();

        assert_eq!(found.len(), 50);
        assert!(
            creation_time.as_millis() < 5000,
            "Creation should be reasonable"
        );
        assert!(query_time.as_millis() < 1000, "Query should be fast");
    }

    #[test]
    fn test_transaction_isolation() {
        let repo = create_task_repository();

        // Test that transactions properly isolate changes
        let task_request1 = test_task!(title: Some("Transaction Test 1".to_string()));
        let task_request2 = test_task!(title: Some("Transaction Test 2".to_string()));

        let result = repo.create_with_transaction(|conn| {
            // Create first task
            let task1 = repo.create_in_transaction(&task_request1, conn)?;

            // Try to create second task with validation that should fail
            let mut invalid_task = task_request2;
            invalid_task.title = None; // This should fail

            match repo.create_in_transaction(&invalid_task, conn) {
                Ok(_) => Err("Should have failed".to_string()),
                Err(e) => {
                    // Verify first task was created within transaction
                    let verify = conn.query_row(
                        "SELECT COUNT(*) FROM tasks WHERE id = ?1",
                        [&task1.id],
                        |row| row.get::<i64, _>(0),
                    )?;

                    if verify != 1 {
                        return Err("Task should exist in transaction".to_string());
                    }

                    Err(e)
                }
            }
        });

        assert!(result.is_err(), "Transaction should fail");

        // Verify no tasks were created (rollback worked)
        let all_count = repo.count(None, None).expect("Should count all tasks");
        assert_eq!(all_count, 0, "No tasks should exist after rollback");
    }
}
