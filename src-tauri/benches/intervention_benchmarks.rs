//! Performance benchmarks for intervention operations
//!
//! This module contains Criterion benchmarks for intervention workflow
//! performance measurement and optimization tracking.

use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::services::task_crud::TaskCrudService;
use crate::test_utils::{test_task, TestDataFactory, TestDatabase};
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use tokio::runtime::Runtime;

fn benchmark_intervention_creation(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    c.bench_function("start_intervention_single", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let workflow_service = InterventionWorkflowService::new(test_db.db());

            let task_request = test_task!(
                title: "PPF Installation Task".to_string(),
                vehicle_plate: Some("ABC123".to_string()),
                status: "scheduled".to_string()
            );
            let task = TestDataFactory::create_test_task(Some(task_request));

            let request = crate::models::intervention::CreateInterventionRequest {
                task_id: "task-123".to_string(),
                ppf_zones_config: Some("front,rear".to_string()),
                film_type: Some("premium".to_string()),
                notes: Some("Standard installation".to_string()),
            };

            let _result = workflow_service
                .start_intervention(black_box(request), black_box(&task), black_box("test_user"))
                .await;
        });
    });

    c.bench_function("start_intervention_batch_10", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let workflow_service = InterventionWorkflowService::new(test_db.db());

            for i in 0..10 {
                let task_request = test_task!(
                    title: format!("Batch PPF Task {}", i),
                    vehicle_plate: Some(format!("BATCH{}", i)),
                    status: "scheduled".to_string()
                );
                let task = TestDataFactory::create_test_task(Some(task_request));

                let request = crate::models::intervention::CreateInterventionRequest {
                    task_id: format!("task-{}", i),
                    ppf_zones_config: Some("front".to_string()),
                    film_type: Some("standard".to_string()),
                    notes: None,
                };

                let _result = workflow_service
                    .start_intervention(
                        black_box(request),
                        black_box(&task),
                        black_box("test_user"),
                    )
                    .await;
            }
        });
    });
}

fn benchmark_intervention_steps(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup test data
    let test_db = TestDatabase::new().unwrap();
    let workflow_service = InterventionWorkflowService::new(test_db.db());

    let mut intervention_ids = Vec::new();

    rt.block_on(async {
        // Create test interventions
        for i in 0..50 {
            let task_request = test_task!(
                title: format!("Step Test Task {}", i),
                vehicle_plate: Some(format!("STEP{}", i)),
                status: "scheduled".to_string()
            );
            let task = TestDataFactory::create_test_task(Some(task_request));

            let request = crate::models::intervention::CreateInterventionRequest {
                task_id: format!("step-task-{}", i),
                ppf_zones_config: Some("front".to_string()),
                film_type: Some("standard".to_string()),
                notes: None,
            };

            let intervention = workflow_service
                .start_intervention(request, &task, "test_user")
                .await
                .unwrap();

            intervention_ids.push((intervention.id, intervention.steps));
        }
    });

    c.bench_function("advance_step_start", |b| {
        b.to_async(&rt).iter(|| async {
            let (intervention_id, steps) = black_box(intervention_ids[0].clone());
            let first_step = &steps[0];

            let advance_request = crate::models::intervention::AdvanceStepRequest {
                step_id: first_step.id.clone(),
                action: "start".to_string(),
                notes: Some("Starting step".to_string()),
                photos: vec![],
                location_lat: Some(40.7128),
                location_lon: Some(-74.0060),
                actual_duration: None,
            };

            let test_db = TestDatabase::new().unwrap();
            let workflow_service = InterventionWorkflowService::new(test_db.db());

            let _result = workflow_service
                .advance_step(black_box(advance_request), black_box("test_user"))
                .await;
        });
    });

    c.bench_function("advance_step_complete", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let workflow_service = InterventionWorkflowService::new(test_db.db());

            // Create new intervention for this test
            let task_request = test_task!(
                title: "Complete Step Test".to_string(),
                status: "scheduled".to_string()
            );
            let task = TestDataFactory::create_test_task(Some(task_request));

            let request = crate::models::intervention::CreateInterventionRequest {
                task_id: "complete-test".to_string(),
                ppf_zones_config: Some("front".to_string()),
                film_type: Some("standard".to_string()),
                notes: None,
            };

            let intervention = workflow_service
                .start_intervention(request, &task, "test_user")
                .await
                .unwrap();

            let first_step = &intervention.steps[0];

            // Start step first
            let start_request = crate::models::intervention::AdvanceStepRequest {
                step_id: first_step.id.clone(),
                action: "start".to_string(),
                notes: None,
                photos: vec![],
                location_lat: None,
                location_lon: None,
                actual_duration: None,
            };

            workflow_service
                .advance_step(start_request, "test_user")
                .await
                .unwrap();

            // Now complete it
            let complete_request = crate::models::intervention::AdvanceStepRequest {
                step_id: first_step.id.clone(),
                action: "complete".to_string(),
                notes: Some("Step completed".to_string()),
                photos: vec![],
                location_lat: Some(40.7128),
                location_lon: Some(-74.0060),
                actual_duration: Some(30),
            };

            let _result = workflow_service
                .advance_step(black_box(complete_request), black_box("test_user"))
                .await;
        });
    });

    c.bench_function("advance_step_with_photos", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let workflow_service = InterventionWorkflowService::new(test_db.db());

            // Create intervention
            let task_request = test_task!(
                title: "Photo Step Test".to_string(),
                status: "scheduled".to_string()
            );
            let task = TestDataFactory::create_test_task(Some(task_request));

            let request = crate::models::intervention::CreateInterventionRequest {
                task_id: "photo-test".to_string(),
                ppf_zones_config: Some("front".to_string()),
                film_type: Some("standard".to_string()),
                notes: None,
            };

            let intervention = workflow_service
                .start_intervention(request, &task, "test_user")
                .await
                .unwrap();

            let first_step = &intervention.steps[0];

            // Start step first
            let start_request = crate::models::intervention::AdvanceStepRequest {
                step_id: first_step.id.clone(),
                action: "start".to_string(),
                notes: None,
                photos: vec![],
                location_lat: None,
                location_lon: None,
                actual_duration: None,
            };

            workflow_service
                .advance_step(start_request, "test_user")
                .await
                .unwrap();

            // Complete with photos
            let complete_request = crate::models::intervention::AdvanceStepRequest {
                step_id: first_step.id.clone(),
                action: "complete".to_string(),
                notes: Some("Step completed with photos".to_string()),
                photos: vec![
                    crate::models::intervention::StepPhoto {
                        id: "photo-1".to_string(),
                        step_id: first_step.id.clone(),
                        photo_type: "before".to_string(),
                        file_path: "/tmp/before.jpg".to_string(),
                        thumbnail_path: Some("/tmp/before_thumb.jpg".to_string()),
                        file_size: 1024,
                        width: 1920,
                        height: 1080,
                        taken_at: chrono::Utc::now().timestamp_millis(),
                        location_lat: Some(40.7128),
                        location_lon: Some(-74.0060),
                        location_accuracy: Some(5.0),
                        quality_score: Some(95),
                        metadata: None,
                        created_at: chrono::Utc::now().timestamp_millis(),
                        updated_at: chrono::Utc::now().timestamp_millis(),
                        created_by: "test_user".to_string(),
                        updated_by: "test_user".to_string(),
                        synced: 0,
                        last_synced_at: None,
                        sync_error: None,
                    },
                    crate::models::intervention::StepPhoto {
                        id: "photo-2".to_string(),
                        step_id: first_step.id.clone(),
                        photo_type: "after".to_string(),
                        file_path: "/tmp/after.jpg".to_string(),
                        thumbnail_path: Some("/tmp/after_thumb.jpg".to_string()),
                        file_size: 1152,
                        width: 1920,
                        height: 1080,
                        taken_at: chrono::Utc::now().timestamp_millis(),
                        location_lat: Some(40.7128),
                        location_lon: Some(-74.0060),
                        location_accuracy: Some(5.0),
                        quality_score: Some(92),
                        metadata: None,
                        created_at: chrono::Utc::now().timestamp_millis(),
                        updated_at: chrono::Utc::now().timestamp_millis(),
                        created_by: "test_user".to_string(),
                        updated_by: "test_user".to_string(),
                        synced: 0,
                        last_synced_at: None,
                        sync_error: None,
                    },
                ],
                location_lat: Some(40.7128),
                location_lon: Some(-74.0060),
                actual_duration: Some(45),
            };

            let _result = workflow_service
                .advance_step(black_box(complete_request), black_box("test_user"))
                .await;
        });
    });
}

fn benchmark_intervention_completion(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    c.bench_function("complete_intervention_full_workflow", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let workflow_service = InterventionWorkflowService::new(test_db.db());

            let task_request = test_task!(
                title: "Complete Workflow Test".to_string(),
                status: "scheduled".to_string()
            );
            let task = TestDataFactory::create_test_task(Some(task_request));

            // Start intervention
            let request = crate::models::intervention::CreateInterventionRequest {
                task_id: "complete-workflow".to_string(),
                ppf_zones_config: Some("full".to_string()),
                film_type: Some("premium".to_string()),
                notes: None,
            };

            let mut intervention = workflow_service
                .start_intervention(request, &task, "test_user")
                .await
                .unwrap();

            // Complete all steps
            for step in &intervention.steps {
                let start_request = crate::models::intervention::AdvanceStepRequest {
                    step_id: step.id.clone(),
                    action: "start".to_string(),
                    notes: None,
                    photos: vec![],
                    location_lat: None,
                    location_lon: None,
                    actual_duration: None,
                };

                workflow_service
                    .advance_step(start_request, "test_user")
                    .await
                    .unwrap();

                let complete_request = crate::models::intervention::AdvanceStepRequest {
                    step_id: step.id.clone(),
                    action: "complete".to_string(),
                    notes: Some("Step completed".to_string()),
                    photos: vec![],
                    location_lat: Some(40.7128),
                    location_lon: Some(-74.0060),
                    actual_duration: Some(30),
                };

                workflow_service
                    .advance_step(complete_request, "test_user")
                    .await
                    .unwrap();
            }

            // Complete intervention
            let complete_request = crate::models::intervention::CompleteInterventionRequest {
                intervention_id: intervention.id.clone(),
                quality_score: Some(95),
                customer_satisfaction: Some(9),
                final_observations: Some("Excellent work".to_string()),
                actual_duration: Some(180),
            };

            let _result = workflow_service
                .complete_intervention(black_box(complete_request), black_box("test_user"))
                .await;
        });
    });
}

fn benchmark_intervention_queries(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup test data
    let test_db = TestDatabase::new().unwrap();
    let workflow_service = InterventionWorkflowService::new(test_db.db());

    rt.block_on(async {
        // Create test interventions with different statuses
        for i in 0..200 {
            let task_request = test_task!(
                title: format!("Query Test Task {}", i),
                status: "scheduled".to_string()
            );
            let task = TestDataFactory::create_test_task(Some(task_request));

            let request = crate::models::intervention::CreateInterventionRequest {
                task_id: format!("query-task-{}", i),
                ppf_zones_config: Some("front".to_string()),
                film_type: if i % 3 == 0 {
                    Some("premium".to_string())
                } else if i % 3 == 1 {
                    Some("standard".to_string())
                } else {
                    Some("matte".to_string())
                },
                notes: None,
            };

            workflow_service
                .start_intervention(request, &task, "test_user")
                .await
                .unwrap();
        }
    });

    c.bench_function("list_interventions_10", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = workflow_service
                .list_interventions(black_box(10), black_box(0))
                .await;
        });
    });

    c.bench_function("list_interventions_100", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = workflow_service
                .list_interventions(black_box(100), black_box(0))
                .await;
        });
    });

    c.bench_function("get_intervention_by_id", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = workflow_service
                .get_intervention_by_id(black_box("query-task-50"))
                .await;
        });
    });

    c.bench_function("get_interventions_by_task", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = workflow_service
                .get_interventions_by_task(black_box("query-task-25"))
                .await;
        });
    });
}

criterion_group!(
    benches,
    benchmark_intervention_creation,
    benchmark_intervention_steps,
    benchmark_intervention_completion,
    benchmark_intervention_queries
);
criterion_main!(benches);
