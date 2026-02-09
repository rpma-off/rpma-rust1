//! Test migration 027: Add Task Constraints
//!
//! This migration rebuilds the tasks table with new constraints.
//! It's critical to test because:
//! - Rebuilds entire tasks table (core business table)
//! - Adds CHECK constraints that could fail on existing data
//! - Foreign keys that might reference non-existent records

use super::*;
use crate::commands::errors::AppResult;
use rusqlite::params;

#[test]
fn test_027_task_constraints() -> AppResult<()> {
    let mut ctx = MigrationTestContext::new();
    ctx.database.migrate(27)?;

    // Create test data with various edge cases
    ctx.conn.execute_batch(
        r#"
        -- Create related tables
        CREATE TABLE clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            email TEXT UNIQUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('Admin', 'Technician', 'Supervisor')),
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Insert test data
        INSERT INTO clients (name, address, phone, email, created_at, updated_at)
        VALUES 
            ('Client 1', '123 St', '555-0001', 'c1@test.com', datetime('now'), datetime('now')),
            ('Client 2', '456 St', '555-0002', 'c2@test.com', datetime('now'), datetime('now'));
        
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES 
            ('tech1', 'tech1@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now')),
            ('tech2', 'tech2@test.com', 'hash', 'Technician', 0, datetime('now'), datetime('now'));
        
        -- Create old tasks table structure
        CREATE TABLE tasks_old (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            client_id INTEGER,
            priority TEXT,
            status TEXT,
            assigned_technician_id INTEGER,
            ppf_zone TEXT,
            estimated_duration_hours REAL,
            scheduled_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            task_number TEXT
        );
        
        -- Insert test tasks including some that violate new constraints
        INSERT INTO tasks_old (title, description, client_id, priority, status, assigned_technician_id, ppf_zone, estimated_duration_hours, scheduled_date, task_number)
        VALUES 
            ('Valid Task', 'Valid description', 1, 'Normal', 'Pending', 1, 'ZONE-001', 2.5, '2024-01-01', 'TASK-001'),
            ('Invalid Priority', 'Invalid', 2, 'Urgent', 'InProgress', 2, 'ZONE-002', 1.0, '2024-01-02', 'TASK-002'),
            ('Invalid Status', 'Invalid', 1, 'High', 'Cancelled', 1, 'ZONE-003', 0.5, '2024-01-03', 'TASK-003'),
            ('Missing Client', 'No client', NULL, 'Normal', 'Pending', 1, 'ZONE-004', 3.0, '2024-01-04', 'TASK-004'),
            ('Invalid Duration', 'Negative duration', 1, 'Normal', 'Pending', 1, 'ZONE-005', -1.0, '2024-01-05', 'TASK-005');
        "#
    )?;

    // Run migration 027
    ctx.migrate_to_version(27)?;

    // Verify the tasks table was rebuilt with new structure
    let mut stmt = ctx.conn.prepare("PRAGMA table_info(tasks)")?;
    let columns: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let column_names: Vec<String> = columns.iter().map(|(name, _)| name.clone()).collect();

    // Check for new constraints columns
    assert!(column_names.contains(&"requires_2fa_override".to_string()));
    assert!(column_names.contains(&"quality_check_required".to_string()));
    assert!(column_names.contains(&"requires_photos".to_string()));
    assert!(column_names.contains(&"min_photo_count".to_string()));
    assert!(column_names.contains(&"location_latitude".to_string()));
    assert!(column_names.contains(&"location_longitude".to_string()));
    assert!(column_names.contains(&"estimated_cost".to_string()));
    assert!(column_names.contains(&"actual_cost".to_string()));

    // Verify data migration - only valid records should be preserved
    let mut stmt = ctx.conn.prepare("SELECT COUNT(*) FROM tasks")?;
    let final_count: i32 = stmt.query_row([], |row| row.get(0))?;

    // Should have only the valid task (TASK-001)
    assert_eq!(final_count, 1, "Only valid tasks should be preserved");

    // Verify the valid task was migrated correctly
    let mut stmt = ctx.conn.prepare(
        "SELECT title, client_id, priority, status, assigned_technician_id, ppf_zone FROM tasks WHERE task_number = 'TASK-001'"
    )?;
    let (title, client_id, priority, status, tech_id, zone): (
        String,
        i32,
        String,
        String,
        Option<i32>,
        String,
    ) = stmt.query_row([], |row| {
        Ok((
            row.get(0)?,
            row.get(1)?,
            row.get(2)?,
            row.get(3)?,
            row.get(4)?,
            row.get(5)?,
        ))
    })?;

    assert_eq!(title, "Valid Task");
    assert_eq!(client_id, 1);
    assert_eq!(priority, "Normal");
    assert_eq!(status, "Pending");
    assert_eq!(tech_id, Some(1));
    assert_eq!(zone, "ZONE-001");

    // Test CHECK constraints
    // Invalid priority should fail
    let result = ctx.conn.execute(
        "INSERT INTO tasks (title, description, client_id, priority, status, ppf_zone, task_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        params!["Test", "Desc", 1, "Invalid", "Pending", "ZONE-999", "TASK-999"]
    );
    assert!(result.is_err(), "Invalid priority should be rejected");

    // Invalid status should fail
    let result = ctx.conn.execute(
        "INSERT INTO tasks (title, description, client_id, priority, status, ppf_zone, task_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        params!["Test", "Desc", 1, "Normal", "InvalidStatus", "ZONE-999", "TASK-998"]
    );
    assert!(result.is_err(), "Invalid status should be rejected");

    // Negative duration should fail
    let result = ctx.conn.execute(
        "INSERT INTO tasks (title, description, client_id, priority, status, estimated_duration_hours, ppf_zone, task_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        params!["Test", "Desc", 1, "Normal", "Pending", -1.0, "ZONE-999", "TASK-997"]
    );
    assert!(result.is_err(), "Negative duration should be rejected");

    // Foreign key constraints should work
    // Non-existent client should fail
    let result = ctx.conn.execute(
        "INSERT INTO tasks (title, description, client_id, priority, status, ppf_zone, task_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        params!["Test", "Desc", 999, "Normal", "Pending", "ZONE-999", "TASK-996"]
    );
    assert!(result.is_err(), "Non-existent client should be rejected");

    // Non-existent technician should fail
    let result = ctx.conn.execute(
        "INSERT INTO tasks (title, description, client_id, priority, status, assigned_technician_id, ppf_zone, task_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        params!["Test", "Desc", 1, "Normal", "Pending", Some(999), "ZONE-999", "TASK-995"]
    );
    assert!(
        result.is_err(),
        "Non-existent technician should be rejected"
    );
}

#[test]
fn test_027_task_constraints_business_logic() -> Result<(), Box<dyn std::error::Error>> {
    let ctx = MigrationTestContext::new()?;

    // Run migration first
    ctx.migrate_to_version(27)?;

    // Insert test client and technician
    ctx.conn.execute_batch(
        r#"
        INSERT INTO clients (name, address, phone, email, created_at, updated_at)
        VALUES ('Test Client', '123 St', '555-0001', 'c@test.com', datetime('now'), datetime('now'));
        
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ('tech1', 't@test.com', 'hash', 'Technician', 1, datetime('now'), datetime('now'));
        "#
    )?;

    // Test task creation with all new fields
    ctx.conn.execute(
        "INSERT INTO tasks (title, description, client_id, priority, status, assigned_technician_id, ppf_zone, estimated_duration_hours, requires_2fa_override, quality_check_required, requires_photos, min_photo_count, location_latitude, location_longitude, estimated_cost, task_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        params![
            "Complex Task",
            "A complex task with all fields",
            1,
            "High",
            "Pending",
            Some(1),
            "ZONE-001",
            4.5,
            true,
            true,
            true,
            3,
            48.8566,
            2.3522,
            150.0,
            "TASK-COMPLEX-001"
        ],
    )?;

    // Verify all fields were saved correctly
    let mut stmt = ctx.conn.prepare(
        "SELECT requires_2fa_override, quality_check_required, requires_photos, min_photo_count, 
                location_latitude, location_longitude, estimated_cost 
         FROM tasks WHERE task_number = 'TASK-COMPLEX-001'",
    )?;
    let (requires_2fa, quality_check, requires_photos, min_photos, lat, lng, cost): (
        bool,
        bool,
        bool,
        i32,
        f64,
        f64,
        f64,
    ) = stmt.query_row([], |row| {
        Ok((
            row.get(0)?,
            row.get(1)?,
            row.get(2)?,
            row.get(3)?,
            row.get(4)?,
            row.get(5)?,
            row.get(6)?,
        ))
    })?;

    assert!(requires_2fa);
    assert!(quality_check);
    assert!(requires_photos);
    assert_eq!(min_photos, 3);
    assert!((lat - 48.8566).abs() < 0.0001);
    assert!((lng - 2.3522).abs() < 0.0001);
    assert!((cost - 150.0).abs() < 0.01);

    // Test the default values for new fields
    ctx.conn.execute(
        "INSERT INTO tasks (title, description, client_id, priority, status, ppf_zone, task_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        params![
            "Simple Task",
            "A simple task",
            1,
            "Normal",
            "Pending",
            "ZONE-002",
            "TASK-SIMPLE-001"
        ],
    )?;

    let mut stmt = ctx.conn.prepare(
        "SELECT requires_2fa_override, quality_check_required, requires_photos, min_photo_count 
         FROM tasks WHERE task_number = 'TASK-SIMPLE-001'",
    )?;
    let (requires_2fa, quality_check, requires_photos, min_photos): (bool, bool, bool, i32) = stmt
        .query_row([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;

    assert!(!requires_2fa, "2FA override should default to false");
    assert!(!quality_check, "Quality check should default to false");
    assert!(!requires_photos, "Photos should default to false");
    assert_eq!(min_photos, 0, "Min photo count should default to 0");

    Ok(())
}
