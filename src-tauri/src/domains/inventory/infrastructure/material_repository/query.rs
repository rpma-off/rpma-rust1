//! Query builder for filtering materials.

use crate::shared::repositories::base::RepoError;

/// Query for filtering materials
#[derive(Debug, Clone, Default)]
pub struct MaterialQuery {
    pub search: Option<String>,
    pub material_type: Option<crate::domains::inventory::domain::models::material::MaterialType>,
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
    pub(super) fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
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
        crate::shared::repositories::base::validate_sort_column(
            sort_by,
            &[
                "created_at",
                "updated_at",
                "name",
                "sku",
                "material_type",
                "category",
                "is_active",
                "quantity",
                "price",
            ],
        )
    }

    pub(super) fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(self.sort_by.as_deref().unwrap_or("name"))?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            Some("DESC") => "DESC",
            _ => "ASC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    pub(super) fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}
