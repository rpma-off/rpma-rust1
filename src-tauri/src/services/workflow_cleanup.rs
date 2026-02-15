//! Workflow Cleanup Service
//!
//! Extracted from InterventionWorkflowService to handle cleanup
//! of failed interventions and orphaned data.
//! Delegates all database operations to InterventionRepository.

use crate::db::{InterventionError, InterventionResult};
use crate::logging::RPMARequestLogger;
use crate::repositories::intervention_repository::InterventionRepository;
use std::sync::Arc;

/// Service for cleaning up workflow artifacts and failed operations
#[derive(Debug)]
pub struct WorkflowCleanupService {
    repo: InterventionRepository,
}

impl WorkflowCleanupService {
    /// Create a new WorkflowCleanupService
    pub fn new(db: Arc<crate::db::Database>) -> Self {
        Self {
            repo: InterventionRepository::new(db),
        }
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
        if let Err(e) = self.repo.reset_task_workflow_state(task_id) {
            let mut cleanup_error_context = std::collections::HashMap::new();
            cleanup_error_context.insert("task_id".to_string(), serde_json::json!(task_id));
            cleanup_error_context.insert("error".to_string(), serde_json::json!(e));
            logger.error(
                "Failed to cleanup task workflow state",
                None,
                Some(cleanup_error_context),
            );
        }

        // Delete any orphaned intervention and steps for this task
        if let Err(e) = self.repo.delete_orphaned_for_task(task_id) {
            let mut cleanup_error_context = std::collections::HashMap::new();
            cleanup_error_context.insert("task_id".to_string(), serde_json::json!(task_id));
            cleanup_error_context.insert("error".to_string(), serde_json::json!(e));
            logger.error(
                "Failed to cleanup orphaned intervention",
                None,
                Some(cleanup_error_context),
            );
        } else {
            let mut success_context = std::collections::HashMap::new();
            success_context.insert("task_id".to_string(), serde_json::json!(task_id));
            logger.info(
                "Successfully cleaned up orphaned intervention",
                Some(success_context),
            );
        }
    }

    /// Cleanup orphaned interventions (those without valid task references)
    pub fn cleanup_orphaned_interventions(&self) -> InterventionResult<u32> {
        self.repo.delete_orphaned()
    }

    /// Cleanup old completed interventions (archival)
    pub fn archive_old_interventions(&self, days_old: i32) -> InterventionResult<u32> {
        self.repo.archive_old(days_old)
    }

    /// Get cleanup statistics
    pub fn get_cleanup_stats(&self) -> InterventionResult<CleanupStats> {
        let orphaned_interventions = self.repo.count_orphaned()? as u32;
        let orphaned_steps = self.repo.count_orphaned_steps()? as u32;
        let archived_interventions = self.repo.count_archived()? as u32;

        Ok(CleanupStats {
            orphaned_interventions,
            orphaned_steps,
            archived_interventions,
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
