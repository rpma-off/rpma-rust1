//! Test for migration 020_fix_cache_metadata_schema.sql
//!
//! This test verifies that the cache_metadata table is recreated correctly
//! with the proper schema, indexes, and triggers.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_020_cache_metadata() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(20)?;

    // Create the old cache_metadata table with test data
    ctx.conn.execute_batch(
        r#"
        CREATE TABLE cache_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cache_key TEXT UNIQUE NOT NULL,
            cache_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_accessed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            is_compressed BOOLEAN DEFAULT 0,
            checksum TEXT,
            metadata_json TEXT
        );
        
        -- Insert test data
        INSERT INTO cache_metadata (
            cache_key, cache_type, size_bytes, expires_at, is_compressed, checksum, metadata_json
        ) VALUES 
            ('task:1', 'task', 1024, datetime('now', '+1 day'), 0, 'abc123', '{"version": 1}'),
            ('intervention:1', 'intervention', 2048, datetime('now', '+2 days'), 1, 'def456', '{"version": 2}'),
            ('expired:1', 'test', 512, datetime('now', '-1 day'), 0, 'ghi789', '{"version": 1}'),
            ('client:1', 'client', 1536, NULL, 1, 'jkl012', '{"version": 3}');
        "#
    )?;

    let initial_count = ctx.count_rows("cache_metadata")?;
    assert_eq!(initial_count, 4, "Should have 4 test cache entries");

    // Run migration 020
    ctx.migrate_to_version(20)?;

    // Verify table structure has the new columns
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(cache_metadata)")?;
    let columns: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(name, _)| name.clone()).collect();
    assert!(
        column_names.contains(&"id".to_string()),
        "id column should exist"
    );
    assert!(
        column_names.contains(&"cache_key".to_string()),
        "cache_key column should exist"
    );
    assert!(
        column_names.contains(&"cache_type".to_string()),
        "cache_type column should exist"
    );
    assert!(
        column_names.contains(&"size_bytes".to_string()),
        "size_bytes column should exist"
    );
    assert!(
        column_names.contains(&"access_count".to_string()),
        "access_count column should exist"
    );
    assert!(
        column_names.contains(&"ttl_seconds".to_string()),
        "ttl_seconds column should exist"
    );
    assert!(
        column_names.contains(&"backend_type".to_string()),
        "backend_type column should exist"
    );
    assert!(
        column_names.contains(&"expires_at".to_string()),
        "expires_at column should exist"
    );

    // Verify data was preserved and transformed correctly
    let final_count = ctx.count_rows("cache_metadata")?;
    assert_eq!(final_count, initial_count, "Data should be preserved");

    // Test the trigger for cleaning expired entries
    // Insert an expired entry
    ctx.conn.execute(
        "INSERT INTO cache_metadata (cache_key, cache_type, size_bytes, ttl_seconds, backend_type, created_at)
         VALUES ('test_expired', 'test', 1000, 3600, 'memory', datetime('now', '-2 days'))",
        [],
    )?;

    // The trigger should automatically remove expired entries when they're inserted
    // Check if the expired entry was removed
    let expired_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM cache_metadata WHERE cache_key = 'test_expired'",
        [],
        |row| row.get(0),
    )?;

    // The trigger should have removed the expired entry
    assert_eq!(
        expired_count, 0,
        "Expired entry should be removed by trigger"
    );

    // Verify cache_statistics table exists
    let stats_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='cache_statistics'",
        [],
        |row| row.get(0),
    )?;
    assert!(stats_exists > 0, "cache_statistics table should exist");

    // Check database integrity
    ctx.check_integrity()?;
    ctx.check_foreign_keys()?;

    Ok(())
}

#[test]
fn test_020_cache_metadata_indexes() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(20)?;

    // Run migration 020
    ctx.migrate_to_version(20)?;

    // Verify indexes were created
    let mut stmt = ctx.conn.prepare(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='cache_metadata'
         AND name NOT LIKE 'sqlite_autoindex_%'",
    )?;

    let indexes: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        indexes.iter().any(|i| i.contains("cache_key")),
        "Should have cache_key index"
    );
    assert!(
        indexes.iter().any(|i| i.contains("cache_type")),
        "Should have cache_type index"
    );
    assert!(
        indexes.iter().any(|i| i.contains("expires_at")),
        "Should have expires_at index"
    );

    // Check cache_statistics indexes
    let mut stmt = ctx.conn.prepare(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='cache_statistics'
         AND name NOT LIKE 'sqlite_autoindex_%'",
    )?;

    let stats_indexes: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        stats_indexes.iter().any(|i| i.contains("timestamp")),
        "cache_statistics should have timestamp index"
    );
    assert!(
        stats_indexes.iter().any(|i| i.contains("cache_type")),
        "cache_statistics should have cache_type index"
    );

    Ok(())
}

#[test]
fn test_020_cache_metadata_triggers() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(20)?;

    // Run migration 020
    ctx.migrate_to_version(20)?;

    // Verify cleanup_expired_cache trigger exists
    let trigger_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name='cleanup_expired_cache'",
        [],
        |row| row.get(0),
    )?;

    assert!(
        trigger_count > 0,
        "Should have cleanup_expired_cache trigger"
    );

    // Test trigger by inserting an expired entry
    ctx.conn.execute(
        "INSERT INTO cache_metadata (cache_key, cache_type, size_bytes, ttl_seconds, backend_type, created_at)
         VALUES ('test_expired_trigger', 'test', 1000, 3600, 'memory', datetime('now', '-2 days'))",
        [],
    )?;

    // The trigger should have removed it
    let expired_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM cache_metadata WHERE cache_key = 'test_expired_trigger'",
        [],
        |row| row.get(0),
    )?;

    assert_eq!(expired_count, 0, "Trigger should remove expired entries");

    Ok(())
}
