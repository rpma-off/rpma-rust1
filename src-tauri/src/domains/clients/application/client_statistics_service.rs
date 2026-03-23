//! Client statistics service — analytics and overview stats.

use crate::domains::clients::domain::models::{ClientActivityMetrics, ClientOverviewStats};
use crate::domains::clients::domain::repositories::IClientRepository;
use crate::domains::clients::infrastructure::client_repository::SqliteClientRepository;
use crate::db::Database;
use crate::shared::repositories::cache::Cache;
use std::sync::Arc;

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
        let repo = Arc::new(SqliteClientRepository::new(db, cache));
        Self { client_repo: repo }
    }

    pub fn get_client_stats(&self) -> Result<ClientOverviewStats, String> {
        futures::executor::block_on(IClientRepository::get_overview_stats(
            self.client_repo.as_ref(),
        ))
        .map_err(|e| format!("Failed to get client stats: {}", e))
    }

    pub fn get_client_activity_metrics(
        &self,
        _client_id: &str,
    ) -> Result<ClientActivityMetrics, String> {
        Err("Not implemented - move to repository".to_string())
    }
}
