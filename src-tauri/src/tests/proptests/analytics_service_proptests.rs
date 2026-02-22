//! Property-based tests for Analytics Service
//!
//! Uses proptest to test analytics calculations with random inputs

use crate::db::Database;
use crate::domains::analytics::infrastructure::analytics::AnalyticsService;
use crate::domains::reports::domain::models::reports::*;
use chrono::{DateTime, Duration, Utc};
use proptest::prelude::*;
use rusqlite::params;
use uuid::Uuid;

// Helper to create a test database with analytics tables
async fn create_test_db() -> Database {
    let db = Database::new_in_memory().await.unwrap();

    // Create analytics tables
    db.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS analytics_kpis (
            id TEXT PRIMARY KEY NOT NULL,
            kpi_name TEXT NOT NULL UNIQUE,
            kpi_category TEXT NOT NULL,
            display_name TEXT NOT NULL,
            calculation_method TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );
        
        CREATE TABLE IF NOT EXISTS analytics_metrics (
            id TEXT PRIMARY KEY NOT NULL,
            metric_name TEXT NOT NULL,
            metric_category TEXT NOT NULL,
            value REAL NOT NULL,
            value_type TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            source TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );
        
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            completed_at INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS interventions (
            id TEXT PRIMARY KEY NOT NULL,
            status TEXT NOT NULL,
            visit_count INTEGER DEFAULT 1,
            started_at INTEGER,
            completed_at INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY NOT NULL,
            current_stock REAL NOT NULL DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS material_consumption (
            id TEXT PRIMARY KEY NOT NULL,
            material_id TEXT NOT NULL,
            quantity_used REAL NOT NULL DEFAULT 0,
            recorded_at INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS quality_checks (
            id TEXT PRIMARY KEY NOT NULL,
            passed INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id TEXT PRIMARY KEY NOT NULL,
            material_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            performed_at INTEGER NOT NULL
        );
    "#,
    )
    .unwrap();

    db
}

// Strategy for generating random dates within the last year
fn date_strategy() -> impl Strategy<Value = i64> {
    let now = Utc::now();
    let year_ago = now - Duration::days(365);

    (0u64..=365u64)
        .prop_map(move |days_ago| (now - Duration::days(days_ago as i64)).timestamp_millis())
}

// Strategy for generating random completion rates (0-100%)
fn completion_rate_strategy() -> impl Strategy<Value = f64> {
    prop::num::f64::POSITIVE.prop_map(|v| v % 100.0)
}

// Strategy for generating random time durations (0-24 hours)
fn duration_strategy() -> impl Strategy<Value = f64> {
    prop::num::f64::POSITIVE.prop_map(|v| v % 24.0)
}

// Strategy for generating random stock quantities (0-1000)
fn stock_quantity_strategy() -> impl Strategy<Value = f64> {
    prop::num::f64::POSITIVE.prop_map(|v| v % 1000.0)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn test_calculate_task_completion_rate_with_random_data(
        completed_count in 0u32..100u32,
        total_count in 0u32..100u32,
        created_date in date_strategy()
    ) {
        // Ensure total >= completed
        let total = total_count.max(completed_count);

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            // Create test KPI
            let kpi_id = Uuid::new_v4().to_string();
            service.db.execute(r#"
                INSERT INTO analytics_kpis (id, kpi_name, kpi_category, display_name, calculation_method, is_active)
                VALUES (?, 'task_completion_rate', 'operational', 'Task Completion Rate', 'COMPLETED_TASKS / TOTAL_TASKS * 100', 1)
            "#, params![kpi_id]).unwrap();

            // Insert tasks
            for i in 0..total {
                let status = if i < completed { "completed" } else { "pending" };
                let completed_at = if status == "completed" { Some(created_date) } else { None };

                service.db.execute(r#"
                    INSERT INTO tasks (id, title, status, created_at, completed_at)
                    VALUES (?, ?, ?, ?, ?)
                "#, params![
                    format!("task_{}", i),
                    format!("Task {}", i),
                    status,
                    created_date,
                    completed_at
                ]).unwrap();
            }

            // Calculate KPI
            let kpi = service.get_kpi(&kpi_id).unwrap().unwrap();
            let result = service.calculate_kpi(&kpi);

            prop_assert!(result.is_ok());

            // Get the calculated value
            let updated_kpi = service.get_kpi(&kpi_id).unwrap().unwrap();
            prop_assert!(updated_kpi.current_value.is_some());

            let calculated_rate = updated_kpi.current_value.unwrap();
            let expected_rate = if total > 0 {
                (completed as f64 / total as f64) * 100.0
            } else {
                0.0
            };

            prop_assert!((calculated_rate - expected_rate).abs() < 0.01,
                "Calculated rate {} should match expected {}",
                calculated_rate, expected_rate
            );
        });
    }

    #[test]
    fn test_calculate_avg_completion_time_with_random_durations(
        durations in prop::collection::vec(duration_strategy(), 1..20)
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            // Create test KPI
            let kpi_id = Uuid::new_v4().to_string();
            service.db.execute(r#"
                INSERT INTO analytics_kpis (id, kpi_name, kpi_category, display_name, calculation_method, is_active)
                VALUES (?, 'avg_completion_time', 'efficiency', 'Avg Completion Time', 'AVG(intervention_duration)', 1)
            "#, params![kpi_id]).unwrap();

            let now = Utc::now().timestamp_millis();

            // Insert interventions with random durations
            for (i, &duration) in durations.iter().enumerate() {
                let started_at = now - (duration * 3600000.0) as i64; // Convert hours to ms
                let completed_at = now;

                service.db.execute(r#"
                    INSERT INTO interventions (id, status, started_at, completed_at)
                    VALUES (?, 'completed', ?, ?)
                "#, params![
                    format!("int_{}", i),
                    started_at,
                    completed_at
                ]).unwrap();
            }

            // Calculate KPI
            let kpi = service.get_kpi(&kpi_id).unwrap().unwrap();
            let result = service.calculate_kpi(&kpi);

            prop_assert!(result.is_ok());

            // Get the calculated value
            let updated_kpi = service.get_kpi(&kpi_id).unwrap().unwrap();
            prop_assert!(updated_kpi.current_value.is_some());

            let calculated_avg = updated_kpi.current_value.unwrap();
            let expected_avg = if !durations.is_empty() {
                durations.iter().sum::<f64>() / durations.len() as f64
            } else {
                0.0
            };

            prop_assert!((calculated_avg - expected_avg).abs() < 0.01,
                "Calculated average {} should match expected {}",
                calculated_avg, expected_avg
            );
        });
    }

    #[test]
    fn test_calculate_first_time_fix_rate_with_random_visits(
        interventions in prop::collection::vec(1u32..=5u32, 1..20)
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            let now = Utc::now().timestamp_millis();

            // Insert interventions with random visit counts
            for (i, &visit_count) in interventions.iter().enumerate() {
                service.db.execute(r#"
                    INSERT INTO interventions (id, status, visit_count, completed_at)
                    VALUES (?, 'completed', ?, ?)
                "#, params![
                    format!("int_{}", i),
                    visit_count,
                    now
                ]).unwrap();
            }

            // Calculate first time fix rate
            let rate = service.calculate_first_time_fix_rate().unwrap();

            let single_visit_count = interventions.iter().filter(|&&v| v == 1).count();
            let total_count = interventions.len();
            let expected_rate = if total_count > 0 {
                (single_visit_count as f64 / total_count as f64) * 100.0
            } else {
                0.0
            };

            prop_assert!((rate - expected_rate).abs() < 0.01,
                "First time fix rate {} should match expected {}",
                rate, expected_rate
            );
        });
    }

    #[test]
    fn test_calculate_material_utilization_with_random_stock(
        stocks in prop::collection::vec(stock_quantity_strategy(), 1..10),
        consumptions in prop::collection::vec(stock_quantity_strategy(), 1..10)
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

            // Ensure we have matching number of materials and consumptions
            let material_count = stocks.len().min(consumptions.len());

            // Insert materials with random stock
            for (i, &stock) in stocks.iter().enumerate().take(material_count) {
                service.db.execute(r#"
                    INSERT INTO materials (id, current_stock)
                    VALUES (?, ?)
                "#, params![
                    format!("mat_{}", i),
                    stock
                ]).unwrap();
            }

            // Insert material consumption
            let mut total_consumed = 0.0;
            for (i, &consumption) in consumptions.iter().enumerate().take(material_count) {
                total_consumed += consumption;
                service.db.execute(r#"
                    INSERT INTO material_consumption (id, material_id, quantity_used, recorded_at)
                    VALUES (?, ?, ?, ?)
                "#, params![
                    format!("cons_{}", i),
                    format!("mat_{}", i),
                    consumption,
                    thirty_days_ago
                ]).unwrap();
            }

            // Calculate material utilization
            let utilization = service.calculate_material_utilization().unwrap();

            let total_stock: f64 = stocks.iter().take(material_count).sum();
            let expected_utilization = if total_stock > 0.0 {
                (total_consumed / total_stock) * 100.0
            } else {
                0.0
            };

            prop_assert!((utilization - expected_utilization).abs() < 0.01,
                "Material utilization {} should match expected {}",
                utilization, expected_utilization
            );
        });
    }

    #[test]
    fn test_calculate_quality_score_with_random_checks(
        passed_count in 0u32..20u32,
        failed_count in 0u32..20u32
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            let thirty_days_ago = (Utc::now() - Duration::days(30)).timestamp_millis();

            // Insert passed quality checks
            for i in 0..passed_count {
                service.db.execute(r#"
                    INSERT INTO quality_checks (id, passed, created_at)
                    VALUES (?, ?, ?)
                "#, params![
                    format!("qc_passed_{}", i),
                    1,
                    thirty_days_ago
                ]).unwrap();
            }

            // Insert failed quality checks
            for i in 0..failed_count {
                service.db.execute(r#"
                    INSERT INTO quality_checks (id, passed, created_at)
                    VALUES (?, ?, ?)
                "#, params![
                    format!("qc_failed_{}", i),
                    0,
                    thirty_days_ago
                ]).unwrap();
            }

            // Calculate quality score
            let score = service.calculate_quality_score().unwrap();

            let total_checks = passed_count + failed_count;
            let expected_score = if total_checks > 0 {
                (passed_count as f64 / total_checks as f64) * 100.0
            } else {
                100.0 // Default to 100% when no checks exist
            };

            prop_assert!((score - expected_score).abs() < 0.01,
                "Quality score {} should match expected {}",
                score, expected_score
            );
        });
    }

    #[test]
    fn test_calculate_inventory_turnover_with_random_transactions(
        initial_stocks in prop::collection::vec(stock_quantity_strategy(), 1..10),
        out_quantities in prop::collection::vec(stock_quantity_strategy(), 1..10)
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            let year_ago = (Utc::now() - Duration::days(365)).timestamp_millis();

            // Ensure we have matching number of materials and transactions
            let material_count = initial_stocks.len().min(out_quantities.len());

            // Insert materials with initial stock
            for (i, &stock) in initial_stocks.iter().enumerate().take(material_count) {
                service.db.execute(r#"
                    INSERT INTO materials (id, current_stock)
                    VALUES (?, ?)
                "#, params![
                    format!("mat_{}", i),
                    stock
                ]).unwrap();
            }

            // Insert stock out transactions
            let mut total_out = 0.0;
            for (i, &out_qty) in out_quantities.iter().enumerate().take(material_count) {
                total_out += out_qty;
                service.db.execute(r#"
                    INSERT INTO inventory_transactions (id, material_id, transaction_type, quantity, performed_at)
                    VALUES (?, ?, 'stock_out', ?, ?)
                "#, params![
                    format!("tx_{}", i),
                    format!("mat_{}", i),
                    out_qty,
                    year_ago
                ]).unwrap();
            }

            // Calculate inventory turnover
            let turnover = service.calculate_inventory_turnover().unwrap();

            let total_stock: f64 = initial_stocks.iter().take(material_count).sum();
            let expected_turnover = if total_stock > 0.0 {
                total_out / total_stock
            } else {
                0.0
            };

            prop_assert!((turnover - expected_turnover).abs() < 0.01,
                "Inventory turnover {} should match expected {}",
                turnover, expected_turnover
            );
        });
    }

    #[test]
    fn test_analytics_time_series_with_random_metrics(
        metric_values in prop::collection::vec(completion_rate_strategy(), 1..30)
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            let metric_name = "test_metric";

            // Insert metrics with random values and timestamps
            let now = Utc::now();
            for (i, &value) in metric_values.iter().enumerate() {
                let timestamp = (now - Duration::days(i as i64)).timestamp_millis();

                service.db.execute(r#"
                    INSERT INTO analytics_metrics (id, metric_name, metric_category, value, value_type, timestamp, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                "#, params![
                    format!("m_{}", i),
                    metric_name,
                    "test_category",
                    value,
                    "percentage",
                    timestamp,
                    "test_source"
                ]).unwrap();
            }

            // Get time series data
            let time_series = service.get_metric_time_series(metric_name, 30).unwrap();

            prop_assert_eq!(time_series.metric_name, metric_name);
            prop_assert_eq!(time_series.period, "day");
            prop_assert_eq!(time_series.aggregation, "avg");

            // Should have all metrics
            prop_assert_eq!(time_series.data_points.len(), metric_values.len());

            // Verify values match
            for (i, data_point) in time_series.data_points.iter().enumerate() {
                prop_assert!((data_point.value - metric_values[i]).abs() < 0.01,
                    "Data point value {} should match expected {}",
                    data_point.value, metric_values[i]
                );
            }

            // Verify chronological order
            for i in 1..time_series.data_points.len() {
                prop_assert!(
                    time_series.data_points[i-1].timestamp <= time_series.data_points[i].timestamp,
                    "Data points should be in chronological order"
                );
            }
        });
    }

    #[test]
    fn test_trend_direction_calculation_with_random_values(
        current in prop::num::f64::ANY,
        previous in prop::num::f64::ANY
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let db = create_test_db().await;
            let service = AnalyticsService::new(db);

            // Test trend calculation
            let trend = service.calculate_trend_direction(current, Some(previous));

            // Test trend direction logic
            let diff = current - previous;
            let threshold = (previous * 0.05).abs(); // 5% threshold

            let expected_trend = if diff > threshold {
                Some(TrendDirection::Up)
            } else if diff < -threshold {
                Some(TrendDirection::Down)
            } else {
                Some(TrendDirection::Stable)
            };

            prop_assert_eq!(trend, expected_trend,
                "Trend {:?} should match expected {:?} for current={}, previous={}",
                trend, expected_trend, current, previous
            );

            // Test with no previous value
            let no_prev_trend = service.calculate_trend_direction(current, None);
            prop_assert_eq!(no_prev_trend, Some(TrendDirection::Unknown));
        });
    }
}
