//! Application layer for the Quotes bounded context.
//!
//! Re-exports request/response contracts for external consumers.

mod contracts;

pub use contracts::{
    QuoteAcknowledgeRequest, QuoteAttachmentCreateRequest, QuoteAttachmentDeleteRequest,
    QuoteAttachmentUpdateRequest, QuoteAttachmentsGetRequest, QuoteCreateRequest,
    QuoteDeleteRequest, QuoteGetRequest, QuoteItemAddRequest, QuoteItemDeleteRequest,
    QuoteItemUpdateRequest, QuoteListRequest, QuotePublicViewRequest, QuoteRevokeRequest,
    QuoteShareRequest, QuoteStatusRequest, QuoteUpdateRequest,
};
