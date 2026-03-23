//! Backward-compatibility shim — repository types re-exported from their proper locations.

// IClientRepository trait (legacy) → domain repositories layer
pub use crate::domains::clients::domain::repositories::IClientRepository;

// `ClientRepository` type alias kept for existing call-sites that do
// `ClientRepository::new(db, cache)` — this is the concrete SqliteClientRepository.
// ClientRepoQuery is already re-exported from domain::models::* in the parent mod.rs.
pub type ClientRepository =
    crate::domains::clients::infrastructure::client_repository::SqliteClientRepository;
