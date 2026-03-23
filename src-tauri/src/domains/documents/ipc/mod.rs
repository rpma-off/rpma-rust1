//! IPC layer for the documents domain (ADR-018).
//!
//! Tauri command handlers for photos and reports.
//! The god-file photo_handler.rs is tracked as tech debt — split into
//! application/photo_service.rs + ipc/photo_handlers.rs in a future patch.

pub use crate::domains::documents::report_handler::*;
pub use crate::domains::documents::photo_handler::{
    document_delete_photo, document_get_photo, document_get_photo_data, document_get_photos,
    document_store_photo, document_update_photo_metadata, export_intervention_report,
    save_intervention_report,
};
