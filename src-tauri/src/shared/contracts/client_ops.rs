//! Shared contract for client lookups across bounded contexts.
//!
//! Domains that need to resolve client contact data (e.g. tasks) depend on
//! this trait rather than on the clients domain's concrete infrastructure.

use async_trait::async_trait;

/// Minimal client contact information needed outside the clients domain.
pub struct ClientContactInfo {
    pub email: Option<String>,
    pub address_state: Option<String>,
}

/// Port for resolving client data across bounded-context boundaries.
#[async_trait]
pub trait ClientResolver: Send + Sync {
    /// Return minimal contact info for the given client ID, or `None` if not found.
    async fn get_client_contact(&self, id: &str) -> Result<Option<ClientContactInfo>, String>;

    /// Return `true` if a client with the given ID exists.
    async fn client_exists(&self, id: &str) -> Result<bool, String>;
}
