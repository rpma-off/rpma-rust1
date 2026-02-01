use rusqlite::{Connection, Result};
use std::collections::HashMap;

fn main() -> Result<()> {
    // Try to find the database path - check common locations
    let possible_paths = vec![
        "rpma.db",
        "../rpma.db",
        "./rpma.db",
        "C:\\Users\\emaMA\\AppData\\Roaming\\com.rpma.ppf-intervention\\rpma.db",
    ];

    let mut conn: Option<Connection> = None;
    let mut db_path = String::new();

    for path in possible_paths {
        if let Ok(connection) = Connection::open(path) {
            // Test if this is actually our database by checking for clients table
            if connection
                .execute("SELECT 1 FROM clients LIMIT 1", [])
                .is_ok()
            {
                conn = Some(connection);
                db_path = path.to_string();
                break;
            }
        }
    }

    let conn = match conn {
        Some(c) => c,
        None => {
            eprintln!("Could not find database file. Please ensure the application has been run at least once to create the database.");
            std::process::exit(1);
        }
    };

    println!("Found database at: {}", db_path);
    println!("Starting client statistics backfill...");

    // First, reset all client statistics to 0
    println!("Resetting client statistics to 0...");
    conn.execute("UPDATE clients SET total_tasks = 0, active_tasks = 0, completed_tasks = 0, last_task_date = NULL", [])?;

    // Get all tasks grouped by client_id
    println!("Calculating statistics from existing tasks...");
    let mut stmt = conn.prepare(
        "SELECT client_id, status, created_at, updated_at
         FROM tasks
         WHERE client_id IS NOT NULL AND deleted_at IS NULL
         ORDER BY client_id",
    )?;

    let task_iter = stmt.query_map([], |row| {
        let client_id: String = row.get(0)?;
        let status: String = row.get(1)?;
        let created_at: i64 = row.get(2)?;
        let updated_at: i64 = row.get(3)?;
        Ok((client_id, status, created_at, updated_at))
    })?;

    let mut client_stats: HashMap<String, (i32, i32, i32, i64)> = HashMap::new(); // (total, active, completed, last_date)

    for task_result in task_iter {
        let (client_id, status, created_at, updated_at) = task_result?;

        let entry = client_stats.entry(client_id).or_insert((0, 0, 0, 0));
        entry.0 += 1; // total_tasks

        // Check if task is active
        let is_active = !matches!(
            status.as_str(),
            "completed" | "cancelled" | "archived" | "failed" | "invalid"
        );
        if is_active {
            entry.1 += 1; // active_tasks
        }

        // Check if task is completed
        if status == "completed" {
            entry.2 += 1; // completed_tasks
        }

        // Update last_task_date (use the most recent update or create time)
        let task_date = updated_at.max(created_at);
        entry.3 = entry.3.max(task_date);
    }

    // Update client statistics
    println!(
        "Updating {} clients with calculated statistics...",
        client_stats.len()
    );
    let mut update_stmt = conn.prepare(
        "UPDATE clients
         SET total_tasks = ?, active_tasks = ?, completed_tasks = ?, last_task_date = ?
         WHERE id = ?",
    )?;

    for (client_id, (total, active, completed, last_date)) in client_stats {
        update_stmt.execute((total, active, completed, last_date, client_id))?;
    }

    println!("Backfill completed successfully!");

    // Verify the results
    let total_clients: i64 = conn.query_row(
        "SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL",
        [],
        |row| row.get(0),
    )?;
    let clients_with_tasks: i64 = conn.query_row(
        "SELECT COUNT(*) FROM clients WHERE total_tasks > 0 AND deleted_at IS NULL",
        [],
        |row| row.get(0),
    )?;

    println!("Summary:");
    println!("- Total clients: {}", total_clients);
    println!("- Clients with tasks: {}", clients_with_tasks);

    // Show a few examples
    println!("\nSample client statistics:");
    let mut sample_stmt = conn.prepare(
        "SELECT id, name, total_tasks, active_tasks, completed_tasks
         FROM clients
         WHERE total_tasks > 0 AND deleted_at IS NULL
         ORDER BY total_tasks DESC
         LIMIT 5",
    )?;

    let sample_iter = sample_stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let total: i32 = row.get(2)?;
        let active: i32 = row.get(3)?;
        let completed: i32 = row.get(4)?;
        Ok((id, name, total, active, completed))
    })?;

    for (id, name, total, active, completed) in sample_iter.flatten() {
        println!(
            "- {} ({}): {} total, {} active, {} completed",
            name, id, total, active, completed
        );
    }

    Ok(())
}
