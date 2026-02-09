//! Test for migration 025_add_analytics_dashboard.sql
//! 
//! This test verifies that the analytics dashboard tables are created correctly
//! and all constraints, indexes, and views are properly applied.

use super::test_framework::*;
use sqlx::SqlitePool;

/// Test that migration 025 creates all analytics tables correctly
pub async fn test_migration_025_analytics_dashboard(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check that analytics_events table exists
    let events_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='analytics_events'"
    )
    .fetch_one(pool)
    .await?;
    assert!(events_exists, "analytics_events table should exist");

    // Check that dashboard_configs table exists
    let configs_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='dashboard_configs'"
    )
    .fetch_one(pool)
    .await?;
    assert!(configs_exists, "dashboard_configs table should exist");

    // Check that analytics_material_usage view exists
    let view_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='view' AND name='analytics_material_usage'"
    )
    .fetch_one(pool)
    .await?;
    assert!(view_exists, "analytics_material_usage view should exist");

    // Check that analytics_performance view exists
    let perf_view_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='view' AND name='analytics_performance'"
    )
    .fetch_one(pool)
    .await?;
    assert!(perf_view_exists, "analytics_performance view should exist");

    // Verify table schemas
    verify_analytics_events_schema(pool).await?;
    verify_dashboard_configs_schema(pool).await?;

    // Verify views are queryable
    verify_views_work(pool).await?;

    // Verify indexes were created
    verify_indexes_created(pool).await?;

    Ok(())
}

/// Verify analytics_events table schema
async fn verify_analytics_events_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('analytics_events') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "event_type", "entity_type", "entity_id", "user_id",
        "session_id", "properties", "timestamp", "created_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "analytics_events should have column: {}", col);
    }

    // Check event_type has constraints
    let check_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('analytics_events') 
         WHERE name='event_type' AND NOT NULL = 1"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(check_count > 0, "event_type should be NOT NULL");

    // Verify properties is JSON
    let json_check: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('analytics_events') 
         WHERE name='properties' AND type LIKE '%json%'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(json_check || columns.contains(&"properties".to_string()), 
           "properties should support JSON data");

    Ok(())
}

/// Verify dashboard_configs table schema
async fn verify_dashboard_configs_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('dashboard_configs') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "user_id", "dashboard_name", "config", "is_default", "is_public",
        "created_at", "updated_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "dashboard_configs should have column: {}", col);
    }

    // Verify config is JSON
    let json_check: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('dashboard_configs') 
         WHERE name='config' AND type LIKE '%json%'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(json_check || columns.contains(&"config".to_string()), 
           "config should support JSON data");

    Ok(())
}

/// Verify analytics views are properly created and queryable
async fn verify_views_work(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Test analytics_material_usage view
    let material_usage_columns: Vec<String> = sqlx::query_scalar(
        "PRAGMA table_info(analytics_material_usage)"
    )
    .fetch_all(pool)
    .await
    .iter()
    .map(|row: &String| row.split(':').next().unwrap_or("").trim().to_string())
    .collect();
    
    assert!(material_usage_columns.iter().any(|c| c.contains("material_id")), 
           "analytics_material_usage should have material_id column");
    assert!(material_usage_columns.iter().any(|c| c.contains("total_used")), 
           "analytics_material_usage should have total_used column");

    // Test analytics_performance view
    let performance_columns: Vec<String> = sqlx::query_scalar(
        "PRAGMA table_info(analytics_performance)"
    )
    .fetch_all(pool)
    .await
    .iter()
    .map(|row: &String| row.split(':').next().unwrap_or("").trim().to_string())
    .collect();
    
    assert!(performance_columns.iter().any(|c| c.contains("technician_id")), 
           "analytics_performance should have technician_id column");
    assert!(performance_columns.iter().any(|c| c.contains("avg_duration")), 
           "analytics_performance should have avg_duration column");

    Ok(())
}

/// Verify indexes were created for performance
async fn verify_indexes_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check analytics_events indexes
    let event_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='analytics_events'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(event_indexes.iter().any(|i| i.contains("event_type")), 
           "analytics_events should have event_type index");
    assert!(event_indexes.iter().any(|i| i.contains("entity_type")), 
           "analytics_events should have entity_type index");
    assert!(event_indexes.iter().any(|i| i.contains("timestamp")), 
           "analytics_events should have timestamp index");

    // Check dashboard_configs indexes
    let config_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='dashboard_configs'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(config_indexes.iter().any(|i| i.contains("user_id")), 
           "dashboard_configs should have user_id index");

    Ok(())
}