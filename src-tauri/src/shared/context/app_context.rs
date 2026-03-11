//! Application-wide dependency container.
//!
//! `AppContext` is a lightweight reference wrapper around [`AppStateType`]
//! that provides the same service access surface without coupling
//! callers to the Tauri `State<'_>` extractor.
//!
//! In practice, IPC handlers continue to receive `AppState<'_>` (which
//! is `State<'_, AppStateType>`), but application services and session
//! resolution accept `&AppStateType` directly so they remain testable
//! outside Tauri.

// Re-export the concrete state type so callers can use `AppContext`
// without importing the `app_state` module.
pub use crate::shared::app_state::AppStateType as AppContext;
