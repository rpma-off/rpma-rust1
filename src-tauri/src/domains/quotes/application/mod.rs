// Application layer for the Quotes bounded context.
//
// Re-exports the public IPC contracts for quote operations.

pub use crate::domains::quotes::ipc::quote::{
    QuoteCreateRequest, QuoteDeleteRequest, QuoteGetRequest, QuoteItemAddRequest,
    QuoteItemDeleteRequest, QuoteItemUpdateRequest, QuoteListRequest, QuoteStatusRequest,
    QuoteUpdateRequest,
};
