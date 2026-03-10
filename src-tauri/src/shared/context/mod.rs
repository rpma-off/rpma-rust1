//! Centralized request context module.
//!
//! This module provides the three context types that drive the
//! authentication architecture:
//!
//! | Type             | Created by          | Consumed by               |
//! |------------------|---------------------|---------------------------|
//! | [`AppContext`]    | Tauri setup         | IPC handlers, resolver    |
//! | [`AuthContext`]   | Session resolver    | Application services      |
//! | [`RequestContext`]| Session resolver    | Application services      |
//!
//! Session tokens are validated **exclusively** by the
//! [`session_resolver`] — no service or repository may ever touch one.

pub mod app_context;
pub mod auth_context;
pub mod request_context;
pub mod session_resolver;

pub use app_context::AppContext;
pub use auth_context::AuthContext;
pub use request_context::RequestContext;
pub use session_resolver::resolve_request_context;
