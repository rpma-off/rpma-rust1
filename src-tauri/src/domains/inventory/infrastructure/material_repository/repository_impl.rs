//! `Repository<Material, String>` trait implementation for `MaterialRepository`.

use crate::domains::inventory::domain::models::material::Material;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::ttl;
use async_trait::async_trait;
use rusqlite::params;

use super::columns::MATERIAL_COLUMNS;

#[async_trait]
impl Repository<Material, String> for super::MaterialRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Material>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(material) = self.cache.get::<Material>(&cache_key) {
            return Ok(Some(material));
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM materials
            WHERE id = ? AND deleted_at IS NULL
            "#,
            MATERIAL_COLUMNS
        );

        let material = self
            .db
            .query_single_as::<Material>(
                &sql,
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find material by id: {}", e)))?;

        if let Some(ref material) = material {
            self.cache.set(&cache_key, material.clone(), ttl::LONG);
        }

        Ok(material)
    }

    async fn find_all(&self) -> RepoResult<Vec<Material>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(materials) = self.cache.get::<Vec<Material>>(&cache_key) {
            return Ok(materials);
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM materials
            WHERE is_active = 1 AND is_discontinued = 0 AND deleted_at IS NULL
            ORDER BY name ASC
            "#,
            MATERIAL_COLUMNS
        );

        let materials = self
            .db
            .query_as::<Material>(
                &sql,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all materials: {}", e)))?;

        self.cache.set(&cache_key, materials.clone(), ttl::MEDIUM);

        Ok(materials)
    }

    async fn save(&self, entity: Material) -> RepoResult<Material> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        // Handle JSON fields
        let specifications_json = entity
            .specifications
            .map(|v| serde_json::to_string(&v).unwrap_or_default())
            .unwrap_or_default();

        let serial_numbers_json = entity
            .serial_numbers
            .map(|v| serde_json::to_string(&v).unwrap_or_default())
            .unwrap_or_default();

        let expiry_timestamp = entity.expiry_date;

        if exists {
            // Update existing material
            self.db
                .execute(
                    r#"
                    UPDATE materials SET
                        sku = ?, name = ?, description = ?, material_type = ?, category = ?, subcategory = ?, category_id = ?,
                        brand = ?, model = ?, specifications = ?,
                        unit_of_measure = ?, current_stock = ?, minimum_stock = ?, maximum_stock = ?, reorder_point = ?,
                        unit_cost = ?, currency = ?,
                        supplier_id = ?, supplier_name = ?, supplier_sku = ?,
                        quality_grade = ?, certification = ?, expiry_date = ?, batch_number = ?, serial_numbers = ?,
                        is_active = ?, is_discontinued = ?,
                        storage_location = ?, warehouse_id = ?,
                        updated_at = (unixepoch() * 1000), updated_by = ?
                    WHERE id = ?
                    "#,
                    params![
                        entity.sku,
                        entity.name,
                        entity.description,
                        entity.material_type.to_string(),
                        entity.category,
                        entity.subcategory,
                        entity.category_id,
                        entity.brand,
                        entity.model,
                        specifications_json,
                        entity.unit_of_measure.to_string(),
                        entity.current_stock,
                        entity.minimum_stock,
                        entity.maximum_stock,
                        entity.reorder_point,
                        entity.unit_cost,
                        entity.currency,
                        entity.supplier_id,
                        entity.supplier_name,
                        entity.supplier_sku,
                        entity.quality_grade,
                        entity.certification,
                        expiry_timestamp,
                        entity.batch_number,
                        serial_numbers_json,
                        entity.is_active,
                        entity.is_discontinued,
                        entity.storage_location,
                        entity.warehouse_id,
                        entity.updated_by,
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update material: {}", e)))?;
        } else {
            // Create new material
            self.db
                .execute(
                    r#"
                    INSERT INTO materials (
                    id, sku, name, description, material_type, category, subcategory, category_id,
                    brand, model, specifications,
                        unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
                        unit_cost, currency,
                        supplier_id, supplier_name, supplier_sku,
                        quality_grade, certification, expiry_date, batch_number, serial_numbers,
                        is_active, is_discontinued,
                        storage_location, warehouse_id,
                        created_at, updated_at, created_by, updated_by,
                        synced
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (unixepoch() * 1000), (unixepoch() * 1000), ?, ?, 0)
                    "#,
                    params![
                        entity.id,
                        entity.sku,
                        entity.name,
                        entity.description,
                        entity.material_type.to_string(),
                        entity.category,
                        entity.subcategory,
                        entity.category_id,
                        entity.brand,
                        entity.model,
                        specifications_json,
                        entity.unit_of_measure.to_string(),
                        entity.current_stock,
                        entity.minimum_stock,
                        entity.maximum_stock,
                        entity.reorder_point,
                        entity.unit_cost,
                        entity.currency,
                        entity.supplier_id,
                        entity.supplier_name,
                        entity.supplier_sku,
                        entity.quality_grade,
                        entity.certification,
                        expiry_timestamp,
                        entity.batch_number,
                        serial_numbers_json,
                        entity.is_active,
                        entity.is_discontinued,
                        entity.storage_location,
                        entity.warehouse_id,
                        entity.created_by,
                        entity.updated_by,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create material: {}", e)))?;
        }

        // Invalidate cache
        self.invalidate_material_cache(&entity.id);

        // Return the saved material
        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Material not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        // Soft delete by marking as discontinued
        self.soft_delete_by_id(&id, "system").await
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value("SELECT COUNT(*) FROM materials WHERE id = ? AND deleted_at IS NULL", params![id])
            .map_err(|e| {
                RepoError::Database(format!("Failed to check material existence: {}", e))
            })?;

        Ok(count > 0)
    }
}
