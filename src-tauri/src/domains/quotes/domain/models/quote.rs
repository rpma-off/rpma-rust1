//! Quote (Devis) model
//!
//! Represents quotes for PPF intervention services.

use crate::db::FromSqlRow;
use crate::shared::contracts::common::{serialize_optional_timestamp, serialize_timestamp};
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

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
    /// Public sharing token (null if not shared)
    pub public_token: Option<String>,
    /// When the quote was shared publicly
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub shared_at: Option<i64>,
    /// Number of times the public link was viewed
    pub view_count: i32,
    /// Last time the public link was viewed
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[ts(type = "string | null")]
    pub last_viewed_at: Option<i64>,
    /// Customer response message (for changes_requested or accepted status)
    pub customer_message: Option<String>,
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
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
pub struct QuoteQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub search: Option<String>,
    pub client_id: Option<String>,
    pub status: Option<QuoteStatus>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
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
    pub notes: Option<String>,
    pub terms: Option<String>,
    pub vehicle_plate: Option<String>,
    pub vehicle_make: Option<String>,
    pub vehicle_model: Option<String>,
    pub vehicle_year: Option<String>,
    pub vehicle_vin: Option<String>,
    #[serde(default)]
    pub items: Vec<CreateQuoteItemRequest>,
}

impl CreateQuoteRequest {
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

/// Response for PDF export
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuoteExportResponse {
    pub file_path: String,
}

/// Response for quote sharing link generation
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuoteShareResponse {
    pub quote_id: String,
    pub public_token: String,
    pub shared_at: i64,
}

/// Response for public quote view
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct QuotePublicViewResponse {
    pub quote_id: String,
    pub public_token: String,
    pub created_at: i64,
    pub expires_at: i64,
    pub quote: Quote,
    pub view_count: i32,
    pub last_viewed_at: Option<i64>,
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

/// Customer quote response action
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(rename_all = "snake_case")]
pub enum CustomerResponseAction {
    Accepted,
    ChangesRequested,
}

impl std::fmt::Display for CustomerResponseAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Accepted => "accepted",
            Self::ChangesRequested => "changes_requested",
        };
        write!(f, "{}", s)
    }
}

impl std::str::FromStr for CustomerResponseAction {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "accepted" => Ok(Self::Accepted),
            "changes_requested" => Ok(Self::ChangesRequested),
            _ => Err(format!("Invalid customer response action: {}", s)),
        }
    }
}

/// Customer quote response (public endpoint)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CustomerQuoteResponse {
    pub quote_id: String,
    pub public_token: String,
    pub action: CustomerResponseAction,
    pub message: Option<String>,
}

// --- FromSqlRow implementations ---

fn get_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<i64> {
    match row.get::<_, i64>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: String = row.get(column)?;
            value.parse::<i64>().map_err(|_| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    "Unable to parse integer".into(),
                )
            })
        }
    }
}

fn get_optional_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<Option<i64>> {
    match row.get::<_, Option<i64>>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: Option<String> = row.get(column)?;
            match value {
                Some(v) => v.parse::<i64>().map(Some).map_err(|_| {
                    rusqlite::Error::FromSqlConversionFailure(
                        0,
                        rusqlite::types::Type::Text,
                        "Unable to parse integer".into(),
                    )
                }),
                None => Ok(None),
            }
        }
    }
}

impl FromSqlRow for Quote {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Quote {
            id: row.get("id")?,
            quote_number: row.get("quote_number")?,
            client_id: row.get("client_id")?,
            task_id: row.get("task_id")?,
            status: match row.get::<_, String>("status")?.as_str() {
                "sent" => QuoteStatus::Sent,
                "accepted" => QuoteStatus::Accepted,
                "rejected" => QuoteStatus::Rejected,
                "expired" => QuoteStatus::Expired,
                "converted" => QuoteStatus::Converted,
                "changes_requested" => QuoteStatus::ChangesRequested,
                _ => QuoteStatus::Draft,
            },
            valid_until: get_optional_i64_from_row(row, "valid_until")?,
            description: row.get("description")?,
            notes: row.get("notes")?,
            terms: row.get("terms")?,
            subtotal: get_i64_from_row(row, "subtotal")?,
            tax_total: get_i64_from_row(row, "tax_total")?,
            total: get_i64_from_row(row, "total")?,
            discount_type: row.get("discount_type")?,
            discount_value: get_optional_i64_from_row(row, "discount_value")?,
            discount_amount: get_optional_i64_from_row(row, "discount_amount")?,
            vehicle_plate: row.get("vehicle_plate")?,
            vehicle_make: row.get("vehicle_make")?,
            vehicle_model: row.get("vehicle_model")?,
            vehicle_year: row.get("vehicle_year")?,
            vehicle_vin: row.get("vehicle_vin")?,
            public_token: row.get("public_token")?,
            shared_at: get_optional_i64_from_row(row, "shared_at")?,
            view_count: row.get("view_count").unwrap_or(0),
            last_viewed_at: get_optional_i64_from_row(row, "last_viewed_at")?,
            customer_message: row.get("customer_message")?,
            created_at: get_i64_from_row(row, "created_at")?,
            updated_at: get_i64_from_row(row, "updated_at")?,
            created_by: row.get("created_by")?,
            items: Vec::new(),
        })
    }
}

impl FromSqlRow for QuoteItem {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(QuoteItem {
            id: row.get("id")?,
            quote_id: row.get("quote_id")?,
            kind: match row.get::<_, String>("kind")?.as_str() {
                "labor" => QuoteItemKind::Labor,
                "material" => QuoteItemKind::Material,
                "discount" => QuoteItemKind::Discount,
                _ => QuoteItemKind::Service,
            },
            label: row.get("label")?,
            description: row.get("description")?,
            qty: row.get("qty")?,
            unit_price: get_i64_from_row(row, "unit_price")?,
            tax_rate: row.get("tax_rate")?,
            material_id: row.get("material_id")?,
            position: row.get("position")?,
            created_at: get_i64_from_row(row, "created_at")?,
            updated_at: get_i64_from_row(row, "updated_at")?,
        })
    }
}

impl FromSqlRow for QuoteAttachment {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(QuoteAttachment {
            id: row.get("id")?,
            quote_id: row.get("quote_id")?,
            file_name: row.get("file_name")?,
            file_path: row.get("file_path")?,
            file_size: get_i64_from_row(row, "file_size")?,
            mime_type: row.get("mime_type")?,
            attachment_type: match row.get::<_, String>("attachment_type")?.as_str() {
                "image" => AttachmentType::Image,
                "document" => AttachmentType::Document,
                _ => AttachmentType::Other,
            },
            description: row.get("description")?,
            created_at: get_i64_from_row(row, "created_at")?,
            created_by: row.get("created_by")?,
        })
    }
}
