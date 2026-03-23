//! Atomic stock and consumption write operations.

use crate::domains::inventory::domain::models::material::{
    InventoryTransaction, InventoryTransactionType, Material, MaterialConsumption,
};
use rusqlite::params;
use tracing::{debug, info};

use super::errors::{MaterialError, MaterialResult};
use super::types::{
    CreateInventoryTransactionRequest, RecordConsumptionRequest, UpdateStockRequest,
};

impl super::MaterialService {
    // ── Atomic stock / consumption writes ────────────────────────────────────

    /// Update material stock level.
    pub fn update_stock(&self, request: UpdateStockRequest) -> MaterialResult<Material> {
        let recorded_by = request
            .recorded_by
            .clone()
            .filter(|user_id| !user_id.trim().is_empty())
            .ok_or_else(|| {
                MaterialError::Authorization("User ID is required to update stock".to_string())
            })?;
        self.validate_stock_update(&request)?;

        let transaction_type = if request.quantity_change > 0.0 {
            InventoryTransactionType::StockIn
        } else {
            InventoryTransactionType::StockOut
        };

        let transaction_request = CreateInventoryTransactionRequest {
            material_id: request.material_id.clone(),
            transaction_type,
            quantity: request.quantity_change.abs(),
            unit_cost: None,
            reference_number: None,
            reference_type: Some("manual_update".to_string()),
            notes: Some(request.reason.clone()),
            warehouse_id: None,
            location_from: None,
            location_to: None,
            batch_number: None,
            expiry_date: None,
            quality_status: None,
            intervention_id: None,
            step_id: None,
        };

        self.create_inventory_transaction(transaction_request, &recorded_by)?;

        self.get_material(&request.material_id)?.ok_or_else(|| {
            MaterialError::NotFound(format!(
                "Material {} not found after stock update",
                request.material_id
            ))
        })
    }

    /// Record material consumption for an intervention.
    ///
    /// Atomically inserts the consumption record, appends an audit transaction,
    /// and decrements `materials.current_stock` in a single DB transaction.
    pub fn record_consumption(
        &self,
        request: RecordConsumptionRequest,
    ) -> MaterialResult<MaterialConsumption> {
        let recorded_by = request
            .recorded_by
            .clone()
            .filter(|user_id| !user_id.trim().is_empty())
            .ok_or_else(|| {
                MaterialError::Authorization(
                    "User ID is required to record consumption".to_string(),
                )
            })?;
        self.validate_consumption_request(&request)?;
        debug!(
            material_id = %request.material_id,
            intervention_id = %request.intervention_id,
            quantity_used = request.quantity_used,
            "Recording material consumption"
        );
        let material = self.get_material(&request.material_id)?.ok_or_else(|| {
            MaterialError::NotFound(format!("Material {} not found", request.material_id))
        })?;
        self.ensure_material_active(&material)?;

        if material.is_expired() {
            return Err(MaterialError::ExpiredMaterial(format!(
                "Material {} is expired",
                material.name
            )));
        }

        let waste_quantity = request.waste_quantity.unwrap_or(0.0);
        let total_needed = request.quantity_used + waste_quantity;
        if material.current_stock < total_needed {
            return Err(MaterialError::InsufficientStock(format!(
                "Material {} has insufficient stock. Available: {}, Needed: {}",
                material.name, material.current_stock, total_needed
            )));
        }

        let consumption =
            Self::build_consumption_record(&request, &recorded_by, &material, waste_quantity);
        let new_stock = material.current_stock - total_needed;
        let now = crate::shared::contracts::common::now();
        let transaction =
            Self::build_consumption_transaction(&consumption, &material, total_needed, new_stock, &recorded_by, now);

        let material_id_for_update = request.material_id.clone();
        let recorded_by_for_update = recorded_by.clone();
        self.db
            .with_transaction(|tx| {
                Self::insert_consumption(tx, &consumption)?;
                Self::insert_inventory_transaction(tx, &transaction)?;
                tx.execute(
                    "UPDATE materials SET current_stock = ?, updated_at = ?, updated_by = ? WHERE id = ?",
                    params![
                        new_stock,
                        now,
                        Some(recorded_by_for_update),
                        material_id_for_update
                    ],
                )
                .map_err(|e| e.to_string())?;
                Ok(())
            })
            .map_err(MaterialError::Database)?;

        info!(
            consumption_id = %consumption.id,
            material_id = %consumption.material_id,
            intervention_id = %consumption.intervention_id,
            "Consumption recorded, stock decremented"
        );
        Ok(consumption)
    }

    /// Build a `MaterialConsumption` record from the request and fetched material.
    fn build_consumption_record(
        request: &RecordConsumptionRequest,
        recorded_by: &str,
        material: &Material,
        waste_quantity: f64,
    ) -> MaterialConsumption {
        let id = crate::shared::utils::uuid::generate_uuid_string();
        let mut consumption = MaterialConsumption::new(
            id,
            request.intervention_id.clone(),
            request.material_id.clone(),
            request.quantity_used,
        );

        consumption.step_id = request.step_id.clone();
        consumption.step_number = request.step_number;
        consumption.waste_quantity = waste_quantity;
        consumption.waste_reason = request.waste_reason.clone();
        consumption.batch_used = request.batch_used.clone();
        consumption.quality_notes = request.quality_notes.clone();
        consumption.recorded_by = Some(recorded_by.to_string());
        consumption.unit_cost = material.unit_cost;
        consumption.calculate_total_cost();
        consumption
    }

    /// Build the audit `InventoryTransaction` that accompanies a consumption record.
    fn build_consumption_transaction(
        consumption: &MaterialConsumption,
        material: &Material,
        total_used: f64,
        new_stock: f64,
        recorded_by: &str,
        now: i64,
    ) -> InventoryTransaction {
        InventoryTransaction {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            material_id: consumption.material_id.clone(),
            transaction_type: InventoryTransactionType::StockOut,
            quantity: total_used,
            previous_stock: material.current_stock,
            new_stock,
            reference_number: Some(consumption.id.clone()),
            reference_type: Some("consumption".to_string()),
            notes: Some("Intervention consumption".to_string()),
            unit_cost: material.unit_cost,
            total_cost: consumption.total_cost,
            warehouse_id: material.warehouse_id.clone(),
            location_from: None,
            location_to: None,
            batch_number: consumption.batch_used.clone(),
            expiry_date: consumption.expiry_used,
            quality_status: None,
            intervention_id: Some(consumption.intervention_id.clone()),
            step_id: consumption.step_id.clone(),
            performed_by: recorded_by.to_string(),
            performed_at: now,
            created_at: now,
            updated_at: now,
            synced: false,
            last_synced_at: None,
        }
    }

    /// Insert a `MaterialConsumption` row within an existing transaction.
    fn insert_consumption(
        tx: &rusqlite::Transaction<'_>,
        c: &MaterialConsumption,
    ) -> Result<(), String> {
        tx.execute(
            r#"
            INSERT INTO material_consumption (
                id, intervention_id, material_id, step_id, quantity_used, unit_cost,
                total_cost, waste_quantity, waste_reason, batch_used, expiry_used,
                quality_notes, step_number, recorded_by, recorded_at, created_at,
                updated_at, synced, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                c.id,
                c.intervention_id,
                c.material_id,
                c.step_id,
                c.quantity_used,
                c.unit_cost,
                c.total_cost,
                c.waste_quantity,
                c.waste_reason,
                c.batch_used,
                c.expiry_used,
                c.quality_notes,
                c.step_number,
                c.recorded_by,
                c.recorded_at,
                c.created_at,
                c.updated_at,
                c.synced,
                c.last_synced_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Insert an `InventoryTransaction` row within an existing transaction.
    fn insert_inventory_transaction(
        tx: &rusqlite::Transaction<'_>,
        t: &InventoryTransaction,
    ) -> Result<(), String> {
        tx.execute(
            r#"
            INSERT INTO inventory_transactions (
                id, material_id, transaction_type, quantity, previous_stock, new_stock,
                reference_number, reference_type, notes, unit_cost, total_cost,
                warehouse_id, location_from, location_to, batch_number, expiry_date, quality_status,
                intervention_id, step_id, performed_by, performed_at, created_at, updated_at, synced, last_synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                t.id,
                t.material_id,
                t.transaction_type.to_string(),
                t.quantity,
                t.previous_stock,
                t.new_stock,
                t.reference_number,
                t.reference_type,
                t.notes,
                t.unit_cost,
                t.total_cost,
                t.warehouse_id,
                t.location_from,
                t.location_to,
                t.batch_number,
                t.expiry_date,
                t.quality_status,
                t.intervention_id,
                t.step_id,
                t.performed_by,
                t.performed_at,
                t.created_at,
                t.updated_at,
                t.synced,
                t.last_synced_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Create an inventory transaction and atomically update stock.
    pub fn create_inventory_transaction(
        &self,
        request: CreateInventoryTransactionRequest,
        user_id: &str,
    ) -> MaterialResult<InventoryTransaction> {
        debug!(
            material_id = %request.material_id,
            transaction_type = ?request.transaction_type,
            quantity = request.quantity,
            "Creating inventory transaction"
        );
        Self::validate_transaction_quantity(&request)?;

        let material = self.get_material(&request.material_id)?.ok_or_else(|| {
            MaterialError::NotFound(format!("Material {} not found", request.material_id))
        })?;
        self.ensure_material_active(&material)?;

        let previous_stock = material.current_stock;
        let new_stock =
            Self::calculate_new_stock(previous_stock, &request.transaction_type, request.quantity)?;

        if let Some(max_stock) = material.maximum_stock {
            if new_stock > max_stock {
                return Err(MaterialError::Validation(format!(
                    "New stock {} would exceed maximum stock limit of {}",
                    new_stock, max_stock
                )));
            }
        }

        let total_cost = request.unit_cost.map(|uc| uc * request.quantity);
        let now = crate::shared::contracts::common::now();

        let transaction = InventoryTransaction {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            material_id: request.material_id.clone(),
            transaction_type: request.transaction_type.clone(),
            quantity: request.quantity,
            previous_stock,
            new_stock,
            reference_number: request.reference_number.clone(),
            reference_type: request.reference_type.clone(),
            notes: request.notes.clone(),
            unit_cost: request.unit_cost,
            total_cost,
            warehouse_id: request.warehouse_id.clone(),
            location_from: request.location_from.clone(),
            location_to: request.location_to.clone(),
            batch_number: request.batch_number.clone(),
            expiry_date: request.expiry_date,
            quality_status: request.quality_status.clone(),
            intervention_id: request.intervention_id.clone(),
            step_id: request.step_id.clone(),
            performed_by: user_id.to_string(),
            performed_at: now,
            created_at: now,
            updated_at: now,
            synced: false,
            last_synced_at: None,
        };

        let material_id_for_update = request.material_id.clone();
        let updated_by = user_id.to_string();
        self.db.with_transaction(|tx| {
            Self::insert_inventory_transaction(tx, &transaction)?;
            tx.execute(
                "UPDATE materials SET current_stock = ?, updated_at = ?, updated_by = ? WHERE id = ?",
                params![new_stock, now, Some(updated_by), material_id_for_update],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
        .map_err(MaterialError::Database)?;

        info!(
            transaction_id = %transaction.id,
            material_id = %transaction.material_id,
            new_stock = new_stock,
            "Inventory transaction committed"
        );
        Ok(transaction)
    }

    /// Validate that the transaction quantity is a valid positive finite number.
    fn validate_transaction_quantity(
        request: &CreateInventoryTransactionRequest,
    ) -> MaterialResult<()> {
        if request.quantity.is_nan() || request.quantity.is_infinite() {
            return Err(MaterialError::Validation(
                "Transaction quantity must be a finite number".to_string(),
            ));
        }

        match request.transaction_type {
            InventoryTransactionType::Adjustment => {
                if request.quantity <= 0.0 {
                    return Err(MaterialError::Validation(
                        "Adjustment quantity must be greater than 0".to_string(),
                    ));
                }
            }
            _ => {
                if request.quantity <= 0.0 {
                    return Err(MaterialError::Validation(
                        "Transaction quantity must be greater than 0".to_string(),
                    ));
                }
            }
        }

        Ok(())
    }

    /// Calculate the resulting stock level after applying a transaction.
    ///
    /// Returns `Err` if the operation would cause insufficient stock or a
    /// negative balance.
    fn calculate_new_stock(
        previous_stock: f64,
        transaction_type: &InventoryTransactionType,
        quantity: f64,
    ) -> MaterialResult<f64> {
        let new_stock = match transaction_type {
            InventoryTransactionType::StockIn | InventoryTransactionType::Return => {
                previous_stock + quantity
            }
            InventoryTransactionType::StockOut
            | InventoryTransactionType::Waste
            | InventoryTransactionType::Transfer => {
                if previous_stock < quantity {
                    return Err(MaterialError::InsufficientStock(format!(
                        "Insufficient stock: {} available, {} requested",
                        previous_stock, quantity
                    )));
                }
                previous_stock - quantity
            }
            InventoryTransactionType::Adjustment => quantity,
        };

        if new_stock < 0.0 {
            return Err(MaterialError::InsufficientStock(format!(
                "Cannot set stock below 0. Current: {}, Requested: {}",
                previous_stock, new_stock
            )));
        }

        Ok(new_stock)
    }

    // ── Private stock helpers ─────────────────────────────────────────────────

    pub(super) fn ensure_material_active(&self, material: &Material) -> MaterialResult<()> {
        if material.is_discontinued {
            return Err(MaterialError::Validation(
                "Material is discontinued".to_string(),
            ));
        }
        if !material.is_active {
            return Err(MaterialError::Validation(
                "Material is inactive".to_string(),
            ));
        }
        Ok(())
    }

    fn validate_stock_update(&self, request: &UpdateStockRequest) -> MaterialResult<()> {
        if request.material_id.trim().is_empty() {
            return Err(MaterialError::Validation(
                "Material ID is required".to_string(),
            ));
        }

        if request.reason.trim().is_empty() {
            return Err(MaterialError::Validation(
                "Stock update reason is required".to_string(),
            ));
        }

        if !request.quantity_change.is_finite() {
            return Err(MaterialError::Validation(
                "Stock change must be a finite number".to_string(),
            ));
        }

        if request.quantity_change == 0.0 {
            return Err(MaterialError::Validation(
                "Stock change cannot be zero".to_string(),
            ));
        }

        Ok(())
    }

    fn validate_consumption_request(
        &self,
        request: &RecordConsumptionRequest,
    ) -> MaterialResult<()> {
        if request.material_id.trim().is_empty() {
            return Err(MaterialError::Validation(
                "Material ID is required".to_string(),
            ));
        }

        if request.intervention_id.trim().is_empty() {
            return Err(MaterialError::Validation(
                "Intervention ID is required".to_string(),
            ));
        }

        if !request.quantity_used.is_finite() || request.quantity_used <= 0.0 {
            return Err(MaterialError::Validation(
                "Quantity used must be greater than 0".to_string(),
            ));
        }

        if let Some(waste_quantity) = request.waste_quantity {
            if !waste_quantity.is_finite() || waste_quantity < 0.0 {
                return Err(MaterialError::Validation(
                    "Waste quantity must be a non-negative number".to_string(),
                ));
            }
        }

        Ok(())
    }
}
