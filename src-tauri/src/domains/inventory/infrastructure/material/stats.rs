//! Read-only stats and reporting queries.

use crate::domains::inventory::domain::material::{
    effective_threshold, DEFAULT_LOW_STOCK_THRESHOLD,
};
use crate::domains::inventory::domain::models::material::{
    InterventionMaterialSummary, LowStockMaterial, LowStockMaterialsResponse, Material,
    MaterialConsumptionSummary, MaterialStats,
};
use rusqlite::params;
use std::collections::HashMap;
use tracing::debug;

use super::errors::MaterialResult;

impl super::MaterialService {
    // ── Stats and read queries ────────────────────────────────────────────────

    /// Get material statistics.
    pub fn get_material_stats(&self) -> MaterialResult<MaterialStats> {
        debug!("Fetching material statistics");
        let total_materials: i32 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM materials WHERE deleted_at IS NULL",
                [],
            )?;

        let active_materials: i32 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM materials WHERE is_active = 1 AND deleted_at IS NULL",
                [],
            )?;

        let low_stock_materials: i32 = self.db.query_single_value(
            r#"
            SELECT COUNT(*) FROM materials
            WHERE is_active = 1
              AND deleted_at IS NULL
              AND (current_stock - 0.0) <= COALESCE(minimum_stock, ?)
            "#,
            params![DEFAULT_LOW_STOCK_THRESHOLD],
        )?;

        let expired_materials: i32 = self.db.query_single_value(
            r#"
            SELECT COUNT(*) FROM materials
            WHERE is_active = 1
              AND deleted_at IS NULL
              AND expiry_date IS NOT NULL
              AND expiry_date <= ?
            "#,
            params![crate::shared::contracts::common::now()],
        )?;

        let total_value: f64 = self.db.query_single_value(
            r#"
            SELECT COALESCE(SUM(current_stock * unit_cost), 0)
            FROM materials
            WHERE unit_cost IS NOT NULL AND is_active = 1 AND deleted_at IS NULL
            "#,
            [],
        )?;

        // ADR-011 fix: use query_multiple instead of get_connection()+prepare()+query_map()
        let type_rows: Vec<(String, i32)> = self.db.query_multiple(
            "SELECT material_type, COUNT(*) AS count FROM materials WHERE is_active = 1 AND deleted_at IS NULL GROUP BY material_type",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?)),
        )?;

        let materials_by_type: HashMap<String, i32> = type_rows.into_iter().collect();

        Ok(MaterialStats {
            total_materials,
            active_materials,
            low_stock_materials,
            expired_materials,
            total_value,
            materials_by_type,
        })
    }

    /// Get low-stock materials according to the configured threshold policy.
    pub fn get_low_stock_materials(&self) -> MaterialResult<LowStockMaterialsResponse> {
        let threshold_fallback = effective_threshold(None);
        let sql = r#"
            SELECT
              id                                    AS material_id,
              sku,
              name,
              unit_of_measure,
              current_stock,
              0.0                                   AS reserved_stock,
              current_stock                         AS available_stock,
              COALESCE(minimum_stock, ?)            AS minimum_stock,
              COALESCE(minimum_stock, ?)            AS effective_threshold,
              CASE
                WHEN current_stock < COALESCE(minimum_stock, ?)
                  THEN COALESCE(minimum_stock, ?) - current_stock
                ELSE 0.0
              END                                   AS shortage_quantity
            FROM materials
            WHERE is_active = 1
              AND deleted_at IS NULL
              AND current_stock <= COALESCE(minimum_stock, ?)
            ORDER BY shortage_quantity DESC, available_stock ASC, name ASC
        "#;

        let items = self.db.query_as::<LowStockMaterial>(
            sql,
            params![
                threshold_fallback,
                threshold_fallback,
                threshold_fallback,
                threshold_fallback,
                threshold_fallback
            ],
        )?;

        Ok(LowStockMaterialsResponse {
            total: items.len() as i32,
            items,
        })
    }

    /// Get expired materials.
    pub fn get_expired_materials(&self) -> MaterialResult<Vec<Material>> {
        let sql = r#"
            SELECT * FROM materials
            WHERE is_active = 1
              AND deleted_at IS NULL
              AND expiry_date IS NOT NULL
              AND expiry_date <= ?
            ORDER BY expiry_date ASC
        "#;

        Ok(self
            .db
            .query_as::<Material>(sql, params![crate::shared::contracts::common::now()])?)
    }

    /// Get material consumption summary for an intervention.
    ///
    /// N+1 fix: fetches all materials in a single batch query instead of one query
    /// per consumption row.
    pub fn get_intervention_material_summary(
        &self,
        intervention_id: &str,
    ) -> MaterialResult<InterventionMaterialSummary> {
        let consumptions = self
            .consumption
            .get_intervention_consumption(intervention_id)?;

        // Batch-load all referenced materials in one query.
        let material_ids: Vec<&str> = consumptions
            .iter()
            .map(|c| c.material_id.as_str())
            .collect();
        let materials_map = self.get_materials_by_ids(&material_ids)?;

        let mut total_cost = 0.0;
        let mut materials = Vec::new();

        for consumption in consumptions {
            if let Some(material) = materials_map.get(&consumption.material_id) {
                let summary = MaterialConsumptionSummary {
                    material_id: material.id.clone(),
                    material_name: material.name.clone(),
                    material_type: material.material_type.to_string(),
                    quantity_used: consumption.quantity_used,
                    unit_cost: consumption.unit_cost,
                    total_cost: consumption.total_cost,
                    waste_quantity: consumption.waste_quantity,
                };
                materials.push(summary);

                if let Some(cost) = consumption.total_cost {
                    total_cost += cost;
                }
            }
        }

        Ok(InterventionMaterialSummary {
            intervention_id: intervention_id.to_string(),
            total_materials_used: materials.len() as i32,
            total_cost,
            materials,
        })
    }
}
