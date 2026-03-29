//! IPC layer for the documents domain (ADR-018).
//!
//! Tauri command handlers for photos and reports.

pub use crate::domains::documents::photo_handler::{
    document_delete_photo, document_get_photo, document_get_photo_data, document_get_photos,
    document_store_photo, document_update_photo_metadata, export_intervention_report,
    save_intervention_report,
};
pub use crate::domains::documents::report_handler::*;
