//! Integration tests for Analytics Service
//!
//! Tests analytics functionality with database operations and interactions with other services

use crate::db::Database;
use crate::models::reports::*;
use crate::services::analytics::AnalyticsService;
use chrono::{DateTime, Duration, Utc};
use rusqlite::params;
use std::sync::Arc;

// Helper to create a test database with full schema
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Load migration 025 for analytics tables
    let migration_sql = r#"
        -- Table: analytics_kpis
        -- Stores computed Key Performance Indicators for dashboard display
        CREATE TABLE IF NOT EXISTS analytics_kpis (
            -- Identifiers
            id TEXT PRIMARY KEY NOT NULL,
            kpi_name TEXT NOT NULL UNIQUE,
            kpi_category TEXT NOT NULL
                CHECK(kpi_category IN ('operational', 'financial', 'quality', 'efficiency', 'client_satisfaction')),
            
            -- KPI Definition
            display_name TEXT NOT NULL,
            description TEXT,
            unit TEXT, -- 'percentage', 'currency', 'count', 'hours', etc.
            calculation_method TEXT NOT NULL,
            
            -- Value and Trends
            current_value REAL,
            previous_value REAL,
            target_value REAL,
            trend_direction TEXT
                CHECK(trend_direction IN ('up', 'down', 'stable', 'unknown')),
            
            -- Time periods
            last_calculated INTEGER,
            calculation_period TEXT DEFAULT 'daily'
                CHECK(calculation_period IN ('hourly', 'daily', 'weekly', 'monthly')),
            
            -- Status
            is_active INTEGER NOT NULL DEFAULT 1,
            priority INTEGER DEFAULT 0,
            
            -- Audit
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            
            -- Sync
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
        
        -- Table: analytics_metrics
        -- Stores raw metrics data for charts and trend analysis
        CREATE TABLE IF NOT EXISTS analytics_metrics (
            -- Identifiers
            id TEXT PRIMARY KEY NOT NULL,
            metric_name TEXT NOT NULL,
            metric_category TEXT NOT NULL,
            
            -- Value
            value REAL NOT NULL,
            value_type TEXT NOT NULL
                CHECK(value_type IN ('count', 'percentage', 'currency', 'duration', 'rating')),
            
            -- Dimensions (for grouping/filtering)
            dimensions TEXT, -- JSON object with dimension keys/values
            
            -- Time
            timestamp INTEGER NOT NULL,
            period_start INTEGER,
            period_end INTEGER,
            
            -- Metadata
            source TEXT NOT NULL, -- 'intervention', 'task', 'material', 'client', etc.
            source_id TEXT, -- Reference to the source record
            
            -- Audit
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            
            -- Sync
            synced INTEGER NOT NULL DEFAULT 0
        );
        
        -- Table: analytics_dashboards
        -- Stores dashboard configurations and layouts
        CREATE TABLE IF NOT EXISTS analytics_dashboards (
            -- Identifiers
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            dashboard_type TEXT NOT NULL DEFAULT 'main'
                CHECK(dashboard_type IN ('main', 'operational', 'financial', 'quality', 'custom')),
            
            -- Configuration
            layout_config TEXT, -- JSON layout configuration
            widget_configs TEXT, -- JSON array of widget configurations
            filters_config TEXT, -- JSON default filters
            
            -- Access Control
            user_id TEXT, -- NULL for global dashboards
            is_public INTEGER NOT NULL DEFAULT 0,
            is_default INTEGER NOT NULL DEFAULT 0,
            
            -- Status
            is_active INTEGER NOT NULL DEFAULT 1,
            
            -- Audit
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_by TEXT,
            updated_by TEXT,
            
            -- Sync
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER
        );
        
        -- Core business tables for integration testing
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT DEFAULT 'normal',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            assigned_to TEXT,
            started_at INTEGER,
            completed_at INTEGER,
            client_id TEXT,
            intervention_id TEXT,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS interventions (
            id TEXT PRIMARY KEY NOT NULL,
            client_id TEXT NOT NULL,
            vehicle_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT DEFAULT 'normal',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            created_by TEXT,
            assigned_to TEXT,
            started_at INTEGER,
            completed_at INTEGER,
            visit_count INTEGER DEFAULT 1,
            total_cost REAL DEFAULT 0,
            currency TEXT DEFAULT 'EUR',
            notes TEXT,
            quality_check_result TEXT,
            client_rating INTEGER,
            client_feedback TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        );
        
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            material_type TEXT NOT NULL,
            category TEXT,
            subcategory TEXT,
            brand TEXT,
            model TEXT,
            specifications TEXT, -- JSON
            unit_of_measure TEXT NOT NULL,
            current_stock REAL NOT NULL DEFAULT 0,
            minimum_stock REAL DEFAULT 0,
            maximum_stock REAL DEFAULT 0,
            reorder_point REAL DEFAULT 0,
            unit_cost REAL DEFAULT 0,
            currency TEXT DEFAULT 'EUR',
            supplier_id TEXT,
            supplier_name TEXT,
            supplier_sku TEXT,
            quality_grade TEXT,
            certification TEXT,
            expiry_date INTEGER,
            batch_number TEXT,
            storage_location TEXT,
            warehouse_id TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_by TEXT,
            updated_by TEXT,
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        );
        
        CREATE TABLE IF NOT EXISTS material_consumption (
            id TEXT PRIMARY KEY NOT NULL,
            intervention_id TEXT NOT NULL,
            material_id TEXT NOT NULL,
            step_id TEXT,
            step_number INTEGER,
            quantity_used REAL NOT NULL DEFAULT 0,
            waste_quantity REAL DEFAULT 0,
            waste_reason TEXT,
            batch_used TEXT,
            quality_notes TEXT,
            recorded_by TEXT,
            recorded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
            FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
            FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
        );
        
        CREATE TABLE IF NOT EXISTS quality_checks (
            id TEXT PRIMARY KEY NOT NULL,
            intervention_id TEXT,
            step_id TEXT,
            check_type TEXT NOT NULL,
            result TEXT NOT NULL,
            passed INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            performed_by TEXT,
            performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
            FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
        );
        
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id TEXT PRIMARY KEY NOT NULL,
            material_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            previous_stock REAL NOT NULL,
            new_stock REAL NOT NULL,
            reference_number TEXT,
            reference_type TEXT,
            notes TEXT,
            unit_cost REAL,
            total_cost REAL,
            warehouse_id TEXT,
            location_from TEXT,
            location_to TEXT,
            batch_number TEXT,
            expiry_date INTEGER,
            quality_status TEXT,
            intervention_id TEXT,
            step_id TEXT,
            performed_by TEXT NOT NULL,
            performed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            synced INTEGER NOT NULL DEFAULT 0,
            last_synced_at INTEGER,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE SET NULL,
            FOREIGN KEY (step_id) REFERENCES intervention_steps(id) ON DELETE SET NULL,
            FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
        );
    "#;

    db.execute_batch(migration_sql).unwrap();

    // Insert default KPIs
    let now = Utc::now().timestamp_millis();
    db.execute_batch(r#"
        INSERT OR IGNORE INTO analytics_kpis (
            id, kpi_name, kpi_category, display_name, description, unit,
            calculation_method, target_value, calculation_period, priority,
            created_at, updated_at, is_active
        ) VALUES
            ('kpi_completion_rate', 'task_completion_rate', 'operational', 'Task Completion Rate', 
             'Percentage of tasks completed on time', 'percentage', 
             'COMPLETED_TASKS / TOTAL_TASKS * 100', 95.0, 'daily', 10, ?, ?, 1),
            ('kpi_avg_completion_time', 'avg_completion_time', 'efficiency', 'Average Completion Time', 
             'Average time to complete interventions', 'hours', 
             'AVG(intervention_duration)', 4.0, 'daily', 9, ?, ?, 1),
            ('kpi_client_satisfaction', 'client_satisfaction_score', 'client_satisfaction', 'Client Satisfaction', 
             'Average client satisfaction rating', 'rating', 
             'AVG(client_feedback_rating)', 4.5, 'weekly', 8, ?, ?, 1),
            ('kpi_material_utilization', 'material_utilization_rate', 'efficiency', 'Material Utilization', 
             'Percentage of materials used vs ordered', 'percentage', 
             'USED_MATERIALS / ORDERED_MATERIALS * 100', 90.0, 'weekly', 7, ?, ?, 1),
            ('kpi_quality_score', 'overall_quality_score', 'quality', 'Quality Score', 
             'Overall quality compliance score', 'percentage', 
             'QUALITY_CHECKS_PASSED / TOTAL_CHECKS * 100', 98.0, 'daily', 10, ?, ?, 1);
    "#, params![now, now, now, now, now, now, now, now, now, now]).unwrap();

    db
}

// Helper to create sample data for integration tests
fn create_sample_data(db: &Database) {
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();
    let today_start = Utc::now()
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap_or_default()
        .and_utc()
        .timestamp_millis();

    // Create users
    db.execute_batch(r#"
        INSERT OR IGNORE INTO users (id, username, email, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES
            ('user_1', 'tech1', 'tech1@example.com', 'Technician', 'One', 'technician', 1, ?, ?),
            ('user_2', 'tech2', 'tech2@example.com', 'Technician', 'Two', 'technician', 1, ?, ?),
            ('user_3', 'manager', 'manager@example.com', 'Manager', 'One', 'manager', 1, ?, ?);
    "#, params![now, now, now, now, now, now]).unwrap();

    // Create clients
    db.execute_batch(r#"
        INSERT OR IGNORE INTO clients (id, name, email, phone, address, is_active, created_at, updated_at)
        VALUES
            ('client_1', 'Client One', 'client1@example.com', '555-0001', '123 Main St', 1, ?, ?),
            ('client_2', 'Client Two', 'client2@example.com', '555-0002', '456 Oak Ave', 1, ?, ?);
    "#, params![now, now, now, now]).unwrap();

    // Create interventions
    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO interventions (
            id, client_id, title, description, status, priority, 
            created_at, updated_at, created_by, assigned_to, 
            started_at, completed_at, visit_count, client_rating
        ) VALUES
            ('int_1', 'client_1', 'PPF Installation', 'Full vehicle PPF', 'completed', 'normal', 
             ?, ?, 'user_3', 'user_1', ?, ?, 1, 5),
            ('int_2', 'client_1', 'Paint Protection', 'Partial hood PPF', 'completed', 'normal', 
             ?, ?, 'user_3', 'user_1', ?, ?, 1, 4),
            ('int_3', 'client_2', 'Window Tint', 'Full window tint', 'in_progress', 'high', 
             ?, ?, 'user_3', 'user_2', ?, NULL, 1, NULL),
            ('int_4', 'client_2', 'Ceramic Coating', 'Full vehicle coating', 'pending', 'normal', 
             ?, ?, 'user_3', NULL, NULL, NULL, 1, NULL);
    "#,
        params![
            thirty_days_ago,
            now,
            thirty_days_ago,
            now,
            thirty_days_ago,
            now,
            thirty_days_ago,
            today_start,
            today_start,
            now,
            today_start,
            today_start,
            today_start,
            now
        ],
    )
    .unwrap();

    // Create tasks
    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO tasks (
            id, title, description, status, priority,
            created_at, updated_at, created_by, assigned_to,
            started_at, completed_at, intervention_id, client_id
        ) VALUES
            ('task_1', 'Vehicle Preparation', 'Clean and prepare vehicle', 'completed', 'normal',
             ?, ?, 'user_3', 'user_1', ?, ?, 'int_1', 'client_1'),
            ('task_2', 'PPF Installation', 'Install PPF on hood', 'completed', 'normal',
             ?, ?, 'user_3', 'user_1', ?, ?, 'int_1', 'client_1'),
            ('task_3', 'Quality Check', 'Final quality inspection', 'in_progress', 'high',
             ?, ?, 'user_3', 'user_1', ?, NULL, 'int_2', 'client_1'),
            ('task_4', 'Window Preparation', 'Clean windows for tint', 'pending', 'normal',
             ?, ?, 'user_3', 'user_2', NULL, NULL, 'int_3', 'client_2');
    "#,
        params![
            thirty_days_ago,
            now,
            thirty_days_ago,
            now,
            thirty_days_ago,
            now,
            thirty_days_ago,
            today_start,
            today_start,
            now,
            today_start,
            today_start,
            today_start,
            now
        ],
    )
    .unwrap();

    // Create materials
    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO materials (
            id, sku, name, material_type, unit_of_measure, current_stock,
            minimum_stock, unit_cost, created_at, updated_at
        ) VALUES
            ('mat_1', 'PPF-001', 'Clear PPF Film', 'film', 'meter', 100, 20, 50.0, ?, ?),
            ('mat_2', 'TINT-001', 'Window Tint Film', 'film', 'meter', 50, 10, 20.0, ?, ?),
            ('mat_3', 'CLEAN-001', 'Cleaning Solution', 'liquid', 'liter', 25, 5, 5.0, ?, ?);
    "#,
        params![now, now, now, now, now, now],
    )
    .unwrap();

    // Create material consumption
    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO material_consumption (
            id, intervention_id, material_id, quantity_used, recorded_at
        ) VALUES
            ('cons_1', 'int_1', 'mat_1', 10, ?),
            ('cons_2', 'int_1', 'mat_3', 2, ?),
            ('cons_3', 'int_2', 'mat_1', 5, ?);
    "#,
        params![now, now, now],
    )
    .unwrap();

    // Create quality checks
    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO quality_checks (
            id, intervention_id, check_type, result, passed, performed_at
        ) VALUES
            ('qc_1', 'int_1', 'final_inspection', 'passed', 1, ?),
            ('qc_2', 'int_2', 'visual_check', 'passed', 1, ?),
            ('qc_3', 'int_3', 'pre_check', 'failed', 0, ?);
    "#,
        params![
            (Utc::now() - Duration::hours(24)).timestamp_millis(),
            (Utc::now() - Duration::hours(12)).timestamp_millis(),
            (Utc::now() - Duration::hours(6)).timestamp_millis()
        ],
    )
    .unwrap();

    // Create inventory transactions
    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO inventory_transactions (
            id, material_id, transaction_type, quantity, previous_stock, new_stock, performed_at
        ) VALUES
            ('tx_1', 'mat_1', 'stock_in', 100, 0, 100, ?),
            ('tx_2', 'mat_2', 'stock_in', 50, 0, 50, ?),
            ('tx_3', 'mat_1', 'stock_out', 10, 100, 90, ?),
            ('tx_4', 'mat_3', 'stock_in', 25, 0, 25, ?);
    "#,
        params![
            (Utc::now() - Duration::days(10)).timestamp_millis(),
            (Utc::now() - Duration::days(8)).timestamp_millis(),
            (Utc::now() - Duration::days(2)).timestamp_millis(),
            (Utc::now() - Duration::days(5)).timestamp_millis()
        ],
    )
    .unwrap();
}

#[tokio::test]
async fn test_analytics_end_to_end_workflow() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create sample data
    create_sample_data(&service.db);

    // Calculate all KPIs
    let result = service.calculate_all_kpis();
    assert!(result.is_ok(), "Should successfully calculate all KPIs");

    // Get analytics summary
    let summary = service.get_analytics_summary().unwrap();

    // Verify calculated values
    assert_eq!(
        summary.total_interventions, 4,
        "Should have 4 total interventions"
    );
    assert_eq!(summary.completed_today, 1, "Should have 1 completed today");
    assert_eq!(
        summary.active_technicians, 2,
        "Should have 2 active technicians"
    );
    assert!(
        summary.average_completion_time > 0.0,
        "Average completion time should be > 0"
    );

    // Verify KPI values were calculated
    let kpis = service.get_active_kpis().unwrap();
    for kpi in kpis {
        if kpi.kpi_name == "task_completion_rate" {
            assert!(
                kpi.current_value.is_some(),
                "Task completion rate should be calculated"
            );
            assert_eq!(
                kpi.current_value.unwrap(),
                50.0,
                "Should be 50% completion (2/4)"
            );
        }
    }
}

#[tokio::test]
async fn test_analytics_with_intervention_data() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create intervention-specific test data
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO users (id, username, email, role, is_active, created_at, updated_at)
        VALUES ('tech_1', 'tech1', 'tech1@example.com', 'technician', 1, ?, ?);
        
        INSERT OR IGNORE INTO clients (id, name, email, is_active, created_at, updated_at)
        VALUES ('client_test', 'Test Client', 'test@example.com', 1, ?, ?);
        
        INSERT OR IGNORE INTO interventions (
            id, client_id, title, status, created_at, updated_at, assigned_to,
            started_at, completed_at, visit_count, client_rating
        ) VALUES
            ('int_single', 'client_test', 'Single Visit', 'completed', ?, ?, 'tech_1', 
             ?, ?, 1, 5),
            ('int_multi', 'client_test', 'Multi Visit', 'completed', ?, ?, 'tech_1',
             ?, ?, 2, 3);
    "#,
        params![
            now,
            now,
            now,
            now,
            thirty_days_ago,
            now,
            thirty_days_ago,
            (Utc::now() - Duration::hours(4)).timestamp_millis(),
            thirty_days_ago,
            now,
            thirty_days_ago,
            (Utc::now() - Duration::hours(8)).timestamp_millis()
        ],
    )
    .unwrap();

    // Calculate first time fix rate
    let rate = service.calculate_first_time_fix_rate().unwrap();

    // Should be 50% (1 out of 2 interventions completed in single visit)
    assert_eq!(rate, 50.0, "First time fix rate should be 50%");
}

#[tokio::test]
async fn test_analytics_with_material_consumption() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create material test data
    let now = Utc::now().timestamp_millis();
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO materials (
            id, sku, name, material_type, unit_of_measure, current_stock,
            created_at, updated_at
        ) VALUES
            ('mat_a', 'MAT-A', 'Material A', 'film', 'meter', 100, ?, ?),
            ('mat_b', 'MAT-B', 'Material B', 'film', 'meter', 50, ?, ?);
        
        INSERT OR IGNORE INTO material_consumption (
            id, material_id, quantity_used, recorded_at
        ) VALUES
            ('cons_a', 'mat_a', 20, ?),
            ('cons_b', 'mat_a', 30, ?),
            ('cons_c', 'mat_b', 10, ?);
    "#,
        params![
            now,
            now,
            now,
            now,
            thirty_days_ago,
            thirty_days_ago,
            thirty_days_ago
        ],
    )
    .unwrap();

    // Calculate material utilization
    let utilization = service.calculate_material_utilization().unwrap();

    // Should be 40% (60 used out of 150 total stock)
    assert_eq!(utilization, 40.0, "Material utilization should be 40%");
}

#[tokio::test]
async fn test_analytics_with_quality_checks() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create quality check test data
    let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO quality_checks (
            id, check_type, result, passed, performed_at
        ) VALUES
            ('qc_1', 'visual', 'passed', 1, ?),
            ('qc_2', 'measurement', 'passed', 1, ?),
            ('qc_3', 'functional', 'failed', 0, ?),
            ('qc_4', 'visual', 'passed', 1, ?);
    "#,
        params![
            thirty_days_ago,
            thirty_days_ago,
            thirty_days_ago,
            thirty_days_ago
        ],
    )
    .unwrap();

    // Calculate quality score
    let score = service.calculate_quality_score().unwrap();

    // Should be 75% (3 passed out of 4 checks)
    assert_eq!(score, 75.0, "Quality score should be 75%");
}

#[tokio::test]
async fn test_analytics_with_inventory_transactions() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create inventory transaction test data
    let year_ago = (Utc::now() - Duration::days(365)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO materials (
            id, sku, name, material_type, unit_of_measure, current_stock,
            created_at, updated_at
        ) VALUES
            ('mat_1', 'MAT-1', 'Material 1', 'film', 'meter', 100, ?, ?),
            ('mat_2', 'MAT-2', 'Material 2', 'film', 'meter', 50, ?, ?);
        
        INSERT OR IGNORE INTO inventory_transactions (
            id, material_id, transaction_type, quantity, performed_at
        ) VALUES
            ('tx_1', 'mat_1', 'stock_out', 50, ?),
            ('tx_2', 'mat_1', 'stock_out', 30, ?),
            ('tx_3', 'mat_2', 'stock_out', 25, ?);
    "#,
        params![year_ago, year_ago, year_ago, year_ago, year_ago, year_ago, year_ago],
    )
    .unwrap();

    // Calculate inventory turnover
    let turnover = service.calculate_inventory_turnover().unwrap();

    // Should be 105/75 = 1.4
    assert!(
        (turnover - 1.4).abs() < 0.01,
        "Inventory turnover should be ~1.4"
    );
}

#[tokio::test]
async fn test_analytics_time_series_aggregation() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create time series test data
    let now = Utc::now().timestamp_millis();
    let one_day_ago = (Utc::now() - Duration::days(1)).timestamp_millis();
    let two_days_ago = (Utc::now() - Duration::days(2)).timestamp_millis();
    let three_days_ago = (Utc::now() - Duration::days(3)).timestamp_millis();

    db.execute_batch(
        r#"
        INSERT OR IGNORE INTO analytics_metrics (
            id, metric_name, metric_category, value, value_type, timestamp, source
        ) VALUES
            ('m1', 'daily_sales', 'financial', 1000.0, 'currency', ?, 'intervention'),
            ('m2', 'daily_sales', 'financial', 1500.0, 'currency', ?, 'intervention'),
            ('m3', 'daily_sales', 'financial', 1200.0, 'currency', ?, 'intervention'),
            ('m4', 'daily_sales', 'financial', 1800.0, 'currency', ?, 'intervention');
    "#,
        params![three_days_ago, two_days_ago, one_day_ago, now],
    )
    .unwrap();

    // Get time series data
    let time_series = service.get_metric_time_series("daily_sales", 30).unwrap();

    assert_eq!(time_series.metric_name, "daily_sales");
    assert_eq!(
        time_series.data_points.len(),
        4,
        "Should have 4 data points"
    );

    // Verify data points are ordered by timestamp
    for i in 1..time_series.data_points.len() {
        assert!(
            time_series.data_points[i - 1].timestamp <= time_series.data_points[i].timestamp,
            "Data points should be in chronological order"
        );
    }

    // Verify values
    let values: Vec<f64> = time_series.data_points.iter().map(|p| p.value).collect();
    assert_eq!(
        values,
        vec![1000.0, 1500.0, 1200.0, 1800.0],
        "Values should match expected"
    );
}

#[tokio::test]
async fn test_analytics_dashboard_configuration() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create a test dashboard
    let now = Utc::now().timestamp_millis();
    db.execute(
        r#"
        INSERT INTO analytics_dashboards (
            id, name, dashboard_type, layout_config, widget_configs, 
            is_public, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    "#,
        params![
            "dashboard_test",
            "Test Dashboard",
            "custom",
            r#"{"layout": "grid"}"#,
            r#"[{"type": "chart", "id": "chart1"}]"#,
            1,
            0,
            now,
            now
        ],
    )
    .unwrap();

    // Get dashboard data
    let dashboard_data = service.get_dashboard_data("dashboard_test").unwrap();

    assert_eq!(dashboard_data.dashboard.name, "Test Dashboard");
    assert_eq!(dashboard_data.dashboard.dashboard_type, "custom");
    assert_eq!(dashboard_data.dashboard.is_public, 1);
    assert_eq!(dashboard_data.dashboard.is_default, 0);

    // Verify widgets were created
    assert!(!dashboard_data.widgets.is_empty(), "Should have widgets");

    // Verify KPIs are included
    assert!(!dashboard_data.kpis.is_empty(), "Should include KPIs");

    // Verify date range
    assert!(
        dashboard_data.date_range.end >= dashboard_data.date_range.start,
        "Date range should be valid"
    );
}

#[tokio::test]
async fn test_analytics_performance_with_large_dataset() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create a large dataset to test performance
    let now = Utc::now();
    let mut batch_params = Vec::new();

    // Create 1000 interventions
    for i in 0..1000 {
        let timestamp = (now - Duration::days(i % 365)).timestamp_millis();
        batch_params.push(("int_".to_string() + &i.to_string(), timestamp));
    }

    // Batch insert interventions
    let tx = db.get_connection().unwrap().transaction().unwrap();
    for (id, timestamp) in batch_params {
        tx.execute(r#"
            INSERT INTO interventions (id, client_id, title, status, created_at, updated_at, completed_at)
            VALUES (?, 'client_test', ?, 'completed', ?, ?, ?)
        "#, params![id, "Test Intervention", timestamp, timestamp, timestamp]).unwrap();
    }
    tx.commit().unwrap();

    // Test performance of KPI calculation
    let start = std::time::Instant::now();

    let kpis = service.get_active_kpis().unwrap();
    let result = service.calculate_all_kpis();

    let duration = start.elapsed();

    assert!(result.is_ok(), "Should calculate all KPIs successfully");
    assert!(
        duration.as_millis() < 5000,
        "Should complete within 5 seconds"
    ); // 5 second threshold
    assert!(!kpis.is_empty(), "Should have KPIs to calculate");
}

#[tokio::test]
async fn test_analytics_data_integrity() {
    let db = create_test_db().await;
    let service = AnalyticsService::new(db);

    // Create test data with edge cases
    let now = Utc::now().timestamp_millis();
    let future_time = (Utc::now() + Duration::days(1)).timestamp_millis();
    let past_time = (Utc::now() - Duration::days(400)).timestamp_millis(); // Older than 1 year

    db.execute_batch(r#"
        -- Normal data
        INSERT INTO interventions (id, client_id, title, status, created_at, updated_at, completed_at)
        VALUES ('int_normal', 'client_test', 'Normal', 'completed', ?, ?, ?);
        
        -- Future date (edge case)
        INSERT INTO interventions (id, client_id, title, status, created_at, updated_at)
        VALUES ('int_future', 'client_test', 'Future', 'in_progress', ?, ?);
        
        -- Very old date (edge case)
        INSERT INTO interventions (id, client_id, title, status, created_at, updated_at, completed_at)
        VALUES ('int_old', 'client_test', 'Old', 'completed', ?, ?, ?);
    "#, params![
        now, now, now,
        future_time, future_time,
        past_time, past_time, past_time
    ]).unwrap();

    // Calculate KPIs to verify data integrity
    let result = service.calculate_all_kpis();
    assert!(result.is_ok(), "Should handle edge case dates gracefully");

    // Get summary to verify data integrity
    let summary = service.get_analytics_summary().unwrap();

    // Should include all interventions, regardless of date
    assert_eq!(
        summary.total_interventions, 3,
        "Should count all interventions including edge cases"
    );

    // Should only count completed today (none in this test)
    assert_eq!(
        summary.completed_today, 0,
        "Should not count future or past interventions as today's completions"
    );
}

#[tokio::test]
async fn test_analytics_concurrent_access() {
    let db = Arc::new(create_test_db().await);
    let service = Arc::new(AnalyticsService::new((*db).clone()));

    // Create sample data
    create_sample_data(&service.db);

    // Test concurrent access to analytics
    let mut handles = vec![];

    for i in 0..5 {
        let service_clone = Arc::clone(&service);
        let handle = tokio::spawn(async move {
            // Calculate all KPIs
            let result = service_clone.calculate_all_kpis();
            assert!(
                result.is_ok(),
                "Thread {} should calculate KPIs successfully",
                i
            );

            // Get summary
            let summary = service_clone.get_analytics_summary().unwrap();
            assert!(
                summary.total_interventions > 0,
                "Thread {} should get valid summary",
                i
            );
        });
        handles.push(handle);
    }

    // Wait for all threads to complete
    for handle in handles {
        handle.await.unwrap();
    }

    // Verify data integrity after concurrent access
    let final_summary = service.get_analytics_summary().unwrap();
    assert!(
        final_summary.total_interventions > 0,
        "Data should remain valid after concurrent access"
    );
}
