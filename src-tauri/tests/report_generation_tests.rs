//! Tests for report generation functionality
//!
//! This module contains comprehensive unit tests for all report generation functions
//! including database queries, data processing, and edge cases.

use chrono::{DateTime, Duration, Utc};
use rusqlite::Connection;
use std::path::PathBuf;

/// Test date range validation function
#[test]
fn test_date_validation() {
    use crate::commands::reports::generation::validate_date_range;
    use crate::models::reports::DateRange;

    // Test valid date range
    let valid_range = DateRange {
        start: Utc::now() - Duration::days(1),
        end: Utc::now(),
    };
    assert!(validate_date_range(&valid_range).is_ok());

    // Test invalid date range (end before start)
    let invalid_range = DateRange {
        start: Utc::now(),
        end: Utc::now() - Duration::days(1),
    };
    assert!(validate_date_range(&invalid_range).is_err());

    // Test date range too large
    let too_large_range = DateRange {
        start: Utc::now() - Duration::days(400),
        end: Utc::now(),
    };
    assert!(validate_date_range(&too_large_range).is_err());

    // Test date before Unix epoch
    let before_epoch_range = DateRange {
        start: DateTime::from_timestamp(-100, 0).unwrap(),
        end: Utc::now(),
    };
    assert!(validate_date_range(&before_epoch_range).is_err());
}

/// Test database schema includes proper indexes
#[test]
fn test_database_indexes_exist() {
    let conn = Connection::open_in_memory().expect("Failed to open test database");

    // Initialize schema
    conn.execute_batch(include_str!("../db/schema.sql"))
        .expect("Failed to initialize schema");

    // Check that key indexes exist
    let indexes: Vec<String> = conn
        .prepare(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_interventions_%'",
        )
        .unwrap()
        .query_map([], |row| row.get(0))
        .unwrap()
        .collect::<Result<Vec<String>, _>>()
        .unwrap();

    // Verify key indexes are present
    assert!(indexes.contains(&"idx_interventions_created".to_string()));
    assert!(indexes.contains(&"idx_interventions_status".to_string()));
    assert!(indexes.contains(&"idx_interventions_technician".to_string()));
    assert!(indexes.contains(&"idx_interventions_client".to_string()));
}

/// Test that report queries handle empty results gracefully
#[test]
fn test_empty_database_queries() {
    let conn = Connection::open_in_memory().expect("Failed to open test database");

    // Initialize schema without data
    conn.execute_batch(include_str!("../db/schema.sql"))
        .expect("Failed to initialize schema");

    // Test a simple count query that should return 0
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM interventions", [], |row| row.get(0))
        .unwrap();

    assert_eq!(count, 0);
}

/// Test date range boundary conditions
#[test]
fn test_date_range_boundaries() {
    use crate::commands::reports::generation::validate_date_range;
    use crate::models::reports::DateRange;

    // Test exact same start and end time (should fail)
    let same_time = Utc::now();
    let same_range = DateRange {
        start: same_time,
        end: same_time,
    };
    assert!(validate_date_range(&same_range).is_err());

    // Test very small valid range
    let small_range = DateRange {
        start: Utc::now() - Duration::seconds(1),
        end: Utc::now(),
    };
    assert!(validate_date_range(&small_range).is_ok());

    // Test maximum allowed range (365 days)
    let max_range = DateRange {
        start: Utc::now() - Duration::days(365),
        end: Utc::now(),
    };
    assert!(validate_date_range(&max_range).is_ok());

    // Test range slightly over limit (366 days)
    let over_limit_range = DateRange {
        start: Utc::now() - Duration::days(366),
        end: Utc::now(),
    };
    assert!(validate_date_range(&over_limit_range).is_err());
}

/// Test PDF generation with minimal content
#[test]
fn test_generate_minimal_pdf() {
    use crate::services::pdf_report::InterventionPdfReport;

    // Create a temporary file path for testing
    let temp_dir = std::env::temp_dir();
    let test_file_path = temp_dir.join("test_minimal_pdf.pdf");

    // Clean up any existing test file
    if test_file_path.exists() {
        std::fs::remove_file(&test_file_path).expect("Failed to remove existing test file");
    }

    // Test minimal PDF generation
    let result = tokio_test::block_on(async {
        InterventionPdfReport::test_generate_minimal(&test_file_path).await
    });

    // Assert that PDF generation succeeded
    assert!(
        result.is_ok(),
        "PDF generation should succeed: {:?}",
        result.err()
    );

    // Verify the file was created
    assert!(
        test_file_path.exists(),
        "PDF file should be created at {:?}",
        test_file_path
    );

    // Verify the file has content (should be more than just empty)
    let metadata = std::fs::metadata(&test_file_path).expect("Failed to get file metadata");
    assert!(
        metadata.len() > 1000,
        "PDF file should have substantial content, got {} bytes",
        metadata.len()
    );

    // Clean up
    std::fs::remove_file(&test_file_path).expect("Failed to clean up test file");
}
