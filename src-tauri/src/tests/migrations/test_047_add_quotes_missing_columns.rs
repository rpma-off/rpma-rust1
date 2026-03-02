//! Migration 047 tests: Add missing columns to quotes table and create quote_attachments

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_047_adds_missing_quotes_columns() {
    let mut ctx =
        MigrationTestContext::at_version(46).expect("Failed to create migration test context");

    ctx.migrate_to_version(47)
        .expect("Failed to run migration 47");

    // Verify required columns now exist by inserting a row using them
    ctx.conn
        .execute(
            r#"
            INSERT INTO quotes (
                id, quote_number, client_id, status,
                subtotal, tax_total, total,
                discount_type, discount_value, discount_amount,
                description, public_token, shared_at, view_count,
                last_viewed_at, customer_message,
                created_at, updated_at
            ) VALUES (
                'test-q-047', 'Q-047-001', 'client-x', 'draft',
                1000, 200, 1200,
                'percentage', 10, 100,
                'Test description', NULL, NULL, 0,
                NULL, NULL,
                1234567890000, 1234567890000
            )
            "#,
            [],
        )
        .expect("Failed to insert quote with new columns — columns may be missing");

    let count: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM quotes WHERE id='test-q-047'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to count quotes");

    assert_eq!(count, 1, "Quote with new columns should be inserted");
}

#[test]
fn test_migration_047_creates_quote_attachments_table() {
    let mut ctx =
        MigrationTestContext::at_version(46).expect("Failed to create migration test context");

    ctx.migrate_to_version(47)
        .expect("Failed to run migration 47");

    let table_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='quote_attachments'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check quote_attachments table");

    assert_eq!(table_exists, 1, "quote_attachments table should exist");
}

#[test]
fn test_migration_047_idempotent() {
    let mut ctx =
        MigrationTestContext::at_version(46).expect("Failed to create migration test context");

    // Run twice - should not fail
    ctx.migrate_to_version(47)
        .expect("Failed to run migration 47 first time");
    ctx.migrate_to_version(47)
        .expect("Failed to run migration 47 second time — not idempotent");
}
