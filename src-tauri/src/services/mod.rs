//! Services module - Business logic layer
//!
//! This module contains all business logic services that handle
//! complex operations and validation for the application.

pub mod cache;
pub mod domain_event;
pub mod event_bus;
pub mod event_system;
pub mod performance_monitor;
pub mod system;
pub mod validation;
pub mod websocket_event_handler;
pub mod worker_pool;

// Domain service aliases kept in-module to avoid legacy file shims while
// preserving existing call sites during migration waves.
pub mod alerting {
    pub use crate::domains::audit::infrastructure::alerting::*;
}

pub mod analytics {
    pub use crate::domains::analytics::infrastructure::analytics::*;
}

pub mod audit_log_handler {
    pub use crate::domains::audit::infrastructure::audit_log_handler::*;
}

pub mod audit_service {
    pub use crate::domains::audit::infrastructure::audit_service::*;
}

pub mod auth {
    pub use crate::domains::auth::infrastructure::auth::*;
}

pub mod calendar {
    pub use crate::domains::calendar::infrastructure::calendar::*;
}

pub mod calendar_event_service {
    pub use crate::domains::calendar::infrastructure::calendar_event_service::*;
}

pub mod consent {
    pub use crate::domains::settings::infrastructure::consent::*;
}

pub mod dashboard {
    pub use crate::domains::analytics::infrastructure::dashboard::*;
}

pub mod client {
    pub use crate::domains::clients::infrastructure::client::*;
}

pub mod geo {
    pub use crate::domains::reports::infrastructure::geo::*;
}

pub mod message {
    pub use crate::domains::notifications::infrastructure::message::*;
}

pub mod notification {
    pub use crate::domains::notifications::infrastructure::notification::*;
}

pub mod operational_intelligence {
    pub use crate::domains::reports::infrastructure::operational_intelligence::*;
}

pub mod pdf_generation {
    pub use crate::domains::reports::infrastructure::pdf_generation::*;
}

pub mod pdf_report {
    pub use crate::domains::reports::infrastructure::pdf_report::*;
}

pub mod prediction {
    pub use crate::domains::analytics::infrastructure::prediction::*;
}

pub mod quote {
    pub use crate::domains::quotes::infrastructure::quote::*;
}

pub mod rate_limiter {
    pub use crate::domains::auth::infrastructure::rate_limiter::*;
}

pub mod report_jobs {
    pub use crate::domains::reports::infrastructure::report_jobs::*;
}

pub mod reports {
    pub use crate::domains::reports::infrastructure::reports::*;

    pub mod client_report {
        pub use crate::domains::reports::infrastructure::reports::client_report::*;
    }

    pub mod core_service {
        pub use crate::domains::reports::infrastructure::reports::core_service::*;
    }

    pub mod export_service {
        pub use crate::domains::reports::infrastructure::reports::export_service::*;
    }

    pub mod generation_service {
        pub use crate::domains::reports::infrastructure::reports::generation_service::*;
    }

    pub mod geographic_report {
        pub use crate::domains::reports::infrastructure::reports::geographic_report::*;
    }

    pub mod intelligence_report {
        pub use crate::domains::reports::infrastructure::reports::intelligence_report::*;
    }

    pub mod material_report {
        pub use crate::domains::reports::infrastructure::reports::material_report::*;
    }

    pub mod overview_orchestrator {
        pub use crate::domains::reports::infrastructure::reports::overview_orchestrator::*;
    }

    pub mod quality_report {
        pub use crate::domains::reports::infrastructure::reports::quality_report::*;
    }

    pub mod search_service {
        pub use crate::domains::reports::infrastructure::reports::search_service::*;
    }

    pub mod seasonal_report {
        pub use crate::domains::reports::infrastructure::reports::seasonal_report::*;
    }

    pub mod task_report {
        pub use crate::domains::reports::infrastructure::reports::task_report::*;
    }

    pub mod technician_report {
        pub use crate::domains::reports::infrastructure::reports::technician_report::*;
    }

    pub mod types {
        pub use crate::domains::reports::infrastructure::reports::types::*;
    }

    pub mod validation {
        pub use crate::domains::reports::infrastructure::reports::validation::*;
    }
}

pub mod security_monitor {
    pub use crate::domains::audit::infrastructure::security_monitor::*;
}

pub mod session {
    pub use crate::domains::auth::infrastructure::session::*;
}

pub mod settings {
    pub use crate::domains::settings::infrastructure::settings::*;
}

pub mod task_client_integration {
    pub use crate::domains::tasks::infrastructure::task_client_integration::*;
}

pub mod task_statistics {
    pub use crate::domains::tasks::infrastructure::task_statistics::*;
}

pub mod task_validation {
    pub use crate::domains::tasks::infrastructure::task_validation::*;
}

pub mod token {
    pub use crate::domains::auth::infrastructure::token::*;
}

pub mod two_factor {
    pub use crate::domains::auth::infrastructure::two_factor::*;
}

pub mod user {
    pub use crate::domains::users::infrastructure::user::*;
}

pub mod workflow_cleanup {
    pub use crate::domains::tasks::infrastructure::workflow_cleanup::*;
}

pub mod workflow_progression {
    pub use crate::domains::tasks::infrastructure::workflow_progression::*;
}

pub mod workflow_strategy {
    pub use crate::domains::tasks::infrastructure::workflow_strategy::*;
}

pub mod workflow_validation {
    pub use crate::domains::tasks::infrastructure::workflow_validation::*;
}

pub mod document_storage {
    pub use crate::domains::documents::infrastructure::document_storage::*;
}

pub mod intervention {
    pub use crate::domains::interventions::infrastructure::intervention::*;
}

pub mod intervention_calculation {
    pub use crate::domains::interventions::infrastructure::intervention_calculation::*;
}

pub mod intervention_data {
    pub use crate::domains::interventions::infrastructure::intervention_data::*;
}

pub mod intervention_types {
    pub use crate::domains::interventions::infrastructure::intervention_types::*;
}

pub mod intervention_validation {
    pub use crate::domains::interventions::infrastructure::intervention_validation::*;
}

pub mod intervention_workflow {
    pub use crate::domains::interventions::infrastructure::intervention_workflow::*;
}

pub mod material {
    pub use crate::domains::inventory::infrastructure::material::*;
}

pub mod photo {
    pub use crate::domains::documents::infrastructure::photo::*;
}

// Re-export main services
pub use crate::domains::clients::infrastructure::client::ClientService;
pub use crate::domains::clients::infrastructure::client_statistics::ClientStatisticsService;
pub use crate::domains::tasks::infrastructure::task::TaskService;
pub use analytics::AnalyticsService;

pub use dashboard::DashboardService;

pub use crate::domains::documents::infrastructure::photo::PhotoService;
pub use crate::domains::interventions::infrastructure::intervention::InterventionService;
pub use crate::domains::inventory::infrastructure::material::MaterialService;
pub use message::MessageService;
pub use quote::QuoteService;
pub use settings::SettingsService;
pub use user::UserService;
