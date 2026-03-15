//! Application layer for the Quotes bounded context.
//!
//! Contains the `QuoteService` (business logic) and request/response
//! contracts for external consumers.

mod contracts;
mod quote_attachment_service;
mod quote_events;
pub(crate) mod quote_export_service;
pub(crate) mod quote_service;
// quote_task_creation module removed: cross-domain SQL (tasks table) violated ADR-001/ADR-004.
mod quote_totals;

pub use contracts::{
    QuoteAttachmentCreateRequest, QuoteAttachmentDeleteRequest, QuoteAttachmentOpenRequest,
    QuoteAttachmentUpdateRequest, QuoteAttachmentsGetRequest, QuoteConvertToTaskRequest,
    QuoteCreateRequest, QuoteDeleteRequest, QuoteDuplicateRequest, QuoteGetRequest,
    QuoteItemAddRequest, QuoteItemDeleteRequest, QuoteItemUpdateRequest, QuoteListRequest,
    QuoteStatusRequest, QuoteUpdateRequest,
};
