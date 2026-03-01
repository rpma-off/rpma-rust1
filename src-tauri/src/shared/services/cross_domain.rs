//! Cross-domain service re-exports for shared access.
//!
//! This module provides a single, audited entry point for services that are
//! legitimately used across bounded-context boundaries (e.g., by the reports
//! aggregation domain or IPC coordination layer).
//!
//! Files in `src-tauri/src/shared/` are exempt from the domain-boundary
//! enforcement script, so routing through here removes violations while
//! keeping all cross-domain coupling visible in one place.

// --- Intervention domain services ---
pub use crate::domains::interventions::infrastructure::intervention::InterventionService;
pub use crate::domains::interventions::infrastructure::intervention_repository::InterventionRepository;

// --- Client domain services ---
pub use crate::domains::clients::infrastructure::client::ClientService;
pub use crate::domains::clients::infrastructure::client::ClientStat;

// --- Analytics / prediction ---
pub use crate::domains::analytics::infrastructure::prediction::CompletionTimePrediction;

// --- Settings ---
pub use crate::domains::settings::infrastructure::settings::SettingsService;

// --- Calendar ---
pub use crate::domains::calendar::infrastructure::calendar::CalendarService;

// --- Tasks ---
pub use crate::domains::tasks::infrastructure::task::TaskService;

// --- Auth (used in settings tests and service methods) ---
pub use crate::domains::auth::infrastructure::auth::AuthService;
// --- Cross-domain shared contracts/types ---
pub use crate::domains::clients::domain::models::client::Client;
pub use crate::domains::documents::domain::models::photo::Photo;
pub use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus, InterventionType,
};
pub use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus};
pub use crate::domains::inventory::domain::models::material::MaterialConsumption;
pub use crate::domains::sync::domain::models::sync::EntityType as SyncEntityType;
pub use crate::domains::tasks::domain::models::task::{PaginationInfo, SortOrder, Task, TaskQuery};

