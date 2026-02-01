//! Performance benchmarks for task operations
//!
//! This module contains Criterion benchmarks to measure and track
//! the performance of critical task management operations.

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use crate::services::task_crud::TaskCrudService;
use crate::services::task_queries::TaskQueriesService;
use crate::test_utils::{TestDatabase, TestDataFactory, test_task};
use tokio::runtime::Runtime;

fn benchmark_task_creation(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    c.bench_function("create_task_single", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let service = TaskCrudService::new(test_db.db());
            
            let task_request = test_task!(
                title: "Benchmark Task".to_string(),
                description: Some("Task for benchmarking".to_string())
            );
            
            let _result = service.create_task_async(
                black_box(task_request),
                black_box("benchmark_user")
            ).await;
        });
    });
    
    c.bench_function("create_task_batch_10", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let service = TaskCrudService::new(test_db.db());
            
            for i in 0..10 {
                let task_request = test_task!(
                    title: format!("Batch Task {}", i),
                    description: Some(format!("Batch task {}", i))
                );
                
                let _result = service.create_task_async(
                    black_box(task_request),
                    black_box("benchmark_user")
                ).await;
            }
        });
    });
    
    c.bench_function("create_task_batch_100", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let service = TaskCrudService::new(test_db.db());
            
            for i in 0..100 {
                let task_request = test_task!(
                    title: format!("Large Batch Task {}", i),
                    description: Some(format!("Large batch task {}", i))
                );
                
                let _result = service.create_task_async(
                    black_box(task_request),
                    black_box("benchmark_user")
                ).await;
            }
        });
    });
}

fn benchmark_task_queries(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    // Setup test data
    let test_db = TestDatabase::new().unwrap();
    let service = TaskQueriesService::new(test_db.db());
    
    rt.block_on(async {
        // Create test tasks
        for i in 0..1000 {
            let task_service = TaskCrudService::new(test_db.db());
            let task_request = test_task!(
                title: format!("Query Test Task {}", i),
                status: if i % 3 == 0 { "draft" } 
                        else if i % 3 == 1 { "scheduled" } 
                        else { "in_progress" }.to_string(),
                priority: if i % 2 == 0 { "high" } else { "medium" }.to_string()
            );
            
            task_service.create_task_async(task_request, "benchmark_user").await.unwrap();
        }
    });
    
    c.bench_function("list_tasks_10", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = service.list_tasks_async(black_box(10), black_box(0)).await;
        });
    });
    
    c.bench_function("list_tasks_100", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = service.list_tasks_async(black_box(100), black_box(0)).await;
        });
    });
    
    c.bench_function("list_tasks_1000", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = service.list_tasks_async(black_box(1000), black_box(0)).await;
        });
    });
    
    c.bench_function("search_tasks_by_status", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = service.search_tasks_async(black_box("draft"), black_box(50), black_box(0)).await;
        });
    });
    
    c.bench_function("get_task_statistics", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = service.get_task_statistics_async().await;
        });
    });
}

fn benchmark_task_updates(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    // Setup test data
    let test_db = TestDatabase::new().unwrap();
    let service = TaskCrudService::new(test_db.db());
    
    let mut task_ids = Vec::new();
    
    rt.block_on(async {
        // Create test tasks
        for i in 0..100 {
            let task_request = test_task!(
                title: format!("Update Test Task {}", i),
                status: "draft".to_string()
            );
            
            let task = service.create_task_async(task_request, "benchmark_user").await.unwrap();
            task_ids.push(task.id);
        }
    });
    
    c.bench_function("update_task_single", |b| {
        b.to_async(&rt).iter(|| async {
            let task_id = black_box(task_ids[0].clone());
            let update_request = crate::models::task::UpdateTaskRequest {
                id: task_id,
                title: Some("Updated Title".to_string()),
                description: Some("Updated description".to_string()),
                ..Default::default()
            };
            
            let _result = service.update_task_async(black_box(update_request), black_box("benchmark_user")).await;
        });
    });
    
    c.bench_function("update_task_batch_10", |b| {
        b.to_async(&rt).iter(|| async {
            for i in 0..10 {
                let task_id = black_box(task_ids[i].clone());
                let update_request = crate::models::task::UpdateTaskRequest {
                    id: task_id,
                    title: Some(format!("Batch Update {}", i)),
                    ..Default::default()
                };
                
                let _result = service.update_task_async(black_box(update_request), black_box("benchmark_user")).await;
            }
        });
    });
    
    c.bench_function("assign_task", |b| {
        b.to_async(&rt).iter(|| async {
            let task_id = black_box(task_ids[10].clone());
            let update_request = crate::models::task::UpdateTaskRequest {
                id: task_id,
                technician_id: Some("tech-123".to_string()),
                status: Some("assigned".to_string()),
                assigned_at: Some(chrono::Utc::now().timestamp_millis()),
                assigned_by: Some("manager".to_string()),
                ..Default::default()
            };
            
            let _result = service.update_task_async(black_box(update_request), black_box("benchmark_user")).await;
        });
    });
    
    c.bench_function("complete_task", |b| {
        b.to_async(&rt).iter(|| async {
            let task_id = black_box(task_ids[20].clone());
            let update_request = crate::models::task::UpdateTaskRequest {
                id: task_id,
                status: Some("completed".to_string()),
                completed_at: Some(chrono::Utc::now().timestamp_millis()),
                actual_duration: Some(120),
                ..Default::default()
            };
            
            let _result = service.update_task_async(black_box(update_request), black_box("benchmark_user")).await;
        });
    });
}

fn benchmark_task_deletes(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    c.bench_function("delete_task_single", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let service = TaskCrudService::new(test_db.db());
            
            // Create a task first
            let task_request = test_task!(
                title: "Task to Delete".to_string(),
                description: Some("This task will be deleted".to_string())
            );
            
            let task = service.create_task_async(task_request, "benchmark_user").await.unwrap();
            
            // Then delete it
            let _result = service.delete_task_async(black_box(&task.id), black_box("benchmark_user")).await;
        });
    });
    
    c.bench_function("delete_task_batch_10", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let service = TaskCrudService::new(test_db.db());
            let mut task_ids = Vec::new();
            
            // Create tasks
            for i in 0..10 {
                let task_request = test_task!(
                    title: format!("Batch Delete Task {}", i),
                    description: Some(format!("Task {} for batch deletion", i))
                );
                
                let task = service.create_task_async(task_request, "benchmark_user").await.unwrap();
                task_ids.push(task.id);
            }
            
            // Delete all tasks
            for task_id in task_ids {
                let _result = service.delete_task_async(black_box(&task_id), black_box("benchmark_user")).await;
            }
        });
    });
}

fn benchmark_database_connections(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    
    c.bench_function("database_connection_pool_get", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let _conn = test_db.db().get_connection().unwrap();
            black_box(_conn);
        });
    });
    
    c.bench_function("database_transaction_commit", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            
            let result = test_db.db().with_transaction(|tx| {
                // Simple query within transaction
                tx.execute("SELECT 1", []).map_err(|e| e.to_string())
            });
            
            black_box(result);
        });
    });
    
    c.bench_function("database_transaction_rollback", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            
            let result = test_db.db().with_transaction(|tx| {
                // Query that will fail and cause rollback
                tx.execute("SELECT * FROM non_existent_table", [])
                    .map_err(|e| e.to_string())
            });
            
            black_box(result);
        });
    });
}

criterion_group!(
    benches,
    benchmark_task_creation,
    benchmark_task_queries,
    benchmark_task_updates,
    benchmark_task_deletes,
    benchmark_database_connections
);
criterion_main!(benches);