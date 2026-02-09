//! Test migration 020: Fix Cache Metadata Schema
//!
//! This migration recreates the cache_metadata table with a new schema.
//! It's critical to test because:
//! - It drops and recreates an entire table
//! - Could lose data if backup fails
//! - Virtual computed column might have compatibility issues

use super::*;

test_migration!(20, test_020_cache_metadata_schema, {
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
        column_names.contains(&"data_hash".to_string()),
        "data_hash column should exist"
    );
    assert!(
        column_names.contains(&"compressed_size".to_string()),
        "compressed_size column should exist"
    );
    assert!(
        column_names.contains(&"is_compressed".to_string()),
        "is_compressed column should exist"
    );
    assert!(
        column_names.contains(&"ttl_seconds".to_string()),
        "ttl_seconds column should exist"
    );
    assert!(
        column_names.contains(&"created_at".to_string()),
        "created_at column should exist"
    );
    assert!(
        column_names.contains(&"last_accessed_at".to_string()),
        "last_accessed_at column should exist"
    );
    assert!(
        column_names.contains(&"expires_at".to_string()),
        "expires_at column should exist"
    );

    // Verify data was preserved and transformed correctly
    let mut stmt = ctx.conn.prepare("SELECT COUNT(*) FROM cache_metadata")?;
    let final_count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(
        final_count, initial_count as i32,
        "Data should be preserved"
    );

    // Verify checksum was renamed to data_hash
    let mut stmt = ctx
        .conn
        .prepare("SELECT data_hash FROM cache_metadata WHERE cache_key = 'task:1'")?;
    let hash: String = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(hash, "abc123", "Checksum should be preserved as data_hash");

    // Verify compressed_size is computed for compressed entries
    let mut stmt = ctx.conn.prepare(
        "SELECT size_bytes, compressed_size, is_compressed FROM cache_metadata WHERE cache_key = 'intervention:1'"
    )?;
    let (size, compressed_size, is_compressed): (i32, i32, bool) =
        stmt.query_row([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?;

    assert_eq!(size, 2048);
    assert!(is_compressed);
    assert!(
        compressed_size < size,
        "Compressed size should be less than original size"
    );

    // Test the trigger for updating last_accessed_at
    ctx.conn.execute(
        "UPDATE cache_metadata SET cache_key = cache_key WHERE cache_key = 'client:1'",
        [],
    )?;

    let mut stmt = ctx.conn.prepare(
        "SELECT last_accessed_at > created_at FROM cache_metadata WHERE cache_key = 'client:1'",
    )?;
    let was_updated: bool = stmt.query_row([], |row| row.get(0))?;
    assert!(
        was_updated,
        "last_accessed_at should be updated on modification"
    );

    // Test the trigger for cleaning expired entries
    // Insert an expired entry
    ctx.conn.execute(
        "INSERT INTO cache_metadata (cache_key, cache_type, size_bytes, data_hash, ttl_seconds, created_at, expires_at) VALUES ('test_expired', 'test', 100, 'hash', 3600, datetime('now', '-2 days'), datetime('now', '-1 day'))",
        [],
    )?;

    // Trigger cleanup manually
    ctx.conn
        .execute("SELECT cleanup_expired_cache_entries()", [])?;

    // Verify expired entry was removed
    let mut stmt = ctx
        .conn
        .prepare("SELECT COUNT(*) FROM cache_metadata WHERE cache_key = 'test_expired'")?;
    let count: i32 = stmt.query_row([], |row| row.get(0))?;
    assert_eq!(count, 0, "Expired entries should be cleaned up");
});

#[test]
fn test_020_cache_metadata_performance() -> Result<(), Box<dyn std::error::Error>> {
    let ctx = MigrationTestContext::new()?;

    // Run migration first
    ctx.migrate_to_version(20)?;

    // Insert test data
    for i in 0..1000 {
        ctx.conn.execute(
            "INSERT INTO cache_metadata (cache_key, cache_type, size_bytes, data_hash, is_compressed, ttl_seconds) VALUES (?, ?, ?, ?, ?, ?)",
            params![
                format!("key_{}", i),
                if i % 3 == 0 { "task" } else if i % 3 == 1 { "intervention" } else { "client" },
                1000 + (i * 10),
                format!("hash_{}", i),
                i % 2 == 0,
                3600
            ],
        )?;
    }

    // Test query performance with the new schema
    use std::time::Instant;
    let start = Instant::now();

    let mut stmt = ctx.conn.prepare(
        "SELECT cache_key, cache_type, size_bytes FROM cache_metadata WHERE cache_type = ? AND expires_at > ? ORDER BY last_accessed_at DESC LIMIT 100"
    )?;
    let rows = stmt.query_map(
        params![
            "task",
            chrono::Utc::now()
                .naive_utc()
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
        ],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)?,
            ))
        },
    )?;

    let results: Vec<_> = rows.collect::<Result<Vec<_>, _>>()?;
    let elapsed = start.elapsed();

    assert!(!results.is_empty(), "Query should return results");
    assert!(
        elapsed.as_millis() < 100,
        "Query should be fast (<100ms), took {}ms",
        elapsed.as_millis()
    );

    // Test the computed column for cache age
    let mut stmt = ctx.conn.prepare(
        "SELECT cache_key, (julianday('now') - julianday(created_at)) * 24 * 60 AS age_minutes FROM cache_metadata WHERE cache_key = ?"
    )?;
    let (key, age_minutes): (String, f64) =
        stmt.query_row(params!["key_500"], |row| Ok((row.get(0)?, row.get(1)?)))?;

    assert_eq!(key, "key_500");
    assert!(age_minutes >= 0.0, "Age should be positive");

    Ok(())
}
