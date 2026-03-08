//! Read-only query operations for `MaterialRepository`.

use crate::domains::inventory::domain::models::material::{Material, MaterialType};
use crate::shared::repositories::base::RepoResult;
use crate::shared::repositories::cache::ttl;
use rusqlite::params;
use tracing::warn;

use super::columns::MATERIAL_COLUMNS;
use super::query::MaterialQuery;

impl super::MaterialRepository {
    /// Find material by SKU
    pub async fn find_by_sku(&self, sku: &str) -> RepoResult<Option<Material>> {
        let cache_key = self.cache_key_builder.query(&["sku", sku]);

        if let Some(material) = self.cache.get::<Material>(&cache_key) {
            return Ok(Some(material));
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM materials
            WHERE sku = ? AND is_active = 1 AND deleted_at IS NULL
            LIMIT 1
            "#,
            MATERIAL_COLUMNS
        );

        let material = self
            .db
            .query_single_as::<Material>(&sql, params![sku])
            .map_err(|e| {
                crate::shared::repositories::base::RepoError::Database(format!(
                    "Failed to find material by SKU: {}",
                    e
                ))
            })?;

        if let Some(ref material) = material {
            self.cache.set(&cache_key, material.clone(), ttl::MEDIUM);
        }

        Ok(material)
    }

    /// Find materials with low stock
    pub async fn find_low_stock(&self) -> RepoResult<Vec<Material>> {
        let cache_key = self.cache_key_builder.query(&["low_stock"]);

        if let Some(materials) = self.cache.get::<Vec<Material>>(&cache_key) {
            return Ok(materials);
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM materials
            WHERE is_active = 1 AND is_discontinued = 0 AND deleted_at IS NULL
              AND (current_stock < COALESCE(minimum_stock, 0) OR current_stock < COALESCE(reorder_point, 0))
            ORDER BY current_stock ASC
            "#,
            MATERIAL_COLUMNS
        );

        let materials = self.db.query_as::<Material>(&sql, []).map_err(|e| {
            crate::shared::repositories::base::RepoError::Database(format!(
                "Failed to find low stock materials: {}",
                e
            ))
        })?;

        self.cache.set(&cache_key, materials.clone(), ttl::SHORT);

        Ok(materials)
    }

    /// Find materials by type
    pub async fn find_by_type(&self, material_type: MaterialType) -> RepoResult<Vec<Material>> {
        let cache_key = self
            .cache_key_builder
            .query(&["type", &material_type.to_string()]);

        if let Some(materials) = self.cache.get::<Vec<Material>>(&cache_key) {
            return Ok(materials);
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM materials
            WHERE material_type = ? AND is_active = 1 AND is_discontinued = 0 AND deleted_at IS NULL
            ORDER BY name ASC
            "#,
            MATERIAL_COLUMNS
        );

        let materials = self
            .db
            .query_as::<Material>(&sql, params![material_type.to_string()])
            .map_err(|e| {
                crate::shared::repositories::base::RepoError::Database(format!(
                    "Failed to find materials by type: {}",
                    e
                ))
            })?;

        self.cache.set(&cache_key, materials.clone(), ttl::MEDIUM);

        Ok(materials)
    }

    /// Search materials
    pub async fn search(&self, query: MaterialQuery) -> RepoResult<Vec<Material>> {
        let cache_key = self.cache_key_builder.query(&[&format!("{:?}", query)]);

        if let Some(materials) = self.cache.get::<Vec<Material>>(&cache_key) {
            return Ok(materials);
        }

        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|e| {
            warn!("Invalid order clause, using default: {}", e);
            "ORDER BY name ASC".to_string()
        });
        let (limit, _offset) = query.build_limit_offset().unwrap_or((100, None));

        let sql = format!(
            r#"
            SELECT {}
            FROM materials
            {}
            {}
            LIMIT ?
            "#,
            MATERIAL_COLUMNS, where_clause, order_clause
        );

        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());

        let materials = self
            .db
            .query_as::<Material>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| {
                crate::shared::repositories::base::RepoError::Database(format!(
                    "Failed to search materials: {}",
                    e
                ))
            })?;

        self.cache.set(&cache_key, materials.clone(), ttl::SHORT);

        Ok(materials)
    }

    /// Count materials matching query
    pub async fn count(&self, query: MaterialQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) FROM materials {}", where_clause);

        let count: i64 = self
            .db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| {
                crate::shared::repositories::base::RepoError::Database(format!(
                    "Failed to count materials: {}",
                    e
                ))
            })?;

        Ok(count)
    }
}
