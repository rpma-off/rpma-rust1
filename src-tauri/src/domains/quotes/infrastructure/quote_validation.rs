//! Quote validation rules
//!
//! Pure validation functions for attachment constraints and discount rules.
//! No database access — these checks rely only on the input data.

use crate::domains::quotes::domain::models::quote::{AttachmentType, CreateQuoteAttachmentRequest};

/// Maximum allowed file size for attachments (50 MB)
pub const MAX_ATTACHMENT_SIZE: i64 = 50 * 1024 * 1024;

/// Allowed MIME types for image attachments
pub const ALLOWED_IMAGE_MIME_TYPES: &[&str] = &[
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
];

/// Allowed MIME types for document attachments
pub const ALLOWED_DOCUMENT_MIME_TYPES: &[&str] = &[
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
];

/// Validate attachment file constraints (size limits and MIME type allowlists).
pub fn validate_attachment_file(req: &CreateQuoteAttachmentRequest) -> Result<(), String> {
    if req.file_size <= 0 {
        return Err("File size must be greater than 0".to_string());
    }

    if req.file_size > MAX_ATTACHMENT_SIZE {
        return Err(format!(
            "File size exceeds maximum allowed size of {} MB",
            MAX_ATTACHMENT_SIZE / (1024 * 1024)
        ));
    }

    let attachment_type = req
        .attachment_type
        .as_ref()
        .unwrap_or(&AttachmentType::Other);

    match attachment_type {
        AttachmentType::Image => {
            if !ALLOWED_IMAGE_MIME_TYPES.contains(&req.mime_type.as_str()) {
                return Err(format!(
                    "Invalid image file type. Allowed types: {}",
                    ALLOWED_IMAGE_MIME_TYPES.join(", ")
                ));
            }
        }
        AttachmentType::Document => {
            if !ALLOWED_DOCUMENT_MIME_TYPES.contains(&req.mime_type.as_str()) {
                return Err(format!(
                    "Invalid document file type. Allowed types: {}",
                    ALLOWED_DOCUMENT_MIME_TYPES.join(", ")
                ));
            }
        }
        AttachmentType::Other => {
            if req.file_size > 10 * 1024 * 1024 {
                return Err("Files of type 'other' are limited to 10 MB".to_string());
            }
        }
    }

    Ok(())
}

/// Validate discount type and value on a quote update request.
pub fn validate_discount_update(
    discount_type: Option<&str>,
    discount_value: Option<i64>,
) -> Result<(), String> {
    if let Some(dt) = discount_type {
        if !matches!(dt, "percentage" | "fixed") {
            return Err("Invalid discount type. Must be 'percentage' or 'fixed'.".to_string());
        }
    }

    if let Some(value) = discount_value {
        if value < 0 {
            return Err("Discount value cannot be negative".to_string());
        }
        if discount_type == Some("percentage") && value > 100 {
            return Err("Percentage discount cannot exceed 100%".to_string());
        }
    }

    Ok(())
}
