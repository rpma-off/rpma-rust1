use crate::domains::quotes::domain::models::quote::{Quote, QuoteStatus, UpdateQuoteRequest};
use crate::shared::repositories::base::{RepoError, RepoResult};
use rusqlite::params;

use super::{helpers, QuoteRepository};

pub(super) fn create(repo: &QuoteRepository, quote: &Quote) -> RepoResult<()> {
    repo.db
        .execute(
            r#"
            INSERT INTO quotes (
                id, quote_number, client_id, task_id, status,
                valid_until, description, notes, terms,
                subtotal, tax_total, total,
                discount_type, discount_value, discount_amount,
                vehicle_plate, vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
                created_at, updated_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                quote.id,
                quote.quote_number,
                quote.client_id,
                quote.task_id,
                quote.status.to_string(),
                quote.valid_until,
                quote.description,
                quote.notes,
                quote.terms,
                quote.subtotal,
                quote.tax_total,
                quote.total,
                quote.discount_type,
                quote.discount_value,
                quote.discount_amount,
                quote.vehicle_plate,
                quote.vehicle_make,
                quote.vehicle_model,
                quote.vehicle_year,
                quote.vehicle_vin,
                quote.created_at,
                quote.updated_at,
                quote.created_by,
            ],
        )
        .map_err(|e| RepoError::Database(format!("Failed to create quote: {}", e)))?;

    helpers::invalidate_cache(repo, &quote.id);
    Ok(())
}

pub(super) fn update(repo: &QuoteRepository, id: &str, req: &UpdateQuoteRequest) -> RepoResult<()> {
    let mut sets = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(ref v) = req.valid_until {
        sets.push("valid_until = ?");
        params_vec.push((*v).into());
    }
    if let Some(ref v) = req.description {
        sets.push("description = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.notes {
        sets.push("notes = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.terms {
        sets.push("terms = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.discount_type {
        sets.push("discount_type = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(v) = req.discount_value {
        sets.push("discount_value = ?");
        params_vec.push(v.into());
    }
    if let Some(ref v) = req.vehicle_plate {
        sets.push("vehicle_plate = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.vehicle_make {
        sets.push("vehicle_make = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.vehicle_model {
        sets.push("vehicle_model = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.vehicle_year {
        sets.push("vehicle_year = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.vehicle_vin {
        sets.push("vehicle_vin = ?");
        params_vec.push(v.clone().into());
    }

    if sets.is_empty() {
        return Ok(());
    }

    sets.push("updated_at = (unixepoch() * 1000)");
    params_vec.push(id.to_string().into());
    params_vec.push(QuoteStatus::Draft.to_string().into());

    let sql = format!(
        "UPDATE quotes SET {} WHERE id = ? AND status = ? AND deleted_at IS NULL",
        sets.join(", ")
    );

    let rows = repo
        .db
        .execute(&sql, rusqlite::params_from_iter(params_vec.iter()))
        .map_err(|e| RepoError::Database(format!("Failed to update quote: {}", e)))?;

    if rows == 0 {
        return Err(RepoError::NotFound(
            "Quote not found or not in draft status".to_string(),
        ));
    }

    helpers::invalidate_cache(repo, id);
    Ok(())
}

pub(super) fn delete(repo: &QuoteRepository, id: &str) -> RepoResult<bool> {
    let rows = repo
        .db
        .execute(
            "UPDATE quotes SET deleted_at = (unixepoch() * 1000), updated_at = (unixepoch() * 1000) WHERE id = ? AND status = ? AND deleted_at IS NULL",
            params![id, QuoteStatus::Draft.to_string()],
        )
        .map_err(|e| RepoError::Database(format!("Failed to soft-delete quote: {}", e)))?;

    if rows > 0 {
        helpers::invalidate_cache(repo, id);
    }
    Ok(rows > 0)
}

pub(super) fn update_status(
    repo: &QuoteRepository,
    id: &str,
    status: &QuoteStatus,
) -> RepoResult<()> {
    let rows = repo
        .db
        .execute(
            "UPDATE quotes SET status = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
            params![status.to_string(), id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to update quote status: {}", e)))?;

    if rows == 0 {
        return Err(RepoError::NotFound("Quote not found".to_string()));
    }

    helpers::invalidate_cache(repo, id);
    Ok(())
}

pub(super) fn link_task(repo: &QuoteRepository, quote_id: &str, task_id: &str) -> RepoResult<()> {
    repo.db
        .execute(
            "UPDATE quotes SET task_id = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
            params![task_id, quote_id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to link task to quote: {}", e)))?;

    helpers::invalidate_cache(repo, quote_id);
    Ok(())
}

pub(super) fn update_totals(
    repo: &QuoteRepository,
    id: &str,
    subtotal: i64,
    tax_total: i64,
    total: i64,
) -> RepoResult<()> {
    let rows = repo
        .db
        .execute(
            "UPDATE quotes SET subtotal = ?, tax_total = ?, total = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
            params![subtotal, tax_total, total, id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to update quote totals: {}", e)))?;

    if rows == 0 {
        return Err(RepoError::NotFound(format!(
            "Quote {} not found or deleted",
            id
        )));
    }

    helpers::invalidate_cache(repo, id);
    Ok(())
}

pub(super) fn update_totals_with_discount(
    repo: &QuoteRepository,
    id: &str,
    subtotal: i64,
    discount_amount: i64,
    tax_total: i64,
    total: i64,
) -> RepoResult<()> {
    repo.db
        .execute(
            "UPDATE quotes SET subtotal = ?, discount_amount = ?, tax_total = ?, total = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
            params![subtotal, discount_amount, tax_total, total, id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to update quote totals with discount: {}", e)))?;

    helpers::invalidate_cache(repo, id);
    Ok(())
}
