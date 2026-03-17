pub(crate) mod quote_attachments;
pub(crate) mod quote_crud;
pub(crate) mod quote_export;
pub(crate) mod quote_items;
pub(crate) mod quote_status;

/// Re-export all handlers so existing `domains::quotes::ipc::quote::*` paths
/// continue to work.
pub(crate) mod quote;
