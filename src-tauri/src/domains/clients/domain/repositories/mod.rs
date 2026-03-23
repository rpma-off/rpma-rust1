//! Client repository traits — domain contracts for data access (ADR-005).

use crate::domains::clients::domain::models::{Client, ClientOverviewStats, ClientRepoQuery};
use crate::shared::repositories::base::RepoResult;
use async_trait::async_trait;

/// Domain contract for all client data-access operations.
///
/// Concrete implementations live in the infrastructure layer
/// (`crate::domains::clients::infrastructure::client_repository::SqliteClientRepository`).
#[async_trait]
pub trait ClientRepository: Send + Sync + std::fmt::Debug {
    /// Look up a single client by its primary-key `id`.
    async fn find_by_id(&self, id: &str) -> RepoResult<Option<Client>>;
    /// Return every non-deleted client.
    async fn find_all(&self) -> RepoResult<Vec<Client>>;
    /// Insert or update a client record.
    async fn save(&self, entity: Client) -> RepoResult<Client>;
    /// Soft-delete a client by `id`. Returns `true` if a row was affected.
    async fn delete_by_id(&self, id: &str) -> RepoResult<bool>;
    /// Return `true` if a non-deleted client with `id` exists.
    async fn exists_by_id(&self, id: &str) -> RepoResult<bool>;
    /// Find a client whose `email` column matches exactly.
    async fn find_by_email(&self, email: &str) -> RepoResult<Option<Client>>;
    /// Filtered, paginated search.
    async fn search(&self, query: ClientRepoQuery) -> RepoResult<Vec<Client>>;
    /// Count rows matching `query` (without limit/offset applied).
    async fn count(&self, query: ClientRepoQuery) -> RepoResult<i64>;
    /// Refresh the denormalised task-counter columns for a client.
    async fn update_statistics(&self, client_id: &str) -> RepoResult<()>;
    /// Evict all cached client entries.
    fn invalidate_all_cache(&self);
    /// Total count of non-deleted clients.
    async fn count_all(&self) -> RepoResult<i64>;
    /// Free-text search with a simple LIKE pattern.
    async fn search_simple(
        &self,
        query: &str,
        limit: usize,
        offset: usize,
    ) -> RepoResult<Vec<Client>>;
    /// Count open tasks linked to `client_id`.
    async fn count_active_tasks(&self, client_id: &str) -> RepoResult<i64>;
    /// Aggregate overview statistics across all clients.
    async fn get_overview_stats(&self) -> RepoResult<ClientOverviewStats>;
}

// ── IClientRepository (legacy async trait) ────────────────────────────────────
//
// Used by the application layer (ClientService). Kept separate from
// `ClientRepository` during the incremental migration to the unified trait.

/// Client repository trait for database operations (ADR-005)
#[async_trait]
pub trait IClientRepository: Send + Sync + std::fmt::Debug {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Client>>;
    async fn find_all(&self) -> RepoResult<Vec<Client>>;
    async fn save(&self, entity: Client) -> RepoResult<Client>;
    async fn delete_by_id(&self, id: String) -> RepoResult<bool>;
    async fn exists_by_id(&self, id: String) -> RepoResult<bool>;
    async fn find_by_email(&self, email: &str) -> RepoResult<Option<Client>>;
    async fn search(&self, query: ClientRepoQuery) -> RepoResult<Vec<Client>>;
    async fn count(&self, query: ClientRepoQuery) -> RepoResult<i64>;
    async fn update_statistics(&self, client_id: &str) -> RepoResult<()>;
    fn invalidate_all_cache(&self);
    async fn count_all(&self) -> RepoResult<i64>;
    async fn search_simple(
        &self,
        query: &str,
        limit: usize,
        offset: usize,
    ) -> RepoResult<Vec<Client>>;
    async fn count_active_tasks(&self, client_id: &str) -> RepoResult<i64>;
    async fn get_overview_stats(&self) -> RepoResult<ClientOverviewStats>;
}
