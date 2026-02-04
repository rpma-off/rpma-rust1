//! Regression test: ensure task updates persist assignment/workflow fields.

use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::task::{CreateTaskRequest, UpdateTaskRequest};
use rpma_ppf_intervention::services::task_creation::TaskCreationService;
use rpma_ppf_intervention::services::task_update::TaskUpdateService;
use std::sync::Arc;

fn setup_test_db() -> Arc<Database> {
    let temp_file = tempfile::NamedTempFile::new().expect("create temp db file");
    let db = Database::new(temp_file.path(), "test_encryption_key_32_bytes_long!")
        .expect("create db");
    db.init().expect("init db");
    Arc::new(db)
}

fn seed_user(db: &Database, user_id: &str) {
    let conn = db.get_connection().expect("get db connection");
    conn.execute(
        r#"
        INSERT INTO users (
            id, email, username, password_hash, full_name, role,
            is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        rusqlite::params![
            user_id,
            format!("{}@example.com", user_id),
            user_id,
            "hash",
            "Test User",
            "technician",
            1,
            chrono::Utc::now().timestamp_millis(),
            chrono::Utc::now().timestamp_millis(),
        ],
    )
    .expect("insert user");
}

#[test]
fn test_update_persists_assignment_and_workflow_fields() {
    let db = setup_test_db();
    let user_id = "user-1";
    seed_user(&db, user_id);

    let creation_service = TaskCreationService::new(db.clone());
    let task = creation_service
        .create_task_sync(
            CreateTaskRequest {
                vehicle_plate: "ABC-123".to_string(),
                vehicle_model: "Model X".to_string(),
                ppf_zones: vec!["hood".to_string()],
                scheduled_date: "2025-01-15".to_string(),
                external_id: None,
                status: None,
                technician_id: None,
                start_time: None,
                end_time: None,
                checklist_completed: None,
                notes: None,
                title: Some("Original".to_string()),
                vehicle_make: None,
                vehicle_year: None,
                vin: None,
                date_rdv: None,
                heure_rdv: None,
                lot_film: None,
                customer_name: None,
                customer_email: None,
                customer_phone: None,
                customer_address: None,
                custom_ppf_zones: None,
                template_id: None,
                workflow_id: None,
                task_number: None,
                creator_id: Some(user_id.to_string()),
                created_by: Some(user_id.to_string()),
                description: None,
                priority: None,
                client_id: None,
                estimated_duration: None,
                tags: None,
            },
            user_id,
        )
        .expect("create task");

    let assigned_at = chrono::Utc::now().timestamp_millis();
    let started_at = assigned_at + 1000;
    let completed_at = started_at + 1000;

    // Pre-seed fields that must be preserved by update_task_sync.
    let conn = db.get_connection().expect("get db connection");
    conn.execute(
        r#"
        UPDATE tasks SET
            technician_id = ?,
            assigned_at = ?,
            assigned_by = ?,
            workflow_status = ?,
            current_workflow_step_id = ?,
            completed_steps = ?,
            started_at = ?,
            completed_at = ?,
            actual_duration = ?
        WHERE id = ?
        "#,
        rusqlite::params![
            user_id,
            assigned_at,
            "assigner",
            "in_progress",
            "step-1",
            "[\"step-1\"]",
            started_at,
            completed_at,
            123,
            task.id,
        ],
    )
    .expect("seed task fields");

    let update_service = TaskUpdateService::new(db.clone());
    let updated_task = update_service
        .update_task_sync(
            UpdateTaskRequest {
                id: Some(task.id.clone()),
                title: Some("Updated".to_string()),
                ..Default::default()
            },
            user_id,
        )
        .expect("update task");

    assert_eq!(updated_task.title, "Updated");

    let persisted = update_service
        .get_task_sync(&task.id)
        .expect("get task")
        .expect("task should exist");

    assert_eq!(persisted.technician_id.as_deref(), Some(user_id));
    assert_eq!(persisted.assigned_at, Some(assigned_at));
    assert_eq!(persisted.assigned_by.as_deref(), Some("assigner"));
    assert_eq!(persisted.workflow_status.as_deref(), Some("in_progress"));
    assert_eq!(persisted.current_workflow_step_id.as_deref(), Some("step-1"));
    assert_eq!(persisted.completed_steps.as_deref(), Some("[\"step-1\"]"));
    assert_eq!(persisted.started_at, Some(started_at));
    assert_eq!(persisted.completed_at, Some(completed_at));
    assert_eq!(persisted.actual_duration, Some(123));
}
