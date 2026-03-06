//! Application layer for the Quotes bounded context.
//!
//! Contains the `QuoteService` (business logic) and request/response
//! contracts for external consumers.

mod contracts;
pub(crate) mod quote_service;

pub use contracts::{
    QuoteAttachmentCreateRequest, QuoteAttachmentDeleteRequest,
    QuoteAttachmentUpdateRequest, QuoteAttachmentsGetRequest, QuoteCreateRequest,
    QuoteDeleteRequest, QuoteGetRequest, QuoteItemAddRequest, QuoteItemDeleteRequest,
    QuoteItemUpdateRequest, QuoteListRequest,
    QuoteStatusRequest, QuoteUpdateRequest,
};
