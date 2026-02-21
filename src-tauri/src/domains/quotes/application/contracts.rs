//! Application-layer contracts (DTOs) for the Quotes bounded context.

use crate::models::quote::*;
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
