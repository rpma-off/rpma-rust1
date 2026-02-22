//! Unit tests for task deletion service
//!
//! Tests for:
//! - Soft delete functionality
//! - Hard delete functionality
//! - Task restore
//! - Cleanup of old tasks
//! - Authorization checks

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::domain::models::task::{CreateTaskRequest, TaskPriority, TaskStatus};
use crate::domains::tasks::infrastructure::task_creation::TaskCreationService;
use crate::domains::tasks::infrastructure::task_deletion::TaskDeletionService;
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;

/// Helper function to create a test database
fn setup_test_db() -> Database {
    crate::test_utils::setup_test_db_sync()
}

/// Helper function to create a test user
fn create_test_user(db: &Database, id: &str, role: &str) {
    let conn = db.get_connection().expect("Failed to get connection");
    conn.execute(
        "INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, format!("{}@test.com", id), id, "hash", "Test", "User", role, 1]
    ).expect("Failed to create test user");
}

/// Helper function to create a test client
fn create_test_client(db: &Database, id: &str) {
    let conn = db.get_connection().expect("Failed to get connection");
    conn.execute(
        "INSERT INTO clients (id, name, email, phone, address, is_active, synced, last_synced_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, "Test Client", "client@test.com", "1234567890", "123 Test St", 1, 0, 0, 0, 0]
    ).expect("Failed to create test client");
}

/// Helper function to create a test task
fn create_test_task(db: Arc<Database>, user_id: &str) -> Result<String, AppError> {
    create_test_client(&db, "client-1");

    let creation_service = TaskCreationService::new(db.clone());
    let task_request = CreateTaskRequest {
        task_number: None,
        title: Some("Test Task".to_string()),
        description: Some("Test Description".to_string()),
        vehicle_plate: "ABC123".to_string(),
        vehicle_model: "Test Model".to_string(),
        vehicle_year: None,
        vehicle_make: None,
        vin: None,
        ppf_zones: vec!["hood".to_string()],
        custom_ppf_zones: None,
        status: Some(TaskStatus::Pending),
        priority: Some(TaskPriority::Medium),
        technician_id: None,
        scheduled_date: Some("2024-01-01".to_string()),
        start_time: None,
        end_time: None,
        date_rdv: None,
        heure_rdv: None,
        template_id: None,
        workflow_id: None,
        client_id: Some("client-1".to_string()),
        customer_name: Some("John Doe".to_string()),
        customer_email: Some("john@test.com".to_string()),
        customer_phone: Some("5551234567".to_string()),
        customer_address: None,
        external_id: None,
        lot_film: None,
        checklist_completed: None,
        notes: Some("Test notes".to_string()),
        tags: Some(vec!["test".to_string()]),
        estimated_duration: Some(120),
    };

    let task = creation_service.create_task_sync(task_request, user_id)?;
    Ok(task.id)
}

/// Test soft delete task
#[test]
fn test_soft_delete_task() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Soft delete task
    deletion_service.soft_delete_task(&task_id, "user-1")?;

    // Verify task is not found (deleted_at filter)
    let task = deletion_service.get_task_sync(&task_id)?;
    assert!(task.is_none(), "Soft-deleted task should not be found");

    // Verify task exists in database with deleted_at set
    let conn = db.get_connection()?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE id = ? AND deleted_at IS NOT NULL",
        params![task_id],
        |row| row.get(0),
    )?;
    assert_eq!(count, 1, "Task should exist with deleted_at set");

    Ok(())
}

/// Test soft delete task ownership check
#[test]
fn test_soft_delete_ownership_check() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");
    create_test_user(&db, "user-2", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Try to soft delete as different user - should fail
    let result = deletion_service.soft_delete_task(&task_id, "user-2");
    assert!(
        result.is_err(),
        "Should fail: user-2 cannot delete user-1's task"
    );

    // Verify task is not deleted
    let task = deletion_service.get_task_sync(&task_id)?;
    assert!(task.is_some(), "Task should not be deleted");

    Ok(())
}

/// Test restore soft-deleted task
#[test]
fn test_restore_task() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Soft delete task
    deletion_service.soft_delete_task(&task_id, "user-1")?;

    // Restore task
    deletion_service.restore_task(&task_id)?;

    // Verify task is restored
    let task = deletion_service.get_task_sync(&task_id)?;
    assert!(task.is_some(), "Restored task should be found");
    assert_eq!(task.unwrap().id, task_id);

    // Verify deleted_at and deleted_by are cleared
    let conn = db.get_connection()?;
    let (deleted_at, deleted_by): (Option<i64>, Option<String>) = conn.query_row(
        "SELECT deleted_at, deleted_by FROM tasks WHERE id = ?",
        params![task_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;
    assert!(deleted_at.is_none(), "deleted_at should be NULL");
    assert!(deleted_by.is_none(), "deleted_by should be NULL");

    Ok(())
}

/// Test restore non-existent task
#[test]
fn test_restore_non_existent_task() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    let deletion_service = TaskDeletionService::new(db.clone());

    // Try to restore non-existent task
    let result = deletion_service.restore_task("non-existent-id");
    // This should succeed but update 0 rows
    assert!(
        result.is_ok(),
        "Restore should succeed even for non-existent task"
    );

    Ok(())
}

/// Test hard delete task
#[test]
fn test_hard_delete_task() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Hard delete task
    tokio_test::block_on(deletion_service.hard_delete_task_async(&task_id, "user-1"))?;

    // Verify task is completely removed
    let conn = db.get_connection()?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE id = ?",
        params![task_id],
        |row| row.get(0),
    )?;
    assert_eq!(count, 0, "Task should be completely removed");

    Ok(())
}

/// Test hard delete ownership check
#[test]
fn test_hard_delete_ownership_check() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");
    create_test_user(&db, "user-2", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Try to hard delete as different user - should fail
    let result = tokio_test::block_on(deletion_service.hard_delete_task_async(&task_id, "user-2"));
    assert!(
        result.is_err(),
        "Should fail: user-2 cannot hard delete user-1's task"
    );

    // Verify task still exists
    let task = deletion_service.get_task_sync(&task_id)?;
    assert!(task.is_some(), "Task should still exist");

    Ok(())
}

/// Test soft delete by default (async)
#[test]
fn test_delete_task_async_soft_delete_by_default() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Delete task (async, should soft delete by default)
    tokio_test::block_on(deletion_service.delete_task_async(&task_id, "user-1", false))?;

    // Verify task is soft deleted (exists but not found by regular query)
    let task = deletion_service.get_task_sync(&task_id)?;
    assert!(task.is_none(), "Task should be soft deleted");

    // Verify task exists in database
    let conn = db.get_connection()?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE id = ? AND deleted_at IS NOT NULL",
        params![task_id],
        |row| row.get(0),
    )?;
    assert_eq!(count, 1, "Task should exist with deleted_at set");

    Ok(())
}

/// Test force hard delete (async)
#[test]
fn test_delete_task_async_force_hard_delete() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Delete task with force=true (hard delete)
    tokio_test::block_on(deletion_service.delete_task_async(&task_id, "user-1", true))?;

    // Verify task is completely removed
    let conn = db.get_connection()?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE id = ?",
        params![task_id],
        |row| row.get(0),
    )?;
    assert_eq!(count, 0, "Task should be completely removed");

    Ok(())
}

/// Test cleanup old soft-deleted tasks
#[test]
fn test_cleanup_deleted_tasks() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    // Create and soft delete 3 tasks
    let mut task_ids = Vec::new();
    for i in 1..=3 {
        let task_id = create_test_task(db.clone(), "user-1")?;
        task_ids.push(task_id.clone());

        let deletion_service = TaskDeletionService::new(db.clone());
        deletion_service.soft_delete_task(&task_id, "user-1")?;

        // Set deleted_at to make task "old"
        if i <= 2 {
            let conn = db.get_connection()?;
            let old_timestamp = chrono::Utc::now().timestamp_millis() - (10 * 24 * 60 * 60 * 1000);
            conn.execute(
                "UPDATE tasks SET deleted_at = ? WHERE id = ?",
                params![old_timestamp, task_id],
            )?;
        }
    }

    // Cleanup tasks older than 7 days
    let deletion_service = TaskDeletionService::new(db.clone());
    let deleted_count = deletion_service.cleanup_deleted_tasks(7)?;

    assert_eq!(deleted_count, 2, "Should delete 2 old tasks");

    // Verify 1 task remains (the recent one)
    let conn = db.get_connection()?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE deleted_at IS NOT NULL",
        params![],
        |row| row.get(0),
    )?;
    assert_eq!(count, 1, "One recent soft-deleted task should remain");

    Ok(())
}

/// Test delete non-existent task
#[test]
fn test_delete_non_existent_task() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let deletion_service = TaskDeletionService::new(db.clone());

    // Try to soft delete non-existent task
    let result = deletion_service.soft_delete_task("non-existent-id", "user-1");
    assert!(result.is_err(), "Should fail: task not found");

    // Try to hard delete non-existent task
    let result =
        tokio_test::block_on(deletion_service.hard_delete_task_async("non-existent-id", "user-1"));
    assert!(result.is_err(), "Should fail: task not found");

    Ok(())
}

/// Test already soft-deleted task
#[test]
fn test_delete_already_soft_deleted_task() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Soft delete task
    deletion_service.soft_delete_task(&task_id, "user-1")?;

    // Try to soft delete again
    let result = deletion_service.soft_delete_task(&task_id, "user-1");
    // Should fail because task is not found (deleted_at filter)
    assert!(result.is_err(), "Should fail: task already soft deleted");

    Ok(())
}

/// Test task deletion updates timestamps
#[test]
fn test_deletion_updates_timestamps() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());
    create_test_user(&db, "user-1", "technician");

    let task_id = create_test_task(db.clone(), "user-1")?;
    let deletion_service = TaskDeletionService::new(db.clone());

    // Get initial updated_at
    let conn = db.get_connection()?;
    let initial_updated_at: i64 = conn.query_row(
        "SELECT updated_at FROM tasks WHERE id = ?",
        params![task_id],
        |row| row.get(0),
    )?;

    // Small delay to ensure timestamp changes
    std::thread::sleep(std::time::Duration::from_millis(10));

    // Soft delete task
    deletion_service.soft_delete_task(&task_id, "user-1")?;

    // Verify updated_at is updated
    let (new_updated_at, deleted_at, deleted_by): (i64, i64, String) = conn.query_row(
        "SELECT updated_at, deleted_at, deleted_by FROM tasks WHERE id = ?",
        params![task_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    assert!(
        new_updated_at > initial_updated_at,
        "updated_at should be updated"
    );
    assert_eq!(deleted_by, "user-1", "deleted_by should be set");
    assert!(deleted_at > 0, "deleted_at should be set");

    Ok(())
}
