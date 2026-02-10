//! Material repository implementation
//!
//! Provides consistent database access patterns for Material entities.

use crate::db::Database;
use crate::models::material::{Material, MaterialType};
use crate::repositories::base::{RepoError, RepoResult, Repository};
use crate::repositories::cache::{ttl, Cache, CacheKeyBuilder};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering materials
#[derive(Debug, Clone, Default)]
pub struct MaterialQuery {
    pub search: Option<String>,
    pub material_type: Option<MaterialType>,
    pub is_active: Option<bool>,
    pub is_discontinued: Option<bool>,
    pub sku: Option<String>,
    pub category: Option<String>,
    pub supplier_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl MaterialQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(search) = &self.search {
            conditions.push("(name LIKE ? OR sku LIKE ? OR description LIKE ?)".to_string());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }

        if let Some(material_type) = &self.material_type {
            conditions.push("material_type = ?".to_string());
            params.push(material_type.to_string().into());
        }

        if let Some(is_active) = self.is_active {
            conditions.push("is_active = ?".to_string());
            params.push((if is_active { 1 } else { 0 }).into());
        }

        if let Some(is_discontinued) = self.is_discontinued {
            conditions.push("is_discontinued = ?".to_string());
            params.push((if is_discontinued { 1 } else { 0 }).into());
        }

        if let Some(sku) = &self.sku {
            conditions.push("sku = ?".to_string());
            params.push(sku.clone().into());
        }

        if let Some(category) = &self.category {
            conditions.push("category = ?".to_string());
            params.push(category.clone().into());
        }

        if let Some(supplier_id) = &self.supplier_id {
            conditions.push("supplier_id = ?".to_string());
            params.push(supplier_id.clone().into());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }

    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
        let allowed_columns = [
            "created_at",
            "updated_at",
            "name",
            "sku",
            "material_type",
            "category",
            "is_active",
            "quantity",
            "price",
        ];
        allowed_columns
            .iter()
            .find(|&&col| col == sort_by)
            .map(|s| s.to_string())
            .ok_or_else(|| RepoError::Validation(format!("Invalid sort column: {}", sort_by)))
    }

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(self.sort_by.as_deref().unwrap_or("name"))?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            Some("DESC") => "DESC",
            _ => "ASC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

/// Material repository for database operations
pub struct MaterialRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl MaterialRepository {
    /// Create a new MaterialRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("material"),
        }
    }

    /// Get access to the underlying database for direct queries
    /// This is a temporary method for refactoring - should be removed once all queries use repository pattern
    pub fn get_db(&self) -> &Arc<Database> {
        &self.db
    }

    /// Find material by SKU
    pub async fn find_by_sku(&self, sku: &str) -> RepoResult<Option<Material>> {
        let cache_key = self.cache_key_builder.query(&["sku", sku]);

        if let Some(material) = self.cache.get::<Material>(&cache_key) {
            return Ok(Some(material));
        }

        let material = self
            .db
            .query_single_as::<Material>(
                r#"
                SELECT
                    id, sku, name, description, material_type, category, subcategory, category_id,
                    brand, model, specifications,
                    unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
                    unit_cost, currency,
                    supplier_id, supplier_name, supplier_sku,
                    quality_grade, certification, expiry_date, batch_number, serial_numbers,
                    is_active, is_discontinued,
                    storage_location, warehouse_id,
                    created_at, updated_at, created_by, updated_by,
                    synced, last_synced_at
                FROM materials
                WHERE sku = ? AND is_active = 1
                LIMIT 1
                "#,
                params![sku],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find material by SKU: {}", e)))?;

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

        let materials = self
            .db
            .query_as::<Material>(
                r#"
                SELECT
                    id, sku, name, description, material_type, category, subcategory, category_id,
                    brand, model, specifications,
                    unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
                    unit_cost, currency,
                    supplier_id, supplier_name, supplier_sku,
                    quality_grade, certification, expiry_date, batch_number, serial_numbers,
                    is_active, is_discontinued,
                    storage_location, warehouse_id,
                    created_at, updated_at, created_by, updated_by,
                    synced, last_synced_at
                FROM materials
                WHERE is_active = 1 AND is_discontinued = 0
                  AND (current_stock < COALESCE(minimum_stock, 0) OR current_stock < COALESCE(reorder_point, 0))
                ORDER BY current_stock ASC
                "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find low stock materials: {}", e)))?;

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

        let materials = self
            .db
            .query_as::<Material>(
                r#"
                SELECT
                    id, sku, name, description, material_type, category, subcategory, category_id,
                    brand, model, specifications,
                    unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
                    unit_cost, currency,
                    supplier_id, supplier_name, supplier_sku,
                    quality_grade, certification, expiry_date, batch_number, serial_numbers,
                    is_active, is_discontinued,
                    storage_location, warehouse_id,
                    created_at, updated_at, created_by, updated_by,
                    synced, last_synced_at
                FROM materials
                WHERE material_type = ? AND is_active = 1 AND is_discontinued = 0
                ORDER BY name ASC
                "#,
                params![material_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find materials by type: {}", e)))?;

        self.cache.set(&cache_key, materials.clone(), ttl::MEDIUM);

        Ok(materials)
    }

    /// Update material stock
    pub async fn update_stock(
        &self,
        material_id: &str,
        quantity_adjustment: f64,
    ) -> RepoResult<f64> {
        self.db
            .execute(
                r#"
                UPDATE materials SET
                    current_stock = current_stock + ?,
                    updated_at = (unixepoch() * 1000)
                WHERE id = ?
                "#,
                params![quantity_adjustment, material_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update material stock: {}", e)))?;

        // Invalidate cache for this material
        self.invalidate_material_cache(material_id);

        // Fetch and return new stock level
        let material = self
            .find_by_id(material_id.to_string())
            .await?
            .ok_or_else(|| {
                RepoError::NotFound("Material not found after stock update".to_string())
            })?;

        Ok(material.current_stock)
    }

    /// Search materials
    pub async fn search(&self, query: MaterialQuery) -> RepoResult<Vec<Material>> {
        let cache_key = self.cache_key_builder.query(&[&format!("{:?}", query)]);

        if let Some(materials) = self.cache.get::<Vec<Material>>(&cache_key) {
            return Ok(materials);
        }

        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|e| {
            eprintln!("Invalid order clause, using default: {}", e);
            "ORDER BY name ASC".to_string()
        });
        let (limit, _offset) = query.build_limit_offset().unwrap_or((100, None));

        let sql = format!(
            r#"
            SELECT
                id, sku, name, description, material_type, category, subcategory, category_id,
                brand, model, specifications,
                unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
                unit_cost, currency,
                supplier_id, supplier_name, supplier_sku,
                quality_grade, certification, expiry_date, batch_number, serial_numbers,
                is_active, is_discontinued,
                storage_location, warehouse_id,
                created_at, updated_at, created_by, updated_by,
                synced, last_synced_at
            FROM materials
            {}
            {}
            LIMIT ?
            "#,
            where_clause, order_clause
        );

        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());

        let materials = self
            .db
            .query_as::<Material>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search materials: {}", e)))?;

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
            .map_err(|e| RepoError::Database(format!("Failed to count materials: {}", e)))?;

        Ok(count)
    }

    /// Invalidate cache for a specific material
    fn invalidate_material_cache(&self, material_id: &str) {
        self.cache.remove(&self.cache_key_builder.id(material_id));
    }

    /// Invalidate all material caches
    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<Material, String> for MaterialRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Material>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(material) = self.cache.get::<Material>(&cache_key) {
            return Ok(Some(material));
        }

        let material = self
            .db
            .query_single_as::<Material>(
                r#"
                SELECT
                    id, sku, name, description, material_type, category, subcategory, category_id,
                    brand, model, specifications,
                    unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
                    unit_cost, currency,
                    supplier_id, supplier_name, supplier_sku,
                    quality_grade, certification, expiry_date, batch_number, serial_numbers,
                    is_active, is_discontinued,
                    storage_location, warehouse_id,
                    created_at, updated_at, created_by, updated_by,
                    synced, last_synced_at
                FROM materials
                WHERE id = ?
                "#,
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

        let materials = self
            .db
            .query_as::<Material>(
                r#"
                SELECT
                    id, sku, name, description, material_type, category, subcategory, category_id,
                    brand, model, specifications,
                    unit_of_measure, current_stock, minimum_stock, maximum_stock, reorder_point,
                    unit_cost, currency,
                    supplier_id, supplier_name, supplier_sku,
                    quality_grade, certification, expiry_date, batch_number, serial_numbers,
                    is_active, is_discontinued,
                    storage_location, warehouse_id,
                    created_at, updated_at, created_by, updated_by,
                    synced, last_synced_at
                FROM materials
                WHERE is_active = 1 AND is_discontinued = 0
                ORDER BY name ASC
                "#,
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
        let rows_affected = self
            .db
            .execute(
                "UPDATE materials SET is_discontinued = 1, updated_at = (unixepoch() * 1000) WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete material: {}", e)))?;

        if rows_affected > 0 {
            // Invalidate cache
            self.invalidate_material_cache(&id);
        }

        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value("SELECT COUNT(*) FROM materials WHERE id = ?", params![id])
            .map_err(|e| {
                RepoError::Database(format!("Failed to check material existence: {}", e))
            })?;

        Ok(count > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use chrono::Utc;

    async fn setup_test_db() -> Database {
        Database::new_in_memory().await.unwrap()
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test material
        let material = Material {
            id: "test-1".to_string(),
            sku: "SKU-001".to_string(),
            name: "Test Material".to_string(),
            description: Some("Test description".to_string()),
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: crate::models::material::UnitOfMeasure::Roll,
            current_stock: 10.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
            currency: "EUR".to_string(),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            serial_numbers: None,
            is_active: true,
            is_discontinued: false,
            storage_location: None,
            warehouse_id: None,
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(material.clone()).await.unwrap();

        // Find by ID
        let found = repo.find_by_id("test-1".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, "test-1");
    }

    #[tokio::test]
    async fn test_find_by_sku() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test material
        let material = Material {
            id: "sku-test".to_string(),
            sku: "SKU-002".to_string(),
            name: "SKU Test Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: crate::models::material::UnitOfMeasure::Roll,
            current_stock: 15.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(150.0),
            currency: "EUR".to_string(),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            serial_numbers: None,
            is_active: true,
            is_discontinued: false,
            storage_location: None,
            warehouse_id: None,
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(material).await.unwrap();

        // Find by SKU
        let found = repo.find_by_sku("SKU-002").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "SKU Test Material");
    }

    #[tokio::test]
    async fn test_find_low_stock() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create material with low stock
        let low_stock_material = Material {
            id: "low-stock".to_string(),
            sku: "SKU-003".to_string(),
            name: "Low Stock Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: crate::models::material::UnitOfMeasure::Roll,
            current_stock: 3.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
            currency: "EUR".to_string(),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            serial_numbers: None,
            is_active: true,
            is_discontinued: false,
            storage_location: None,
            warehouse_id: None,
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };
        repo.save(low_stock_material).await.unwrap();

        // Find low stock materials
        let low_stock = repo.find_low_stock().await.unwrap();
        assert!(low_stock.len() >= 1);
    }

    #[tokio::test]
    async fn test_find_by_type() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test materials
        for i in 0..2 {
            let material = Material {
                id: format!("type-test-{}", i),
                sku: format!("SKU-TYPE-{}", i),
                name: format!("Type Test Material {}", i),
                description: None,
                material_type: MaterialType::Adhesive,
                category: None,
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: crate::models::material::UnitOfMeasure::Piece,
                current_stock: 10.0,
                minimum_stock: Some(5.0),
                maximum_stock: Some(20.0),
                reorder_point: Some(8.0),
                unit_cost: Some(50.0),
                currency: "EUR".to_string(),
                supplier_id: None,
                supplier_name: None,
                supplier_sku: None,
                quality_grade: None,
                certification: None,
                expiry_date: None,
                batch_number: None,
                serial_numbers: None,
                is_active: true,
                is_discontinued: false,
                storage_location: None,
                warehouse_id: None,
                created_at: Utc::now().timestamp_millis(),
                updated_at: Utc::now().timestamp_millis(),
                created_by: None,
                updated_by: None,
                synced: false,
                last_synced_at: None,
            };
            repo.save(material).await.unwrap();
        }

        // Find by type
        let adhesives = repo.find_by_type(MaterialType::Adhesive).await.unwrap();
        assert!(adhesives.len() >= 2);
    }

    #[tokio::test]
    async fn test_update_stock() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test material
        let material = Material {
            id: "stock-test".to_string(),
            sku: "SKU-004".to_string(),
            name: "Stock Test Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: crate::models::material::UnitOfMeasure::Roll,
            current_stock: 10.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
            currency: "EUR".to_string(),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            serial_numbers: None,
            is_active: true,
            is_discontinued: false,
            storage_location: None,
            warehouse_id: None,
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };
        repo.save(material).await.unwrap();

        // Update stock
        let new_stock = repo.update_stock("stock-test", -2.0).await.unwrap();
        assert_eq!(new_stock, 8.0);

        // Update stock again
        let new_stock = repo.update_stock("stock-test", 5.0).await.unwrap();
        assert_eq!(new_stock, 13.0);
    }

    #[tokio::test]
    async fn test_search() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(db, cache);

        // Create test materials
        for i in 0..3 {
            let material = Material {
                id: format!("search-{}", i),
                sku: format!("SKU-SEARCH-{}", i),
                name: format!("Search Material {}", i),
                description: Some(format!("Search description {}", i)),
                material_type: MaterialType::Consumable,
                category: None,
                subcategory: None,
                category_id: None,
                brand: None,
                model: None,
                specifications: None,
                unit_of_measure: crate::models::material::UnitOfMeasure::Piece,
                current_stock: 10.0,
                minimum_stock: Some(5.0),
                maximum_stock: Some(20.0),
                reorder_point: Some(8.0),
                unit_cost: Some(25.0),
                currency: "EUR".to_string(),
                supplier_id: None,
                supplier_name: None,
                supplier_sku: None,
                quality_grade: None,
                certification: None,
                expiry_date: None,
                batch_number: None,
                serial_numbers: None,
                is_active: true,
                is_discontinued: false,
                storage_location: None,
                warehouse_id: None,
                created_at: Utc::now().timestamp_millis(),
                updated_at: Utc::now().timestamp_millis(),
                created_by: None,
                updated_by: None,
                synced: false,
                last_synced_at: None,
            };
            repo.save(material).await.unwrap();
        }

        // Search materials
        let query = MaterialQuery {
            search: Some("Search".to_string()),
            ..Default::default()
        };

        let results = repo.search(query).await.unwrap();
        assert!(results.len() >= 3);
    }

    #[tokio::test]
    async fn test_cache_hit() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = MaterialRepository::new(Arc::clone(&db), Arc::clone(&cache));

        // Create test material
        let material = Material {
            id: "cache-test".to_string(),
            sku: "SKU-CACHE".to_string(),
            name: "Cache Test Material".to_string(),
            description: None,
            material_type: MaterialType::PpfFilm,
            category: None,
            subcategory: None,
            category_id: None,
            brand: None,
            model: None,
            specifications: None,
            unit_of_measure: crate::models::material::UnitOfMeasure::Roll,
            current_stock: 10.0,
            minimum_stock: Some(5.0),
            maximum_stock: Some(20.0),
            reorder_point: Some(8.0),
            unit_cost: Some(100.0),
            currency: "EUR".to_string(),
            supplier_id: None,
            supplier_name: None,
            supplier_sku: None,
            quality_grade: None,
            certification: None,
            expiry_date: None,
            batch_number: None,
            serial_numbers: None,
            is_active: true,
            is_discontinued: false,
            storage_location: None,
            warehouse_id: None,
            created_at: Utc::now().timestamp_millis(),
            updated_at: Utc::now().timestamp_millis(),
            created_by: None,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        repo.save(material).await.unwrap();

        // First call - cache miss, hit database
        let _ = repo.find_by_id("cache-test".to_string()).await.unwrap();

        // Second call - cache hit
        let found = repo.find_by_id("cache-test".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Cache Test Material");
    }
}
