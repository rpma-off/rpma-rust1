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
pub use crate::domains::clients::application::client_service::ClientService;
pub use crate::domains::clients::client_handler::ClientStat;
pub use crate::domains::clients::client_handler::{CreateClientRequest, CustomerType};
pub use crate::domains::clients::ClientsFacade;

// Settings domain
pub use crate::domains::settings::settings_repository::SettingsRepository;

// Calendar domain
pub use crate::domains::calendar::calendar_handler::CalendarService;

// Tasks domain
pub use crate::domains::tasks::infrastructure::task::TaskService;

// Auth domain
pub use crate::domains::auth::infrastructure::auth::AuthService;
pub use crate::shared::contracts::auth::UserRole;
pub use crate::shared::logging::audit_service::{ActionResult, AuditEventType, AuditService};

// --- Cross-domain shared types ---
// Client types
pub use crate::domains::clients::client_handler::Client;

// Document types
pub use crate::domains::documents::Photo;

// Intervention types
pub use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus, InterventionType,
};
pub use crate::domains::interventions::domain::models::step::{
    InterventionStep, StepStatus, StepType,
};

// Inventory types
pub use crate::domains::inventory::domain::models::material::MaterialConsumption;
pub use crate::domains::inventory::domain::models::material::{MaterialType, UnitOfMeasure};
pub use crate::domains::inventory::infrastructure::material::{
    CreateMaterialRequest, MaterialService, RecordConsumptionRequest, UpdateStockRequest,
};

// Task types
pub use crate::domains::tasks::domain::models::task::{CreateTaskRequest, TaskStatus};
pub use crate::domains::tasks::domain::models::task::{PaginationInfo, SortOrder, Task, TaskQuery};

// Intervention requests
pub use crate::domains::interventions::infrastructure::intervention::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};

// Quote services and models
pub use crate::domains::quotes::application::quote_service::QuoteService;
pub use crate::domains::quotes::domain::models::quote::{
    ConvertQuoteToTaskResponse, CreateQuoteItemRequest, CreateQuoteRequest, QuoteAcceptResponse,
    QuoteItemKind, QuoteStatus, UpdateQuoteItemRequest, UpdateQuoteRequest,
};
pub use crate::domains::quotes::QuotesFacade;

// TODO(scaffold): Uncomment if TrashService needs cross-domain access (ADR-003)
// pub use crate::domains::trash::application::services::trash_service::TrashService;
