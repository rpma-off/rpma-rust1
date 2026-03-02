//! Application-layer contracts (DTOs) for the Quotes bounded context.

use crate::domains::quotes::domain::models::quote::*;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct QuoteCreateRequest {
    pub session_token: String,
    pub data: CreateQuoteRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteGetRequest {
    pub session_token: String,
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteListRequest {
    pub session_token: String,
    #[serde(default)]
    pub filters: QuoteQuery,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteUpdateRequest {
    pub session_token: String,
    pub id: String,
    pub data: UpdateQuoteRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteDeleteRequest {
    pub session_token: String,
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteItemAddRequest {
    pub session_token: String,
    pub quote_id: String,
    pub item: CreateQuoteItemRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteItemUpdateRequest {
    pub session_token: String,
    pub quote_id: String,
    pub item_id: String,
    pub data: UpdateQuoteItemRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteItemDeleteRequest {
    pub session_token: String,
    pub quote_id: String,
    pub item_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteStatusRequest {
    pub session_token: String,
    pub id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentsGetRequest {
    pub session_token: String,
    pub quote_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentCreateRequest {
    pub session_token: String,
    pub quote_id: String,
    pub data: CreateQuoteAttachmentRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentUpdateRequest {
    pub session_token: String,
    pub quote_id: String,
    pub attachment_id: String,
    pub data: UpdateQuoteAttachmentRequest,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteAttachmentDeleteRequest {
    pub session_token: String,
    pub quote_id: String,
    pub attachment_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteShareRequest {
    pub session_token: String,
    pub quote_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuoteRevokeRequest {
    pub session_token: String,
    pub quote_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct QuotePublicViewRequest {
    pub public_token: String,
}

#[derive(Deserialize, Debug)]
pub struct QuoteAcknowledgeRequest {
    pub session_token: String,
    pub quote_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}
