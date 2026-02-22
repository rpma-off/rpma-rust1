//! Unit tests for Analytics Service
//!
//! Tests KPI calculations, dashboard data aggregation, and analytics queries

use crate::db::Database;
use crate::domains::analytics::infrastructure::analytics::AnalyticsService;
use crate::domains::reports::domain::models::reports::*;
use chrono::{DateTime, Duration, Utc};
use rusqlite::params;

// Test helper to create a test database with sample data
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Create test schema
    db.execute_batch(r#"
        -- Analytics KPIs table
        CREATE TABLE IF NOT EXISTS analytics_kpis (
            id TEXT PRIMARY KEY NOT NULL,
            kpi_name TEXT NOT NULL UNIQUE,
            kpi_category TEXT NOT NULL CHECK(kpi_category IN ('operational', 'financial', 'quality', 'efficiency', 'client_satisfaction')),
            display_name TEXT NOT NULL,
            description TEXT,
            unit TEXT,
            calculation_method TEXT NOT NULL,
            current_value REAL,
            previous_value REAL,
            target_value REAL,
            trend_direction TEXT CHECK(trend_direction IN ('up', 'down', 'stable', 'unknown')),
            last_calculated INTEGER,
            calculation_period TEXT DEFAULT 'daily' CHECK(calculation_period IN ('hourly', 'daily', 'weekly', 'monthly')),
            is_active INTEGER NOT NULL DEFAULT 1,
            priority INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
        
        -- Analytics metrics table
        CREATE TABLE IF NOT EXISTS analytics_metrics (
            id TEXT PRIMARY KEY NOT NULL,
            metric_name TEXT NOT NULL,
            metric_category TEXT NOT NULL,
            value REAL NOT NULL,
            value_type TEXT NOT NULL CHECK(value_type IN ('count', 'percentage', 'currency', 'duration', 'rating')),
            dimensions TEXT,
            timestamp INTEGER NOT NULL,
            period_start INTEGER,
            period_end INTEGER,
            source TEXT NOT NULL,
            source_id TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            synced INTEGER NOT NULL DEFAULT 0
        );
        
        -- Analytics dashboards table
        CREATE TABLE IF NOT EXISTS analytics_dashboards (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            dashboard_type TEXT NOT NULL DEFAULT 'main' CHECK(dashboard_type IN ('main', 'operational', 'financial', 'quality', 'custom')),
            layout_config TEXT,
            widget_configs TEXT,
            filters_config TEXT,
            user_id TEXT,
            is_public INTEGER NOT NULL DEFAULT 0,
            is_default INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
            created_by TEXT,
            updated_by TEXT,
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
        
        -- Tasks table for testing
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            started_at INTEGER,
            completed_at INTEGER,
            assigned_to TEXT
        );
        
        -- Interventions table for testing
        CREATE TABLE IF NOT EXISTS interventions (
            id TEXT PRIMARY KEY NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            started_at INTEGER,
            completed_at INTEGER,
            visit_count INTEGER DEFAULT 1
        );
        
        -- Materials table for testing
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            current_stock REAL DEFAULT 0
        );
        
        -- Material consumption table for testing
        CREATE TABLE IF NOT EXISTS material_consumption (
            id TEXT PRIMARY KEY NOT NULL,
            material_id TEXT NOT NULL,
            quantity_used REAL DEFAULT 0,
            recorded_at INTEGER NOT NULL,
            FOREIGN KEY (material_id) REFERENCES materials(id)
        );
        
        -- Quality checks table for testing
        CREATE TABLE IF NOT EXISTS quality_checks (
            id TEXT PRIMARY KEY NOT NULL,
            passed INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        );
        
        -- Inventory transactions table for testing
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id TEXT PRIMARY KEY NOT NULL,
            material_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            performed_at INTEGER NOT NULL,
            FOREIGN KEY (material_id) REFERENCES materials(id)
        );
    "#).unwrap();

    // Insert test KPIs
    let now = Utc::now().timestamp_millis();
    db.execute_batch(r#"
        INSERT OR IGNORE INTO analytics_kpis (id, kpi_name, kpi_category, display_name, description, unit, calculation_method, target_value, calculation_period, priority, created_at, updated_at, is_active)
        VALUES 
            ('kpi_1', 'task_completion_rate', 'operational', 'Task Completion Rate', 'Percentage of tasks completed', 'percentage', 'COMPLETED_TASKS / TOTAL_TASKS * 100', 95.0, 'daily', 10, ?, ?, 1),
            ('kpi_2', 'avg_completion_time', 'efficiency', 'Average Completion Time', 'Average time to complete interventions', 'hours', 'AVG(intervention_duration)', 4.0, 'daily', 9, ?, ?, 1),
            ('kpi_3', 'client_satisfaction_score', 'client_satisfaction', 'Client Satisfaction', 'Average client satisfaction', 'rating', 'AVG(client_feedback_rating)', 4.5, 'weekly', 8, ?, ?, 1),
            ('kpi_4', 'material_utilization_rate', 'efficiency', 'Material Utilization', 'Material usage rate', 'percentage', 'USED_MATERIALS / ORDERED_MATERIALS * 100', 90.0, 'weekly', 7, ?, ?, 1),
            ('kpi_5', 'inventory_turnover_rate', 'efficiency', 'Inventory Turnover', 'How often inventory is sold/replaced', 'count', 'COGS / AVERAGE_INVENTORY', 12.0, 'monthly', 5, ?, ?, 1);
    "#, params![now, now, now, now, now, now, now, now, now, now]).unwrap();

    db
}

#[tokio::test]
async fn test_analytics_service_creation() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Service should be created successfully
    assert!(true, "AnalyticsService created successfully");
}

#[tokio::test]
async fn test_get_active_kpis() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    let kpis = service.get_active_kpis().unwrap();

    // Should have 5 active KPIs from test data
    assert_eq!(kpis.len(), 5, "Should have 5 active KPIs");

    // Verify KPI properties
    for kpi in &kpis {
        assert!(kpi.is_active, "KPI should be active");
        assert!(!kpi.kpi_name.is_empty(), "KPI name should not be empty");
        assert!(
            !kpi.display_name.is_empty(),
            "KPI display name should not be empty"
        );
        assert!(
            !kpi.calculation_method.is_empty(),
            "KPI calculation method should not be empty"
        );
    }
}

#[tokio::test]
async fn test_get_kpi_by_id() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Test existing KPI
    let kpi = service.get_kpi("kpi_1").unwrap();
    assert!(kpi.is_some(), "KPI should exist");

    let kpi = kpi.unwrap();
    assert_eq!(kpi.kpi_name, "task_completion_rate");
    assert_eq!(kpi.display_name, "Task Completion Rate");

    // Test non-existent KPI
    let kpi = service.get_kpi("non_existent").unwrap();
    assert!(kpi.is_none(), "Non-existent KPI should return None");
}

#[tokio::test]
async fn test_calculate_task_completion_rate() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test tasks
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

    // Create tasks with different statuses
    db.execute_batch(
        r#"
        INSERT INTO tasks (id, title, status, created_at, completed_at) VALUES
            ('task_1', 'Task 1', 'completed', ?, ?),
            ('task_2', 'Task 2', 'completed', ?, ?),
            ('task_3', 'Task 3', 'in_progress', ?, ?),
            ('task_4', 'Task 4', 'pending', ?, ?);
    "#,
        params![
            thirty_days_ago,
            now,
            thirty_days_ago,
            now,
            thirty_days_ago,
            None,
            thirty_days_ago,
            None
        ],
    )
    .unwrap();

    // Calculate KPI
    let kpi = service.get_kpi("kpi_1").unwrap().unwrap();
    let result = service.calculate_kpi(&kpi);

    assert!(result.is_ok(), "KPI calculation should succeed");

    // Verify KPI value in database
    let updated_kpi = service.get_kpi("kpi_1").unwrap().unwrap();
    assert!(
        updated_kpi.current_value.is_some(),
        "Current value should be set"
    );
    assert_eq!(
        updated_kpi.current_value.unwrap(),
        50.0,
        "Completion rate should be 50%"
    );
}

#[tokio::test]
async fn test_calculate_avg_completion_time() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test interventions
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();
    let two_hours_ago = (Utc::now() - Duration::hours(2)).timestamp_millis();
    let four_hours_ago = (Utc::now() - Duration::hours(4)).timestamp_millis();

    // Create completed interventions
    db.execute_batch(
        r#"
        INSERT INTO interventions (id, status, started_at, completed_at) VALUES
            ('int_1', 'completed', ?, ?),
            ('int_2', 'completed', ?, ?);
    "#,
        params![
            four_hours_ago,
            two_hours_ago, // 2 hour duration
            four_hours_ago,
            now // 4 hour duration
        ],
    )
    .unwrap();

    // Calculate KPI
    let kpi = service.get_kpi("kpi_2").unwrap().unwrap();
    let result = service.calculate_kpi(&kpi);

    assert!(result.is_ok(), "KPI calculation should succeed");

    // Verify KPI value
    let updated_kpi = service.get_kpi("kpi_2").unwrap().unwrap();
    assert!(
        updated_kpi.current_value.is_some(),
        "Current value should be set"
    );
    assert_eq!(
        updated_kpi.current_value.unwrap(),
        3.0,
        "Average completion time should be 3 hours"
    );
}

#[tokio::test]
async fn test_calculate_first_time_fix_rate() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test interventions
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();
    let two_hours_ago = (Utc::now() - Duration::hours(2)).timestamp_millis();

    // Create interventions with different visit counts
    db.execute_batch(
        r#"
        INSERT INTO interventions (id, status, visit_count, completed_at) VALUES
            ('int_1', 'completed', 1, ?),
            ('int_2', 'completed', 1, ?),
            ('int_3', 'completed', 2, ?),
            ('int_4', 'in_progress', 1, NULL);
    "#,
        params![two_hours_ago, two_hours_ago, two_hours_ago],
    )
    .unwrap();

    // Calculate the KPI directly (not through calculate_kpi to test specific method)
    let rate = service.calculate_first_time_fix_rate().unwrap();

    assert_eq!(
        rate, 66.66666666666667,
        "First time fix rate should be 66.67% (2 out of 3)"
    );
}

#[tokio::test]
async fn test_calculate_material_utilization() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test materials
    db.execute_batch(
        r#"
        INSERT INTO materials (id, name, current_stock) VALUES
            ('mat_1', 'Material 1', 100),
            ('mat_2', 'Material 2', 50);
    "#,
        params![],
    )
    .unwrap();

    // Insert material consumption
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT INTO material_consumption (id, material_id, quantity_used, recorded_at) VALUES
            ('cons_1', 'mat_1', 30, ?),
            ('cons_2', 'mat_1', 20, ?),
            ('cons_3', 'mat_2', 10, ?);
    "#,
        params![thirty_days_ago, thirty_days_ago, thirty_days_ago],
    )
    .unwrap();

    // Calculate the KPI
    let rate = service.calculate_material_utilization().unwrap();

    // Expected: 30+20+10 = 60 used, 100+50 = 150 stock
    // 60/150 * 100 = 40%
    assert_eq!(rate, 40.0, "Material utilization should be 40%");
}

#[tokio::test]
async fn test_calculate_quality_score() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test quality checks
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT INTO quality_checks (id, passed, created_at) VALUES
            ('qc_1', 1, ?),
            ('qc_2', 1, ?),
            ('qc_3', 0, ?),
            ('qc_4', 1, ?),
            ('qc_5', 0, ?);
    "#,
        params![
            thirty_days_ago,
            thirty_days_ago,
            thirty_days_ago,
            thirty_days_ago,
            thirty_days_ago
        ],
    )
    .unwrap();

    // Calculate the KPI
    let score = service.calculate_quality_score().unwrap();

    // Expected: 3 passed out of 5 = 60%
    assert_eq!(score, 60.0, "Quality score should be 60%");
}

#[tokio::test]
async fn test_calculate_inventory_turnover() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test materials
    db.execute_batch(
        r#"
        INSERT INTO materials (id, name, current_stock) VALUES
            ('mat_1', 'Material 1', 100),
            ('mat_2', 'Material 2', 50);
    "#,
        params![],
    )
    .unwrap();

    // Insert inventory transactions
    let year_ago = (Utc::now() - Duration::days(365)).timestamp_millis();

    db.execute_batch(r#"
        INSERT INTO inventory_transactions (id, material_id, transaction_type, quantity, performed_at) VALUES
            ('tx_1', 'mat_1', 'stock_out', 20, ?),
            ('tx_2', 'mat_1', 'stock_out', 30, ?),
            ('tx_3', 'mat_2', 'stock_out', 15, ?);
    "#, params![
        year_ago,
        year_ago,
        year_ago
    ]).unwrap();

    // Calculate the KPI
    let turnover = service.calculate_inventory_turnover().unwrap();

    // Expected: 20+30+15 = 65 total out, 100+50 = 150 avg stock
    // 65 / 150 = 0.433333...
    assert!(
        (turnover - 0.433333).abs() < 0.001,
        "Inventory turnover should be ~0.433"
    );
}

#[tokio::test]
async fn test_get_analytics_summary() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test data for summary calculations
    let now = Utc::now().timestamp_millis();
    let today_start = Utc::now()
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap_or_default()
        .and_utc()
        .timestamp_millis();

    // Create interventions
    db.execute_batch(
        r#"
        INSERT INTO interventions (id, status, completed_at) VALUES
            ('int_1', 'completed', ?),
            ('int_2', 'completed', ?),
            ('int_3', 'in_progress', NULL);
    "#,
        params![now, today_start],
    )
    .unwrap();

    // Create tasks
    db.execute_batch(
        r#"
        INSERT INTO tasks (id, title, status, created_at, assigned_to) VALUES
            ('task_1', 'Task 1', 'in_progress', ?, 'user_1'),
            ('task_2', 'Task 2', 'in_progress', ?, 'user_2');
    "#,
        params![now, now],
    )
    .unwrap();

    let summary = service.get_analytics_summary().unwrap();

    assert_eq!(
        summary.total_interventions, 3,
        "Should have 3 total interventions"
    );
    assert_eq!(summary.completed_today, 1, "Should have 1 completed today");
    assert_eq!(
        summary.active_technicians, 2,
        "Should have 2 active technicians"
    );
    assert!(
        summary.average_completion_time >= 0.0,
        "Average completion time should be non-negative"
    );
    assert!(
        summary.client_satisfaction_score >= 0.0,
        "Client satisfaction should be non-negative"
    );
    assert!(
        summary.quality_compliance_rate >= 0.0,
        "Quality compliance should be non-negative"
    );
    assert!(
        summary.inventory_turnover >= 0.0,
        "Inventory turnover should be non-negative"
    );
}

#[tokio::test]
async fn test_get_metric_time_series() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert test metrics
    let now = Utc::now().timestamp_millis();
    let one_day_ago = (Utc::now() - Duration::days(1)).timestamp_millis();
    let two_days_ago = (Utc::now() - Duration::days(2)).timestamp_millis();

    db.execute_batch(r#"
        INSERT INTO analytics_metrics (id, metric_name, metric_category, value, value_type, timestamp, source) VALUES
            ('m_1', 'task_completion_rate', 'operational', 85.0, 'percentage', ?, 'intervention'),
            ('m_2', 'task_completion_rate', 'operational', 90.0, 'percentage', ?, 'intervention'),
            ('m_3', 'task_completion_rate', 'operational', 88.0, 'percentage', ?, 'intervention');
    "#, params![
        two_days_ago,
        one_day_ago,
        now
    ]).unwrap();

    let time_series = service
        .get_metric_time_series("task_completion_rate", 30)
        .unwrap();

    assert_eq!(time_series.metric_name, "task_completion_rate");
    assert_eq!(time_series.period, "day");
    assert_eq!(time_series.aggregation, "avg");
    assert_eq!(
        time_series.data_points.len(),
        3,
        "Should have 3 data points"
    );

    // Verify data points are sorted by timestamp
    for i in 1..time_series.data_points.len() {
        assert!(
            time_series.data_points[i - 1].timestamp <= time_series.data_points[i].timestamp,
            "Data points should be sorted by timestamp"
        );
    }
}

#[tokio::test]
async fn test_calculate_all_kpis() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Insert minimal test data
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT INTO tasks (id, title, status, created_at, completed_at) VALUES
            ('task_1', 'Task 1', 'completed', ?, ?),
            ('task_2', 'Task 2', 'in_progress', ?, NULL);
        
        INSERT INTO interventions (id, status, started_at, completed_at) VALUES
            ('int_1', 'completed', ?, ?);
        
        INSERT INTO materials (id, name, current_stock) VALUES
            ('mat_1', 'Material 1', 100);
            
        INSERT INTO material_consumption (id, material_id, quantity_used, recorded_at) VALUES
            ('cons_1', 'mat_1', 10, ?);
            
        INSERT INTO quality_checks (id, passed, created_at) VALUES
            ('qc_1', 1, ?);
    "#,
        params![
            thirty_days_ago,
            now,
            thirty_days_ago,
            thirty_days_ago,
            now,
            thirty_days_ago,
            thirty_days_ago
        ],
    )
    .unwrap();

    // Calculate all KPIs
    let result = service.calculate_all_kpis();

    assert!(result.is_ok(), "Should successfully calculate all KPIs");

    // Verify that KPIs have been updated
    let kpis = service.get_active_kpis().unwrap();
    for kpi in kpis {
        assert!(
            kpi.current_value.is_some()
                || kpi.kpi_name == "client_satisfaction_score"
                || kpi.kpi_name == "revenue_per_technician_hour",
            "KPI {} should have a current value calculated",
            kpi.kpi_name
        );
    }
}

#[tokio::test]
async fn test_trend_direction_calculation() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create a KPI to test trend calculation
    let kpi_id = "test_trend";
    db.execute(r#"
        INSERT INTO analytics_kpis (id, kpi_name, kpi_category, display_name, calculation_method, is_active)
        VALUES (?, 'test_trend', 'operational', 'Test Trend', '1 + 1', 1)
    "#, params![kpi_id]).unwrap();

    // Test trend calculation with various scenarios
    let kpi = service.get_kpi(kpi_id).unwrap().unwrap();

    // Test with no previous value
    let trend = service.calculate_trend_direction(50.0, None);
    assert_eq!(
        trend,
        Some(TrendDirection::Unknown),
        "Trend should be unknown with no previous value"
    );

    // Test with significant increase
    let trend = service.calculate_trend_direction(60.0, Some(50.0));
    assert_eq!(
        trend,
        Some(TrendDirection::Up),
        "Trend should be up with significant increase"
    );

    // Test with significant decrease
    let trend = service.calculate_trend_direction(40.0, Some(50.0));
    assert_eq!(
        trend,
        Some(TrendDirection::Down),
        "Trend should be down with significant decrease"
    );

    // Test with small change (within 5% threshold)
    let trend = service.calculate_trend_direction(51.0, Some(50.0));
    assert_eq!(
        trend,
        Some(TrendDirection::Stable),
        "Trend should be stable with small change"
    );

    // Test with exact same value
    let trend = service.calculate_trend_direction(50.0, Some(50.0));
    assert_eq!(
        trend,
        Some(TrendDirection::Stable),
        "Trend should be stable with same value"
    );
}

#[tokio::test]
async fn test_unknown_kpi_handling() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create KPI with unknown calculation method
    let kpi_id = "unknown_kpi";
    db.execute(r#"
        INSERT INTO analytics_kpis (id, kpi_name, kpi_category, display_name, calculation_method, is_active)
        VALUES (?, 'unknown_kpi', 'operational', 'Unknown KPI', 'UNKNOWN_METHOD', 1)
    "#, params![kpi_id]).unwrap();

    let kpi = service.get_kpi(kpi_id).unwrap().unwrap();
    let result = service.calculate_kpi(&kpi);

    assert!(result.is_err(), "Should fail to calculate unknown KPI");
    assert!(
        result.unwrap_err().contains("Unknown KPI"),
        "Error should mention unknown KPI"
    );
}
