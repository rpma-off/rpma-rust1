//! Database repositories for consistent data access patterns
//!
//! This module provides repository implementations for all entities,
//! following the repository pattern for clean database access.

// Base infrastructure
pub mod base;
pub mod cache;
pub mod factory;

// Existing repositories
pub mod calendar_event_repository;
pub mod intervention_repository;
pub mod session_repository;
pub mod task_repository;
pub mod task_repository_streaming;

// New repositories
pub mod audit_repository;
pub mod client_repository;
pub mod dashboard_repository;
pub mod material_repository;
pub mod message_repository;
pub mod notification_preferences_repository;
pub mod notification_repository;
pub mod photo_repository;
pub mod task_history_repository;
pub mod user_repository;

// Re-exports - only what's actually used
pub use audit_repository::AuditRepository;
pub use base::Repository;
pub use cache::Cache;
pub use calendar_event_repository::CalendarEventRepository;
pub use client_repository::ClientRepository;
pub use dashboard_repository::DashboardRepository;
pub use factory::Repositories;
pub use intervention_repository::InterventionRepository;
pub use user_repository::UserRepository;
