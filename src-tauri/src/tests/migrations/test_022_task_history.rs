//! Test for migration 022_add_task_history_table.sql
//! 
//! This test verifies that the task history tracking table is created correctly
//! and all constraints, indexes, and triggers are properly applied.

use super::test_framework::*;
use sqlx::SqlitePool;

/// Test that migration 022 creates task history table correctly
pub async fn test_migration_022_task_history(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check that task_history table exists
    let history_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='task_history'"
    )
    .fetch_one(pool)
    .await?;
    assert!(history_exists, "task_history table should exist");

    // Verify table schema
    verify_task_history_schema(pool).await?;

    // Verify indexes were created
    verify_indexes_created(pool).await?;

    // Verify triggers were created for automatic history tracking
    verify_triggers_created(pool).await?;

    // Test trigger functionality
    test_trigger_functionality(pool).await?;

    Ok(())
}

/// Verify task_history table schema
async fn verify_task_history_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('task_history') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "task_id", "changed_by", "change_type", "old_status", "new_status",
        "old_assigned_technician_id", "new_assigned_technician_id", "change_reason",
        "change_timestamp", "metadata"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "task_history should have column: {}", col);
    }

    // Check foreign key to tasks table
    let fk_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('task_history') 
         WHERE table='tasks'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(fk_count > 0, "task_history should have foreign key to tasks");

    // Check change_type has constraints
    let check_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('task_history') 
         WHERE name='change_type' AND NOT NULL = 1"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(check_count > 0, "change_type should be NOT NULL");

    Ok(())
}

/// Verify indexes were created for performance
async fn verify_indexes_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check task_history indexes
    let history_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='task_history'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(history_indexes.iter().any(|i| i.contains("task_id")), 
           "task_history should have task_id index");
    assert!(history_indexes.iter().any(|i| i.contains("change_timestamp")), 
           "task_history should have change_timestamp index");
    assert!(history_indexes.iter().any(|i| i.contains("changed_by")), 
           "task_history should have changed_by index");

    Ok(())
}

/// Verify triggers were created for automatic history tracking
async fn verify_triggers_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check for trigger on task INSERT
    let insert_trigger: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'task_history_insert'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(insert_trigger > 0, "Should have trigger for task INSERT history");

    // Check for trigger on task UPDATE
    let update_trigger: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'task_history_update'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(update_trigger > 0, "Should have trigger for task UPDATE history");

    // Check for trigger on task DELETE
    let delete_trigger: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'task_history_delete'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(delete_trigger > 0, "Should have trigger for task DELETE history");

    Ok(())
}

/// Test that triggers actually create history records
async fn test_trigger_functionality(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Create test user
    sqlx::query(
        "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES ('test-user-022', 'test@example.com', 'testuser', 'hash', 'Test User', 'User', 1, datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Create test client
    sqlx::query(
        "INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
         VALUES ('client-022', 'Test Client', '123 Test St', '555-0123', 'client@test.com', datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Insert a task (should create INSERT history)
    sqlx::query(
        "INSERT INTO tasks (id, title, status, client_id, created_by, created_at, updated_at)
         VALUES ('task-022', 'Test Task', 'Draft', 'client-022', 'test-user-022', datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Check INSERT history was created
    let insert_history: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022' AND change_type = 'INSERT'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(insert_history > 0, "INSERT trigger should create history record");

    // Update the task (should create UPDATE history)
    sqlx::query(
        "UPDATE tasks SET status = 'Pending', updated_at = datetime('now'), updated_by = 'test-user-022'
         WHERE id = 'task-022'"
    )
    .execute(pool)
    .await?;

    // Check UPDATE history was created
    let update_history: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022' AND change_type = 'UPDATE' 
         AND new_status = 'Pending' AND old_status = 'Draft'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(update_history > 0, "UPDATE trigger should create history record with status change");

    // Assign the task (should create UPDATE history for assignment)
    sqlx::query(
        "UPDATE tasks SET assigned_technician_id = 'tech-001', updated_at = datetime('now'), updated_by = 'test-user-022'
         WHERE id = 'task-022'"
    )
    .execute(pool)
    .await?;

    // Check assignment history was created
    let assign_history: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022' AND change_type = 'UPDATE'
         AND new_assigned_technician_id = 'tech-001'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(assign_history > 0, "UPDATE trigger should create history record for assignment");

    // Delete the task (should create DELETE history)
    sqlx::query("DELETE FROM tasks WHERE id = 'task-022'").execute(pool).await?;

    // Check DELETE history was created
    let delete_history: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM task_history 
         WHERE task_id = 'task-022' AND change_type = 'DELETE'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(delete_history > 0, "DELETE trigger should create history record");

    // Clean up
    sqlx::query("DELETE FROM task_history WHERE task_id = 'task-022'").execute(pool).await?;
    sqlx::query("DELETE FROM tasks WHERE id = 'task-022'").execute(pool).await?;
    sqlx::query("DELETE FROM clients WHERE id = 'client-022'").execute(pool).await?;
    sqlx::query("DELETE FROM users WHERE id = 'test-user-022'").execute(pool).await?;

    Ok(())
}