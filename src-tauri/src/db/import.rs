//! Import module for migrating data from Supabase JSON exports to SQLite

use super::Database;
use crate::db::DbResult;
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::fs;
use std::path::Path;

impl Database {
    /// Import all data from JSON exports directory
    pub fn import_from_json<P: AsRef<Path>>(&self, exports_dir: P) -> DbResult<ImportStats> {
        // Import in correct order (respecting foreign keys)
        let stats = ImportStats {
            users: self.import_users(exports_dir.as_ref().join("users.json"))?,
            clients: self.import_clients(exports_dir.as_ref().join("clients.json"))?,
            interventions: self.import_interventions(
                exports_dir.as_ref().join("tasks.json"),
                exports_dir.as_ref().join("ppf_intervention_data.json"),
            )?,
            steps: self.import_steps(exports_dir.as_ref().join("ppf_intervention_steps.json"))?,
            photos: self.import_photos(exports_dir.as_ref().join("task_photos.json"))?,
        };

        Ok(stats)
    }

    fn import_users<P: AsRef<Path>>(&self, path: P) -> DbResult<usize> {
        let json_str = fs::read_to_string(path).map_err(|e| e.to_string())?;

        let users: Vec<Value> = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

        let conn = self.get_connection()?;
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        let mut count = 0;

        for user in users {
            tx.execute(
                "INSERT OR REPLACE INTO users (
                    id, email, password_hash, full_name, role, phone,
                    is_active, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    user["id"].as_str(),
                    user["email"].as_str(),
                    user["password_hash"].as_str().unwrap_or(""),
                    user["full_name"].as_str(),
                    user["role"].as_str(),
                    user["phone"].as_str(),
                    user["is_active"].as_bool().unwrap_or(true) as i32,
                    user["created_at"].as_str(),
                    user["updated_at"].as_str()
                ],
            )
            .map_err(|e| e.to_string())?;
            count += 1;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    }

    fn import_clients<P: AsRef<Path>>(&self, path: P) -> DbResult<usize> {
        let json_str = fs::read_to_string(path).map_err(|e| e.to_string())?;

        let clients: Vec<Value> = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

        let conn = self.get_connection()?;
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        let mut count = 0;

        for client in clients {
            tx.execute(
                "INSERT OR REPLACE INTO clients (
                    id, name, email, phone, address, city, postal_code,
                    country, company_name, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                rusqlite::params![
                    client["id"].as_str(),
                    client["name"].as_str(),
                    client["email"].as_str(),
                    client["phone"].as_str(),
                    client["address"].as_str(),
                    client["city"].as_str(),
                    client["postal_code"].as_str(),
                    client["country"].as_str().unwrap_or("France"),
                    client["company_name"].as_str(),
                    {
                        let s = client["created_at"].as_str().unwrap_or("");
                        DateTime::parse_from_rfc3339(s)
                            .map(|dt| dt.timestamp_millis())
                            .unwrap_or_else(|_| Utc::now().timestamp_millis())
                    },
                    {
                        let s = client["updated_at"].as_str().unwrap_or("");
                        DateTime::parse_from_rfc3339(s)
                            .map(|dt| dt.timestamp_millis())
                            .unwrap_or_else(|_| Utc::now().timestamp_millis())
                    },
                ],
            )
            .map_err(|e| e.to_string())?;
            count += 1;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    }

    fn import_interventions<P: AsRef<Path>>(
        &self,
        tasks_path: P,
        ppf_data_path: P,
    ) -> DbResult<usize> {
        // Read both JSON files
        let tasks_json = fs::read_to_string(tasks_path).map_err(|e| e.to_string())?;
        let ppf_json = fs::read_to_string(ppf_data_path).map_err(|e| e.to_string())?;

        let tasks: Vec<Value> = serde_json::from_str(&tasks_json).map_err(|e| e.to_string())?;
        let ppf_data: Vec<Value> = serde_json::from_str(&ppf_json).map_err(|e| e.to_string())?;

        // Create lookup map for PPF data
        let ppf_map: std::collections::HashMap<String, &Value> = ppf_data
            .iter()
            .filter_map(|ppf| ppf["task_id"].as_str().map(|id| (id.to_string(), ppf)))
            .collect();

        let conn = self.get_connection()?;
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        let mut count = 0;

        for task in tasks {
            let task_id = task["id"].as_str().expect("Task ID should be a string");
            let ppf = ppf_map.get(task_id);

            tx.execute(
                "INSERT OR REPLACE INTO interventions (
                    id, task_id, status, vehicle_plate, vehicle_model,
                    vehicle_make, vehicle_year, client_id, technician_id,
                    current_step, scheduled_at, started_at, completed_at,
                    created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
                rusqlite::params![
                    task_id,
                    task_id, // task_id is the same as intervention id in this import
                    task["status"].as_str(),
                    task["vehicle_plate"].as_str(),
                    task["vehicle_model"].as_str(),
                    task["vehicle_make"].as_str(),
                    task["vehicle_year"].as_i64(),
                    task["client_id"].as_str(),
                    task["assigned_to"].as_str(),
                    ppf.and_then(|p| p["current_step"].as_i64()).unwrap_or(0),
                    task["scheduled_at"].as_str(),
                    task["started_at"].as_str(),
                    task["completed_at"].as_str(),
                    task["created_at"].as_str(),
                    task["updated_at"].as_str(),
                ],
            )
            .map_err(|e| e.to_string())?;
            count += 1;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    }

    fn import_steps<P: AsRef<Path>>(&self, path: P) -> DbResult<usize> {
        let json_str = fs::read_to_string(path).map_err(|e| e.to_string())?;

        let steps: Vec<Value> = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

        let conn = self.get_connection()?;
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        let mut count = 0;

        for step in steps {
            tx.execute(
                "INSERT OR REPLACE INTO intervention_steps (
                    id, intervention_id, step_number, step_name, step_type,
                    step_status, started_at, completed_at, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                rusqlite::params![
                    step["id"].as_str(),
                    step["intervention_id"].as_str(),
                    step["step_number"].as_i64(),
                    step["step_name"].as_str(),
                    step["step_type"].as_str(),
                    step["step_status"].as_str(),
                    step["started_at"].as_str(),
                    step["completed_at"].as_str(),
                    step["created_at"].as_str(),
                    step["updated_at"].as_str(),
                ],
            )
            .map_err(|e| e.to_string())?;
            count += 1;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    }

    fn import_photos<P: AsRef<Path>>(&self, path: P) -> DbResult<usize> {
        let json_str = fs::read_to_string(path).map_err(|e| e.to_string())?;

        let photos: Vec<Value> = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

        let conn = self.get_connection()?;
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        let mut count = 0;

        for photo in photos {
            tx.execute(
                "INSERT OR REPLACE INTO photos (
                    id, intervention_id, step_id, file_path, file_name,
                    photo_type, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![
                    photo["id"].as_str(),
                    photo["task_id"].as_str(),
                    photo["step_id"].as_str(),
                    photo["file_path"].as_str(),
                    photo["file_name"].as_str(),
                    photo["photo_type"].as_str(),
                    photo["created_at"].as_str(),
                    photo["updated_at"].as_str(),
                ],
            )
            .map_err(|e| e.to_string())?;
            count += 1;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    }
}

#[derive(Default, Debug)]
pub struct ImportStats {
    pub users: usize,
    pub clients: usize,
    pub interventions: usize,
    pub steps: usize,
    pub photos: usize,
}

impl ImportStats {
    pub fn total(&self) -> usize {
        self.users + self.clients + self.interventions + self.steps + self.photos
    }
}
