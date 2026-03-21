//! Repository for task form drafts (ADR-002: SQL stays in infrastructure).
//!
//! One row per user — stores the entire TaskFormData JSON blob so the form
//! can survive an accidental page reload or session restart.

use std::sync::Arc;

use rusqlite::params;

use crate::commands::AppError;
use crate::db::Database;

#[derive(Debug)]
pub struct TaskDraftRepository {
    db: Arc<Database>,
}

impl TaskDraftRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Persist (insert or replace) a draft for a user.
    pub fn save(&self, user_id: &str, form_data: &str) -> Result<(), AppError> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .execute(
                r#"
                INSERT INTO task_drafts (user_id, form_data, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE
                    SET form_data  = excluded.form_data,
                        updated_at = excluded.updated_at
                "#,
                params![user_id, form_data, now, now],
            )
            .map_err(|e| AppError::Database(format!("Save draft error: {e}")))?;
        Ok(())
    }

    /// Return the raw JSON blob for a user's draft, or `None` if absent.
    pub fn get(&self, user_id: &str) -> Result<Option<String>, AppError> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| AppError::Database(format!("Connection error: {e}")))?;

        let result = conn.query_row(
            "SELECT form_data FROM task_drafts WHERE user_id = ?",
            params![user_id],
            |row| row.get::<_, String>(0),
        );

        match result {
            Ok(data) => Ok(Some(data)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(format!("Get draft error: {e}"))),
        }
    }

    /// Delete the draft for a user (e.g. after successful task creation).
    pub fn delete(&self, user_id: &str) -> Result<(), AppError> {
        self.db
            .execute(
                "DELETE FROM task_drafts WHERE user_id = ?",
                params![user_id],
            )
            .map_err(|e| AppError::Database(format!("Delete draft error: {e}")))?;
        Ok(())
    }
}
