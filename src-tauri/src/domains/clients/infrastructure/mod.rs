//! Client infrastructure — SQLite repository implementation.

pub mod client_query;
pub mod client_repository;
pub mod client_row_mapping;

pub use client_repository::SqliteClientRepository;
