//! Client statistics service — analytics and overview stats.

use super::{IClientRepository, repository::ClientRepository};
use crate::db::Database;
use crate::shared::repositories::cache::Cache;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

// ── Statistics structs ────────────────────────────────────────────────────────

/// Overall client statistics (from analytics service)
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientOverviewStats {
    pub total_clients: i32,
    pub active_clients: i32,
    pub inactive_clients: i32,
    pub new_clients_this_month: i32,
    pub clients_by_type: HashMap<String, i32>,
}

/// Activity metrics for a specific client
#[derive(Debug, Serialize, Deserialize)]
pub struct ClientActivityMetrics {
    pub client_id: String,
    pub total_tasks: i32,
    pub completed_tasks: i32,
    pub active_tasks: i32,
    pub completion_rate: f64,
    pub average_task_duration: Option<f64>,
    pub last_activity_date: Option<i64>,
    pub total_revenue: Option<f64>,
}

// ── ClientStatisticsService ───────────────────────────────────────────────────

/// Service for client analytics
#[derive(Debug)]
pub struct ClientStatisticsService {
    client_repo: Arc<dyn IClientRepository>,
}

impl ClientStatisticsService {
    pub fn new(client_repo: Arc<dyn IClientRepository>) -> Self {
        Self { client_repo }
    }

    pub fn new_with_db(db: Arc<Database>) -> Self {
        let cache = Arc::new(Cache::new(256));
        let repo = Arc::new(ClientRepository::new(db, cache));
        Self { client_repo: repo }
    }

    pub fn get_client_stats(&self) -> Result<ClientOverviewStats, String> {
        futures::executor::block_on(IClientRepository::get_overview_stats(self.client_repo.as_ref()))
            .map_err(|e| format!("Failed to get client stats: {}", e))
    }

    pub fn get_client_activity_metrics(
        &self,
        _client_id: &str,
    ) -> Result<ClientActivityMetrics, String> {
        Err("Not implemented - move to repository".to_string())
    }
}
