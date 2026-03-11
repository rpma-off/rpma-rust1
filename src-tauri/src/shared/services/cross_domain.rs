//! Cross-domain service re-exports for shared access.
//!
//! This module provides a single, audited entry point for services that are
//! legitimately used across bounded-context boundaries (e.g., by the reports
//! aggregation domain or IPC coordination layer).
//!
//! **Prefer** importing domain-owned traits from `shared::contracts` when
//! only the contract surface is needed.  Use this module only when a
//! concrete infrastructure service or domain model is required at the
//! wiring / composition layer.

// --- Services ---
// Intervention domain
pub use crate::domains::interventions::infrastructure::intervention::InterventionService;

// Client domain
pub use crate::domains::clients::infrastructure::client::ClientService;
pub use crate::domains::clients::infrastructure::client::ClientStat;
pub use crate::domains::clients::domain::models::client::{CreateClientRequest, CustomerType};

// Settings domain
pub use crate::domains::settings::infrastructure::settings::SettingsService;

// Calendar domain
pub use crate::domains::calendar::infrastructure::calendar::CalendarService;

// Tasks domain
pub use crate::domains::tasks::infrastructure::task::TaskService;

// Auth domain
pub use crate::domains::auth::infrastructure::auth::AuthService;
pub use crate::shared::contracts::auth::UserRole;
pub use crate::shared::logging::audit_service::{
    ActionResult, AuditEventType, AuditService,
};

// --- Cross-domain shared types ---
// Client types
pub use crate::domains::clients::domain::models::client::Client;

// Document types
pub use crate::domains::documents::domain::models::photo::Photo;

// Intervention types
pub use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus,
};
pub use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus};

// Inventory types
pub use crate::domains::inventory::domain::models::material::MaterialConsumption;
pub use crate::domains::inventory::infrastructure::material::{
    CreateMaterialRequest, MaterialService, RecordConsumptionRequest, UpdateStockRequest,
};
pub use crate::domains::inventory::domain::models::material::{MaterialType, UnitOfMeasure};

// Task types
pub use crate::domains::tasks::domain::models::task::{PaginationInfo, SortOrder, Task, TaskQuery};
pub use crate::domains::tasks::domain::models::task::{CreateTaskRequest, TaskStatus};

// Intervention requests
pub use crate::domains::interventions::infrastructure::intervention::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};

// Quote services and models
pub use crate::domains::quotes::QuotesFacade;
pub use crate::domains::quotes::infrastructure::quote::QuoteService;
pub use crate::domains::quotes::domain::models::quote::{
    CreateQuoteItemRequest, CreateQuoteRequest, QuoteItemKind, QuoteStatus,
};
