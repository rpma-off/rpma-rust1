mod facade;
pub use facade::NotificationsFacade;

pub mod models;
pub mod notification_handler;

// ── 4-Layer structure (ADR-001) ───────────────────────────────────────────────
pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ipc;

pub use models::*;
pub use notification_handler::*;

#[cfg(test)]
pub(crate) mod tests;
