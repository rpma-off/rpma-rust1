//! Material Service — coordinator for PPF material inventory and consumption management.
//!
//! Implementation is split across focused submodules:
//! - `errors`      — Error types (`MaterialError`, `MaterialResult`)
//! - `types`       — Request DTOs
//! - `crud`        — Material CRUD operations and upsert/validation helpers
//! - `stock_ops`   — Atomic stock/consumption writes
//! - `stats`       — Read-only stats and reporting queries
//! - `delegation`  — Pass-throughs to sub-repositories

use crate::db::Database;

use super::inventory_transaction_service::InventoryTransactionService;
use super::material_category_repository::MaterialCategoryRepository;
use super::material_consumption_repository::MaterialConsumptionRepository;
use super::supplier_repository::SupplierRepository;

// ── Error types ───────────────────────────────────────────────────────────────

pub(crate) mod errors;
pub use errors::{MaterialError, MaterialResult};

// ── Request DTOs ──────────────────────────────────────────────────────────────

pub(crate) mod types;
pub use types::{
    CreateInventoryTransactionRequest, CreateMaterialCategoryRequest, CreateMaterialRequest,
    CreateSupplierRequest, RecordConsumptionRequest, UpdateStockRequest,
};

// ── Submodule implementations ─────────────────────────────────────────────────

mod crud;
mod delegation;
mod stats;
mod stock_ops;

#[cfg(test)]
mod tests;

// ── MaterialService ───────────────────────────────────────────────────────────

/// Central coordinator for material inventory operations.
///
/// Delegates read operations to focused sub-repositories and retains the
/// atomic write operations that must span multiple tables in one transaction.
#[derive(Debug)]
pub struct MaterialService {
    pub(super) db: Database,
    pub(super) categories: MaterialCategoryRepository,
    pub(super) suppliers: SupplierRepository,
    pub(super) consumption: MaterialConsumptionRepository,
    pub(super) transactions: InventoryTransactionService,
}

impl MaterialService {
    /// TODO: document
    pub fn new(db: Database) -> Self {
        Self {
            categories: MaterialCategoryRepository::new(db.clone()),
            suppliers: SupplierRepository::new(db.clone()),
            consumption: MaterialConsumptionRepository::new(db.clone()),
            transactions: InventoryTransactionService::new(db.clone()),
            db,
        }
    }
}
