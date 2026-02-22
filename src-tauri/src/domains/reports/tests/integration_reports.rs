use crate::domains::reports::domain::models::reports::*;
use crate::domains::reports::infrastructure::reports::overview_orchestrator::generate_overview_report;
use crate::domains::reports::infrastructure::reports::task_report::generate_task_completion_report;
use chrono::Utc;

#[tokio::test]
async fn task_completion_report_generation_works_for_empty_db() {
    let db = crate::db::Database::new(":memory:", "test_encryption_key_32_bytes_long!")
        .expect("Failed to create test database");
    db.init().expect("Failed to initialize test database");

    let date_range = DateRange {
        start: Utc::now() - chrono::Duration::days(30),
        end: Utc::now(),
    };

    let filters = ReportFilters::default();

    let report = generate_task_completion_report(&date_range, &filters, &db)
        .await
        .expect("Task completion report generation should succeed");

    assert_eq!(report.metadata.title, "Task Completion Report");
    assert_eq!(report.summary.total_tasks, 0);
}

#[tokio::test]
async fn overview_report_generation_works_for_empty_db() {
    let db = crate::db::Database::new(":memory:", "test_encryption_key_32_bytes_long!")
        .expect("Failed to create test database");
    db.init().expect("Failed to initialize test database");

    let date_range = DateRange {
        start: Utc::now() - chrono::Duration::days(30),
        end: Utc::now(),
    };

    let filters = ReportFilters::default();

    let report = generate_overview_report(&date_range, &filters, &db)
        .await
        .expect("Overview report generation should succeed");

    assert_eq!(
        report.task_completion.metadata.title,
        "Task Completion Report"
    );
    assert_eq!(
        report.technician_performance.metadata.title,
        "Technician Performance Report"
    );
}
