//! Compatibility model surface.
//!
//! Domain-specific model definitions now live under
//! `src-tauri/src/domains/<domain>/domain/models` and shared contracts under
//! `src-tauri/src/shared/contracts`.
//! This module preserves existing `crate::models::*` import paths.

pub mod auth {
    pub use crate::domains::auth::domain::models::auth::*;
}

pub mod calendar {
    pub use crate::domains::calendar::domain::models::calendar::*;
}

pub mod calendar_event {
    pub use crate::domains::calendar::domain::models::calendar_event::*;
}

pub mod client {
    pub use crate::domains::clients::domain::models::client::*;
}

pub mod intervention {
    pub use crate::domains::interventions::domain::models::intervention::*;
}

pub mod material {
    pub use crate::domains::inventory::domain::models::material::*;
}

pub mod message {
    pub use crate::domains::notifications::domain::models::message::*;
}

pub mod notification {
    pub use crate::domains::notifications::domain::models::notification::*;
}

pub mod photo {
    pub use crate::domains::documents::domain::models::photo::*;
}

pub mod quote {
    pub use crate::domains::quotes::domain::models::quote::*;
}

pub mod reports {
    pub use crate::domains::reports::domain::models::reports::*;
}

pub mod settings {
    pub use crate::domains::settings::domain::models::settings::*;
}

pub mod step {
    pub use crate::domains::interventions::domain::models::step::*;
}

pub mod sync {
    pub use crate::domains::sync::domain::models::sync::*;
}

pub mod task {
    pub use crate::domains::tasks::domain::models::task::*;
}

pub mod user {
    pub use crate::domains::users::domain::models::user::*;
}

pub mod material_ts;
pub mod status;
