//! Query builder for filtering users.

use crate::domains::users::domain::models::user::UserRole;
use crate::shared::repositories::base::RepoError;

/// Query for filtering users
#[derive(Debug, Clone, Default)]
pub struct UserQuery {
    pub search: Option<String>,
    pub role: Option<UserRole>,
    pub is_active: Option<bool>,
    pub email: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl UserQuery {
    pub(super) fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["deleted_at IS NULL".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(search) = &self.search {
            conditions.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)".to_string());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }

        if let Some(role) = &self.role {
            conditions.push("role = ?".to_string());
            params.push(role.to_string().into());
        }

        if let Some(is_active) = self.is_active {
            conditions.push("is_active = ?".to_string());
            params.push((if is_active { 1 } else { 0 }).into());
        }

        if let Some(email) = &self.email {
            conditions.push("email = ?".to_string());
            params.push(email.clone().into());
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
                "email",
                "full_name",
                "role",
                "phone",
                "is_active",
                "last_login_at",
                "login_count",
            ],
        )
    }

    pub(super) fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(self.sort_by.as_deref().unwrap_or("created_at"))?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            Some("DESC") => "DESC",
            _ => "DESC",
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
