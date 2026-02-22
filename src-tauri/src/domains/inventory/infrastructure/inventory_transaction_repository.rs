use std::sync::Arc;

use rusqlite::params;

use crate::domains::inventory::domain::models::material::InventoryTransaction;
use crate::shared::db::Database;

#[allow(dead_code)]
#[derive(Debug)]
pub struct InventoryTransactionRepository {
    db: Arc<Database>,
}

impl InventoryTransactionRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub fn reference_exists(
        &self,
        tx: &rusqlite::Transaction<'_>,
        reference_type: &str,
        reference_number: &str,
    ) -> Result<bool, String> {
        let count: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM inventory_transactions WHERE reference_type = ? AND reference_number = ?",
                params![reference_type, reference_number],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(count > 0)
    }

    pub fn insert(
        &self,
        tx: &rusqlite::Transaction<'_>,
        transaction: &InventoryTransaction,
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
        Ok(())
    }

    #[allow(dead_code)]
    pub fn db(&self) -> &Arc<Database> {
        &self.db
    }
}
