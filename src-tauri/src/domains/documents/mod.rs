mod facade;
pub use facade::DocumentsFacade;

// ── 4-Layer structure (ADR-001) ───────────────────────────────────────────────
pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ipc;

pub mod document_storage;
pub mod models;
pub mod photo_handler;
pub mod photo_repository;
pub mod report_export;
pub mod report_handler;
pub mod report_pdf;
pub mod report_template;
pub mod report_view_model;

pub use models::*;
pub use report_handler::*;
// Explicitly export from photo_handler to avoid name collisions with report_export
pub use document_storage::*;
pub use photo_handler::{
    document_delete_photo, document_get_photo, document_get_photo_data, document_get_photos,
    document_store_photo, document_update_photo_metadata, export_intervention_report,
    save_intervention_report, DocumentsCommand, DocumentsResponse, DocumentsServices, PhotoError,
    PhotoMetadataUpdate, PhotoResult, PhotoService, PhotoStats, PhotoStorageSettings,
    StorageProvider, StorePhotoRequest, StorePhotoResponse,
};
pub use photo_repository::*;
// These are used by report_handler but we can also export them
pub use report_export::{check_intervention_export_permissions, get_intervention_with_details};
pub use report_pdf::*;
pub use report_view_model::*;

#[cfg(test)]
pub(crate) mod tests;
