//! Database repositories for consistent data access patterns
//!
//! This module provides repository implementations for all entities,
//! following the repository pattern for clean database access.

// Base infrastructure
pub mod base;
pub mod cache;
pub mod factory;

pub mod audit_repository {
    pub use crate::domains::audit::infrastructure::audit_repository::*;
}

pub mod calendar_event_repository {
    pub use crate::domains::calendar::infrastructure::calendar_event_repository::*;
}

pub mod dashboard_repository {
    pub use crate::domains::analytics::infrastructure::dashboard_repository::*;
}

pub mod message_repository {
    pub use crate::domains::notifications::infrastructure::message_repository::*;
}

pub mod notification_preferences_repository {
    pub use crate::domains::notifications::infrastructure::notification_preferences_repository::*;
}

pub mod notification_repository {
    pub use crate::domains::notifications::infrastructure::notification_repository::*;
}

pub mod quote_repository {
    pub use crate::domains::quotes::infrastructure::quote_repository::*;
}

pub mod session_repository {
    pub use crate::domains::auth::infrastructure::session_repository::*;
}

pub mod user_repository {
    pub use crate::domains::users::infrastructure::user_repository::*;
}

pub mod intervention_repository {
    pub use crate::domains::interventions::infrastructure::intervention_repository::*;
}

pub mod material_repository {
    pub use crate::domains::inventory::infrastructure::material_repository::*;
}

pub mod photo_repository {
    pub use crate::domains::documents::infrastructure::photo_repository::*;
}

// Re-exports - only what's actually used
pub use crate::domains::clients::infrastructure::client_repository::ClientRepository;
pub use crate::domains::documents::infrastructure::photo_repository::PhotoRepository;
pub use crate::domains::interventions::infrastructure::intervention_repository::InterventionRepository;
pub use crate::domains::inventory::infrastructure::material_repository::MaterialRepository;
pub use crate::domains::tasks::infrastructure::task_history_repository::TaskHistoryRepository;
pub use crate::domains::tasks::infrastructure::task_repository::TaskRepository;
pub use audit_repository::AuditRepository;
pub use base::Repository;
pub use cache::Cache;
pub use calendar_event_repository::CalendarEventRepository;
pub use dashboard_repository::DashboardRepository;
pub use factory::Repositories;
pub use quote_repository::QuoteRepository;
pub use user_repository::UserRepository;
