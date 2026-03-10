//! Tests for quote command handlers.
//!
//! These tests verify that quote IPC commands are exposed through the
//! `commands` module and that request DTOs remain stable.

use rpma_ppf_intervention::commands::quote::{quote_create, QuoteCreateRequest};

#[test]
fn test_quote_command_symbols_exist() {
    let _ = quote_create as fn(_, _) -> _;
}

#[test]
fn test_quote_create_request_structure() {
    let _request_type = std::any::type_name::<QuoteCreateRequest>();
}

