/// ADR-005: Repository Pattern
use std::collections::HashSet;
use std::sync::Arc;

use rusqlite::params;

use crate::domains::inventory::domain::models::material::{
    IInventoryTransactionRepository, InventoryTransaction,
};
use crate::shared::db::Database;

/// TODO: document
#[derive(Debug, Clone)]
pub struct InventoryTransactionRepository {
    db: Arc<Database>,
}

impl IInventoryTransactionRepository for InventoryTransactionRepository {
    fn upsert_intervention_consumptions(
        &self,
        reference_type: &str,
        transactions: &[InventoryTransaction],
    ) -> Result<usize, String> {
        self.db
            .with_transaction(|tx| {
                // QW-4 perf: batch existence check — 1 WHERE IN query instead of N individual queries.
                let refs_to_check: Vec<String> = transactions
                    .iter()
                    .filter_map(|t| t.reference_number.clone())
                    .collect();
                let existing_refs =
                    self.references_exist_batch(tx, reference_type, &refs_to_check)?;

                let mut inserted = 0usize;
                for transaction in transactions {
                    if let Some(ref_num) = &transaction.reference_number {
                        if existing_refs.contains(ref_num) {
                            continue;
                        }
                    }
                    self.insert(tx, transaction)?;
                    inserted += 1;
                }
                Ok(inserted)
            })
            .map_err(|e| e.to_string())
    }

    fn revert_intervention_consumptions(
        &self,
        reference_id: &str,
    ) -> Result<usize, String> {
        let mut conn = self.db.get_connection().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // Find transactions to revert
        let to_revert: Vec<(String, f64)> = {
            let mut stmt = tx
                .prepare("SELECT material_id, quantity FROM inventory_transactions WHERE intervention_id = ? AND transaction_type = 'stock_out'")
                .map_err(|e| e.to_string())?;
            stmt
                .query_map(rusqlite::params![reference_id], |row| {
                    Ok((row.get(0)?, row.get(1)?))
                })
                .map_err(|e| e.to_string())?
                .filter_map(Result::ok)
                .collect()
        };

        // First delete the transactions
        let deleted = tx
            .execute(
                "DELETE FROM inventory_transactions WHERE intervention_id = ?",
                rusqlite::params![reference_id],
            )
            .map_err(|e| e.to_string())?;

        // Then restore material stock
        for (material_id, quantity) in to_revert {
            tx.execute(
                "UPDATE materials SET current_stock = current_stock + ? WHERE id = ?",
                rusqlite::params![quantity, material_id],
            ).map_err(|e| e.to_string())?;
        }

        tx.commit().map_err(|e| e.to_string())?;

        Ok(deleted)
    }
}

impl InventoryTransactionRepository {
    /// TODO: document
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// TODO: document
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

    /// QW-4 perf: batch existence check via WHERE IN — replaces N individual queries with 1.
    pub fn references_exist_batch(
        &self,
        tx: &rusqlite::Transaction<'_>,
        reference_type: &str,
        refs: &[String],
    ) -> Result<HashSet<String>, String> {
        if refs.is_empty() {
            return Ok(HashSet::new());
        }
        let placeholders = crate::shared::utils::sql::in_clause_placeholders(refs);
        let sql = format!(
            "SELECT reference_number FROM inventory_transactions \
             WHERE reference_type = ? AND reference_number IN ({})",
            placeholders
        );
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> =
            vec![Box::new(reference_type.to_string())];
        for r in refs {
            param_values.push(Box::new(r.clone()));
        }
        let mut stmt = tx.prepare_cached(&sql).map_err(|e| e.to_string())?;
        let existing: HashSet<String> = stmt
            .query_map(rusqlite::params_from_iter(param_values.iter()), |row| {
                row.get::<_, String>(0)
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        Ok(existing)
    }

    /// TODO: document
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
}
