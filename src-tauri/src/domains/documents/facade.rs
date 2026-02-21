use std::sync::Arc;

use crate::domains::documents::infrastructure::photo::PhotoService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Documents bounded context.
///
/// Provides document and photo management operations with input validation
/// and error mapping.
#[derive(Debug)]
pub struct DocumentsFacade {
    photo_service: Arc<PhotoService>,
}

impl DocumentsFacade {
    pub fn new(photo_service: Arc<PhotoService>) -> Self {
        Self { photo_service }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying photo service.
    pub fn photo_service(&self) -> &Arc<PhotoService> {
        &self.photo_service
    }

    /// Validate a photo file extension before upload.
    pub fn validate_photo_extension(&self, filename: &str) -> Result<(), AppError> {
        let valid_extensions = ["jpg", "jpeg", "png", "webp", "heic"];
        let extension = filename
            .rsplit('.')
            .next()
            .unwrap_or("")
            .to_lowercase();
        if !valid_extensions.contains(&extension.as_str()) {
            return Err(AppError::Validation(format!(
                "Invalid photo extension: {}. Valid extensions: {}",
                extension,
                valid_extensions.join(", ")
            )));
        }
        Ok(())
    }
}
