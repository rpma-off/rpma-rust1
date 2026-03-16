//! Attachment operations for `QuoteService`.
//!
//! Extracted from `quote_service.rs` to separate attachment management from
//! core quote CRUD and status transitions (ADR-001).
//!
//! Follows the same `impl QuoteService` in submodule pattern used by
//! `quote_totals.rs` and `quote_events.rs`.

use tracing::info;

use crate::domains::quotes::domain::models::quote::{
    CreateQuoteAttachmentRequest, QuoteAttachment, UpdateQuoteAttachmentRequest,
};
use crate::domains::quotes::infrastructure::quote_validation;
use crate::shared::contracts::auth::UserRole;

use super::quote_service::QuoteService;

impl QuoteService {
    /// Get all attachments for a quote.
    pub fn get_attachments(&self, quote_id: &str) -> Result<Vec<QuoteAttachment>, String> {
        self.repo
            .find_attachments_by_quote_id(quote_id)
            .map_err(|e| e.to_string())
    }

    /// Get a single attachment by its ID.
    pub fn get_attachment(&self, attachment_id: &str) -> Result<Option<QuoteAttachment>, String> {
        self.repo
            .find_attachment_by_id(attachment_id)
            .map_err(|e| e.to_string())
    }

    /// Create a new attachment for a quote.
    pub fn create_attachment(
        &self,
        quote_id: &str,
        req: CreateQuoteAttachmentRequest,
        user_id: &str,
        role: &UserRole,
    ) -> Result<QuoteAttachment, String> {
        Self::check_quote_permission(role, "update")?;
        req.validate()?;

        let _quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        quote_validation::validate_attachment_file(&req)?;

        let attachment_id = self
            .repo
            .create_attachment(quote_id, &req, Some(user_id))
            .map_err(|e| e.to_string())?;

        let attachment = self
            .repo
            .find_attachment_by_id(&attachment_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Attachment not found after creation".to_string())?;

        info!(
            quote_id = %quote_id,
            attachment_id = %attachment_id,
            file_name = %req.file_name,
            "Attachment created"
        );

        Ok(attachment)
    }

    /// Update an attachment.
    pub fn update_attachment(
        &self,
        quote_id: &str,
        attachment_id: &str,
        req: UpdateQuoteAttachmentRequest,
        role: &UserRole,
    ) -> Result<QuoteAttachment, String> {
        Self::check_quote_permission(role, "update")?;
        let _quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        self.repo
            .update_attachment(attachment_id, quote_id, &req)
            .map_err(|e| e.to_string())?;

        let attachment = self
            .repo
            .find_attachment_by_id(attachment_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Attachment not found after update".to_string())?;

        info!(
            quote_id = %quote_id,
            attachment_id = %attachment_id,
            "Attachment updated"
        );

        Ok(attachment)
    }

    /// Delete an attachment.
    pub fn delete_attachment(&self, quote_id: &str, attachment_id: &str, role: &UserRole) -> Result<bool, String> {
        Self::check_quote_permission(role, "update")?;
        let _quote = self
            .repo
            .find_by_id(quote_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Quote not found".to_string())?;

        let deleted = self
            .repo
            .delete_attachment(attachment_id, quote_id)
            .map_err(|e| e.to_string())?;

        if deleted {
            info!(
                quote_id = %quote_id,
                attachment_id = %attachment_id,
                "Attachment deleted"
            );
        }

        Ok(deleted)
    }
}
