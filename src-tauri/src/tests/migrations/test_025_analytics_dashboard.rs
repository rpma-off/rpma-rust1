//! Test for migration 025_add_analytics_dashboard.sql
//!
//! This test verifies that the analytics dashboard tables are created correctly
//! with proper relationships, constraints, and indexes.

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_migration_025_analytics_dashboard() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(25)?;

    // Check that kpi_metrics table exists
    let kpi_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='kpi_metrics'",
        [],
        |row| row.get(0),
    )?;
    assert!(kpi_exists > 0, "kpi_metrics table should exist");

    // Check that dashboard_configs table exists
    let dash_configs_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='dashboard_configs'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        dash_configs_exists > 0,
        "dashboard_configs table should exist"
    );

    // Check that dashboard_snapshots table exists
    let snapshots_exists: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master 
         WHERE type='table' AND name='dashboard_snapshots'",
        [],
        |row| row.get(0),
    )?;
    assert!(
        snapshots_exists > 0,
        "dashboard_snapshots table should exist"
    );

    // Verify kpi_metrics table structure
    verify_kpi_metrics_table_structure(&ctx)?;

    // Verify dashboard_configs table structure
    verify_dashboard_configs_table_structure(&ctx)?;

    // Verify dashboard_snapshots table structure
    verify_dashboard_snapshots_table_structure(&ctx)?;

    // Test with sample data
    test_analytics_dashboard_with_data(&mut ctx)?;

    Ok(())
}

/// Verify the kpi_metrics table has the correct structure
fn verify_kpi_metrics_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(kpi_metrics)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "metric_name",
        "metric_type",
        "value",
        "unit",
        "target_value",
        "date_range_start",
        "date_range_end",
        "comparison_value",
        "trend",
        "last_calculated",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in kpi_metrics table",
            col
        );
    }

    // Check indexes
    let indexes: Vec<String> = ctx
        .conn
        .prepare("PRAGMA index_list(kpi_metrics)")?
        .query_map([], |row| Ok(row.get::<_, String>(1)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        indexes
            .iter()
            .any(|name| name == "idx_kpi_metrics_name_type"),
        "Should have index on kpi_metrics(name, metric_type)"
    );

    Ok(())
}

/// Verify the dashboard_configs table has the correct structure
fn verify_dashboard_configs_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(dashboard_configs)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "name",
        "description",
        "config_json",
        "is_default",
        "is_public",
        "created_by",
        "created_at",
        "updated_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in dashboard_configs table",
            col
        );
    }

    // Check foreign key constraints
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(dashboard_configs)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "users"),
        "dashboard_configs table should have foreign key to users"
    );

    Ok(())
}

/// Verify the dashboard_snapshots table has the correct structure
fn verify_dashboard_snapshots_table_structure(ctx: &MigrationTestContext) -> AppResult<()> {
    // Get table columns from PRAGMA
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(dashboard_snapshots)")?;
    let columns: Vec<(i32, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(_, name, _)| name.clone()).collect();

    let expected_columns = vec![
        "id",
        "dashboard_config_id",
        "snapshot_data",
        "snapshot_date",
        "generated_by",
        "created_at",
    ];

    for col in expected_columns {
        assert!(
            column_names.contains(&col.to_string()),
            "Column '{}' should exist in dashboard_snapshots table",
            col
        );
    }

    // Check foreign key constraints
    let fks: Vec<String> = ctx
        .conn
        .prepare("PRAGMA foreign_key_list(dashboard_snapshots)")?
        .query_map([], |row| Ok(row.get::<_, String>(2)?))?
        .collect::<Result<Vec<_>, _>>()?;

    assert!(
        fks.iter().any(|table| table == "dashboard_configs"),
        "dashboard_snapshots table should have foreign key to dashboard_configs"
    );
    assert!(
        fks.iter().any(|table| table == "users"),
        "dashboard_snapshots table should have foreign key to users"
    );

    Ok(())
}

/// Test analytics dashboard tables with sample data
fn test_analytics_dashboard_with_data(ctx: &mut MigrationTestContext) -> AppResult<()> {
    // Insert a test user first
    ctx.conn.execute(
        "INSERT INTO users (id, email, password_hash, created_at, updated_at) 
         VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
        params!["user123", "test@example.com", "hashedpassword"],
    )?;

    // Insert KPI metrics
    ctx.conn.execute(
        "INSERT INTO kpi_metrics (id, metric_name, metric_type, value, unit, target_value, 
         date_range_start, date_range_end, comparison_value, trend, last_calculated, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'), datetime('now'), datetime('now'))",
        params![
            "kpi123",
            "Tasks Completed",
            "count",
            25,
            "tasks",
            30,
            "2024-01-01",
            "2024-01-31",
            20,
            "increasing",
        ]
    )?;

    // Insert dashboard config
    ctx.conn.execute(
        "INSERT INTO dashboard_configs (id, name, description, config_json, is_default, is_public, 
         created_by, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))",
        params![
            "dash123",
            "Task Overview",
            "Dashboard showing task completion metrics",
            r#"{"widgets": [{"type": "kpi", "title": "Tasks Completed", "metric": "Tasks Completed"}]}"#.to_string(),
            false,
            true,
            "user123"
        ],
    )?;

    // Insert dashboard snapshot
    ctx.conn.execute(
        "INSERT INTO dashboard_snapshots (id, dashboard_config_id, snapshot_data, snapshot_date, 
         generated_by, created_at) 
         VALUES (?1, ?2, ?3, datetime('now'), ?4, datetime('now'))",
        params![
            "snap123",
            "dash123",
            r#"{"widgets": [{"type": "kpi", "title": "Tasks Completed", "value": 25, "unit": "tasks"}]}"#.to_string(),
            "user123"
        ],
    )?;

    // Verify data can be retrieved
    let kpi_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM kpi_metrics WHERE metric_name = ?",
        params!["Tasks Completed"],
        |row| row.get(0),
    )?;
    assert_eq!(kpi_count, 1, "Should have one KPI metric");

    let dash_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM dashboard_configs WHERE name = ?",
        params!["Task Overview"],
        |row| row.get(0),
    )?;
    assert_eq!(dash_count, 1, "Should have one dashboard config");

    let snap_count: i64 = ctx.conn.query_row(
        "SELECT COUNT(*) FROM dashboard_snapshots WHERE dashboard_config_id = ?",
        params!["dash123"],
        |row| row.get(0),
    )?;
    assert_eq!(snap_count, 1, "Should have one dashboard snapshot");

    Ok(())
}
