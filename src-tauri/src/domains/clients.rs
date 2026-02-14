//! Clients domain — client management, contact info
//!
//! This module re-exports all client-related components across layers.

// Models
pub use crate::models::client::Client;

// Services
pub use crate::services::client::ClientService;
pub use crate::services::client_statistics::ClientStatisticsService;
pub use crate::services::client_validation::ClientValidationService;

// Repositories
pub use crate::repositories::client_repository::ClientRepository;
