#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::reports::*;
    use chrono::Utc;

    #[tokio::test]
    async fn test_task_completion_report_generation() {
        let db =
            crate::db::Database::new(":memory:", "test_encryption_key_32_bytes_long!")
                .expect("Failed to create test database");
        db.init().expect("Failed to initialize test database");
        
        let date_range = DateRange {
            start: Utc::now() - chrono::Duration::days(30),
            end: Utc::now(),
        };
        
        let filters = ReportFilters::default();
        
        let result = generate_task_completion_report(&date_range, &filters, &db).await;
        
        assert!(result.is_ok(), "Task completion report generation failed: {:?}", result.err());
        
        let report = result.unwrap();
        assert_eq!(report.metadata.title, "Task Completion Report");
        assert_eq!(report.summary.total_tasks, 0); // Empty database should return 0
    }

    #[tokio::test]
    async fn test_overview_report_generation() {
        let db =
            crate::db::Database::new(":memory:", "test_encryption_key_32_bytes_long!")
                .expect("Failed to create test database");
        db.init().expect("Failed to initialize test database");
        
        let date_range = DateRange {
            start: Utc::now() - chrono::Duration::days(30),
            end: Utc::now(),
        };
        
        let filters = ReportFilters::default();
        
        let result = generate_overview_report(&date_range, &filters, &db).await;
        
        assert!(result.is_ok(), "Overview report generation failed: {:?}", result.err());
        
        let report = result.unwrap();
        assert_eq!(report.task_completion.metadata.title, "Task Completion Report");
        assert_eq!(report.technician_performance.metadata.title, "Technician Performance Report");
    }
}
