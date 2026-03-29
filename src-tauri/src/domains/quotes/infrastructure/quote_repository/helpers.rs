use crate::domains::quotes::domain::models::quote::QuoteQuery;

use super::QuoteRepository;

pub(super) fn build_where_clause(
    _repo: &QuoteRepository,
    query: &QuoteQuery,
) -> (String, Vec<rusqlite::types::Value>) {
    let mut conditions = Vec::new();
    let mut params: Vec<rusqlite::types::Value> = Vec::new();

    conditions.push("deleted_at IS NULL".to_string());

    if let Some(ref client_id) = query.client_id {
        conditions.push("client_id = ?".to_string());
        params.push(client_id.clone().into());
    }

    if let Some(ref status) = query.status {
        conditions.push("status = ?".to_string());
        params.push(status.to_string().into());
    }

    if let Some(ref search) = query.search {
        conditions.push(
            "(quote_number LIKE ? OR notes LIKE ? OR vehicle_plate LIKE ? OR description LIKE ?)"
                .to_string(),
        );
        let pattern = format!("%{}%", search);
        params.push(pattern.clone().into());
        params.push(pattern.clone().into());
        params.push(pattern.clone().into());
        params.push(pattern.into());
    }

    if let Some(ref date_from) = query.date_from {
        if let Ok(ts) = date_from.parse::<i64>() {
            conditions.push("created_at >= ?".to_string());
            params.push(ts.into());
        }
    }

    if let Some(ref date_to) = query.date_to {
        if let Ok(ts) = date_to.parse::<i64>() {
            conditions.push("created_at <= ?".to_string());
            params.push(ts.into());
        }
    }

    (format!("WHERE {}", conditions.join(" AND ")), params)
}

pub(super) fn invalidate_cache(repo: &QuoteRepository, id: &str) {
    repo.cache.remove(&repo.cache_key_builder.id(id));
}
