//! Infrastructure-layer query builder for `ClientRepoQuery`.
//!
//! These methods were extracted from the domain model layer to comply with
//! ADR-005: the domain layer must have zero infrastructure (SQL / rusqlite)
//! dependencies.  The `ClientRepoQuery` **struct** remains a plain data
//! carrier in `domain::models`; only the SQL-building logic lives here.

use crate::domains::clients::domain::models::ClientRepoQuery;
use crate::shared::repositories::base::RepoError;

impl ClientRepoQuery {
    pub(crate) fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["deleted_at IS NULL".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(search) = &self.search {
            conditions.push(
                "(name LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ? OR contact_person LIKE ?)"
                    .to_string(),
            );
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }

        if let Some(customer_type) = &self.customer_type {
            conditions.push("customer_type = ?".to_string());
            params.push(customer_type.to_string().into());
        }

        if let Some(email) = &self.email {
            conditions.push("email = ?".to_string());
            params.push(email.clone().into());
        }

        if let Some(phone) = &self.phone {
            conditions.push("phone = ?".to_string());
            params.push(phone.clone().into());
        }

        if let Some(city) = &self.city {
            conditions.push("address_city = ?".to_string());
            params.push(city.clone().into());
        }

        if let Some(tags) = &self.tags {
            conditions.push("tags LIKE ?".to_string());
            params.push(format!("%{}%", tags).into());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }

    pub(crate) fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
        crate::shared::repositories::base::validate_sort_column(
            sort_by,
            &[
                "created_at",
                "updated_at",
                "name",
                "email",
                "phone",
                "customer_type",
                "city",
                "total_tasks",
                "active_tasks",
                "completed_tasks",
            ],
        )
    }

    pub(crate) fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(self.sort_by.as_deref().unwrap_or("created_at"))?;
        let sort_order = match self.sort_order.as_deref() {
            Some(order) if order.eq_ignore_ascii_case("asc") => "ASC",
            Some(order) if order.eq_ignore_ascii_case("desc") => "DESC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    pub(crate) fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}
