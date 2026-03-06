//! Pass-through methods delegating to sub-repositories.

use crate::domains::inventory::domain::models::material::{
    InventoryMovementSummary, InventoryStats, InventoryTransaction, InventoryTransactionType,
    MaterialCategory, MaterialConsumption, Supplier,
};

use super::errors::MaterialResult;
use super::types::{CreateMaterialCategoryRequest, CreateSupplierRequest};

impl super::MaterialService {
    // ── Delegation to sub-repositories ───────────────────────────────────────

    // -- Category --

    pub fn create_material_category(
        &self,
        request: CreateMaterialCategoryRequest,
        created_by: Option<String>,
    ) -> MaterialResult<MaterialCategory> {
        self.categories
            .create_material_category(request, created_by)
    }

    pub fn get_material_category(&self, id: &str) -> MaterialResult<Option<MaterialCategory>> {
        self.categories.get_material_category(id)
    }

    pub fn list_material_categories(
        &self,
        active_only: bool,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<MaterialCategory>> {
        self.categories
            .list_material_categories(active_only, limit, offset)
    }

    pub fn update_material_category(
        &self,
        id: &str,
        request: CreateMaterialCategoryRequest,
        updated_by: Option<String>,
    ) -> MaterialResult<MaterialCategory> {
        self.categories
            .update_material_category(id, request, updated_by)
    }

    // -- Supplier --

    pub fn create_supplier(
        &self,
        request: CreateSupplierRequest,
        created_by: Option<String>,
    ) -> MaterialResult<Supplier> {
        self.suppliers.create_supplier(request, created_by)
    }

    pub fn get_supplier(&self, id: &str) -> MaterialResult<Option<Supplier>> {
        self.suppliers.get_supplier(id)
    }

    pub fn list_suppliers(
        &self,
        active_only: bool,
        preferred_only: Option<bool>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<Supplier>> {
        self.suppliers
            .list_suppliers(active_only, preferred_only, limit, offset)
    }

    pub fn update_supplier(
        &self,
        id: &str,
        request: CreateSupplierRequest,
        updated_by: Option<String>,
    ) -> MaterialResult<Supplier> {
        self.suppliers.update_supplier(id, request, updated_by)
    }

    // -- Consumption reads --

    pub fn get_intervention_consumption(
        &self,
        intervention_id: &str,
    ) -> MaterialResult<Vec<MaterialConsumption>> {
        self.consumption
            .get_intervention_consumption(intervention_id)
    }

    pub fn get_consumption_history(
        &self,
        material_id: &str,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<MaterialConsumption>> {
        self.consumption
            .get_consumption_history(material_id, limit, offset)
    }

    // -- Transaction reads / stats --

    pub fn list_inventory_transactions_by_material(
        &self,
        material_id: &str,
        transaction_type: Option<InventoryTransactionType>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<InventoryTransaction>> {
        self.transactions.list_inventory_transactions_by_material(
            material_id,
            transaction_type,
            limit,
            offset,
        )
    }

    pub fn list_recent_inventory_transactions(
        &self,
        limit: i32,
    ) -> MaterialResult<Vec<InventoryTransaction>> {
        self.transactions.list_recent_inventory_transactions(limit)
    }

    pub fn get_inventory_stats(&self) -> MaterialResult<InventoryStats> {
        self.transactions.get_inventory_stats()
    }

    pub fn get_inventory_movement_summary(
        &self,
        material_id: Option<&str>,
        date_from: Option<&str>,
        date_to: Option<&str>,
    ) -> MaterialResult<Vec<InventoryMovementSummary>> {
        self.transactions
            .get_inventory_movement_summary(material_id, date_from, date_to)
    }
}
