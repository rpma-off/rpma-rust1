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

        let intervention_id = request.intervention_id.clone();
        let material_id = request.material_id.clone();
        let recorded_by = recorded_by.clone();

        let id = crate::shared::utils::uuid::generate_uuid_string();
        let mut consumption = MaterialConsumption::new(
            id,
            intervention_id.clone(),
            material_id.clone(),
            request.quantity_used,
        );

        consumption.step_id = request.step_id;
        consumption.step_number = request.step_number;
        consumption.waste_quantity = waste_quantity;
        consumption.waste_reason = request.waste_reason;
        consumption.batch_used = request.batch_used;
        consumption.quality_notes = request.quality_notes;
        consumption.recorded_by = Some(recorded_by.clone());
        consumption.unit_cost = material.unit_cost;
        consumption.calculate_total_cost();

        let new_stock = material.current_stock - total_needed;
        let material_id_for_update = material_id.clone();
        let recorded_by_for_update = recorded_by.clone();
        let now = crate::shared::contracts::common::now();
        let total_used = total_needed;
        let transaction = InventoryTransaction {
            id: crate::shared::utils::uuid::generate_uuid_string(),
            material_id: material_id.clone(),
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
            performed_by: recorded_by.clone(),
            performed_at: now,
            created_at: now,
            updated_at: now,
            synced: false,
            last_synced_at: None,
        };
        self.db
            .with_transaction(|tx| {
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
                        consumption.id,
                        consumption.intervention_id,
                        consumption.material_id,
                        consumption.step_id,
                        consumption.quantity_used,
                        consumption.unit_cost,
                        consumption.total_cost,
                        consumption.waste_quantity,
                        consumption.waste_reason,
                        consumption.batch_used,
                        consumption.expiry_used,
                        consumption.quality_notes,
                        consumption.step_number,
                        consumption.recorded_by,
                        consumption.recorded_at,
                        consumption.created_at,
                        consumption.updated_at,
                        consumption.synced,
                        consumption.last_synced_at,
                    ],
                )
                .map_err(|e| e.to_string())?;
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
                        transaction.id,
                        transaction.material_id,
                        transaction.transaction_type.to_string(),
                        transaction.quantity,
                        transaction.previous_stock,
                        transaction.new_stock,
                        transaction.reference_number,
                        transaction.reference_type,
                        transaction.notes,
                        transaction.unit_cost,
                        transaction.total_cost,
                        transaction.warehouse_id,
                        transaction.location_from,
                        transaction.location_to,
                        transaction.batch_number,
                        transaction.expiry_date,
                        transaction.quality_status,
                        transaction.intervention_id,
                        transaction.step_id,
                        transaction.performed_by,
                        transaction.performed_at,
                        transaction.created_at,
                        transaction.updated_at,
                        transaction.synced,
                        transaction.last_synced_at,
                    ],
                )
                .map_err(|e| e.to_string())?;
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
        if request.quantity.is_nan() || request.quantity.is_infinite() {
            return Err(MaterialError::Validation(
                "Transaction quantity must be a finite number".to_string(),
            ));
        }

        // Validate quantity against transaction type.
        // - Adjustment and all other types are movements: qty must be > 0.
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

        let material = self.get_material(&request.material_id)?.ok_or_else(|| {
            MaterialError::NotFound(format!("Material {} not found", request.material_id))
        })?;
        self.ensure_material_active(&material)?;

        let previous_stock = material.current_stock;

        let new_stock = match request.transaction_type {
            InventoryTransactionType::StockIn | InventoryTransactionType::Return => {
                previous_stock + request.quantity
            }
            InventoryTransactionType::StockOut
            | InventoryTransactionType::Waste
            | InventoryTransactionType::Transfer => {
                if previous_stock < request.quantity {
                    return Err(MaterialError::InsufficientStock(format!(
                        "Insufficient stock: {} available, {} requested",
                        previous_stock, request.quantity
                    )));
                }
                previous_stock - request.quantity
            }
            InventoryTransactionType::Adjustment => request.quantity,
        };

        if new_stock < 0.0 {
            return Err(MaterialError::InsufficientStock(format!(
                "Cannot set stock below 0. Current: {}, Requested: {}",
                previous_stock, new_stock
            )));
        }

        if let Some(max_stock) = material.maximum_stock {
            if new_stock > max_stock {
                return Err(MaterialError::Validation(format!(
                    "New stock {} would exceed maximum stock limit of {}",
                    new_stock, max_stock
                )));
            }
        }

        let id = crate::shared::utils::uuid::generate_uuid_string();
        let total_cost = request.unit_cost.map(|uc| uc * request.quantity);

        let transaction = InventoryTransaction {
            id,
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
            performed_at: crate::shared::contracts::common::now(),
            created_at: crate::shared::contracts::common::now(),
            updated_at: crate::shared::contracts::common::now(),
            synced: false,
            last_synced_at: None,
        };

        let material_id_for_update = request.material_id.clone();
        let updated_by = user_id.to_string();
        let now = crate::shared::contracts::common::now();
        self.db.with_transaction(|tx| {
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
                    transaction.id,
                    transaction.material_id,
                    transaction.transaction_type.to_string(),
                    transaction.quantity,
                    transaction.previous_stock,
                    transaction.new_stock,
                    transaction.reference_number,
                    transaction.reference_type,
                    transaction.notes,
                    transaction.unit_cost,
                    transaction.total_cost,
                    transaction.warehouse_id,
                    transaction.location_from,
                    transaction.location_to,
                    transaction.batch_number,
                    transaction.expiry_date,
                    transaction.quality_status,
                    transaction.intervention_id,
                    transaction.step_id,
                    transaction.performed_by,
                    transaction.performed_at,
                    transaction.created_at,
                    transaction.updated_at,
                    transaction.synced,
                    transaction.last_synced_at,
                ],
            )
            .map_err(|e| e.to_string())?;
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
