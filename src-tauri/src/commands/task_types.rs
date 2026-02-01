//! Task-related types for commands
//!
//! This module defines types used by task commands that aren't part of the main models.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
#[cfg(feature = "ts-rs")]
use ts_rs::TS;


/// Filter for task queries
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TaskFilter {
    pub assigned_to: Option<String>,
    pub client_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub region: Option<String>,
    pub include_completed: Option<bool>,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

impl Default for TaskFilter {
    fn default() -> Self {
        Self {
            assigned_to: None,
            client_id: None,
            status: None,
            priority: None,
            region: None,
            include_completed: Some(false),
            date_from: None,
            date_to: None,
        }
    }
}

/// Task statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStats {
    pub total_tasks: u64,
    pub completed_tasks: u64,
    pub pending_tasks: u64,
    pub in_progress_tasks: u64,
    pub cancelled_tasks: u64,
    pub overdue_tasks: u64,
    pub on_time_completed: u64,
    pub average_completion_time: Option<f64>,
}

/// Task query for CRUD operations
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TaskQuery {
    pub assigned_to: Option<String>,
    pub client_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub region: Option<String>,
    pub include_completed: Option<bool>,
}

impl Default for TaskQuery {
    fn default() -> Self {
        Self {
            assigned_to: None,
            client_id: None,
            status: None,
            priority: None,
            region: None,
            include_completed: Some(false),
        }
    }
}

/// Statistics response for task operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-rs", derive(TS))]
pub struct TaskStatistics {
    pub total: i64,
    pub completed: i64,
    pub pending: i64,
    pub in_progress: i64,
    pub overdue: i64,
}

/// Task with client information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskWithClient {
    pub task: crate::models::task::Task,
    pub client_name: String,
    pub client_id: String,
}