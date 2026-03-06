//! Material category repository — CRUD for `material_categories` table.

use crate::db::Database;
use crate::domains::inventory::domain::models::material::MaterialCategory;
use rusqlite::params;
use uuid::Uuid;

use super::material::{CreateMaterialCategoryRequest, MaterialError, MaterialResult};

#[derive(Debug)]
pub(crate) struct MaterialCategoryRepository {
    db: Database,
}

impl MaterialCategoryRepository {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Create a new material category.
    pub fn create_material_category(
        &self,
        request: CreateMaterialCategoryRequest,
        created_by: Option<String>,
    ) -> MaterialResult<MaterialCategory> {
        self.validate_create_category_request(&request)?;

        let id = Uuid::new_v4().to_string();
        let level = request.level.unwrap_or(1);

        let category = MaterialCategory {
            id: id.clone(),
            name: request.name,
            code: request.code,
            parent_id: request.parent_id,
            level,
            description: request.description,
            color: request.color,
            is_active: true,
            created_at: crate::shared::contracts::common::now(),
            updated_at: crate::shared::contracts::common::now(),
            created_by,
            updated_by: None,
            synced: false,
            last_synced_at: None,
        };

        self.save_material_category(&category)?;
        Ok(category)
    }

    /// Get material category by ID.
    pub fn get_material_category(&self, id: &str) -> MaterialResult<Option<MaterialCategory>> {
        let sql = "SELECT * FROM material_categories WHERE id = ?";
        let categories = self.db.query_as::<MaterialCategory>(sql, params![id])?;
        Ok(categories.into_iter().next())
    }

    /// List material categories.
    ///
    /// Returns an empty list instead of an error when the `material_categories` table
    /// does not yet exist (migration not yet applied).
    pub fn list_material_categories(
        &self,
        active_only: bool,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> MaterialResult<Vec<MaterialCategory>> {
        let mut sql = "SELECT * FROM material_categories".to_string();
        let mut params = Vec::new();

        if active_only {
            sql.push_str(" WHERE is_active = 1");
        }

        sql.push_str(" ORDER BY level ASC, name ASC");

        if let Some(limit) = limit {
            sql.push_str(" LIMIT ?");
            params.push(limit.to_string());
        }

        if let Some(offset) = offset {
            sql.push_str(" OFFSET ?");
            params.push(offset.to_string());
        }

        match self
            .db
            .query_as::<MaterialCategory>(&sql, rusqlite::params_from_iter(params))
        {
            Ok(categories) => Ok(categories),
            Err(e) => {
                if e.contains("no such table") {
                    Ok(Vec::new())
                } else {
                    Err(MaterialError::Database(e))
                }
            }
        }
    }

    /// Update material category.
    pub fn update_material_category(
        &self,
        id: &str,
        request: CreateMaterialCategoryRequest,
        updated_by: Option<String>,
    ) -> MaterialResult<MaterialCategory> {
        let mut category = self
            .get_material_category(id)?
            .ok_or_else(|| MaterialError::NotFound(format!("Category {} not found", id)))?;

        category.name = request.name;
        category.code = request.code;
        category.parent_id = request.parent_id;
        category.level = request.level.unwrap_or(category.level);
        category.description = request.description;
        category.color = request.color;
        category.updated_at = crate::shared::contracts::common::now();
        category.updated_by = updated_by;

        self.save_material_category(&category)?;
        Ok(category)
    }

    fn validate_create_category_request(
        &self,
        request: &CreateMaterialCategoryRequest,
    ) -> MaterialResult<()> {
        if request.name.is_empty() {
            return Err(MaterialError::Validation(
                "Category name is required".to_string(),
            ));
        }

        let count: i32 = self.db.query_single_value(
            "SELECT COUNT(*) FROM material_categories WHERE name = ? AND level = ? AND is_active = 1",
            params![request.name, request.level.unwrap_or(1)],
        )?;

        if count > 0 {
            return Err(MaterialError::Validation(format!(
                "Category '{}' already exists at level {}",
                request.name,
                request.level.unwrap_or(1)
            )));
        }

        Ok(())
    }

    fn save_material_category(&self, category: &MaterialCategory) -> MaterialResult<()> {
        let exists: i32 = self.db.query_single_value(
            "SELECT COUNT(*) FROM material_categories WHERE id = ?",
            params![category.id],
        )?;

        if exists > 0 {
            self.db.execute(
                r#"
                UPDATE material_categories SET
                    name = ?, code = ?, parent_id = ?, level = ?, description = ?, color = ?,
                    is_active = ?, updated_at = ?, updated_by = ?, synced = ?, last_synced_at = ?
                WHERE id = ?
                "#,
                params![
                    category.name,
                    category.code,
                    category.parent_id,
                    category.level,
                    category.description,
                    category.color,
                    category.is_active,
                    category.updated_at,
                    category.updated_by,
                    category.synced,
                    category.last_synced_at,
                    category.id,
                ],
            )?;
        } else {
            self.db.execute(
                r#"
                INSERT INTO material_categories (
                    id, name, code, parent_id, level, description, color, is_active,
                    created_at, updated_at, created_by, updated_by, synced, last_synced_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                params![
                    category.id,
                    category.name,
                    category.code,
                    category.parent_id,
                    category.level,
                    category.description,
                    category.color,
                    category.is_active,
                    category.created_at,
                    category.updated_at,
                    category.created_by,
                    category.updated_by,
                    category.synced,
                    category.last_synced_at,
                ],
            )?;
        }

        Ok(())
    }
}
