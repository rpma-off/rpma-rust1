//! Migration 037 tests: Create quotes and quote_items tables

use super::test_framework::MigrationTestContext;

#[test]
fn test_migration_037_creates_quotes_table() {
    let mut ctx =
        MigrationTestContext::at_version(36).expect("Failed to create migration test context");

    ctx.migrate_to_version(37)
        .expect("Failed to run migration 37");

    // Check that quotes table exists
    let table_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='quotes'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check quotes table");

    assert_eq!(table_exists, 1, "quotes table should exist");

    // Check that quote_items table exists
    let table_exists: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='quote_items'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to check quote_items table");

    assert_eq!(table_exists, 1, "quote_items table should exist");
}

#[test]
fn test_migration_037_quotes_schema() {
    let mut ctx =
        MigrationTestContext::at_version(36).expect("Failed to create migration test context");

    ctx.migrate_to_version(37)
        .expect("Failed to run migration 37");

    // Verify quotes table columns
    let column_count: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('quotes')",
            [],
            |row| row.get(0),
        )
        .expect("Failed to get quotes columns");

    assert!(column_count >= 20, "quotes table should have at least 20 columns");

    // Verify quote_items table columns
    let column_count: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('quote_items')",
            [],
            |row| row.get(0),
        )
        .expect("Failed to get quote_items columns");

    assert!(column_count >= 11, "quote_items table should have at least 11 columns");
}

#[test]
fn test_migration_037_indexes() {
    let mut ctx =
        MigrationTestContext::at_version(36).expect("Failed to create migration test context");

    ctx.migrate_to_version(37)
        .expect("Failed to run migration 37");

    // Check for quotes indexes
    let indexes = vec![
        "idx_quotes_quote_number",
        "idx_quotes_client_id",
        "idx_quotes_status",
        "idx_quotes_created_at",
        "idx_quotes_task_id",
    ];

    for index_name in indexes {
        let index_exists: i64 = ctx
            .conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?",
                [index_name],
                |row| row.get(0),
            )
            .expect(&format!("Failed to check index {}", index_name));

        assert_eq!(index_exists, 1, "{} index should exist", index_name);
    }

    // Check for quote_items indexes
    let indexes = vec![
        "idx_quote_items_quote_id",
        "idx_quote_items_position",
    ];

    for index_name in indexes {
        let index_exists: i64 = ctx
            .conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?",
                [index_name],
                |row| row.get(0),
            )
            .expect(&format!("Failed to check index {}", index_name));

        assert_eq!(index_exists, 1, "{} index should exist", index_name);
    }
}

#[test]
fn test_migration_037_insert_quote() {
    let mut ctx =
        MigrationTestContext::at_version(36).expect("Failed to create migration test context");

    ctx.migrate_to_version(37)
        .expect("Failed to run migration 37");

    // Insert a test quote
    ctx.conn
        .execute(
            r#"
            INSERT INTO quotes (id, quote_number, client_id, status, subtotal, tax_total, total, created_at, updated_at)
            VALUES ('test-quote-1', 'Q-2024-001', 'client-1', 'draft', 10000, 2000, 12000, 1234567890000, 1234567890000)
            "#,
            [],
        )
        .expect("Failed to insert test quote");

    // Verify the quote was inserted
    let count: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM quotes WHERE id='test-quote-1'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to count quotes");

    assert_eq!(count, 1, "Test quote should be inserted");
}

#[test]
fn test_migration_037_insert_quote_item() {
    let mut ctx =
        MigrationTestContext::at_version(36).expect("Failed to create migration test context");

    ctx.migrate_to_version(37)
        .expect("Failed to run migration 37");

    // Insert a test quote first
    ctx.conn
        .execute(
            r#"
            INSERT INTO quotes (id, quote_number, client_id, status, subtotal, tax_total, total, created_at, updated_at)
            VALUES ('test-quote-2', 'Q-2024-002', 'client-2', 'draft', 10000, 2000, 12000, 1234567890000, 1234567890000)
            "#,
            [],
        )
        .expect("Failed to insert test quote");

    // Insert a quote item
    ctx.conn
        .execute(
            r#"
            INSERT INTO quote_items (id, quote_id, kind, label, qty, unit_price, position, created_at, updated_at)
            VALUES ('item-1', 'test-quote-2', 'service', 'PPF Installation', 1.0, 10000, 0, 1234567890000, 1234567890000)
            "#,
            [],
        )
        .expect("Failed to insert quote item");

    // Verify the quote item was inserted
    let count: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM quote_items WHERE id='item-1'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to count quote items");

    assert_eq!(count, 1, "Test quote item should be inserted");
}

#[test]
fn test_migration_037_cascade_delete() {
    let mut ctx =
        MigrationTestContext::at_version(36).expect("Failed to create migration test context");

    ctx.migrate_to_version(37)
        .expect("Failed to run migration 37");

    // Insert a test quote
    ctx.conn
        .execute(
            r#"
            INSERT INTO quotes (id, quote_number, client_id, status, subtotal, tax_total, total, created_at, updated_at)
            VALUES ('test-quote-3', 'Q-2024-003', 'client-3', 'draft', 10000, 2000, 12000, 1234567890000, 1234567890000)
            "#,
            [],
        )
        .expect("Failed to insert test quote");

    // Insert quote items
    ctx.conn
        .execute(
            r#"
            INSERT INTO quote_items (id, quote_id, kind, label, qty, unit_price, position, created_at, updated_at)
            VALUES ('item-2', 'test-quote-3', 'service', 'PPF Installation', 1.0, 10000, 0, 1234567890000, 1234567890000)
            "#,
            [],
        )
        .expect("Failed to insert quote item");

    // Delete the quote
    ctx.conn
        .execute("DELETE FROM quotes WHERE id='test-quote-3'", [])
        .expect("Failed to delete quote");

    // Verify the quote items were also deleted (cascade)
    let count: i64 = ctx
        .conn
        .query_row(
            "SELECT COUNT(*) FROM quote_items WHERE quote_id='test-quote-3'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to count quote items");

    assert_eq!(count, 0, "Quote items should be deleted with cascade");
}
