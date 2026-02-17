//! Clients domain — client management, contact info
//!
//! This module re-exports all client-related components across layers.

// Public facade
pub use crate::services::client::ClientService;

// Models
pub(crate) use crate::models::client::Client;

// Services
pub(crate) use crate::services::client_statistics::ClientStatisticsService;
pub(crate) use crate::services::client_validation::ClientValidationService;
