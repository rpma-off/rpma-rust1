//! Material consumption repository — read operations on `material_consumption` table.
//!
//! The atomic write (`record_consumption`) stays on `MaterialService` because it
//! must update both `material_consumption` and `materials.current_stock` inside a
//! single DB transaction.

use crate::db::Database;
use crate::domains::inventory::domain::models::material::MaterialConsumption;
use rusqlite::params;

use super::material::MaterialResult;

#[derive(Debug)]
pub(crate) struct MaterialConsumptionRepository {
    db: Database,
}

impl MaterialConsumptionRepository {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get all consumption records for a given intervention.
    pub fn get_intervention_consumption(
        &self,
        intervention_id: &str,
    ) -> MaterialResult<Vec<MaterialConsumption>> {
        let sql = r#"
            SELECT mc.* FROM material_consumption mc
            WHERE mc.intervention_id = ?
            ORDER BY mc.recorded_at ASC
        "#;

        Ok(self
            .db
            .query_as::<MaterialConsumption>(sql, params![intervention_id])?)
    }

    /// Get consumption history for a specific material with pagination.
    pub fn get_consumption_history(
        &self,
        material_id: &str,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<MaterialConsumption>> {
        let mut sql =
            "SELECT * FROM material_consumption WHERE material_id = ? ORDER BY recorded_at DESC"
                .to_string();
        let mut params_vec: Vec<String> = vec![material_id.to_string()];

        if let Some(limit) = limit {
            sql.push_str(" LIMIT ?");
            params_vec.push(limit.to_string());
        }

        if let Some(offset) = offset {
            sql.push_str(" OFFSET ?");
            params_vec.push(offset.to_string());
        }

        Ok(self
            .db
            .query_as::<MaterialConsumption>(&sql, rusqlite::params_from_iter(params_vec))?)
    }
}
