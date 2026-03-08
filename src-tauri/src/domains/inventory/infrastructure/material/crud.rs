//! Material CRUD operations and upsert/validation helpers.

use crate::domains::inventory::domain::models::material::{Material, MaterialType};
use rusqlite::params;
use std::collections::HashMap;
use tracing::{debug, info, warn};
use uuid::Uuid;

use super::errors::{MaterialError, MaterialResult};
use super::types::CreateMaterialRequest;

impl super::MaterialService {
    // ── Material CRUD ─────────────────────────────────────────────────────────

    /// Create a new material.
    pub fn create_material(
        &self,
        mut request: CreateMaterialRequest,
        created_by: Option<String>,
    ) -> MaterialResult<Material> {
        let created_by = created_by
            .filter(|user_id| !user_id.trim().is_empty())
            .ok_or_else(|| {
                MaterialError::Authorization("User ID is required to create materials".to_string())
            })?;

        if request.sku.trim().is_empty() {
            request.sku = format!("SKU-{}", Uuid::new_v4().to_string().chars().take(8).collect::<String>());
            info!(new_sku = %request.sku, "SKU not provided, generated a new one.");
        }

        self.validate_create_request(&request)?;

        debug!(sku = %request.sku, created_by = %created_by, "Creating material");
        let id = Uuid::new_v4().to_string();
        let mut material =
            Material::new(id.clone(), request.sku.clone(), request.name.clone(), request.material_type);

        material.description = request.description;
        material.category = request.category;
        material.subcategory = request.subcategory;
        material.category_id = request.category_id;
        material.brand = request.brand;
        material.model = request.model;
        material.specifications = request.specifications;
        material.unit_of_measure = request.unit_of_measure;
        material.minimum_stock = request.minimum_stock;
        material.maximum_stock = request.maximum_stock;
        material.reorder_point = request.reorder_point;
        material.unit_cost = request.unit_cost;
        material.currency = request.currency.unwrap_or_else(|| "EUR".to_string());
        material.supplier_id = request.supplier_id;
        material.supplier_name = request.supplier_name;
        material.supplier_sku = request.supplier_sku;
        material.quality_grade = request.quality_grade;
        material.certification = request.certification;
        material.expiry_date = request.expiry_date;
        material.batch_number = request.batch_number;
        material.storage_location = request.storage_location;
        material.warehouse_id = request.warehouse_id;
        material.current_stock = request.current_stock.unwrap_or(0.0);
        material.created_by = Some(created_by.clone());
        material.updated_by = Some(created_by);

        self.save_material(&material)?;
        info!(material_id = %id, sku = %material.sku, "Material created");
        Ok(material)
    }

    /// Get material by ID.
    pub fn get_material(&self, id: &str) -> MaterialResult<Option<Material>> {
        Ok(self
            .db
            .query_single_as::<Material>(
                "SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )?)
    }

    /// Get material by ID, returning an error if not found.
    pub fn get_material_by_id(&self, id: &str) -> MaterialResult<Material> {
        self.get_material(id)?
            .ok_or_else(|| MaterialError::NotFound(format!("Material {} not found", id)))
    }

    /// Batch-fetch multiple materials by ID in a single query.
    pub fn get_materials_by_ids(&self, ids: &[&str]) -> MaterialResult<HashMap<String, Material>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }

        let placeholders: Vec<&str> = ids.iter().map(|_| "?").collect();
        let sql = format!(
            "SELECT * FROM materials WHERE id IN ({}) AND deleted_at IS NULL",
            placeholders.join(", ")
        );

        let params: Vec<Box<dyn rusqlite::types::ToSql>> = ids
            .iter()
            .map(|id| Box::new(id.to_string()) as Box<dyn rusqlite::types::ToSql>)
            .collect();

        let materials: Vec<Material> = self
            .db
            .query_as(&sql, rusqlite::params_from_iter(params.iter()))?;

        let map = materials.into_iter().map(|m| (m.id.clone(), m)).collect();
        Ok(map)
    }

    /// Get material by SKU.
    pub fn get_material_by_sku(&self, sku: &str) -> MaterialResult<Option<Material>> {
        Ok(self
            .db
            .query_single_as::<Material>(
                "SELECT * FROM materials WHERE sku = ? AND deleted_at IS NULL",
                params![sku],
            )?)
    }

    /// List materials with optional type/category filters and pagination.
    pub fn list_materials(
        &self,
        material_type: Option<MaterialType>,
        category: Option<String>,
        active_only: bool,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<Material>> {
        let mut conditions = Vec::new();
        let mut params_vec = Vec::new();

        if let Some(mt) = material_type {
            conditions.push("material_type = ?");
            params_vec.push(mt.to_string());
        }

        if let Some(cat) = category {
            conditions.push("category = ?");
            params_vec.push(cat);
        }

        if active_only {
            conditions.push("is_active = 1");
        }

        // Always exclude soft-deleted materials (migration 050)
        conditions.push("deleted_at IS NULL");

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let limit_clause = limit.map(|l| format!("LIMIT {}", l)).unwrap_or_default();
        let offset_clause = offset.map(|o| format!("OFFSET {}", o)).unwrap_or_default();

        let sql = format!(
            "SELECT * FROM materials {} ORDER BY name ASC {} {}",
            where_clause, limit_clause, offset_clause
        );

        let params: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        Ok(self.db.query_as::<Material>(&sql, &params[..])?)
    }

    /// Update an existing material.
    pub fn update_material(
        &self,
        id: &str,
        updates: CreateMaterialRequest,
        updated_by: Option<String>,
    ) -> MaterialResult<Material> {
        let updated_by = updated_by
            .filter(|user_id| !user_id.trim().is_empty())
            .ok_or_else(|| {
                MaterialError::Authorization("User ID is required to update materials".to_string())
            })?;
        let mut material = self
            .get_material(id)?
            .ok_or_else(|| MaterialError::NotFound(format!("Material {} not found", id)))?;
        self.validate_update_request(id, &updates)?;

        debug!(material_id = %id, updated_by = %updated_by, "Updating material");
        if !material.is_active || material.is_discontinued {
            return Err(MaterialError::Validation(
                "Cannot update inactive or discontinued materials".to_string(),
            ));
        }

        if let Some(max_stock) = updates.maximum_stock {
            if material.current_stock > max_stock {
                return Err(MaterialError::Validation(format!(
                    "Current stock {} exceeds new maximum stock limit of {}",
                    material.current_stock, max_stock
                )));
            }
        }

        material.sku = updates.sku;
        material.name = updates.name;
        material.description = updates.description;
        material.material_type = updates.material_type;
        material.category = updates.category;
        material.subcategory = updates.subcategory;
        material.brand = updates.brand;
        material.model = updates.model;
        material.specifications = updates.specifications;
        material.unit_of_measure = updates.unit_of_measure;
        material.minimum_stock = updates.minimum_stock;
        material.maximum_stock = updates.maximum_stock;
        material.reorder_point = updates.reorder_point;
        material.unit_cost = updates.unit_cost;
        if let Some(currency) = updates.currency {
            material.currency = currency;
        }
        material.supplier_id = updates.supplier_id;
        material.supplier_name = updates.supplier_name;
        material.supplier_sku = updates.supplier_sku;
        material.quality_grade = updates.quality_grade;
        material.certification = updates.certification;
        material.expiry_date = updates.expiry_date;
        material.batch_number = updates.batch_number;
        material.storage_location = updates.storage_location;
        material.warehouse_id = updates.warehouse_id;
        material.updated_by = Some(updated_by);
        material.updated_at = crate::shared::contracts::common::now();

        self.save_material(&material)?;
        info!(material_id = %id, "Material updated");
        Ok(material)
    }

    /// Soft-delete a material (marks it as deleted).
    pub fn delete_material(&self, id: &str, deleted_by: Option<String>) -> MaterialResult<()> {
        let deleted_by = deleted_by
            .filter(|user_id| !user_id.trim().is_empty())
            .ok_or_else(|| {
                MaterialError::Authorization("User ID is required to delete materials".to_string())
            })?;
        let material = self
            .get_material(id)?
            .ok_or_else(|| MaterialError::NotFound(format!("Material {} not found", id)))?;

        if material.deleted_at.is_some() {
            return Err(MaterialError::Validation(
                "Material is already deleted".to_string(),
            ));
        }

        debug!(material_id = %id, deleted_by = %deleted_by, "Soft-deleting material");
        self.db.execute(
            r#"
            UPDATE materials SET
                updated_at = ?,
                updated_by = ?,
                deleted_at = ?,
                deleted_by = ?
            WHERE id = ?
            "#,
            params![
                crate::shared::contracts::common::now(),
                Some(deleted_by.clone()),
                crate::shared::contracts::common::now(),
                Some(deleted_by),
                id
            ],
        )?;

        info!(material_id = %id, "Material deleted (soft)");
        Ok(())
    }

    // ── Private CRUD helpers ──────────────────────────────────────────────────

    fn validate_create_request(&self, request: &CreateMaterialRequest) -> MaterialResult<()> {
        if request.name.trim().is_empty() {
            return Err(MaterialError::Validation("Name is required".to_string()));
        }

        self.validate_stock_thresholds(
            request.minimum_stock,
            request.maximum_stock,
            request.reorder_point,
        )?;

        if let Some(initial_stock) = request.current_stock {
            if !initial_stock.is_finite() || initial_stock < 0.0 {
                return Err(MaterialError::Validation(
                    "Initial stock must be a non-negative number".to_string(),
                ));
            }
            if let Some(max_stock) = request.maximum_stock {
                if initial_stock > max_stock {
                    return Err(MaterialError::Validation(
                        "Initial stock cannot exceed maximum stock".to_string(),
                    ));
                }
            }
        }

        if let Ok(Some(_)) = self.get_material_by_sku(&request.sku) {
            warn!(sku = %request.sku, "Duplicate SKU rejected on create");
            return Err(MaterialError::Validation(format!(
                "SKU {} already exists",
                request.sku
            )));
        }

        Ok(())
    }

    fn validate_update_request(
        &self,
        id: &str,
        request: &CreateMaterialRequest,
    ) -> MaterialResult<()> {
        if request.sku.trim().is_empty() {
            return Err(MaterialError::Validation("SKU is required".to_string()));
        }

        if request.name.trim().is_empty() {
            return Err(MaterialError::Validation("Name is required".to_string()));
        }

        self.validate_stock_thresholds(
            request.minimum_stock,
            request.maximum_stock,
            request.reorder_point,
        )?;

        if let Ok(Some(existing)) = self.get_material_by_sku(&request.sku) {
            if existing.id != id {
                warn!(sku = %request.sku, material_id = %id, "Duplicate SKU rejected on update");
                return Err(MaterialError::Validation(format!(
                    "SKU {} already exists",
                    request.sku
                )));
            }
        }

        Ok(())
    }

    fn validate_stock_thresholds(
        &self,
        minimum_stock: Option<f64>,
        maximum_stock: Option<f64>,
        reorder_point: Option<f64>,
    ) -> MaterialResult<()> {
        if let Some(min_stock) = minimum_stock {
            if !min_stock.is_finite() || min_stock < 0.0 {
                return Err(MaterialError::Validation(
                    "Minimum stock must be a non-negative number".to_string(),
                ));
            }
        }

        if let Some(max_stock) = maximum_stock {
            if !max_stock.is_finite() || max_stock < 0.0 {
                return Err(MaterialError::Validation(
                    "Maximum stock must be a non-negative number".to_string(),
                ));
            }
        }

        if let (Some(min_stock), Some(max_stock)) = (minimum_stock, maximum_stock) {
            if min_stock > max_stock {
                return Err(MaterialError::Validation(
                    "Minimum stock cannot exceed maximum stock".to_string(),
                ));
            }
        }

        if let Some(reorder_point) = reorder_point {
            if !reorder_point.is_finite() || reorder_point < 0.0 {
                return Err(MaterialError::Validation(
                    "Reorder point must be a non-negative number".to_string(),
                ));
            }
            if let Some(max_stock) = maximum_stock {
                if reorder_point > max_stock {
                    return Err(MaterialError::Validation(
                        "Reorder point cannot exceed maximum stock".to_string(),
                    ));
                }
            }
        }

        Ok(())
    }

    pub(super) fn save_material(&self, material: &Material) -> MaterialResult<()> {
        let exists: i32 = self.db.query_single_value(
            "SELECT COUNT(*) FROM materials WHERE id = ?",
            params![material.id],
        )?;

        let material_type_str = material.material_type.to_string();
        let unit_str = material.unit_of_measure.to_string();

        if exists > 0 {
            self.db.execute(
                r#"
                UPDATE materials SET
                    sku = ?, name = ?, description = ?, material_type = ?, category = ?,
                    subcategory = ?, brand = ?, model = ?, specifications = ?,
                    unit_of_measure = ?, current_stock = ?, minimum_stock = ?, maximum_stock = ?,
                    reorder_point = ?, unit_cost = ?, currency = ?, supplier_id = ?,
                    supplier_name = ?, supplier_sku = ?, quality_grade = ?, certification = ?,
                    expiry_date = ?, batch_number = ?, serial_numbers = ?, is_active = ?,
                    is_discontinued = ?, storage_location = ?, warehouse_id = ?,
                    updated_at = ?, updated_by = ?, synced = ?, last_synced_at = ?
                WHERE id = ?
                "#,
                params![
                    material.sku,
                    material.name,
                    material.description,
                    material_type_str,
                    material.category,
                    material.subcategory,
                    material.brand,
                    material.model,
                    material
                        .specifications
                        .as_ref()
                        .map(|s| serde_json::to_string(s).unwrap_or_default()),
                    unit_str,
                    material.current_stock,
                    material.minimum_stock,
                    material.maximum_stock,
                    material.reorder_point,
                    material.unit_cost,
                    material.currency,
                    material.supplier_id,
                    material.supplier_name,
                    material.supplier_sku,
                    material.quality_grade,
                    material.certification,
                    material.expiry_date,
                    material.batch_number,
                    material
                        .serial_numbers
                        .as_ref()
                        .map(|s| serde_json::to_string(s).unwrap_or_default()),
                    material.is_active,
                    material.is_discontinued,
                    material.storage_location,
                    material.warehouse_id,
                    material.updated_at,
                    material.updated_by,
                    material.synced,
                    material.last_synced_at,
                    material.id,
                ],
            )?;
        } else {
            self.db.execute(
                r#"
                INSERT INTO materials (
                    id, sku, name, description, material_type, category, subcategory, category_id,
                    brand, model, specifications, unit_of_measure, current_stock,
                    minimum_stock, maximum_stock, reorder_point, unit_cost, currency,
                    supplier_id, supplier_name, supplier_sku, quality_grade, certification,
                    expiry_date, batch_number, serial_numbers, is_active, is_discontinued,
                    storage_location, warehouse_id, created_at, updated_at, created_by,
                    updated_by, synced, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                params![
                    material.id,
                    material.sku,
                    material.name,
                    material.description,
                    material_type_str,
                    material.category,
                    material.subcategory,
                    material.category_id,
                    material.brand,
                    material.model,
                    material.specifications.as_ref().map(|s| serde_json::to_string(s).unwrap_or_default()),
                    unit_str,
                    material.current_stock,
                    material.minimum_stock,
                    material.maximum_stock,
                    material.reorder_point,
                    material.unit_cost,
                    material.currency,
                    material.supplier_id,
                    material.supplier_name,
                    material.supplier_sku,
                    material.quality_grade,
                    material.certification,
                    material.expiry_date,
                    material.batch_number,
                    material.serial_numbers.as_ref().map(|s| serde_json::to_string(s).unwrap_or_default()),
                    material.is_active,
                    material.is_discontinued,
                    material.storage_location,
                    material.warehouse_id,
                    material.created_at,
                    material.updated_at,
                    material.created_by,
                    material.updated_by,
                    material.synced,
                    material.last_synced_at,
                ],
            )?;
        }

        Ok(())
    }
}
