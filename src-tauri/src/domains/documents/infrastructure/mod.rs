//! Infrastructure layer for the documents domain (ADR-001, ADR-005).
//!
//! SQLite repositories and file-system storage implementations.

pub use crate::domains::documents::document_storage::*;
pub use crate::domains::documents::photo_repository::*;
pub use crate::domains::documents::report_export::*;
pub use crate::domains::documents::report_pdf::*;
pub use crate::domains::documents::report_template::*;
