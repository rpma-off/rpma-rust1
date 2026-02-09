//! Test for migration 026_fix_user_settings.sql
//! 
//! This test verifies that the user settings tables are created correctly
//! and all constraints, indexes, and triggers are properly applied.

use super::test_framework::*;
use sqlx::SqlitePool;

/// Test that migration 026 creates all user settings tables correctly
pub async fn test_migration_026_user_settings(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check that user_preferences table exists
    let prefs_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='user_preferences'"
    )
    .fetch_one(pool)
    .await?;
    assert!(prefs_exists, "user_preferences table should exist");

    // Check that settings_audit_log table exists
    let audit_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='settings_audit_log'"
    )
    .fetch_one(pool)
    .await?;
    assert!(audit_exists, "settings_audit_log table should exist");

    // Verify table schemas
    verify_user_preferences_schema(pool).await?;
    verify_settings_audit_log_schema(pool).await?;

    // Verify indexes were created
    verify_indexes_created(pool).await?;

    // Verify triggers were created
    verify_triggers_created(pool).await?;

    Ok(())
}

/// Verify user_preferences table schema
async fn verify_user_preferences_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('user_preferences') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "user_id", "category", "key", "value", "data_type",
        "is_system", "created_at", "updated_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "user_preferences should have column: {}", col);
    }

    // Check unique constraint on (user_id, category, key)
    let unique_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_index_list('user_preferences') 
         WHERE origin='u' AND partial=0"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(unique_count > 0, "user_preferences should have unique constraint");

    // Check data_type has default
    let default_type: Option<String> = sqlx::query_scalar(
        "SELECT dflt_value FROM pragma_table_info('user_preferences') WHERE name='data_type'"
    )
    .fetch_one(pool)
    .await?;
    
    assert_eq!(default_type, Some("'string'".to_string()),
              "data_type should default to 'string'");

    Ok(())
}

/// Verify settings_audit_log table schema
async fn verify_settings_audit_log_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('settings_audit_log') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "user_id", "changed_by", "action", "category", "key",
        "old_value", "new_value", "ip_address", "user_agent", "timestamp"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "settings_audit_log should have column: {}", col);
    }

    // Check foreign key to users table
    let fk_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('settings_audit_log') 
         WHERE table='users'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(fk_count > 0, "settings_audit_log should have foreign key to users");

    // Check action has constraints
    let check_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('settings_audit_log') 
         WHERE name='action' AND NOT NULL = 1"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(check_count > 0, "action should be NOT NULL");

    Ok(())
}

/// Verify indexes were created for performance
async fn verify_indexes_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check user_preferences indexes
    let prefs_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='user_preferences'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(prefs_indexes.iter().any(|i| i.contains("user_id")), 
           "user_preferences should have user_id index");
    assert!(prefs_indexes.iter().any(|i| i.contains("category")), 
           "user_preferences should have category index");
    assert!(prefs_indexes.iter().any(|i| i.contains("key")), 
           "user_preferences should have key index");

    // Check settings_audit_log indexes
    let audit_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='settings_audit_log'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(audit_indexes.iter().any(|i| i.contains("user_id")), 
           "settings_audit_log should have user_id index");
    assert!(audit_indexes.iter().any(|i| i.contains("timestamp")), 
           "settings_audit_log should have timestamp index");

    Ok(())
}

/// Verify triggers were created for audit logging
async fn verify_triggers_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check for trigger on INSERT
    let insert_trigger: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'user_preferences_insert_audit'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(insert_trigger > 0, "Should have trigger for INSERT audit logging");

    // Check for trigger on UPDATE
    let update_trigger: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'user_preferences_update_audit'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(update_trigger > 0, "Should have trigger for UPDATE audit logging");

    // Check for trigger on DELETE
    let delete_trigger: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE 'user_preferences_delete_audit'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(delete_trigger > 0, "Should have trigger for DELETE audit logging");

    // Test trigger by inserting a preference
    sqlx::query(
        "INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES ('test-user-026', 'test@example.com', 'testuser', 'hash', 'Test User', 'User', 1, datetime('now'), datetime('now'))"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "INSERT INTO user_preferences (user_id, category, key, value)
         VALUES ('test-user-026', 'ui', 'theme', 'dark')"
    )
    .execute(pool)
    .await?;

    // Check audit log entry was created
    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM settings_audit_log 
         WHERE user_id = 'test-user-026' AND action = 'INSERT'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(audit_count > 0, "Insert trigger should create audit log entry");

    // Clean up
    sqlx::query("DELETE FROM user_preferences WHERE user_id = 'test-user-026'").execute(pool).await?;
    sqlx::query("DELETE FROM users WHERE id = 'test-user-026'").execute(pool).await?;

    Ok(())
}