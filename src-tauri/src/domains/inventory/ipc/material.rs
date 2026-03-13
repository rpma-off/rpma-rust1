//! Tauri commands for material management - PRD-08
//!
//! Provides IPC endpoints for material inventory management and consumption tracking.
//! Split into focused submodules:
//!   - `crud`        — create, get, list, update, delete
//!   - `stock`       — stock updates, consumption, transactions
//!   - `stats`       — statistics, low-stock, expired, dashboard
//!   - `categories`  — material category management
//!   - `suppliers`   — supplier management

pub mod categories;
pub mod crud;
pub mod stats;
pub mod stock;
pub mod suppliers;

pub use categories::*;
pub use crud::*;
pub use stats::*;
pub use stock::*;
pub use suppliers::*;

