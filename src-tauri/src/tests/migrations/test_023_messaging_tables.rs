//! Test for migration 023_add_messaging_tables.sql
//! 
//! This test verifies that the messaging tables are created correctly
//! and all constraints, indexes, and triggers are properly applied.

use super::test_framework::*;
use sqlx::SqlitePool;

/// Test that migration 023 creates all messaging tables correctly
pub async fn test_migration_023_messaging_tables(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check that messaging_queue table exists
    let queue_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='messaging_queue'"
    )
    .fetch_one(pool)
    .await?;
    assert!(queue_exists, "messaging_queue table should exist");

    // Check that messages table exists
    let messages_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='messages'"
    )
    .fetch_one(pool)
    .await?;
    assert!(messages_exists, "messages table should exist");

    // Check that message_attachments table exists
    let attachments_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='message_attachments'"
    )
    .fetch_one(pool)
    .await?;
    assert!(attachments_exists, "message_attachments table should exist");

    // Verify table schemas
    verify_messaging_queue_schema(pool).await?;
    verify_messages_schema(pool).await?;
    verify_message_attachments_schema(pool).await?;

    // Verify indexes were created
    verify_indexes_created(pool).await?;

    // Verify foreign key constraints
    verify_foreign_keys(pool).await?;

    Ok(())
}

/// Verify messaging_queue table schema
async fn verify_messaging_queue_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('messaging_queue') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "message_type", "priority", "status", "payload",
        "attempts", "max_attempts", "scheduled_at", "created_at",
        "updated_at", "error_message"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "messaging_queue should have column: {}", col);
    }

    // Check defaults and constraints
    let default_priority: Option<String> = sqlx::query_scalar(
        "SELECT dflt_value FROM pragma_table_info('messaging_queue') WHERE name='priority'"
    )
    .fetch_one(pool)
    .await?;
    
    assert_eq!(default_priority, Some("'normal'".to_string()),
              "priority should default to 'normal'");

    Ok(())
}

/// Verify messages table schema
async fn verify_messages_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('messages') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "queue_id", "sender_id", "recipient_id", "subject",
        "body", "read_at", "archived_at", "created_at", "updated_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "messages should have column: {}", col);
    }

    // Check foreign key to messaging_queue
    let fk_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('messages') 
         WHERE table='messaging_queue'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(fk_count > 0, "messages should have foreign key to messaging_queue");

    Ok(())
}

/// Verify message_attachments table schema
async fn verify_message_attachments_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('message_attachments') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "message_id", "filename", "content_type", 
        "size_bytes", "storage_path", "created_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "message_attachments should have column: {}", col);
    }

    // Check foreign key to messages
    let fk_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('message_attachments') 
         WHERE table='messages'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(fk_count > 0, "message_attachments should have foreign key to messages");

    Ok(())
}

/// Verify indexes were created for performance
async fn verify_indexes_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check messaging_queue indexes
    let queue_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='messaging_queue'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(queue_indexes.iter().any(|i| i.contains("status")), 
           "messaging_queue should have status index");
    assert!(queue_indexes.iter().any(|i| i.contains("scheduled_at")), 
           "messaging_queue should have scheduled_at index");
    assert!(queue_indexes.iter().any(|i| i.contains("priority")), 
           "messaging_queue should have priority index");

    // Check messages indexes
    let message_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='messages'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(message_indexes.iter().any(|i| i.contains("recipient_id")), 
           "messages should have recipient_id index");
    assert!(message_indexes.iter().any(|i| i.contains("created_at")), 
           "messages should have created_at index");

    Ok(())
}

/// Verify foreign key constraints are enforced
async fn verify_foreign_keys(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Insert test data
    sqlx::query(
        "INSERT INTO messaging_queue (id, message_type, priority, status, payload, attempts, max_attempts, created_at)
         VALUES ('test-queue-1', 'email', 'normal', 'pending', '{}', 0, 3, datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Test foreign key constraint on messages
    let result = sqlx::query(
        "INSERT INTO messages (id, queue_id, sender_id, recipient_id, subject, body, created_at)
         VALUES ('test-msg-1', 'non-existent-queue', 'user1', 'user2', 'Test', 'Body', datetime('now'))"
    )
    .execute(pool)
    .await;

    // Should fail due to foreign key constraint
    assert!(result.is_err(), "Should not be able to insert message with non-existent queue_id");

    // Test valid insert
    sqlx::query(
        "INSERT INTO messages (id, queue_id, sender_id, recipient_id, subject, body, created_at)
         VALUES ('test-msg-2', 'test-queue-1', 'user1', 'user2', 'Test', 'Body', datetime('now'))"
    )
    .execute(pool)
    .await?;

    // Clean up
    sqlx::query("DELETE FROM messages WHERE id IN ('test-msg-2')").execute(pool).await?;
    sqlx::query("DELETE FROM messaging_queue WHERE id = 'test-queue-1'").execute(pool).await?;

    Ok(())
}