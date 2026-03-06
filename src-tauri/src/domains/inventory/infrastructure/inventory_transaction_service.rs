//! Inventory transaction service — read operations and statistics for the
//! `inventory_transactions` table.
//!
//! The atomic write (`create_inventory_transaction`) stays on `MaterialService`
//! because it must update both `inventory_transactions` and `materials.current_stock`
//! inside a single DB transaction.

use std::collections::HashMap;

use crate::db::Database;
use crate::domains::inventory::domain::material::DEFAULT_LOW_STOCK_THRESHOLD;
use crate::domains::inventory::domain::models::material::{
    InventoryMovementSummary, InventoryStats, InventoryTransaction, InventoryTransactionType,
};
use rusqlite::params;

use super::material::{MaterialError, MaterialResult};

#[derive(Debug)]
pub(crate) struct InventoryTransactionService {
    db: Database,
}

impl InventoryTransactionService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// List inventory transactions for a material with optional type filter and pagination.
    pub fn list_inventory_transactions_by_material(
        &self,
        material_id: &str,
        transaction_type: Option<InventoryTransactionType>,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<InventoryTransaction>> {
        let mut sql = "SELECT * FROM inventory_transactions WHERE material_id = ?".to_string();
        let mut params = vec![material_id.to_string()];

        if let Some(tt) = transaction_type {
            sql.push_str(" AND transaction_type = ?");
            params.push(tt.to_string());
        }

        sql.push_str(" ORDER BY performed_at DESC");

        if let Some(limit) = limit {
            sql.push_str(" LIMIT ?");
            params.push(limit.to_string());
        }

        if let Some(offset) = offset {
            sql.push_str(" OFFSET ?");
            params.push(offset.to_string());
        }

        Ok(self
            .db
            .query_as::<InventoryTransaction>(&sql, rusqlite::params_from_iter(params))?)
    }

    /// List the most recent inventory transactions across all materials.
    pub fn list_recent_inventory_transactions(
        &self,
        limit: i32,
    ) -> MaterialResult<Vec<InventoryTransaction>> {
        let sql = "SELECT * FROM inventory_transactions ORDER BY performed_at DESC LIMIT ?";
        Ok(self
            .db
            .query_as::<InventoryTransaction>(sql, params![limit])?)
    }

    /// Get inventory statistics.
    ///
    /// Root cause fix: GROUP BY used `mc.name` but SELECT used `COALESCE(mc.name, ...)`,
    /// causing inconsistent grouping when categories are NULL. Fixed to use COALESCE
    /// in both SELECT and GROUP BY. Defensive `.unwrap_or()` handling ensures an empty
    /// database returns safe defaults instead of an error.
    pub fn get_inventory_stats(&self) -> MaterialResult<InventoryStats> {
        let total_materials: i32 = self
            .db
            .query_single_value("SELECT COUNT(*) FROM materials WHERE is_active = 1", [])
            .unwrap_or(0);

        let active_materials = total_materials;

        let low_stock_materials: i32 = self
            .db
            .query_single_value(
                r#"
                SELECT COUNT(*) FROM materials
                WHERE is_active = 1
                  AND (current_stock - 0.0) <= COALESCE(minimum_stock, ?)
                "#,
                params![DEFAULT_LOW_STOCK_THRESHOLD],
            )
            .unwrap_or(0);

        let expired_materials: i32 = self
            .db
            .query_single_value(
                r#"
                SELECT COUNT(*) FROM materials
                WHERE is_active = 1 AND expiry_date IS NOT NULL
                  AND expiry_date <= ?
                "#,
                params![crate::shared::contracts::common::now()],
            )
            .unwrap_or(0);

        let total_value: f64 = self
            .db
            .query_single_value(
                r#"
                SELECT COALESCE(SUM(current_stock * unit_cost), 0.0)
                FROM materials
                WHERE unit_cost IS NOT NULL AND is_active = 1
                "#,
                [],
            )
            .unwrap_or(0.0);

        // Materials by category — gracefully handles missing `material_categories` table.
        let materials_by_category: HashMap<String, i32> = match self.db.get_connection() {
            Ok(conn) => {
                match conn.prepare(
                    r#"
                    SELECT COALESCE(mc.name, 'Uncategorized') as cat_name, COUNT(*)
                    FROM materials m
                    LEFT JOIN material_categories mc ON m.category_id = mc.id
                    WHERE m.is_active = 1
                    GROUP BY cat_name
                    "#,
                ) {
                    Ok(mut stmt) => {
                        let category_rows = stmt
                            .query_map([], |row| {
                                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
                            })
                            .ok()
                            .map(|rows| rows.filter_map(|r| r.ok()).collect::<Vec<_>>())
                            .unwrap_or_default();
                        category_rows.into_iter().collect()
                    }
                    Err(_) => HashMap::new(),
                }
            }
            Err(_) => HashMap::new(),
        };

        let recent_transactions = self
            .list_recent_inventory_transactions(10)
            .unwrap_or_default();

        Ok(InventoryStats {
            total_materials,
            active_materials,
            low_stock_materials,
            expired_materials,
            total_value,
            materials_by_category,
            recent_transactions,
            stock_turnover_rate: 0.0,
            average_inventory_age: 0.0,
        })
    }

    /// Get inventory movement summary with optional material and date filters.
    ///
    /// Root cause fix: date filter conditions were placed in WHERE, which converted
    /// the LEFT JOIN into an INNER JOIN for materials with no transactions, causing
    /// them to disappear. Fixed by moving date conditions into the JOIN ON clause.
    pub fn get_inventory_movement_summary(
        &self,
        material_id: Option<&str>,
        date_from: Option<&str>,
        date_to: Option<&str>,
    ) -> MaterialResult<Vec<InventoryMovementSummary>> {
        let mut join_conditions = vec!["m.id = it.material_id".to_string()];
        let mut params: Vec<String> = Vec::new();

        if let Some(date_from) = date_from {
            join_conditions.push("it.performed_at >= ?".to_string());
            params.push(date_from.to_string());
        }

        if let Some(date_to) = date_to {
            join_conditions.push("it.performed_at <= ?".to_string());
            params.push(date_to.to_string());
        }

        let join_clause = join_conditions.join(" AND ");

        let mut sql = format!(
            r#"
            SELECT
                m.id as material_id,
                m.name as material_name,
                COALESCE(SUM(CASE WHEN it.transaction_type IN ('stock_in', 'return') THEN it.quantity ELSE 0 END), 0) as total_stock_in,
                COALESCE(SUM(CASE WHEN it.transaction_type IN ('stock_out', 'waste', 'transfer') THEN it.quantity ELSE 0 END), 0) as total_stock_out,
                m.current_stock
            FROM materials m
            LEFT JOIN inventory_transactions it ON {join_clause}
            "#
        );

        if let Some(material_id) = material_id {
            sql.push_str(" WHERE m.id = ?");
            params.push(material_id.to_string());
        }

        sql.push_str(" GROUP BY m.id, m.name, m.current_stock ORDER BY m.name");

        let conn = match self.db.get_connection() {
            Ok(c) => c,
            Err(_) => return Ok(Vec::new()),
        };
        let mut stmt = match conn.prepare(&sql) {
            Ok(s) => s,
            Err(e) => {
                if e.to_string().contains("no such table") {
                    return Ok(Vec::new());
                }
                return Err(MaterialError::Database(e.to_string()));
            }
        };
        let rows = stmt.query_map(rusqlite::params_from_iter(&params), |row| {
            let material_id: String = row.get(0)?;
            let material_name: String = row.get(1)?;
            let total_stock_in: f64 = row.get(2)?;
            let total_stock_out: f64 = row.get(3)?;
            let current_stock: f64 = row.get(4)?;

            Ok(InventoryMovementSummary {
                material_id,
                material_name,
                total_stock_in,
                total_stock_out,
                net_movement: total_stock_in - total_stock_out,
                current_stock,
                last_transaction_date: None,
            })
        })?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| MaterialError::Database(e.to_string()))
    }
}
