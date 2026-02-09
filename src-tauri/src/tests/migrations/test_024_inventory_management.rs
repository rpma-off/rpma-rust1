//! Test for migration 024_add_inventory_management.sql
//! 
//! This test verifies that the inventory management tables are created correctly
//! and all constraints, indexes, and triggers are properly applied.

use super::test_framework::*;
use sqlx::SqlitePool;

/// Test that migration 024 creates all inventory management tables correctly
pub async fn test_migration_024_inventory_management(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check that inventory_items table exists
    let items_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='inventory_items'"
    )
    .fetch_one(pool)
    .await?;
    assert!(items_exists, "inventory_items table should exist");

    // Check that stock_transactions table exists
    let transactions_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='stock_transactions'"
    )
    .fetch_one(pool)
    .await?;
    assert!(transactions_exists, "stock_transactions table should exist");

    // Check that stock_adjustments table exists
    let adjustments_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='stock_adjustments'"
    )
    .fetch_one(pool)
    .await?;
    assert!(adjustments_exists, "stock_adjustments table should exist");

    // Verify table schemas
    verify_inventory_items_schema(pool).await?;
    verify_stock_transactions_schema(pool).await?;
    verify_stock_adjustments_schema(pool).await?;

    // Verify indexes were created
    verify_indexes_created(pool).await?;

    // Verify triggers were created
    verify_triggers_created(pool).await?;

    Ok(())
}

/// Verify inventory_items table schema
async fn verify_inventory_items_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('inventory_items') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "material_id", "warehouse_id", "location", "quantity_on_hand",
        "quantity_available", "quantity_reserved", "reorder_level", "max_stock",
        "unit_cost", "average_cost", "last_counted_at", "created_at", "updated_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "inventory_items should have column: {}", col);
    }

    // Check constraints
    let check_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('inventory_items') 
         WHERE name='quantity_on_hand' AND NOT NULL = 1"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(check_count > 0, "quantity_on_hand should be NOT NULL");

    Ok(())
}

/// Verify stock_transactions table schema
async fn verify_stock_transactions_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('stock_transactions') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "inventory_item_id", "transaction_type", "quantity", "reference_type",
        "reference_number", "notes", "created_by", "created_at", "updated_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "stock_transactions should have column: {}", col);
    }

    // Check foreign key to inventory_items
    let fk_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('stock_transactions') 
         WHERE table='inventory_items'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(fk_count > 0, "stock_transactions should have foreign key to inventory_items");

    Ok(())
}

/// Verify stock_adjustments table schema
async fn verify_stock_adjustments_schema(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check critical columns exist
    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('stock_adjustments') ORDER BY cid"
    )
    .fetch_all(pool)
    .await?;
    
    let required_columns = vec![
        "id", "inventory_item_id", "adjustment_type", "old_quantity", "new_quantity",
        "difference", "reason", "approved_by", "created_at"
    ];
    
    for col in required_columns {
        assert!(columns.contains(&col.to_string()), 
               "stock_adjustments should have column: {}", col);
    }

    // Check foreign key to inventory_items
    let fk_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('stock_adjustments') 
         WHERE table='inventory_items'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(fk_count > 0, "stock_adjustments should have foreign key to inventory_items");

    Ok(())
}

/// Verify indexes were created for performance
async fn verify_indexes_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check inventory_items indexes
    let items_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='inventory_items'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(items_indexes.iter().any(|i| i.contains("material_id")), 
           "inventory_items should have material_id index");
    assert!(items_indexes.iter().any(|i| i.contains("warehouse_id")), 
           "inventory_items should have warehouse_id index");

    // Check stock_transactions indexes
    let trans_indexes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name='stock_transactions'
         AND name NOT LIKE 'sqlite_autoindex_%'"
    )
    .fetch_all(pool)
    .await?;
    
    assert!(trans_indexes.iter().any(|i| i.contains("inventory_item_id")), 
           "stock_transactions should have inventory_item_id index");
    assert!(trans_indexes.iter().any(|i| i.contains("transaction_type")), 
           "stock_transactions should have transaction_type index");

    Ok(())
}

/// Verify triggers were created for data consistency
async fn verify_triggers_created(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // Check for trigger to update inventory quantities
    let trigger_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE '%update_inventory%'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(trigger_count > 0, "Should have trigger to update inventory on transaction");

    // Check for trigger to prevent negative stock
    let negative_trigger: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='trigger' AND name LIKE '%prevent_negative_stock%'"
    )
    .fetch_one(pool)
    .await?;
    
    assert!(negative_trigger > 0, "Should have trigger to prevent negative stock");

    Ok(())
}