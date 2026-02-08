//! Performance benchmarks for audit operations
//!
//! This module contains Criterion benchmarks for audit logging
//! performance to ensure minimal impact on system performance.

use crate::services::audit_service::{ActionResult, AuditEventType, AuditService};
use crate::test_utils::TestDatabase;
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use tokio::runtime::Runtime;

fn benchmark_audit_logging(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup test database
    let test_db = TestDatabase::new().unwrap();
    let audit_service = AuditService::new(test_db.db());

    rt.block_on(async {
        audit_service.init().unwrap();
    });

    c.bench_function("log_task_event", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = audit_service.log_task_event(
                black_box(AuditEventType::TaskCreated),
                black_box("user-123"),
                black_box("task-456"),
                black_box("Created new PPF installation task"),
                black_box(None),
                black_box(None),
                black_box(ActionResult::Success),
            );
        });
    });

    c.bench_function("log_intervention_event", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = audit_service.log_intervention_event(
                black_box(AuditEventType::InterventionStarted),
                black_box("technician-123"),
                black_box("intervention-456"),
                black_box("Started PPF installation"),
                black_box(None),
                black_box(None),
                black_box(ActionResult::Success),
            );
        });
    });

    c.bench_function("log_security_event", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = audit_service.log_security_event(
                black_box(AuditEventType::AuthenticationSuccess),
                black_box("user-123"),
                black_box("Successful login"),
                black_box(Some("192.168.1.100")),
                black_box(Some("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")),
                black_box(ActionResult::Success),
            );
        });
    });

    c.bench_function("log_custom_event", |b| {
        b.to_async(&rt).iter(|| async {
            let custom_event = crate::services::audit_service::AuditEvent {
                id: uuid::Uuid::new_v4().to_string(),
                event_type: AuditEventType::SystemError,
                user_id: "system-123".to_string(),
                action: "PERFORMANCE_METRIC".to_string(),
                resource_id: None,
                resource_type: Some("system".to_string()),
                description: "Performance metric collected".to_string(),
                ip_address: Some("127.0.0.1".to_string()),
                user_agent: Some("Internal Monitor".to_string()),
                result: ActionResult::Success,
                previous_state: None,
                new_state: Some(serde_json::json!({
                    "cpu_usage": 45.2,
                    "memory_usage": 67.8,
                    "response_time_ms": 123
                })),
                timestamp: chrono::Utc::now(),
                metadata: Some(serde_json::json!({
                    "metric_type": "system_performance",
                    "collection_method": "automatic"
                })),
                session_id: None,
                request_id: Some("metric-12345".to_string()),
            };

            let _result = audit_service.log_event(black_box(custom_event));
        });
    });
}

fn benchmark_audit_batch_operations(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup test database
    let test_db = TestDatabase::new().unwrap();
    let audit_service = AuditService::new(test_db.db());

    rt.block_on(async {
        audit_service.init().unwrap();
    });

    c.bench_function("log_events_batch_10", |b| {
        b.to_async(&rt).iter(|| async {
            for i in 0..10 {
                let _result = audit_service.log_task_event(
                    if i % 2 == 0 {
                        AuditEventType::TaskCreated
                    } else {
                        AuditEventType::TaskUpdated
                    },
                    black_box(&format!("user-{}", i)),
                    black_box(&format!("task-{}", i)),
                    black_box(&format!("Batch event {}", i)),
                    black_box(None),
                    black_box(None),
                    black_box(ActionResult::Success),
                );
            }
        });
    });

    c.bench_function("log_events_batch_100", |b| {
        b.to_async(&rt).iter(|| async {
            for i in 0..100 {
                let _result = audit_service.log_task_event(
                    if i % 2 == 0 {
                        AuditEventType::TaskCreated
                    } else {
                        AuditEventType::TaskUpdated
                    },
                    black_box(&format!("user-{}", i)),
                    black_box(&format!("task-{}", i)),
                    black_box(&format!("Large batch event {}", i)),
                    black_box(None),
                    black_box(None),
                    black_box(ActionResult::Success),
                );
            }
        });
    });
}

fn benchmark_audit_queries(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup test database with audit events
    let test_db = TestDatabase::new().unwrap();
    let audit_service = AuditService::new(test_db.db());

    rt.block_on(async {
        audit_service.init().unwrap();

        // Create test audit events
        for i in 0..1000 {
            audit_service
                .log_task_event(
                    if i % 3 == 0 {
                        AuditEventType::TaskCreated
                    } else if i % 3 == 1 {
                        AuditEventType::TaskUpdated
                    } else {
                        AuditEventType::TaskCompleted
                    },
                    &format!("user-{}", i % 50), // 50 different users
                    &format!("task-{}", i),
                    &format!("Audit event {}", i),
                    None,
                    None,
                    ActionResult::Success,
                )
                .unwrap();
        }
    });

    c.bench_function("get_resource_history_single", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = audit_service
                .get_resource_history(
                    black_box("task"),
                    black_box("task-123"),
                    black_box(Some(10)),
                )
                .await;
        });
    });

    c.bench_function("get_resource_history_pagination_10", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = audit_service
                .get_resource_history(
                    black_box("task"),
                    black_box("task-456"),
                    black_box(Some(10)),
                )
                .await;
        });
    });

    c.bench_function("get_user_activity_single", |b| {
        b.to_async(&rt).iter(|| async {
            let _result = audit_service
                .get_user_activity(
                    black_box("user-25"),
                    black_box(None),
                    black_box(None),
                    black_box(Some(50)),
                )
                .await;
        });
    });

    c.bench_function("get_user_activity_date_range", |b| {
        b.to_async(&rt).iter(|| async {
            let start_time = chrono::Utc::now() - chrono::Duration::days(1);
            let end_time = chrono::Utc::now();

            let _result = audit_service
                .get_user_activity(
                    black_box("user-25"),
                    black_box(Some(start_time)),
                    black_box(Some(end_time)),
                    black_box(Some(100)),
                )
                .await;
        });
    });
}

fn benchmark_audit_maintenance(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Setup test database with old audit events
    let test_db = TestDatabase::new().unwrap();
    let audit_service = AuditService::new(test_db.db());

    rt.block_on(async {
        audit_service.init().unwrap();

        // Create test audit events
        for i in 0..500 {
            audit_service
                .log_task_event(
                    AuditEventType::TaskCreated,
                    &format!("user-{}", i % 20),
                    &format!("task-{}", i),
                    &format!("Old audit event {}", i),
                    None,
                    None,
                    ActionResult::Success,
                )
                .unwrap();
        }
    });

    c.bench_function("cleanup_old_events_7_days", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let audit_service = AuditService::new(test_db.db());

            rt.block_on(async {
                audit_service.init().unwrap();

                // Create some events to clean up
                for i in 0..100 {
                    audit_service
                        .log_task_event(
                            AuditEventType::TaskCreated,
                            &format!("cleanup-user-{}", i),
                            &format!("cleanup-task-{}", i),
                            &format!("Cleanup event {}", i),
                            None,
                            None,
                            ActionResult::Success,
                        )
                        .unwrap();
                }
            });

            let _result = audit_service.cleanup_old_events(black_box(7)).await;
        });
    });

    c.bench_function("cleanup_old_events_30_days", |b| {
        b.to_async(&rt).iter(|| async {
            let test_db = TestDatabase::new().unwrap();
            let audit_service = AuditService::new(test_db.db());

            rt.block_on(async {
                audit_service.init().unwrap();

                // Create some events to clean up
                for i in 0..100 {
                    audit_service
                        .log_task_event(
                            AuditEventType::TaskCreated,
                            &format!("cleanup-user-{}", i),
                            &format!("cleanup-task-{}", i),
                            &format!("Cleanup event {}", i),
                            None,
                            None,
                            ActionResult::Success,
                        )
                        .unwrap();
                }
            });

            let _result = audit_service.cleanup_old_events(black_box(30)).await;
        });
    });
}

criterion_group!(
    benches,
    benchmark_audit_logging,
    benchmark_audit_batch_operations,
    benchmark_audit_queries,
    benchmark_audit_maintenance
);
criterion_main!(benches);
