//! Integration tests for task lifecycle
//!
//! Tests the complete lifecycle of tasks including:
//! - Creation with validation
//! - Technician assignment with qualification checks
//! - Updates with status transitions
//! - Soft delete and restore
//! - Hard delete
//! - Sync queue integration

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::infrastructure::task_creation::TaskCreationService;
use crate::domains::tasks::infrastructure::task_deletion::TaskDeletionService;
use crate::domains::tasks::infrastructure::task_update::TaskUpdateService;
use crate::domains::tasks::infrastructure::task_validation::TaskValidationService;
use crate::models::task::{CreateTaskRequest, TaskPriority, TaskStatus, UpdateTaskRequest};
use chrono::Utc;
use rusqlite::params;
use std::sync::Arc;

/// Helper function to create a test database connection
fn setup_test_db() -> Database {
    crate::test_utils::setup_test_db_sync()
}

/// Helper function to create a test technician
fn create_test_technician(db: &Database, id: &str, role: &str) {
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

/// Helper function to create a basic task request
fn create_basic_task_request() -> CreateTaskRequest {
    CreateTaskRequest {
        task_number: None,
        title: Some("Test Task".to_string()),
        description: Some("Test Description".to_string()),
        vehicle_plate: "ABC123".to_string(),
        vehicle_model: "Test Model".to_string(),
        vehicle_year: None,
        vehicle_make: None,
        vin: None,
        ppf_zones: vec!["hood".to_string(), "fenders".to_string()],
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
    }
}

/// Test complete task lifecycle from creation to deletion
#[test]
fn test_complete_task_lifecycle() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());

    // Create test users
    create_test_technician(&db, "tech-1", "technician");
    create_test_technician(&db, "tech-2", "technician");
    create_test_technician(&db, "admin-1", "admin");

    // Create test client
    create_test_client(&db, "client-1");

    // Step 1: Create a task
    let creation_service = TaskCreationService::new(db.clone());
    let mut task_request = create_basic_task_request();
    task_request.technician_id = Some("tech-1".to_string());

    let task = creation_service.create_task_sync(task_request, "admin-1")?;
    assert_eq!(task.status, TaskStatus::Pending);
    assert_eq!(task.technician_id, Some("tech-1".to_string()));

    // Step 2: Update task with status transition
    let update_service = TaskUpdateService::new(db.clone());
    let mut update_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        title: Some("Updated Task".to_string()),
        status: Some(TaskStatus::InProgress),
        ..Default::default()
    };

    let updated_task = update_service.update_task_sync(update_request, "admin-1")?;
    assert_eq!(updated_task.title, "Updated Task");
    assert_eq!(updated_task.status, TaskStatus::InProgress);
    assert!(updated_task.started_at.is_some());

    // Step 3: Change technician (reassignment)
    let mut reassign_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        technician_id: Some("tech-2".to_string()),
        ..Default::default()
    };

    let reassigned_task = update_service.update_task_sync(reassign_request, "admin-1")?;
    assert_eq!(reassigned_task.technician_id, Some("tech-2".to_string()));

    // Step 4: Complete task
    let mut complete_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        status: Some(TaskStatus::Completed),
        ..Default::default()
    };

    let completed_task = update_service.update_task_sync(complete_request, "admin-1")?;
    assert_eq!(completed_task.status, TaskStatus::Completed);
    assert!(completed_task.completed_at.is_some());

    // Step 5: Soft delete task
    let deletion_service = TaskDeletionService::new(db.clone());
    deletion_service.soft_delete_task(&task.id, "admin-1")?;

    // Verify task is soft-deleted (should not be found by regular query)
    let retrieved_task = deletion_service.get_task_sync(&task.id)?;
    assert!(
        retrieved_task.is_none(),
        "Soft-deleted task should not be found"
    );

    // Step 6: Restore task
    deletion_service.restore_task(&task.id)?;

    // Verify task is restored
    let restored_task = deletion_service.get_task_sync(&task.id)?;
    assert!(restored_task.is_some(), "Restored task should be found");
    let restored_task = restored_task.unwrap();
    assert_eq!(restored_task.id, task.id);

    // Step 7: Hard delete task
    tokio_test::block_on(deletion_service.hard_delete_task_async(&task.id, "admin-1"))?;

    // Verify task is permanently deleted
    let final_task = deletion_service.get_task_sync(&task.id)?;
    assert!(
        final_task.is_none(),
        "Hard-deleted task should not be found"
    );

    Ok(())
}

/// Test task validation through lifecycle
#[test]
fn test_task_validation_in_lifecycle() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());

    // Create test users
    create_test_technician(&db, "tech-1", "technician");
    create_test_technician(&db, "viewer-1", "viewer");
    create_test_technician(&db, "inactive-tech", "technician");

    // Create test client
    create_test_client(&db, "client-1");

    // Deactivate technician
    let conn = db.get_connection()?;
    conn.execute(
        "UPDATE users SET is_active = 0 WHERE id = ?",
        params!["inactive-tech"],
    )?;

    let creation_service = TaskCreationService::new(db.clone());
    let update_service = TaskUpdateService::new(db.clone());
    let validation_service = TaskValidationService::new(db.clone());

    // Test 1: Create task with valid technician
    let mut task_request = create_basic_task_request();
    task_request.technician_id = Some("tech-1".to_string());

    let task = creation_service.create_task_sync(task_request, "admin-1")?;
    assert_eq!(task.technician_id, Some("tech-1".to_string()));

    // Test 2: Try to assign invalid role (viewer)
    let mut invalid_assign_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        technician_id: Some("viewer-1".to_string()),
        ..Default::default()
    };

    let result = update_service.update_task_sync(invalid_assign_request, "admin-1");
    assert!(result.is_err(), "Should fail when assigning viewer to task");

    // Test 3: Try to assign inactive technician
    let mut inactive_assign_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        technician_id: Some("inactive-tech".to_string()),
        ..Default::default()
    };

    let result = update_service.update_task_sync(inactive_assign_request, "admin-1");
    assert!(
        result.is_err(),
        "Should fail when assigning inactive technician"
    );

    // Test 4: Validate PPF zone complexity warning
    let mut complex_zones_request = create_basic_task_request();
    complex_zones_request.ppf_zones = vec![
        "hood".to_string(),
        "fenders".to_string(),
        "bumper".to_string(),
        "door".to_string(),
        "mirror".to_string(),
    ];
    complex_zones_request.technician_id = Some("tech-1".to_string());

    let complex_task = creation_service.create_task_sync(complex_zones_request, "admin-1")?;
    assert_eq!(complex_task.technician_id, Some("tech-1".to_string()));

    Ok(())
}

/// Test invalid status transitions in task lifecycle
#[test]
fn test_invalid_status_transitions() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());

    // Create test user
    create_test_technician(&db, "admin-1", "admin");
    create_test_client(&db, "client-1");

    let creation_service = TaskCreationService::new(db.clone());
    let update_service = TaskUpdateService::new(db.clone());

    // Create task
    let task_request = create_basic_task_request();
    let task = creation_service.create_task_sync(task_request, "admin-1")?;

    // Test 1: Try to transition from Pending to Cancelled (invalid)
    let mut cancel_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        status: Some(TaskStatus::Cancelled),
        ..Default::default()
    };

    let result = update_service.update_task_sync(cancel_request, "admin-1");
    assert!(
        result.is_err(),
        "Should fail: Pending -> Cancelled is invalid"
    );

    // Test 2: Transition to InProgress (valid)
    let mut progress_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        status: Some(TaskStatus::InProgress),
        ..Default::default()
    };

    let in_progress_task = update_service.update_task_sync(progress_request, "admin-1")?;
    assert_eq!(in_progress_task.status, TaskStatus::InProgress);

    // Test 3: Try to transition from InProgress to Scheduled (invalid)
    let mut scheduled_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        status: Some(TaskStatus::Scheduled),
        ..Default::default()
    };

    let result = update_service.update_task_sync(scheduled_request, "admin-1");
    assert!(
        result.is_err(),
        "Should fail: InProgress -> Scheduled is invalid"
    );

    // Test 4: Complete task (valid)
    let mut complete_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        status: Some(TaskStatus::Completed),
        ..Default::default()
    };

    let completed_task = update_service.update_task_sync(complete_request, "admin-1")?;
    assert_eq!(completed_task.status, TaskStatus::Completed);

    // Test 5: Try to modify completed task (invalid)
    let mut modify_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        status: Some(TaskStatus::Pending),
        ..Default::default()
    };

    let result = update_service.update_task_sync(modify_request, "admin-1");
    assert!(
        result.is_err(),
        "Should fail: Completed -> Pending is invalid"
    );

    Ok(())
}

/// Test soft delete and restore functionality
#[test]
fn test_soft_delete_and_restore() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());

    // Create test user
    create_test_technician(&db, "admin-1", "admin");
    create_test_client(&db, "client-1");

    let creation_service = TaskCreationService::new(db.clone());
    let deletion_service = TaskDeletionService::new(db.clone());

    // Create task
    let task_request = create_basic_task_request();
    let task = creation_service.create_task_sync(task_request, "admin-1")?;

    // Verify task exists
    let retrieved_task = deletion_service.get_task_sync(&task.id)?;
    assert!(retrieved_task.is_some());

    // Soft delete task
    deletion_service.soft_delete_task(&task.id, "admin-1")?;

    // Verify task is soft-deleted (not found by regular query)
    let soft_deleted_task = deletion_service.get_task_sync(&task.id)?;
    assert!(soft_deleted_task.is_none());

    // Restore task
    deletion_service.restore_task(&task.id)?;

    // Verify task is restored
    let restored_task = deletion_service.get_task_sync(&task.id)?;
    assert!(restored_task.is_some());
    assert_eq!(restored_task.unwrap().id, task.id);

    Ok(())
}

/// Test ownership and authorization in task lifecycle
#[test]
fn test_ownership_and_authorization() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());

    // Create test users
    create_test_technician(&db, "user-1", "technician");
    create_test_technician(&db, "user-2", "technician");
    create_test_client(&db, "client-1");

    let creation_service = TaskCreationService::new(db.clone());
    let update_service = TaskUpdateService::new(db.clone());
    let deletion_service = TaskDeletionService::new(db.clone());

    // Create task as user-1
    let task_request = create_basic_task_request();
    let task = creation_service.create_task_sync(task_request, "user-1")?;
    assert_eq!(task.created_by, Some("user-1".to_string()));

    // Test 1: Try to update task as user-2 (different owner) - should fail
    let mut update_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        title: Some("Unauthorized Update".to_string()),
        ..Default::default()
    };

    let result = update_service.update_task_sync(update_request, "user-2");
    assert!(
        result.is_err(),
        "User-2 should not be able to update user-1's task"
    );

    // Test 2: Update task as owner (user-1) - should succeed
    let mut valid_update_request = UpdateTaskRequest {
        id: Some(task.id.clone()),
        title: Some("Authorized Update".to_string()),
        ..Default::default()
    };

    let updated_task = update_service.update_task_sync(valid_update_request, "user-1")?;
    assert_eq!(updated_task.title, "Authorized Update");

    // Test 3: Try to delete task as user-2 - should fail
    let result =
        tokio_test::block_on(deletion_service.delete_task_async(&task.id, "user-2", false));
    assert!(
        result.is_err(),
        "User-2 should not be able to delete user-1's task"
    );

    // Test 4: Delete task as owner (user-1) - should succeed
    tokio_test::block_on(deletion_service.delete_task_async(&task.id, "user-1", false))?;

    Ok(())
}

/// Test cleanup of old soft-deleted tasks
#[test]
fn test_cleanup_old_soft_deleted_tasks() -> Result<(), AppError> {
    let db = Arc::new(setup_test_db());

    // Create test user
    create_test_technician(&db, "admin-1", "admin");
    create_test_client(&db, "client-1");

    let creation_service = TaskCreationService::new(db.clone());
    let deletion_service = TaskDeletionService::new(db.clone());

    // Create and soft delete multiple tasks
    for i in 1..=3 {
        let mut task_request = create_basic_task_request();
        task_request.title = Some(format!("Task {}", i));
        let task = creation_service.create_task_sync(task_request, "admin-1")?;
        deletion_service.soft_delete_task(&task.id, "admin-1")?;

        // Manually update deleted_at timestamp to make some tasks "old"
        if i <= 2 {
            let conn = db.get_connection()?;
            let old_timestamp = chrono::Utc::now().timestamp_millis() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
            conn.execute(
                "UPDATE tasks SET deleted_at = ? WHERE id = ?",
                params![old_timestamp, task.id],
            )?;
        }
    }

    // Cleanup tasks older than 7 days
    let deleted_count = deletion_service.cleanup_deleted_tasks(7)?;
    assert_eq!(deleted_count, 2, "Should have deleted 2 old tasks");

    Ok(())
}
