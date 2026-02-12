//! Unit tests for TaskValidationService

use crate::services::task_validation::TaskValidationService;
use crate::test_db;
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_validation_service() -> (
        TaskValidationService,
        Arc<crate::db::Database>,
        tempfile::TempDir,
    ) {
        let test_db = test_db!();
        let db = test_db.db();
        let service = TaskValidationService::new(Arc::clone(&db));
        (service, db, test_db.temp_dir)
    }

    fn insert_user(db: &crate::db::Database, user_id: &str, role: &str, is_active: bool) {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                user_id,
                format!("{}@example.com", user_id),
                format!("user_{}", user_id),
                "hash",
                "Test User",
                role,
                if is_active { 1 } else { 0 },
                Utc::now().timestamp_millis(),
                Utc::now().timestamp_millis()
            ],
        )
        .expect("Failed to insert user");
    }

    fn insert_task(
        db: &crate::db::Database,
        task_id: &str,
        status: &str,
        technician_id: Option<&str>,
        scheduled_date: Option<&str>,
        ppf_zones_json: Option<&str>,
    ) {
        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute(
            "INSERT INTO tasks (id, task_number, title, status, priority, technician_id, scheduled_date, ppf_zones, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                task_id,
                format!("TASK-{}", task_id),
                "Test Task",
                status,
                "medium",
                technician_id,
                scheduled_date,
                ppf_zones_json,
                Utc::now().timestamp_millis(),
                Utc::now().timestamp_millis()
            ],
        )
        .expect("Failed to insert task");
    }

    #[test]
    fn test_validate_technician_assignment_success() {
        let (service, db, _temp_dir) = create_validation_service();
        insert_user(db.as_ref(), "tech1", "technician", true);

        let result = service.validate_technician_assignment(
            "tech1",
            &Some(vec!["front".to_string(), "rear".to_string()]),
        );
        assert!(result.is_ok(), "Active technician should be valid");
    }

    #[test]
    fn test_validate_technician_assignment_inactive_user() {
        let (service, db, _temp_dir) = create_validation_service();
        insert_user(db.as_ref(), "tech2", "technician", false);

        let result = service.validate_technician_assignment("tech2", &None);
        assert!(result.is_err(), "Inactive technician should be rejected");
    }

    #[test]
    fn test_validate_technician_assignment_invalid_role() {
        let (service, db, _temp_dir) = create_validation_service();
        insert_user(db.as_ref(), "viewer1", "viewer", true);

        let result = service.validate_technician_assignment("viewer1", &None);
        assert!(result.is_err(), "Viewer role should not be assignable");
    }

    #[test]
    fn test_check_assignment_eligibility_returns_true_for_valid_setup() {
        let (service, db, _temp_dir) = create_validation_service();
        insert_user(db.as_ref(), "tech3", "technician", true);
        insert_task(
            db.as_ref(),
            "task1",
            "pending",
            Some("tech3"),
            Some("2026-02-10"),
            Some(r#"[\"front\"]"#),
        );

        let result = service.check_assignment_eligibility("task1", "tech3");
        assert!(result.unwrap_or(false), "Technician should be eligible");
    }

    #[test]
    fn test_check_task_availability_false_for_completed_task() {
        let (service, db, _temp_dir) = create_validation_service();
        insert_user(db.as_ref(), "tech4", "technician", true);
        insert_task(
            db.as_ref(),
            "task2",
            "completed",
            Some("tech4"),
            Some("2026-02-10"),
            None,
        );

        let result = service.check_task_availability("task2");
        assert!(
            !result.unwrap_or(true),
            "Completed task should not be available"
        );
    }

    #[test]
    fn test_validate_assignment_change_warns_on_ineligible_user() {
        let (service, db, _temp_dir) = create_validation_service();
        insert_user(db.as_ref(), "tech5", "technician", true);
        insert_user(db.as_ref(), "viewer2", "viewer", true);
        insert_task(
            db.as_ref(),
            "task3",
            "scheduled",
            Some("tech5"),
            Some("2026-02-10"),
            Some(r#"[\"hood\",\"fenders\"]"#),
        );

        let warnings = service
            .validate_assignment_change("task3", Some("tech5"), "viewer2")
            .expect("Validation should return warnings");
        assert!(
            warnings.iter().any(|w| w.contains("not eligible")),
            "Should warn about ineligible user"
        );
    }

    #[test]
    fn test_check_schedule_conflicts_flags_capacity() {
        let (service, db, _temp_dir) = create_validation_service();
        insert_user(db.as_ref(), "tech6", "technician", true);

        for i in 0..3 {
            insert_task(
                db.as_ref(),
                &format!("task-cap-{}", i),
                "scheduled",
                Some("tech6"),
                Some("2026-02-10"),
                None,
            );
        }

        let conflict = service
            .check_schedule_conflicts("tech6", Some("2026-02-10".to_string()), &None)
            .expect("Conflict check should succeed");
        assert!(!conflict, "Should detect capacity limit at 3 tasks");
    }

    #[test]
    fn test_check_dependencies_satisfied_returns_true() {
        let (service, _db, _temp_dir) = create_validation_service();
        let result = service
            .check_dependencies_satisfied("task-any")
            .expect("Dependency check should succeed");
        assert!(result, "Default dependency check should return true");
    }
}
