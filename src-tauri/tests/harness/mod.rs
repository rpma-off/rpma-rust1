//! Integration test harness for the RPMA backend.
//!
//! Provides a reusable, deterministic backend fixture that mirrors the
//! production service graph without starting the Tauri UI.
//!
//! # Quick start
//!
//! ```rust,no_run
//! mod harness;
//!
//! #[tokio::test]
//! async fn example_test() {
//!     let app = harness::app::TestApp::new().await;
//!     let ctx = app.admin_ctx();
//!
//!     // Call application services directly:
//!     let task_service = &app.state.task_service;
//!     // ...
//! }
//! ```
//!
//! # Module overview
//!
//! | Module | Purpose |
//! |---|---|
//! | [`app`] | Central [`TestApp`](app::TestApp) fixture — full wiring via `ServiceBuilder` |
//! | [`db`] | `setup_db()` — isolated in-memory SQLite with all migrations applied |
//! | [`auth`] | `RequestContext` builders for every role; `make_session()` helper |
//! | [`fixtures`] | Data factories for common domain entities (clients, tasks, …) |

pub mod app;
pub mod auth;
pub mod db;
pub mod event_capture;
pub mod fixtures;
