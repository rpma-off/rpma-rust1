#![doc = include_str!("../../docs/adr/001-four-layer-architecture.md")]

pub mod commands;
pub mod db;
pub mod domains;
pub mod infrastructure;
pub mod logging;
pub mod shared;

#[cfg(test)]
mod service_builder;
pub mod models {
    pub mod client {
        pub use crate::domains::clients::client_handler::{
            CreateClientRequest, CustomerType,
        };
    }
}

#[cfg(test)]
pub mod test_utils;

#[cfg(all(test, feature = "legacy-tests"))]
pub mod tests;

#[cfg(test)]
mod smoke_tests;

#[cfg(test)]
mod boundary_tests;

// Type generation for frontend (only available with export-types feature)
#[cfg(feature = "export-types")]
pub use domains::inventory::domain::models::material_ts::*;
