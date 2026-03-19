//! Cross-domain facade for the `clients` domain (ADR-002, ADR-003).
//!
//! Keep this surface minimal — only expose what other domains truly need.
//! Prefer `shared/contracts/` for type-only sharing.

use crate::domains::clients::application::client_service::{ClientStat, ClientService};
use crate::domains::clients::client_handler::{Client, ClientQuery};
use crate::shared::services::cross_domain::SortOrder;
use std::sync::Arc;

/// Maximum number of clients returned by `get_active_clients_for_selector`.
/// Selectors are not expected to show more than this many options.
const MAX_SELECTOR_CLIENTS: i32 = 500;

/// Cross-domain facade for the Clients bounded context.
///
/// Only exposes the minimal surface needed by other domains.
/// IPC handlers use the full `ClientService` via `AppState.client_service` directly.
pub struct ClientsFacade {
    service: Arc<ClientService>,
}

impl ClientsFacade {
    pub fn new(service: Arc<ClientService>) -> Self {
        Self { service }
    }

    /// Return a summary (id, name, total_tasks) for a single client.
    pub async fn get_client_summary(&self, id: &str) -> Result<ClientStat, String> {
        self.service.get_client_task_summary(id).await
    }

    /// Return all active (non-deleted) clients suitable for selector/dropdown components.
    pub async fn get_active_clients_for_selector(&self) -> Result<Vec<Client>, String> {
        let query = ClientQuery {
            page: Some(1),
            limit: Some(MAX_SELECTOR_CLIENTS),
            search: None,
            customer_type: None,
            sort_by: Some("name".to_string()),
            sort_order: Some(SortOrder::Asc),
        };
        self.service.get_clients(query).await.map(|r| r.data)
    }
}
