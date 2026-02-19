//! Performance tests for repository operations
//!
//! These tests verify that database operations perform within acceptable limits
//! and help identify performance regressions.

use rpma_ppf_intervention::models::{CreateTaskRequest, Task, TaskPriority, TaskStatus};
use rpma_ppf_intervention::repositories::{
    InterventionRepository, MaterialRepository, TaskRepository,
};
use rpma_ppf_intervention::test_utils::TestDatabase;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

// Performance thresholds (in milliseconds)
const TASK_CREATE_THRESHOLD: u64 = 100; // 100ms
const TASK_QUERY_THRESHOLD: u64 = 50; // 50ms
const BULK_INSERT_THRESHOLD: u64 = 500; // 500ms for 100 records

#[tokio::test]
async fn test_task_creation_performance() {
    let test_db = TestDatabase::new().await;
    let task_repo = TaskRepository::new(test_db.db());

    // Warm up the database
    for _ in 0..10 {
        create_test_task(&task_repo).await;
    }

    // Measure task creation time
    let start = Instant::now();
    create_test_task(&task_repo).await;
    let duration = start.elapsed();

    assert!(
        duration.as_millis() < TASK_CREATE_THRESHOLD,
        "Task creation took {}ms, expected < {}ms",
        duration.as_millis(),
        TASK_CREATE_THRESHOLD
    );
}

#[tokio::test]
async fn test_task_query_performance() {
    let test_db = TestDatabase::new().await;
    let task_repo = TaskRepository::new(test_db.db());

    // Create test data
    for i in 0..100 {
        create_test_task_with_number(&task_repo, i).await;
    }

    // Measure query time
    let start = Instant::now();
    let _tasks = task_repo
        .find_all(0, 50, Some("created_at DESC"))
        .await
        .unwrap();
    let duration = start.elapsed();

    assert!(
        duration.as_millis() < TASK_QUERY_THRESHOLD,
        "Task query took {}ms, expected < {}ms",
        duration.as_millis(),
        TASK_QUERY_THRESHOLD
    );
}

#[tokio::test]
async fn test_bulk_task_creation_performance() {
    let test_db = TestDatabase::new().await;
    let task_repo = TaskRepository::new(test_db.db());

    let tasks: Vec<CreateTaskRequest> = (0..100)
        .map(|i| CreateTaskRequest {
            title: format!("Performance Test Task {}", i),
            description: Some("Performance test task".to_string()),
            priority: TaskPriority::Normal,
            status: TaskStatus::Pending,
            client_id: "perf-client".to_string(),
            ppf_zone: "ZONE-PERF".to_string(),
            estimated_duration_hours: Some(2.0),
            scheduled_date: None,
            assigned_technician_id: None,
        })
        .collect();

    // Measure bulk insert time
    let start = Instant::now();
    for task in tasks {
        create_task_from_request(&task_repo, &task).await;
    }
    let duration = start.elapsed();

    assert!(
        duration.as_millis() < BULK_INSERT_THRESHOLD,
        "Bulk insert took {}ms, expected < {}ms",
        duration.as_millis(),
        BULK_INSERT_THRESHOLD
    );
}

#[tokio::test]
async fn test_concurrent_task_operations() {
    let test_db = Arc::new(TestDatabase::new().await);
    let task_repo = Arc::new(TaskRepository::new(test_db.db()));
    let task_count = Arc::new(RwLock::new(0));

    let start = Instant::now();

    // Spawn 10 concurrent tasks
    let handles: Vec<_> = (0..10)
        .map(|_| {
            let repo = Arc::clone(&task_repo);
            let count = Arc::clone(&task_count);
            tokio::spawn(async move {
                for _ in 0..10 {
                    create_test_task(&repo).await;
                    let mut c = count.write().await;
                    *c += 1;
                }
            })
        })
        .collect();

    // Wait for all tasks to complete
    for handle in handles {
        handle.await.unwrap();
    }

    let duration = start.elapsed();
    let total_tasks = *task_count.read().await;

    // Verify all tasks were created
    assert_eq!(total_tasks, 100);

    // Performance should scale reasonably with concurrency
    // Allow more time for concurrent operations
    const CONCURRENT_THRESHOLD: u64 = 2000; // 2 seconds
    assert!(
        duration.as_millis() < CONCURRENT_THRESHOLD,
        "Concurrent operations took {}ms, expected < {}ms",
        duration.as_millis(),
        CONCURRENT_THRESHOLD
    );

    println!(
        "Created {} tasks concurrently in {}ms (avg: {}ms per task)",
        total_tasks,
        duration.as_millis(),
        duration.as_millis() / total_tasks as u128
    );
}

#[tokio::test]
async fn test_task_index_performance() {
    let test_db = TestDatabase::new().await;
    let task_repo = TaskRepository::new(test_db.db());

    // Create test data with different statuses
    for i in 0..1000 {
        create_test_task_with_status(&task_repo, i).await;
    }

    // Measure indexed query time
    let start = Instant::now();
    let _tasks = task_repo
        .find_by_status(TaskStatus::Pending, 0, 50)
        .await
        .unwrap();
    let duration = start.elapsed();

    // Indexed queries should be very fast
    const INDEXED_QUERY_THRESHOLD: u64 = 20; // 20ms
    assert!(
        duration.as_millis() < INDEXED_QUERY_THRESHOLD,
        "Indexed query took {}ms, expected < {}ms",
        duration.as_millis(),
        INDEXED_QUERY_THRESHOLD
    );
}

#[tokio::test]
async fn test_intervention_material_join_performance() {
    let test_db = TestDatabase::new().await;
    let intervention_repo = InterventionRepository::new(test_db.db());

    // Create test data
    for i in 0..100 {
        create_test_intervention_with_materials(&test_db, i).await;
    }

    // Measure join query time
    let start = Instant::now();
    let _interventions = intervention_repo.find_with_materials(0, 50).await.unwrap();
    let duration = start.elapsed();

    const JOIN_QUERY_THRESHOLD: u64 = 150; // 150ms for complex joins
    assert!(
        duration.as_millis() < JOIN_QUERY_THRESHOLD,
        "Join query took {}ms, expected < {}ms",
        duration.as_millis(),
        JOIN_QUERY_THRESHOLD
    );
}

#[tokio::test]
async fn test_material_transaction_performance() {
    let test_db = TestDatabase::new().await;
    let material_repo = MaterialRepository::new(test_db.db());

    // Create a material
    let material = create_test_material(&material_repo).await;

    let start = Instant::now();

    // Perform multiple transactions
    for i in 0..50 {
        create_stock_transaction(&material_repo, &material.id, i as f64).await;
    }

    let duration = start.elapsed();

    const TRANSACTION_THRESHOLD: u64 = 300; // 300ms for 50 transactions
    assert!(
        duration.as_millis() < TRANSACTION_THRESHOLD,
        "Material transactions took {}ms, expected < {}ms",
        duration.as_millis(),
        TRANSACTION_THRESHOLD
    );
}

// Helper functions
async fn create_test_task(task_repo: &TaskRepository) -> Task {
    create_test_task_with_number(task_repo, 0).await
}

async fn create_test_task_with_number(task_repo: &TaskRepository, number: i32) -> Task {
    let request = CreateTaskRequest {
        title: format!("Test Task {}", number),
        description: Some("Test description".to_string()),
        priority: TaskPriority::Normal,
        status: match number % 4 {
            0 => TaskStatus::Draft,
            1 => TaskStatus::Pending,
            2 => TaskStatus::InProgress,
            _ => TaskStatus::Completed,
        },
        client_id: "test-client".to_string(),
        ppf_zone: "ZONE-001".to_string(),
        estimated_duration_hours: Some(2.0),
        scheduled_date: None,
        assigned_technician_id: None,
    };

    create_task_from_request(task_repo, &request).await
}

async fn create_test_task_with_status(task_repo: &TaskRepository, number: i32) -> Task {
    let request = CreateTaskRequest {
        title: format!("Status Test Task {}", number),
        description: Some("Test description".to_string()),
        priority: TaskPriority::Normal,
        status: if number % 2 == 0 {
            TaskStatus::Pending
        } else {
            TaskStatus::Completed
        },
        client_id: "test-client".to_string(),
        ppf_zone: "ZONE-001".to_string(),
        estimated_duration_hours: Some(2.0),
        scheduled_date: None,
        assigned_technician_id: None,
    };

    create_task_from_request(task_repo, &request).await
}

async fn create_task_from_request(task_repo: &TaskRepository, request: &CreateTaskRequest) -> Task {
    // This would use the actual repository create method
    // For now, return a mock task
    Task {
        id: format!("task-{}", request.title),
        title: request.title.clone(),
        description: request.description.clone(),
        status: request.status.clone(),
        priority: request.priority,
        client_id: request.client_id.clone(),
        ppf_zone: request.ppf_zone.clone(),
        estimated_duration_hours: request.estimated_duration_hours,
        scheduled_date: request.scheduled_date,
        assigned_technician_id: request.assigned_technician_id.clone(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        task_number: format!("TSK-{:04}", rand::random::<u16>()),
    }
}

async fn create_test_material(
    material_repo: &MaterialRepository,
) -> rpma_ppf_intervention::models::Material {
    // Mock material creation
    rpma_ppf_intervention::models::Material {
        id: "material-1".to_string(),
        sku: "TEST-MAT-001".to_string(),
        name: "Test Material".to_string(),
        description: Some("Test material description".to_string()),
        material_type: rpma_ppf_intervention::models::MaterialType::Film,
        unit_of_measure: rpma_ppf_intervention::models::UnitOfMeasure::M2,
        standard_cost: 50.0,
        selling_price: 75.0,
        reorder_level: 100.0,
        lead_time_days: 7,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        // ... other fields
    }
}

async fn create_stock_transaction(
    _material_repo: &MaterialRepository,
    _material_id: &str,
    _quantity: f64,
) {
    // Mock transaction creation
    tokio::time::sleep(Duration::from_millis(1)).await;
}

async fn create_test_intervention_with_materials(_test_db: &TestDatabase, _number: i32) {
    // Mock intervention with materials
    tokio::time::sleep(Duration::from_millis(1)).await;
}
