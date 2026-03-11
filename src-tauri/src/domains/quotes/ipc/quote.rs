//! Quote IPC re-exports.
//!
//! The commands are split across focused sub-modules for maintainability:
//! - `quote_crud`        — create/get/list/update/delete/duplicate
//! - `quote_status`      — status transition commands
//! - `quote_items`       — line-item add/update/delete
//! - `quote_attachments` — attachment CRUD + open
//! - `quote_export`      — PDF export + convert-to-task

pub use quote_attachments::*;
pub use quote_crud::*;
pub use quote_export::*;
pub use quote_items::*;
pub use quote_status::*;
