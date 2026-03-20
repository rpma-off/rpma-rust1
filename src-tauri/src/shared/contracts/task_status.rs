//! Shared `TaskStatus` enum — cross-domain contract (ADR-003).
//!
//! `TaskStatus` is used by interventions, clients, and tasks domains.
//! Rather than having those domains import from `tasks::domain::models`,
//! the canonical definition lives here in `shared/contracts` so that every
//! consumer depends only on the shared boundary.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Task lifecycle status.
///
/// This enum is shared across domain boundaries (tasks, interventions,
/// clients) and must be kept in sync with the `tasks.status` column values.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, TS)]
#[ts(export)]
pub enum TaskStatus {
    #[serde(rename = "draft")]
    #[default]
    Draft,
    #[serde(rename = "scheduled")]
    Scheduled,
    #[serde(rename = "in_progress")]
    InProgress,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "on_hold")]
    OnHold,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "invalid")]
    Invalid,
    #[serde(rename = "archived")]
    Archived,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "overdue")]
    Overdue,
    #[serde(rename = "assigned")]
    Assigned,
    #[serde(rename = "paused")]
    Paused,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Draft => "draft",
            Self::Scheduled => "scheduled",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
            Self::OnHold => "on_hold",
            Self::Pending => "pending",
            Self::Invalid => "invalid",
            Self::Archived => "archived",
            Self::Failed => "failed",
            Self::Overdue => "overdue",
            Self::Assigned => "assigned",
            Self::Paused => "paused",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for TaskStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "draft" => Ok(Self::Draft),
            "scheduled" => Ok(Self::Scheduled),
            "in_progress" => Ok(Self::InProgress),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            "on_hold" => Ok(Self::OnHold),
            "pending" => Ok(Self::Pending),
            "invalid" => Ok(Self::Invalid),
            "archived" => Ok(Self::Archived),
            "failed" => Ok(Self::Failed),
            "overdue" => Ok(Self::Overdue),
            "assigned" => Ok(Self::Assigned),
            "paused" => Ok(Self::Paused),
            _ => Err(format!("Unknown task status: {}", s)),
        }
    }
}

impl TaskStatus {
    /// Parse a status string, returning `None` for unknown values.
    pub fn from_str_opt(s: &str) -> Option<Self> {
        s.parse().ok()
    }
}
