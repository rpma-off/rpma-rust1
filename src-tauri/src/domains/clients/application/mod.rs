//! Clients application layer — use-case orchestration (ADR-001, ADR-004).

pub mod client_input_validator;
pub mod client_service;
pub mod client_statistics_service;
pub mod client_validation_service;

pub use client_service::ClientService;
pub use client_statistics_service::ClientStatisticsService;
pub use client_validation_service::ClientValidationService;
