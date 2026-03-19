//! Client service — re-exported from the application layer.
//!
//! The canonical implementation lives in
//! `crate::domains::clients::application::client_service`.
//! This module re-exports it so that every existing import path
//! (`super::service::ClientService`, `client_handler::ClientService`, …)
//! continues to compile unchanged during the incremental migration.

pub use crate::domains::clients::application::client_service::{
    ClientStat, ClientService, ClientStats,
};

