pub mod calendar_handler;
pub mod infrastructure;
pub mod models;

// ── 4-Layer structure (ADR-001) ───────────────────────────────────────────────
pub mod application;
pub mod domain;
pub mod ipc;

#[allow(unused_imports)]
pub(crate) use calendar_handler::{CalendarCommand, CalendarFacade, CalendarResponse};
#[cfg(test)]
pub(crate) mod tests;
