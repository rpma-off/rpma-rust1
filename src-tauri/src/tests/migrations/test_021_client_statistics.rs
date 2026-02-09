//! Test for migration 021_add_client_statistics_view.sql
//! 
//! This test verifies that the client statistics view is created correctly
//! and provides accurate aggregated data.

use super::test_framework::*;
use sqlx::SqlitePool;

/// Test that migration 021 creates client statistics view correctly
pub async fn test_migration_021_client_statistics(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check that client_statistics view exists
    let view_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='view' AND name='client_statistics'"
    )
    .fetch_one(pool)
    .await?;
    assert!(view_exists, "client_statistics view should exist");

    // Verify view columns and structure
    verify_view_structure(pool).await?;

    // Test view with sample data
    test_view_with_data(pool).await?;

    // Verify view updates correctly with new data
    test_view_updates(pool).await?;

    Ok(())
}

/// Verify the client_statistics view has the correct structure
async fn verify_view_structure(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Get view columns from PRAGMA
    let columns: Vec<String> = sqlx::query_scalar(
        "PRAGMA table_info(client_statistics)"
    )
    .fetch_all(pool)
    .await
    .iter()
    .map(|row: &String| row.split(':').next().unwrap_or("").trim().to_string())
    .collect();
    
    let expected_columns = vec![
        "client_id",
        "client_name",
        "total_tasks",
        "completed_tasks",
        "pending_tasks",
        "in_progress_tasks",
        "cancelled_tasks",
        "total_interventions",
        "completed_interventions",
        "average_task_duration_hours",
        "total_material_cost",
        "last_task_date",
        "last_intervention_date",
        "created_at",
        "first_task_date"
    ];
    
    for col in expected_columns {
        assert!(columns.contains(&col.to_string()), 
               "client_statistics view should have column: {}", col);
    }

    Ok(())
}

/// Test the view with actual sample data
async fn test_view_with_data(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Create test data
    sqlx::query(
        "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES ('tech-021', 'tech@example.com', 'tech', 'hash', 'Technician', 'Technician', 1, datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
         VALUES ('client-021', 'Test Client Statistics', '123 Test St', '555-0123', 'client@test.com', datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Insert tasks with different statuses
    sqlx::query(
        "INSERT INTO tasks (id, title, status, client_id, assigned_technician_id, estimated_duration_hours, created_at, updated_at)
         VALUES 
            ('task-021-1', 'Completed Task', 'Completed', 'client-021', 'tech-021', 2.5, datetime('now', '-7 days'), datetime('now', '-5 days')),
            ('task-021-2', 'In Progress Task', 'In Progress', 'client-021', 'tech-021', 3.0, datetime('now', '-3 days'), datetime('now', '-2 days')),
            ('task-021-3', 'Pending Task', 'Pending', 'client-021', NULL, 1.5, datetime('now', '-1 days'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Insert interventions
    sqlx::query(
        "INSERT INTO interventions (id, task_id, status, technician_id, created_at, updated_at)
         VALUES 
            ('int-021-1', 'task-021-1', 'Completed', 'tech-021', datetime('now', '-4 days'), datetime('now', '-2 days')),
            ('int-021-2', 'task-021-2', 'In Progress', 'tech-021', datetime('now', '-2 days'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Insert material consumption for cost calculation
    sqlx::query(
        "INSERT INTO materials (id, name, unit_cost, created_at, updated_at)
         VALUES ('mat-021', 'Test Film', 50.0, datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO inventory_transactions (id, material_id, transaction_type, quantity, unit_cost, created_at, updated_at)
         VALUES ('trans-021', 'mat-021', 'StockOut', 2.0, 50.0, datetime('now', '-3 days'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Query the view
    let stats: (String, String, i64, i64, i64, i64, i64, i64, i64, Option<f64>, Option<f64>, String, String, String) = sqlx::query_as(
        "SELECT 
            client_id, client_name, total_tasks, completed_tasks, 
            pending_tasks, in_progress_tasks, cancelled_tasks,
            total_interventions, completed_interventions,
            average_task_duration_hours, total_material_cost,
            last_task_date, last_intervention_date, first_task_date
         FROM client_statistics 
         WHERE client_id = 'client-021'"
    )
    .fetch_one(pool)
    .await?;

    // Verify the calculations
    assert_eq!(stats.0, "client-021"); // client_id
    assert_eq!(stats.1, "Test Client Statistics"); // client_name
    assert_eq!(stats.2, 3); // total_tasks
    assert_eq!(stats.3, 1); // completed_tasks
    assert_eq!(stats.4, 1); // pending_tasks
    assert_eq!(stats.5, 1); // in_progress_tasks
    assert_eq!(stats.8, 2); // total_interventions
    assert_eq!(stats.9, 1); // completed_interventions

    // Clean up test data
    sqlx::query("DELETE FROM inventory_transactions WHERE id = 'trans-021'").execute(pool).await?;
    sqlx::query("DELETE FROM materials WHERE id = 'mat-021'").execute(pool).await?;
    sqlx::query("DELETE FROM interventions WHERE id IN ('int-021-1', 'int-021-2')").execute(pool).await?;
    sqlx::query("DELETE FROM tasks WHERE id IN ('task-021-1', 'task-021-2', 'task-021-3')").execute(pool).await?;
    sqlx::query("DELETE FROM clients WHERE id = 'client-021'").execute(pool).await?;
    sqlx::query("DELETE FROM users WHERE id = 'tech-021'").execute(pool).await?;

    Ok(())
}

/// Test that the view updates correctly when data changes
async fn test_view_updates(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Create minimal test data
    sqlx::query(
        "INSERT INTO clients (id, name, address, phone, email, created_at, updated_at)
         VALUES ('client-021-update', 'Update Test Client', '456 Update St', '555-9999', 'update@test.com', datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Insert initial task
    sqlx::query(
        "INSERT INTO tasks (id, title, status, client_id, created_at, updated_at)
         VALUES ('task-021-update-1', 'Initial Task', 'Pending', 'client-021-update', datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Check initial statistics
    let initial_stats: (i64, i64) = sqlx::query_as(
        "SELECT total_tasks, pending_tasks FROM client_statistics WHERE client_id = 'client-021-update'"
    )
    .fetch_one(pool)
    .await?;

    assert_eq!(initial_stats.0, 1); // total_tasks
    assert_eq!(initial_stats.1, 1); // pending_tasks

    // Add another task
    sqlx::query(
        "INSERT INTO tasks (id, title, status, client_id, created_at, updated_at)
         VALUES ('task-021-update-2', 'Second Task', 'Completed', 'client-021-update', datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Check updated statistics
    let updated_stats: (i64, i64, i64) = sqlx::query_as(
        "SELECT total_tasks, pending_tasks, completed_tasks FROM client_statistics WHERE client_id = 'client-021-update'"
    )
    .fetch_one(pool)
    .await?;

    assert_eq!(updated_stats.0, 2); // total_tasks
    assert_eq!(updated_stats.1, 1); // pending_tasks
    assert_eq!(updated_stats.2, 1); // completed_tasks

    // Clean up
    sqlx::query("DELETE FROM tasks WHERE id IN ('task-021-update-1', 'task-021-update-2')").execute(pool).await?;
    sqlx::query("DELETE FROM clients WHERE id = 'client-021-update'").execute(pool).await?;

    Ok(())
}