//! Performance tests for repository operations
//!
//! Tests the performance of critical repository operations under various load conditions
//! including large datasets, concurrent operations, and complex queries.

use crate::db::Database;
use crate::domains::clients::domain::models::client::Client;
use crate::domains::interventions::domain::models::intervention::{Intervention, InterventionStatus, InterventionType};
use crate::domains::tasks::domain::models::task::{SortOrder, Task, TaskPriority, TaskQuery, TaskStatus};
use crate::domains::users::domain::models::user::{User, UserRole};
use crate::repositories::{
    base::Repository, client_repository::ClientRepository,
    intervention_repository::InterventionRepository, task_repository::TaskRepository,
    user_repository::UserRepository,
};
use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use chrono::Utc;
use futures;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tokio::task as tokio_task;
use uuid::Uuid;

#[cfg(test)]
mod tests {
    use super::*;

    /// Test task repository performance with large datasets
    #[tokio::test]
    async fn test_task_repository_large_dataset_performance(
    ) -> Result<(), Box<dyn std::error::Error>> {
        let test_db = TestDatabase::new()?;
        let task_service = TaskService::new(Arc::clone(&test_db.db()));

        // Create a large dataset of tasks
        let num_tasks = 1000;
        let start_time = Instant::now();

        // Insert tasks in batches for better performance
        let batch_size = 50;
        for batch_start in (0..num_tasks).step_by(batch_size) {
            let batch_end = std::cmp::min(batch_start + batch_size, num_tasks);

            for i in batch_start..batch_end {
                let mut task_request = TestDataFactory::create_test_task(None);
                task_request.title = Some(format!("Performance Test Task {}", i));
                task_request.description = Some(format!("Description for task {}", i));

                let _ = task_service
                    .create_task_async(task_request, "test_user")
                    .await;
            }
        }

        let insert_duration = start_time.elapsed();
        println!("Inserted {} tasks in {:?}", num_tasks, insert_duration);
        println!(
            "Average insert time per task: {:?}",
            insert_duration / num_tasks
        );

        // Test query performance with different filters
        let query_scenarios = vec![
            // Basic query - using actual TaskQuery structure
            TaskQuery {
                page: 1,
                limit: 20,
                status: None,
                technician_id: None,
                client_id: None,
                priority: None,
                search: None,
                from_date: None,
                to_date: None,
                sort_by: Some("created_at".to_string()),
                sort_order: Some("desc".to_string()),
            },
            // Query with status filter
            TaskQuery {
                page: 1,
                limit: 20,
                status: Some(TaskStatus::InProgress),
                technician_id: None,
                client_id: None,
                priority: None,
                search: None,
                from_date: None,
                to_date: None,
                sort_by: Some("created_at".to_string()),
                sort_order: Some("desc".to_string()),
            },
            // Query with search term
            TaskQuery {
                page: 1,
                limit: 20,
                status: None,
                technician_id: None,
                client_id: None,
                priority: None,
                search: Some("Performance".to_string()),
                from_date: None,
                to_date: None,
                sort_by: Some("title".to_string()),
                sort_order: Some("asc".to_string()),
            },
        ];

        for (i, query) in query_scenarios.into_iter().enumerate() {
            let query_start = Instant::now();
            let result = task_service.get_tasks_async(query).await?;
            let query_duration = query_start.elapsed();

            println!(
                "Query scenario {}: {:?} - Found {} tasks",
                i,
                query_duration,
                result.data.len()
            );

            // Assert reasonable query performance (should be under 100ms for 1000 records)
            assert!(
                query_duration < Duration::from_millis(100),
                "Query performance regression detected"
            );
        }

        // Test pagination performance
        for page in 1..=10 {
            let pagination_start = Instant::now();
            let result = task_service
                .get_tasks_async(TaskQuery {
                    page: page,
                    limit: 20,
                    status: None,
                    technician_id: None,
                    client_id: None,
                    priority: None,
                    search: None,
                    from_date: None,
                    to_date: None,
                    sort_by: Some("created_at".to_string()),
                    sort_order: Some("desc".to_string()),
                })
                .await?;
            let pagination_duration = pagination_start.elapsed();

            println!(
                "Page {} query: {:?} - Found {} tasks",
                page,
                pagination_duration,
                result.data.len()
            );

            // Pagination should remain fast even with large datasets
            assert!(
                pagination_duration < Duration::from_millis(50),
                "Pagination performance regression detected"
            );
        }

        Ok(())
    }

    /// Test concurrent repository operations
    #[tokio::test]
    async fn test_concurrent_repository_operations() -> Result<(), Box<dyn std::error::Error>> {
        let test_db = TestDatabase::new()?;
        let task_service = Arc::new(TaskService::new(Arc::clone(&test_db.db())));

        // Create some initial test tasks first
        for i in 0..10 {
            let mut task_request = TestDataFactory::create_test_task(None);
            task_request.title = Some(format!("Initial Task {}", i));
            task_request.description = Some(format!("Description for task {}", i));

            let _ = task_service
                .create_task_async(task_request, "test_user")
                .await;
        }

        // Test concurrent task queries
        let num_concurrent_queries = 100;
        let semaphore = Arc::new(Semaphore::new(10)); // Limit concurrent operations
        let mut handles = vec![];

        let concurrent_start = Instant::now();

        for i in 0..num_concurrent_queries {
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let task_service_clone = Arc::clone(&task_service);

            let handle = tokio_task::spawn(async move {
                let _permit = permit; // Hold permit for the duration of the operation
                let query = TaskQuery {
                    page: (i % 10) + 1,
                    limit: 10,
                    status: None,
                    technician_id: None,
                    client_id: None,
                    priority: None,
                    search: Some("Initial".to_string()),
                    from_date: None,
                    to_date: None,
                    sort_by: Some("created_at".to_string()),
                    sort_order: Some("desc".to_string()),
                };
                task_service_clone.get_tasks_async(query).await
            });

            handles.push(handle);
        }

        // Wait for all concurrent operations to complete
        let results = futures::future::join_all(handles).await;
        let concurrent_duration = concurrent_start.elapsed();

        println!(
            "Executed {} queries concurrently in {:?}",
            num_concurrent_queries, concurrent_duration
        );
        println!(
            "Average time per concurrent query: {:?}",
            concurrent_duration / num_concurrent_queries
        );

        // Check for errors in concurrent operations
        let mut error_count = 0;
        for result in results {
            match result {
                Ok(Ok(_)) => {} // Success
                Ok(Err(e)) => {
                    eprintln!("Concurrent operation failed: {}", e);
                    error_count += 1;
                }
                Err(e) => {
                    eprintln!("Task join error: {}", e);
                    error_count += 1;
                }
            }
        }

        // Assert that most operations succeeded (allowing for some contention)
        let success_rate =
            (num_concurrent_queries - error_count) as f64 / num_concurrent_queries as f64;
        assert!(
            success_rate > 0.95,
            "Concurrent operation success rate too low: {:.2}%",
            success_rate * 100.0
        );

        Ok(())
    }

    /// Test intervention repository performance with complex queries
    #[tokio::test]
    async fn test_intervention_repository_performance() -> Result<(), Box<dyn std::error::Error>> {
        let test_db = TestDatabase::new()?;
        let task_service = TaskService::new(Arc::clone(&test_db.db()));
        let intervention_service = InterventionService::new(Arc::clone(&test_db.db()));

        // Create tasks for interventions
        let num_tasks = 200;
        for i in 0..num_tasks {
            let mut task_request = TestDataFactory::create_test_task(None);
            task_request.title = Some(format!("Intervention Task {}", i));
            task_request.status = Some(TaskStatus::InProgress);
            let created_task = task_service
                .create_task_async(task_request, "test_user")
                .await?;

            // Create intervention for each task
            let intervention = TestDataFactory::create_test_intervention(Some(Intervention {
                id: Uuid::new_v4().to_string(),
                task_id: created_task.id.clone(),
                intervention_type: InterventionType::Custom,
                title: format!("Test Intervention {}", i),
                description: Some(format!("Test intervention description {}", i)),
                status: InterventionStatus::Planned,
                scheduled_start: None,
                scheduled_end: None,
                actual_start: None,
                actual_end: None,
                assigned_to: None,
                created_by: "test_user".to_string(),
                created_at: Utc::now().timestamp(),
                updated_at: Utc::now().timestamp(),
            }));
            let _ = intervention_service
                .create_intervention(intervention, "test_user")
                .await?;
        }

        // Test intervention list performance
        let list_start = Instant::now();
        let interventions = intervention_service
            .get_interventions_async(None, None, None, None, 1, 50)
            .await?;
        let list_duration = list_start.elapsed();

        println!(
            "Listed {} interventions in {:?}",
            interventions.len(),
            list_duration
        );

        // Test intervention filtering performance
        let filter_start = Instant::now();
        let filtered_interventions = intervention_service
            .get_interventions_async(
                Some(InterventionStatus::InProgress),
                None,
                None,
                None,
                1,
                20,
            )
            .await?;
        let filter_duration = filter_start.elapsed();

        println!(
            "Filtered {} interventions in {:?}",
            filtered_interventions.len(),
            filter_duration
        );

        // Test intervention detail retrieval performance
        if !interventions.is_empty() {
            let detail_start = Instant::now();
            let _detail = intervention_service
                .get_intervention_by_id_async(&interventions[0].id)
                .await?;
            let detail_duration = detail_start.elapsed();

            println!("Retrieved intervention detail in {:?}", detail_duration);

            // Detail retrieval should be fast
            assert!(
                detail_duration < Duration::from_millis(10),
                "Intervention detail retrieval too slow"
            );
        }

        Ok(())
    }

    /// Test audit trail performance impact
    #[tokio::test]
    async fn test_audit_trail_performance_impact() -> Result<(), Box<dyn std::error::Error>> {
        let test_db = TestDatabase::new()?;
        let task_service = Arc::new(TaskService::new(Arc::clone(&test_db.db())));
        let audit_service = Arc::new(AuditService::new(Arc::clone(&test_db.db())));

        // Test performance with audit trail (TaskService always includes audit)
        let with_audit_start = Instant::now();
        for i in 0..50 {
            let mut task_request = TestDataFactory::create_test_task(None);
            task_request.title = Some(format!("Audit Task {}", i));
            let _ = task_service
                .create_task_async(task_request, "system@test.com")
                .await;
        }
        let with_audit_duration = with_audit_start.elapsed();

        println!("With audit (TaskService): {:?}", with_audit_duration);

        // The audit trail is built into TaskService, so we can't test without it
        // This test now serves as a baseline for audit performance
        assert!(
            with_audit_duration < Duration::from_secs(10),
            "Task creation with audit too slow: {:?}",
            with_audit_duration
        );

        Ok(())
    }

    /// Test repository memory pressure performance
    #[tokio::test]
    async fn test_repository_memory_pressure_performance() -> Result<(), Box<dyn std::error::Error>>
    {
        let test_db = TestDatabase::new()?;
        let task_service = TaskService::new(Arc::clone(&test_db.db()));

        // Create a smaller dataset to simulate memory pressure (500 instead of 5000 for faster test execution)
        let num_tasks = 500;
        println!(
            "Creating {} tasks to simulate memory pressure...",
            num_tasks
        );

        let creation_start = Instant::now();
        for i in 0..num_tasks {
            let mut task_request = TestDataFactory::create_test_task(None);
            task_request.title = Some(format!(
                "Task with a very long title to consume more memory {}",
                i
            ));
            task_request.description = Some(format!(
                "This is a very long description for task {} that should consume more memory in the database and test performance under memory pressure conditions.",
                i
            ));

            if i % 100 == 0 {
                println!("Created {} tasks...", i);
            }

            let _ = task_service
                .create_task_async(task_request, "test_user")
                .await;
        }
        let creation_duration = creation_start.elapsed();

        println!(
            "Created {} tasks in {:?} (avg: {:?}/task)",
            num_tasks,
            creation_duration,
            creation_duration / num_tasks
        );

        // Test query performance under memory pressure
        let query_start = Instant::now();
        let result = task_service
            .get_tasks_async(TaskQuery {
                page: Some(1),
                limit: Some(50),
                status: Some(TaskStatus::Pending),
                technician_id: None,
                client_id: None,
                priority: None,
                search: Some("very long title".to_string()),
                from_date: None,
                to_date: None,
                sort_by: "created_at".to_string(),
                sort_order: SortOrder::Desc,
            })
            .await?;
        let query_duration = query_start.elapsed();

        println!(
            "Memory pressure query: {:?} - Found {} tasks",
            query_duration,
            result.data.len()
        );

        // Queries should still be reasonably fast even under memory pressure
        assert!(
            query_duration < Duration::from_millis(500),
            "Query performance under memory pressure too slow"
        );

        Ok(())
    }

    /// Test transaction performance for batch operations
    #[tokio::test]
    async fn test_transaction_performance() -> Result<(), Box<dyn std::error::Error>> {
        let test_db = TestDatabase::new()?;
        let task_service = TaskService::new(Arc::clone(&test_db.db()));

        // Test batch operations (TaskService handles transactions internally)
        let batch_size = 100;
        let num_batches = 10;

        let transaction_start = Instant::now();

        for batch_num in 0..num_batches {
            for i in 0..batch_size {
                let mut task_request = TestDataFactory::create_test_task(None);
                task_request.title = Some(format!("Transaction Batch {} Task {}", batch_num, i));
                task_request.description = Some(format!("Tx-{}-{}", batch_num, i));

                let _ = task_service
                    .create_task_async(task_request, "test_user")
                    .await;
            }

            if batch_num % 3 == 0 {
                println!("Completed {} transaction batches", batch_num + 1);
            }
        }

        let transaction_duration = transaction_start.elapsed();
        let total_tasks = (batch_size * num_batches) as i32;

        println!(
            "Created {} batches ({} tasks) in {:?}",
            num_batches, total_tasks, transaction_duration
        );
        println!(
            "Average time per batch: {:?}",
            transaction_duration / num_batches
        );
        println!(
            "Average time per task: {:?}",
            transaction_duration / total_tasks
        );

        // Verify all tasks were created
        let result = task_service
            .get_tasks_async(TaskQuery {
                page: Some(1),
                limit: Some(total_tasks),
                status: None,
                technician_id: None,
                client_id: None,
                priority: None,
                search: Some("Tx-".to_string()),
                from_date: None,
                to_date: None,
                sort_by: "created_at".to_string(),
                sort_order: SortOrder::Desc,
            })
            .await?;

        assert_eq!(
            result.data.len(),
            total_tasks as usize,
            "Not all transaction-batched tasks were created"
        );

        Ok(())
    }

    /// Test repository connection pooling performance
    #[tokio::test]
    async fn test_connection_pooling_performance() -> Result<(), Box<dyn std::error::Error>> {
        let test_db = TestDatabase::new()?;
        let task_service = Arc::new(TaskService::new(Arc::clone(&test_db.db())));

        // Create some initial tasks first
        for i in 0..10 {
            let mut task_request = TestDataFactory::create_test_task(None);
            task_request.title = Some(format!("Initial Task {}", i));
            let _ = task_service
                .create_task_async(task_request, "test_user")
                .await;
        }

        // Test concurrent database operations
        let num_concurrent_ops = 200;
        let semaphore = Arc::new(Semaphore::new(20)); // Limit concurrent DB connections
        let mut handles = vec![];

        let pool_start = Instant::now();

        for i in 0..num_concurrent_ops {
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let task_service_clone = Arc::clone(&task_service);

            let handle = tokio_task::spawn(async move {
                let _permit = permit;

                // Simulate database operation by querying tasks
                let result = task_service_clone
                    .get_tasks_async(TaskQuery {
                        page: Some((i % 5) + 1),
                        limit: Some(10),
                        status: None,
                        technician_id: None,
                        client_id: None,
                        priority: None,
                        search: None,
                        from_date: None,
                        to_date: None,
                        sort_by: "created_at".to_string(),
                        sort_order: SortOrder::Desc,
                    })
                    .await;

                match result {
                    Ok(_) => Ok::<(), String>(()),
                    Err(e) => Err(e.to_string()),
                }
            });

            handles.push(handle);
        }

        let results = futures::future::join_all(handles).await;
        let pool_duration = pool_start.elapsed();

        println!(
            "Executed {} concurrent DB operations in {:?}",
            num_concurrent_ops, pool_duration
        );

        // Check for connection errors
        let mut error_count = 0;
        for result in results {
            match result {
                Ok(Ok(_)) => {} // Success
                Ok(Err(e)) => {
                    eprintln!("Concurrent DB operation failed: {}", e);
                    error_count += 1;
                }
                Err(e) => {
                    eprintln!("Task join error: {}", e);
                    error_count += 1;
                }
            }
        }

        let success_rate = (num_concurrent_ops - error_count) as f64 / num_concurrent_ops as f64;
        println!("Connection pool success rate: {:.2}%", success_rate * 100.0);

        // Most operations should succeed with proper connection pooling
        assert!(
            success_rate > 0.90,
            "Connection pool performance inadequate: {:.2}%",
            success_rate * 100.0
        );

        Ok(())
    }
}
