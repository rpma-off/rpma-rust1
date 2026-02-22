//! Compatibility model surface.
//!
//! Domain-specific model definitions now live under
//! `crate::domains::<domain>/domain/models` and shared contracts under
//! `crate::shared::contracts`.
//! This module provides re-exports for the `export-types` binary.

pub mod status;

/// Re-exports from auth domain models.
pub mod auth {
    pub use crate::domains::auth::domain::models::auth::*;
}

/// Re-exports from calendar domain models.
pub mod calendar {
    pub use crate::domains::calendar::domain::models::calendar::*;
}

/// Re-exports from calendar domain models (events).
pub mod calendar_event {
    pub use crate::domains::calendar::domain::models::calendar_event::*;
}

/// Re-exports from clients domain models.
pub mod client {
    pub use crate::domains::clients::domain::models::client::*;
}

/// Re-exports from shared contracts.
pub mod common {
    pub use crate::shared::contracts::common::*;
}

/// Re-exports from interventions domain models.
pub mod intervention {
    pub use crate::domains::interventions::domain::models::intervention::*;
}

/// Re-exports from inventory domain models.
pub mod material {
    pub use crate::domains::inventory::domain::models::material::*;
}

/// Re-exports from inventory domain models (TS types).
pub mod material_ts {
    pub use crate::domains::inventory::domain::models::material_ts::*;
}

/// Re-exports from notifications domain models (messages).
pub mod message {
    pub use crate::domains::notifications::domain::models::message::*;
}

/// Re-exports from notifications domain models.
pub mod notification {
    pub use crate::domains::notifications::domain::models::notification::*;
}

/// Re-exports from documents domain models.
pub mod photo {
    pub use crate::domains::documents::domain::models::photo::*;
}

/// Re-exports from quotes domain models.
pub mod quote {
    pub use crate::domains::quotes::domain::models::quote::*;
}

/// Re-exports from reports domain models.
pub mod reports {
    pub use crate::domains::reports::domain::models::reports::*;
}

/// Re-exports from settings domain models.
pub mod settings {
    pub use crate::domains::settings::domain::models::settings::*;
}

/// Re-exports from interventions domain models (steps).
pub mod step {
    pub use crate::domains::interventions::domain::models::step::*;
}

/// Re-exports from sync domain models.
pub mod sync {
    pub use crate::domains::sync::domain::models::sync::*;
}

/// Re-exports from tasks domain models.
pub mod task {
    pub use crate::domains::tasks::domain::models::task::*;
}
