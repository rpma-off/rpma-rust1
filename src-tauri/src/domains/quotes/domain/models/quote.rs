//! Quote (Devis) model
//!
//! Represents quotes for PPF intervention services.
//!
//! Row-to-domain conversions (`FromSqlRow` impls) live in
//! `infrastructure::quote_row_mapping` to keep this model free of `rusqlite`
//! dependencies (ADR-002).

use crate::shared::contracts::common::{serialize_optional_timestamp, serialize_timestamp};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shared::contracts::RepoResult;

/// Repository trait for quote operations (ADR-005)
pub trait IQuoteRepository: Send + Sync + std::fmt::Debug {
    fn next_quote_number(&self) -> RepoResult<String>;
    fn create(&self, quote: &Quote) -> RepoResult<()>;
    fn find_by_id(&self, id: &str) -> RepoResult<Option<Quote>>;
    fn list(&self, query: &QuoteQuery) -> RepoResult<(Vec<Quote>, i64)>;
    fn update(&self, id: &str, req: &UpdateQuoteRequest) -> RepoResult<()>;
    fn delete(&self, id: &str) -> RepoResult<bool>;
    fn update_status(&self, id: &str, status: &QuoteStatus) -> RepoResult<()>;
    fn link_task(&self, quote_id: &str, task_id: &str) -> RepoResult<()>;
    fn update_totals(&self, id: &str, subtotal: i64, tax_total: i64, total: i64) -> RepoResult<()>;
    fn update_totals_with_discount(
        &self,
        id: &str,
        subtotal: i64,
        discount_amount: i64,
        tax_total: i64,
        total: i64,
    ) -> RepoResult<()>;
    fn find_items_by_quote_id(&self, quote_id: &str) -> RepoResult<Vec<QuoteItem>>;
    fn add_item(&self, item: &QuoteItem) -> RepoResult<()>;
    fn create_with_items(&self, quote: &Quote, items: &[QuoteItem]) -> RepoResult<()>;
    fn link_task_and_update_status(
        &self,
        quote_id: &str,
        task_id: &str,
        status: &QuoteStatus,
    ) -> RepoResult<()>;
    fn add_items_batch(&self, items: &[QuoteItem]) -> RepoResult<()>;
    fn update_item(
        &self,
        item_id: &str,
        quote_id: &str,
        req: &UpdateQuoteItemRequest,
    ) -> RepoResult<()>;
    fn delete_item(&self, item_id: &str, quote_id: &str) -> RepoResult<bool>;
    fn find_attachments_by_quote_id(&self, quote_id: &str) -> RepoResult<Vec<QuoteAttachment>>;
    fn find_attachment_by_id(&self, id: &str) -> RepoResult<Option<QuoteAttachment>>;
    fn create_attachment(
        &self,
        quote_id: &str,
        req: &CreateQuoteAttachmentRequest,
        created_by: Option<&str>,
    ) -> RepoResult<String>;
    fn update_attachment(
        &self,
        id: &str,
        quote_id: &str,
        req: &UpdateQuoteAttachmentRequest,
    ) -> RepoResult<()>;
    fn delete_attachment(&self, id: &str, quote_id: &str) -> RepoResult<bool>;
    fn get_stats(&self) -> RepoResult<QuoteStats>;
}

/// Quote status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, TS)]
pub enum QuoteStatus {
    #[serde(rename = "draft")]
    #[default]
    Draft,
    #[serde(rename = "sent")]
    Sent,
    #[serde(rename = "accepted")]
    Accepted,
    #[serde(rename = "rejected")]
    Rejected,
    #[serde(rename = "expired")]
    Expired,
    #[serde(rename = "converted")]
    Converted,
    #[serde(rename = "changes_requested")]
    ChangesRequested,
}

impl std::fmt::Display for QuoteStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Draft => "draft",
            Self::Sent => "sent",
            Self::Accepted => "accepted",
            Self::Rejected => "rejected",
            Self::Expired => "expired",
            Self::Converted => "converted",
            Self::ChangesRequested => "changes_requested",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for QuoteStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "draft" => Ok(Self::Draft),
            "sent" => Ok(Self::Sent),
            "accepted" => Ok(Self::Accepted),
            "rejected" => Ok(Self::Rejected),
            "expired" => Ok(Self::Expired),
            "converted" => Ok(Self::Converted),
            "changes_requested" => Ok(Self::ChangesRequested),
            _ => Err(format!("Invalid quote status: {}", s)),
        }
    }
}

impl QuoteStatus {
    /// Returns `true` when the state machine allows a direct transition from
    /// `self` to `next`.
    ///
    /// Transition table (mirrors the application-layer business rules):
    ///
    /// | From              | To                              |
    /// |-------------------|---------------------------------|
    /// | Draft             | Sent, Expired                   |
    /// | Sent              | Accepted, Rejected, Expired, ChangesRequested |
    /// | Accepted          | Converted                       |
    /// | ChangesRequested  | Draft                           |
    /// | Rejected          | Draft                           |
    /// | Expired, Converted| *(terminal — no outgoing edges)*|
    pub fn can_transition_to(&self, next: &QuoteStatus) -> bool {
        match (self, next) {
            (Self::Draft, Self::Sent)
            | (Self::Draft, Self::Expired)
            | (Self::Sent, Self::Accepted)
            | (Self::Sent, Self::Rejected)
            | (Self::Sent, Self::Expired)
            | (Self::Sent, Self::ChangesRequested)
            | (Self::Accepted, Self::Converted)
            | (Self::ChangesRequested, Self::Draft)
            | (Self::Rejected, Self::Draft) => true,
            _ => false,
        }
    }

    /// Returns `true` when this quote is in `Draft` status.
    ///
    /// Only draft quotes are mutable (items, totals, metadata can be edited).
    /// Prefer this predicate over `status == QuoteStatus::Draft` at call sites
    /// to keep the rule in one place.
    pub fn is_draft(&self) -> bool {
        matches!(self, Self::Draft)
    }
}

/// Quote item kind enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, TS)]
pub enum QuoteItemKind {
    #[serde(rename = "labor")]
    Labor,
    #[serde(rename = "material")]
    Material,
    #[serde(rename = "service")]
    #[default]
    Service,
    #[serde(rename = "discount")]
    Discount,
}

impl std::fmt::Display for QuoteItemKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Labor => "labor",
            Self::Material => "material",
            Self::Service => "service",
            Self::Discount => "discount",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for QuoteItemKind {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "labor" => Ok(Self::Labor),
            "material" => Ok(Self::Material),
            "service" => Ok(Self::Service),
            "discount" => Ok(Self::Discount),
            _ => Err(format!("Invalid quote item kind: {}", s)),
        }
    }
}

/// Main Quote entity
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct Quote {
    pub id: String,
    pub quote_number: String,
    pub client_id: String,
    pub task_id: Option<String>,
    pub status: QuoteStatus,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub valid_until: Option<i64>,
    /// Public-facing description (shown to customer)
    pub description: Option<String>,
    /// Internal notes (only visible to staff)
    pub notes: Option<String>,
    pub terms: Option<String>,
    pub subtotal: i64,
    pub tax_total: i64,
    pub total: i64,
    pub discount_type: Option<String>,
    pub discount_value: Option<i64>,
    pub discount_amount: Option<i64>,
    pub vehicle_plate: Option<String>,
    pub vehicle_make: Option<String>,
    pub vehicle_model: Option<String>,
    pub vehicle_year: Option<String>,
    pub vehicle_vin: Option<String>,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
    pub created_by: Option<String>,
    /// Items included in this quote (populated when loading by ID)
    #[serde(default)]
    pub items: Vec<QuoteItem>,
}

impl Quote {
    /// Returns `Ok(())` when this quote satisfies all invariants required
    /// before it can be sent to a customer.
    ///
    /// A quote can only be sent when:
    /// 1. Its status allows the `Draft → Sent` transition.
    /// 2. It has at least one line item.
    /// 3. Its total is non-zero.
    ///
    /// Placing these checks here removes duplication across every call site and
    /// keeps the "sendability" rule as a single, testable domain fact.
    pub fn can_be_sent(&self) -> Result<(), String> {
        if !self.status.can_transition_to(&QuoteStatus::Sent) {
            return Err(format!(
                "Cannot mark as sent: quote is in '{}' status (expected 'draft')",
                self.status
            ));
        }
        if self.items.is_empty() {
            return Err("Impossible d'envoyer un devis sans lignes.".to_string());
        }
        if self.total == 0 {
            return Err(
                "Impossible d'envoyer un devis avec un montant total nul.".to_string(),
            );
        }
        Ok(())
    }
}

/// Quote item entity
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuoteItem {
    pub id: String,
    pub quote_id: String,
    pub kind: QuoteItemKind,
    pub label: String,
    pub description: Option<String>,
    pub qty: f64,
    pub unit_price: i64,
    pub tax_rate: Option<f64>,
    pub material_id: Option<String>,
    pub position: i32,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
}

/// Quote query parameters for listing and filtering
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct QuoteQuery {
    /// Shared pagination params (page, page_size, sort_by, sort_order).
    #[serde(default)]
    pub pagination: crate::shared::repositories::base::PaginationParams,
    pub search: Option<String>,
    pub client_id: Option<String>,
    pub status: Option<QuoteStatus>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

impl Default for QuoteQuery {
    fn default() -> Self {
        Self {
            pagination: Default::default(),
            search: None,
            client_id: None,
            status: None,
            date_from: None,
            date_to: None,
        }
    }
}

/// Aggregate statistics for all quotes (not limited by pagination).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct QuoteStats {
    pub total: i64,
    pub draft: i64,
    pub sent: i64,
    pub accepted: i64,
    pub rejected: i64,
    pub expired: i64,
    pub converted: i64,
    /// Monthly counts for the last 6 months: each entry is (year_month, count).
    pub monthly_counts: Vec<QuoteMonthlyCount>,
}

/// One month's quote count.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct QuoteMonthlyCount {
    /// e.g. "2026-03"
    pub month: String,
    pub count: i64,
}

/// Quote list response with pagination
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuoteListResponse {
    pub data: Vec<Quote>,
    pub total: i64,
    pub page: i32,
    pub limit: i32,
}

/// Create quote request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateQuoteRequest {
    pub client_id: String,
    pub task_id: Option<String>,
    pub valid_until: Option<i64>,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub terms: Option<String>,
    pub discount_type: Option<String>,
    pub discount_value: Option<i64>,
    pub vehicle_plate: Option<String>,
    pub vehicle_make: Option<String>,
    pub vehicle_model: Option<String>,
    pub vehicle_year: Option<String>,
    pub vehicle_vin: Option<String>,
    #[serde(default)]
    pub items: Vec<CreateQuoteItemRequest>,
}

impl CreateQuoteRequest {
    /// Validates that a client is set and all embedded items are valid.
    pub fn validate(&self) -> Result<(), String> {
        if self.client_id.trim().is_empty() {
            return Err("Client ID is required".to_string());
        }
        for item in &self.items {
            item.validate()?;
        }
        Ok(())
    }
}

/// Update quote request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UpdateQuoteRequest {
    pub valid_until: Option<i64>,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub terms: Option<String>,
    pub discount_type: Option<String>,
    pub discount_value: Option<i64>,
    pub vehicle_plate: Option<String>,
    pub vehicle_make: Option<String>,
    pub vehicle_model: Option<String>,
    pub vehicle_year: Option<String>,
    pub vehicle_vin: Option<String>,
}

/// Create quote item request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateQuoteItemRequest {
    pub kind: QuoteItemKind,
    pub label: String,
    pub description: Option<String>,
    pub qty: f64,
    pub unit_price: i64,
    pub tax_rate: Option<f64>,
    pub material_id: Option<String>,
    pub position: Option<i32>,
}

impl CreateQuoteItemRequest {
    /// Validates label is non-empty and quantity is positive.
    pub fn validate(&self) -> Result<(), String> {
        if self.label.trim().is_empty() {
            return Err("Item label is required".to_string());
        }
        if self.qty <= 0.0 {
            return Err("Item quantity must be positive".to_string());
        }
        Ok(())
    }
}

/// Update quote item request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UpdateQuoteItemRequest {
    pub kind: Option<QuoteItemKind>,
    pub label: Option<String>,
    pub description: Option<String>,
    pub qty: Option<f64>,
    pub unit_price: Option<i64>,
    pub tax_rate: Option<f64>,
    pub material_id: Option<String>,
    pub position: Option<i32>,
}

/// Response for accept action that may create a task
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuoteAcceptResponse {
    pub quote: Quote,
    pub task_created: Option<TaskCreatedInfo>,
}

/// Info about a task created from quote acceptance
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct TaskCreatedInfo {
    pub task_id: String,
}

/// Response for convert-to-task action
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ConvertQuoteToTaskResponse {
    pub quote: Quote,
    pub task_id: String,
    pub task_number: String,
}

/// Response for PDF export
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuoteExportResponse {
    pub file_path: String,
}

/// Attachment type enumeration for quote attachments
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, TS)]
pub enum AttachmentType {
    #[serde(rename = "image")]
    #[default]
    Image,
    #[serde(rename = "document")]
    Document,
    #[serde(rename = "other")]
    Other,
}

impl std::fmt::Display for AttachmentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Image => "image",
            Self::Document => "document",
            Self::Other => "other",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for AttachmentType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "image" => Ok(Self::Image),
            "document" => Ok(Self::Document),
            "other" => Ok(Self::Other),
            _ => Err(format!("Invalid attachment type: {}", s)),
        }
    }
}

/// Quote attachment entity
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuoteAttachment {
    pub id: String,
    pub quote_id: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub attachment_type: AttachmentType,
    pub description: Option<String>,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    pub created_by: Option<String>,
}

/// Create quote attachment request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateQuoteAttachmentRequest {
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub attachment_type: Option<AttachmentType>,
    pub description: Option<String>,
}

impl CreateQuoteAttachmentRequest {
    /// Validates required file metadata fields are non-empty and file size is positive.
    pub fn validate(&self) -> Result<(), String> {
        if self.file_name.trim().is_empty() {
            return Err("File name is required".to_string());
        }
        if self.file_path.trim().is_empty() {
            return Err("File path is required".to_string());
        }
        if self.file_size <= 0 {
            return Err("File size must be positive".to_string());
        }
        if self.mime_type.trim().is_empty() {
            return Err("MIME type is required".to_string());
        }
        Ok(())
    }
}

/// Update quote attachment request
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UpdateQuoteAttachmentRequest {
    pub description: Option<String>,
    pub attachment_type: Option<AttachmentType>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ------------------------------------------------------------------
    // QuoteStatus::can_transition_to — state machine coverage
    // ------------------------------------------------------------------

    #[test]
    fn test_draft_can_transition_to_sent() {
        assert!(QuoteStatus::Draft.can_transition_to(&QuoteStatus::Sent));
    }

    #[test]
    fn test_draft_can_transition_to_expired() {
        assert!(QuoteStatus::Draft.can_transition_to(&QuoteStatus::Expired));
    }

    #[test]
    fn test_sent_can_transition_to_accepted() {
        assert!(QuoteStatus::Sent.can_transition_to(&QuoteStatus::Accepted));
    }

    #[test]
    fn test_sent_can_transition_to_rejected() {
        assert!(QuoteStatus::Sent.can_transition_to(&QuoteStatus::Rejected));
    }

    #[test]
    fn test_sent_can_transition_to_expired() {
        assert!(QuoteStatus::Sent.can_transition_to(&QuoteStatus::Expired));
    }

    #[test]
    fn test_sent_can_transition_to_changes_requested() {
        assert!(QuoteStatus::Sent.can_transition_to(&QuoteStatus::ChangesRequested));
    }

    #[test]
    fn test_accepted_can_transition_to_converted() {
        assert!(QuoteStatus::Accepted.can_transition_to(&QuoteStatus::Converted));
    }

    #[test]
    fn test_changes_requested_can_reopen_to_draft() {
        assert!(QuoteStatus::ChangesRequested.can_transition_to(&QuoteStatus::Draft));
    }

    #[test]
    fn test_rejected_can_reopen_to_draft() {
        assert!(QuoteStatus::Rejected.can_transition_to(&QuoteStatus::Draft));
    }

    #[test]
    fn test_terminal_statuses_have_no_outgoing_transitions() {
        // Expired and Converted are terminal.
        for terminal in &[QuoteStatus::Expired, QuoteStatus::Converted] {
            for next in &[
                QuoteStatus::Draft,
                QuoteStatus::Sent,
                QuoteStatus::Accepted,
                QuoteStatus::Rejected,
                QuoteStatus::ChangesRequested,
                QuoteStatus::Converted,
                QuoteStatus::Expired,
            ] {
                assert!(
                    !terminal.can_transition_to(next),
                    "{:?} should not transition to {:?}",
                    terminal,
                    next
                );
            }
        }
    }

    #[test]
    fn test_invalid_transitions_are_rejected() {
        // Draft cannot jump directly to Accepted/Rejected/Converted/ChangesRequested.
        assert!(!QuoteStatus::Draft.can_transition_to(&QuoteStatus::Accepted));
        assert!(!QuoteStatus::Draft.can_transition_to(&QuoteStatus::Rejected));
        assert!(!QuoteStatus::Draft.can_transition_to(&QuoteStatus::Converted));
        assert!(!QuoteStatus::Draft.can_transition_to(&QuoteStatus::ChangesRequested));
        // Accepted cannot go back to Sent or Draft.
        assert!(!QuoteStatus::Accepted.can_transition_to(&QuoteStatus::Sent));
        assert!(!QuoteStatus::Accepted.can_transition_to(&QuoteStatus::Draft));
    }

    // ------------------------------------------------------------------
    // QuoteStatus::is_draft
    // ------------------------------------------------------------------

    #[test]
    fn test_is_draft_returns_true_only_for_draft() {
        assert!(QuoteStatus::Draft.is_draft());
        assert!(!QuoteStatus::Sent.is_draft());
        assert!(!QuoteStatus::Accepted.is_draft());
        assert!(!QuoteStatus::Rejected.is_draft());
        assert!(!QuoteStatus::Expired.is_draft());
        assert!(!QuoteStatus::Converted.is_draft());
        assert!(!QuoteStatus::ChangesRequested.is_draft());
    }

    // ------------------------------------------------------------------
    // Quote::can_be_sent
    // ------------------------------------------------------------------

    fn make_quote(status: QuoteStatus, items: Vec<QuoteItem>, total: i64) -> Quote {
        Quote {
            id: "q1".to_string(),
            quote_number: "Q-001".to_string(),
            client_id: "c1".to_string(),
            task_id: None,
            status,
            valid_until: None,
            description: None,
            notes: None,
            terms: None,
            subtotal: total,
            tax_total: 0,
            total,
            discount_type: None,
            discount_value: None,
            discount_amount: None,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            created_at: 0,
            updated_at: 0,
            created_by: None,
            items,
        }
    }

    fn dummy_item() -> QuoteItem {
        QuoteItem {
            id: "i1".to_string(),
            quote_id: "q1".to_string(),
            kind: QuoteItemKind::Service,
            label: "PPF Hood".to_string(),
            description: None,
            qty: 1.0,
            unit_price: 10000,
            tax_rate: None,
            material_id: None,
            position: 0,
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn test_can_be_sent_ok_for_draft_with_items_and_nonzero_total() {
        let quote = make_quote(QuoteStatus::Draft, vec![dummy_item()], 10000);
        assert!(quote.can_be_sent().is_ok());
    }

    #[test]
    fn test_can_be_sent_fails_for_non_draft_status() {
        let quote = make_quote(QuoteStatus::Sent, vec![dummy_item()], 10000);
        let err = quote.can_be_sent().unwrap_err();
        assert!(
            err.contains("Cannot mark as sent"),
            "expected status error, got: {}",
            err
        );
    }

    #[test]
    fn test_can_be_sent_fails_when_no_items() {
        let quote = make_quote(QuoteStatus::Draft, vec![], 0);
        let err = quote.can_be_sent().unwrap_err();
        assert!(err.contains("sans lignes"), "expected empty-items error, got: {}", err);
    }

    #[test]
    fn test_can_be_sent_fails_when_total_is_zero() {
        let quote = make_quote(QuoteStatus::Draft, vec![dummy_item()], 0);
        let err = quote.can_be_sent().unwrap_err();
        assert!(err.contains("montant total nul"), "expected zero-total error, got: {}", err);
    }
}
