pub mod batching;
pub mod commands;
pub mod db;
pub mod domains;
pub mod ipc_serialization;
pub mod logging;
pub mod memory_management;
pub mod memory_management_helpers;
pub mod shared;
pub mod worker_pool;

#[cfg(test)]
pub mod test_utils;

#[cfg(all(test, feature = "legacy-tests"))]
pub mod tests;

#[cfg(test)]
mod smoke_tests;

// Type generation for frontend (only available with export-types feature)
#[cfg(feature = "export-types")]
pub use domains::inventory::domain::models::material_ts::*;
