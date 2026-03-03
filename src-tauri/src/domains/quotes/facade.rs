use std::sync::Arc;

use crate::domains::quotes::domain::models::quote::*;
use crate::domains::quotes::infrastructure::quote::QuoteService;
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::errors::AppError;

pub struct QuotesFacade {
    quote_service: Arc<QuoteService>,
}

impl QuotesFacade {
    pub fn new(quote_service: Arc<QuoteService>) -> Self {
        Self { quote_service }
    }

    pub fn check_permission(&self, role: &UserRole, operation: &str) -> Result<(), AppError> {
        match operation {
            "read" | "export" => Ok(()),
            "create" | "update" | "delete" | "status" => {
                if matches!(role, UserRole::Viewer) {
                    Err(AppError::Authorization(
                        "Viewers cannot modify quotes".to_string(),
                    ))
                } else {
                    Ok(())
                }
            }
            _ => Err(AppError::Authorization(format!(
                "Unknown quote operation: {}",
                operation
            ))),
        }
    }

    pub fn map_quote_service_error(&self, e: String) -> AppError {
        let lower = e.to_lowercase();
        if lower.contains("not found") || lower.contains("introuvable") {
            AppError::NotFound(e)
        } else {
            AppError::Validation(e)
        }
    }

    pub fn create(
        &self,
        role: &UserRole,
        data: CreateQuoteRequest,
        user_id: &str,
    ) -> Result<Quote, AppError> {
        self.check_permission(role, "create")?;
        self.quote_service
            .create_quote(data, user_id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn get(&self, role: &UserRole, id: &str) -> Result<Option<Quote>, AppError> {
        self.check_permission(role, "read")?;
        self.quote_service
            .get_quote(id)
            .map_err(|_| AppError::Database("Failed to retrieve quote".to_string()))
    }

    pub fn list(&self, role: &UserRole, query: &QuoteQuery) -> Result<QuoteListResponse, AppError> {
        self.check_permission(role, "read")?;
        self.quote_service
            .list_quotes(query)
            .map_err(|_| AppError::Database("Failed to list quotes".to_string()))
    }

    pub fn update(
        &self,
        role: &UserRole,
        id: &str,
        data: UpdateQuoteRequest,
    ) -> Result<Quote, AppError> {
        self.check_permission(role, "update")?;
        self.quote_service
            .update_quote(id, data)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn delete(&self, role: &UserRole, id: &str) -> Result<bool, AppError> {
        self.check_permission(role, "delete")?;
        self.quote_service
            .delete_quote(id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn add_item(
        &self,
        role: &UserRole,
        quote_id: &str,
        item: CreateQuoteItemRequest,
    ) -> Result<Quote, AppError> {
        self.check_permission(role, "update")?;
        self.quote_service
            .add_item(quote_id, item)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn update_item(
        &self,
        role: &UserRole,
        quote_id: &str,
        item_id: &str,
        data: UpdateQuoteItemRequest,
    ) -> Result<Quote, AppError> {
        self.check_permission(role, "update")?;
        self.quote_service
            .update_item(quote_id, item_id, data)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn delete_item(
        &self,
        role: &UserRole,
        quote_id: &str,
        item_id: &str,
    ) -> Result<Quote, AppError> {
        self.check_permission(role, "delete")?;
        self.quote_service
            .delete_item(quote_id, item_id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn mark_sent(&self, role: &UserRole, id: &str) -> Result<Quote, AppError> {
        self.check_permission(role, "status")?;
        self.quote_service
            .mark_sent(id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn mark_accepted(
        &self,
        role: &UserRole,
        id: &str,
    ) -> Result<QuoteAcceptResponse, AppError> {
        self.check_permission(role, "status")?;
        self.quote_service
            .mark_accepted(id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn mark_rejected(&self, role: &UserRole, id: &str) -> Result<Quote, AppError> {
        self.check_permission(role, "status")?;
        self.quote_service
            .mark_rejected(id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn get_attachments(
        &self,
        role: &UserRole,
        quote_id: &str,
    ) -> Result<Vec<QuoteAttachment>, AppError> {
        self.check_permission(role, "read")?;
        self.quote_service
            .get_attachments(quote_id)
            .map_err(|_| AppError::Database("Failed to retrieve attachments".to_string()))
    }

    pub fn create_attachment(
        &self,
        role: &UserRole,
        quote_id: &str,
        data: CreateQuoteAttachmentRequest,
        user_id: &str,
    ) -> Result<QuoteAttachment, AppError> {
        self.check_permission(role, "create")?;
        self.quote_service
            .create_attachment(quote_id, data, user_id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn update_attachment(
        &self,
        role: &UserRole,
        quote_id: &str,
        attachment_id: &str,
        data: UpdateQuoteAttachmentRequest,
    ) -> Result<QuoteAttachment, AppError> {
        self.check_permission(role, "update")?;
        self.quote_service
            .update_attachment(quote_id, attachment_id, data)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn delete_attachment(
        &self,
        role: &UserRole,
        quote_id: &str,
        attachment_id: &str,
    ) -> Result<bool, AppError> {
        self.check_permission(role, "delete")?;
        self.quote_service
            .delete_attachment(quote_id, attachment_id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn generate_share_link(
        &self,
        role: &UserRole,
        quote_id: &str,
    ) -> Result<QuoteShareResponse, AppError> {
        self.check_permission(role, "update")?;
        self.quote_service
            .generate_share_link(quote_id)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn revoke_share_link(&self, role: &UserRole, quote_id: &str) -> Result<bool, AppError> {
        self.check_permission(role, "update")?;
        self.quote_service
            .revoke_share_link(quote_id)
            .map(|_| true)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn track_public_view(
        &self,
        public_token: &str,
    ) -> Result<QuotePublicViewResponse, AppError> {
        self.quote_service
            .track_public_view(public_token)
            .map_err(AppError::NotFound)
    }

    pub fn handle_customer_response(
        &self,
        request: CustomerQuoteResponse,
    ) -> Result<bool, AppError> {
        self.quote_service
            .handle_customer_response(request)
            .map(|_| true)
            .map_err(|e| self.map_quote_service_error(e))
    }

    pub fn acknowledge_response(&self, role: &UserRole, quote_id: &str) -> Result<bool, AppError> {
        self.check_permission(role, "update")?;
        self.quote_service
            .acknowledge_response(quote_id)
            .map(|_| true)
            .map_err(|e| self.map_quote_service_error(e))
    }
}
