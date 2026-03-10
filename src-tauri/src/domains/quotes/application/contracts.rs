//! Application-layer contracts (DTOs) for the Quotes bounded context.

use crate::domains::quotes::domain::models::quote::*;
use serde::Deserialize;

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteCreateRequest {
    pub session_token: String,
    pub data: CreateQuoteRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteGetRequest {
    pub session_token: String,
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteListRequest {
    pub session_token: String,
    #[serde(default)]
    pub filters: QuoteQuery,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteUpdateRequest {
    pub session_token: String,
    pub id: String,
    pub data: UpdateQuoteRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteDeleteRequest {
    pub session_token: String,
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteItemAddRequest {
    pub session_token: String,
    pub quote_id: String,
    pub item: CreateQuoteItemRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteItemUpdateRequest {
    pub session_token: String,
    pub quote_id: String,
    pub item_id: String,
    pub data: UpdateQuoteItemRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteItemDeleteRequest {
    pub session_token: String,
    pub quote_id: String,
    pub item_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteStatusRequest {
    pub session_token: String,
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteDuplicateRequest {
    pub session_token: String,
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentsGetRequest {
    pub session_token: String,
    pub quote_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentCreateRequest {
    pub session_token: String,
    pub quote_id: String,
    pub data: CreateQuoteAttachmentRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentUpdateRequest {
    pub session_token: String,
    pub quote_id: String,
    pub attachment_id: String,
    pub data: UpdateQuoteAttachmentRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentDeleteRequest {
    pub session_token: String,
    pub quote_id: String,
    pub attachment_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// TODO: document
#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentOpenRequest {
    pub session_token: String,
    pub attachment_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request to convert an accepted quote into a task.
///
/// The `vehicle_*` and `scheduled_date` fields provide the data
/// needed to create the corresponding task at the IPC orchestration
/// layer.
#[derive(Deserialize, Debug)]
pub struct QuoteConvertToTaskRequest {
    pub session_token: String,
    pub quote_id: String,
    pub vehicle_plate: String,
    pub vehicle_model: String,
    pub vehicle_make: Option<String>,
    pub vehicle_year: Option<String>,
    pub vehicle_vin: Option<String>,
    pub scheduled_date: Option<String>,
    pub ppf_zones: Option<Vec<String>>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
