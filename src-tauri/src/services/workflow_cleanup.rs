//! Workflow Cleanup Service
//!
//! Extracted from InterventionWorkflowService to handle cleanup
//! of failed interventions and orphaned data.

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::logging::RPMARequestLogger;
use std::sync::Arc;

/// Service for cleaning up workflow artifacts and failed operations
#[derive(Debug)]
pub struct WorkflowCleanupService {
    db: Arc<Database>,
}

impl WorkflowCleanupService {
    /// Create a new WorkflowCleanupService
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Cleanup partial state on failed intervention start
    pub fn cleanup_failed_start(&self, task_id: &str, logger: &RPMARequestLogger) {
        let mut cleanup_context = std::collections::HashMap::new();
        cleanup_context.insert("task_id".to_string(), serde_json::json!(task_id));
        logger.warn(
            "Cleaning up failed intervention start",
            Some(cleanup_context),
        );

        // Reset task workflow state if it was partially set
        if let Err(e) = self.db.get_connection().and_then(|conn| {
            conn.execute(
                "UPDATE tasks SET workflow_id = NULL, current_workflow_step_id = NULL, status = 'draft', started_at = NULL WHERE id = ? AND workflow_id IS NOT NULL",
                rusqlite::params![task_id]
            ).map_err(|db_err| db_err.to_string())
        }) {
            let mut cleanup_error_context = std::collections::HashMap::new();
            cleanup_error_context.insert("task_id".to_string(), serde_json::json!(task_id));
            cleanup_error_context.insert("error".to_string(), serde_json::json!(e));
            logger.error("Failed to cleanup task workflow state", None, Some(cleanup_error_context));
        }

        // Delete any orphaned intervention and steps for this task
        if let Err(e) = self.db.get_connection().and_then(|conn| {
            // Delete steps first
            conn.execute(
                "DELETE FROM intervention_steps WHERE intervention_id IN (SELECT id FROM interventions WHERE task_id = ?)",
                rusqlite::params![task_id]
            ).map_err(|db_err| db_err.to_string())?;
            // Delete intervention
            conn.execute(
                "DELETE FROM interventions WHERE task_id = ?",
                rusqlite::params![task_id]
            ).map_err(|db_err| db_err.to_string())
        }) {
            let mut cleanup_error_context = std::collections::HashMap::new();
            cleanup_error_context.insert("task_id".to_string(), serde_json::json!(task_id));
            cleanup_error_context.insert("error".to_string(), serde_json::json!(e));
            logger.error("Failed to cleanup orphaned intervention", None, Some(cleanup_error_context));
        } else {
            let mut success_context = std::collections::HashMap::new();
            success_context.insert("task_id".to_string(), serde_json::json!(task_id));
            logger.info("Successfully cleaned up orphaned intervention", Some(success_context));
        }
    }

    /// Cleanup orphaned interventions (those without valid task references)
    pub fn cleanup_orphaned_interventions(&self) -> InterventionResult<u32> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        // Find orphaned interventions
        let orphaned_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM interventions i 
             LEFT JOIN tasks t ON i.task_id = t.id 
             WHERE t.id IS NULL OR t.deleted_at IS NOT NULL",
                [],
                |row| row.get(0),
            )
            .map_err(|e| {
                InterventionError::Database(format!(
                    "Failed to count orphaned interventions: {}",
                    e
                ))
            })?;

        if orphaned_count > 0 {
            // Delete orphaned steps first
            conn.execute(
                "DELETE FROM intervention_steps WHERE intervention_id IN (
                    SELECT i.id FROM interventions i 
                    LEFT JOIN tasks t ON i.task_id = t.id 
                    WHERE t.id IS NULL OR t.deleted_at IS NOT NULL
                )",
                [],
            )
            .map_err(|e| {
                InterventionError::Database(format!("Failed to delete orphaned steps: {}", e))
            })?;

            // Delete orphaned interventions
            conn.execute(
                "DELETE FROM interventions WHERE id IN (
                    SELECT i.id FROM interventions i 
                    LEFT JOIN tasks t ON i.task_id = t.id 
                    WHERE t.id IS NULL OR t.deleted_at IS NOT NULL
                )",
                [],
            )
            .map_err(|e| {
                InterventionError::Database(format!(
                    "Failed to delete orphaned interventions: {}",
                    e
                ))
            })?;
        }

        Ok(orphaned_count as u32)
    }

    /// Cleanup old completed interventions (archival)
    pub fn archive_old_interventions(&self, days_old: i32) -> InterventionResult<u32> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        let cutoff_timestamp =
            chrono::Utc::now().timestamp_millis() - (days_old as i64 * 24 * 60 * 60 * 1000);

        // Archive old interventions by marking them
        let archived_count = conn
            .execute(
                "UPDATE interventions 
             SET status = 'archived', updated_at = ?
             WHERE status = 'completed' 
             AND completed_at < ?
             AND status != 'archived'",
                rusqlite::params![chrono::Utc::now().timestamp_millis(), cutoff_timestamp],
            )
            .map_err(|e| {
                InterventionError::Database(format!("Failed to archive old interventions: {}", e))
            })?;

        Ok(archived_count as u32)
    }

    /// Get cleanup statistics
    pub fn get_cleanup_stats(&self) -> InterventionResult<CleanupStats> {
        let conn = self
            .db
            .get_connection()
            .map_err(|e| InterventionError::Database(format!("Failed to get connection: {}", e)))?;

        // Count various types of potentially orphaned data
        let orphaned_interventions: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM interventions i 
             LEFT JOIN tasks t ON i.task_id = t.id 
             WHERE t.id IS NULL OR t.deleted_at IS NOT NULL",
                [],
                |row| row.get(0),
            )
            .map_err(|e| {
                InterventionError::Database(format!(
                    "Failed to count orphaned interventions: {}",
                    e
                ))
            })?;

        let orphaned_steps: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM intervention_steps s 
             LEFT JOIN interventions i ON s.intervention_id = i.id 
             WHERE i.id IS NULL",
                [],
                |row| row.get(0),
            )
            .map_err(|e| {
                InterventionError::Database(format!("Failed to count orphaned steps: {}", e))
            })?;

        let archived_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM interventions WHERE status = 'archived'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| {
                InterventionError::Database(format!(
                    "Failed to count archived interventions: {}",
                    e
                ))
            })?;

        Ok(CleanupStats {
            orphaned_interventions: orphaned_interventions as u32,
            orphaned_steps: orphaned_steps as u32,
            archived_interventions: archived_count as u32,
        })
    }
}

/// Statistics from cleanup operations
#[derive(Debug, Clone)]
pub struct CleanupStats {
    pub orphaned_interventions: u32,
    pub orphaned_steps: u32,
    pub archived_interventions: u32,
}
