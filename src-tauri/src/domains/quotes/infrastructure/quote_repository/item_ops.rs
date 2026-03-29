use crate::domains::quotes::domain::models::quote::{
    Quote, QuoteItem, QuoteStatus, UpdateQuoteItemRequest,
};
use crate::shared::repositories::base::{RepoError, RepoResult};
use rusqlite::params;

use super::{helpers, QuoteRepository};

pub(super) fn find_items_by_quote_id(
    repo: &QuoteRepository,
    quote_id: &str,
) -> RepoResult<Vec<QuoteItem>> {
    repo.db
        .query_as::<QuoteItem>(
            r#"
            SELECT id, quote_id, kind, label, description, qty, unit_price,
                   tax_rate, material_id, position, created_at, updated_at
            FROM quote_items
            WHERE quote_id = ?
            ORDER BY position ASC
            "#,
            params![quote_id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to find quote items: {}", e)))
}

pub(super) fn add_item(repo: &QuoteRepository, item: &QuoteItem) -> RepoResult<()> {
    repo.db
        .execute(
            r#"
            INSERT INTO quote_items (
                id, quote_id, kind, label, description, qty, unit_price,
                tax_rate, material_id, position, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                item.id,
                item.quote_id,
                item.kind.to_string(),
                item.label,
                item.description,
                item.qty,
                item.unit_price,
                item.tax_rate,
                item.material_id,
                item.position,
                item.created_at,
                item.updated_at,
            ],
        )
        .map_err(|e| RepoError::Database(format!("Failed to add quote item: {}", e)))?;

    helpers::invalidate_cache(repo, &item.quote_id);
    Ok(())
}

pub(super) fn create_with_items(
    repo: &QuoteRepository,
    quote: &Quote,
    items: &[QuoteItem],
) -> RepoResult<()> {
    let quote_id = quote.id.clone();
    repo.db
        .with_transaction(|tx| {
            tx.execute(
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
            .map_err(|e| format!("Failed to create quote: {}", e))?;

            for item in items {
                tx.execute(
                    r#"
                    INSERT INTO quote_items (
                        id, quote_id, kind, label, description, qty, unit_price,
                        tax_rate, material_id, position, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                    params![
                        item.id,
                        item.quote_id,
                        item.kind.to_string(),
                        item.label,
                        item.description,
                        item.qty,
                        item.unit_price,
                        item.tax_rate,
                        item.material_id,
                        item.position,
                        item.created_at,
                        item.updated_at,
                    ],
                )
                .map_err(|e| format!("Failed to insert quote item: {}", e))?;
            }
            Ok(())
        })
        .map_err(RepoError::Database)?;
    helpers::invalidate_cache(repo, &quote_id);
    Ok(())
}

pub(super) fn link_task_and_update_status(
    repo: &QuoteRepository,
    quote_id: &str,
    task_id: &str,
    status: &QuoteStatus,
) -> RepoResult<()> {
    let status_str = status.to_string();
    let qid = quote_id.to_string();
    let tid = task_id.to_string();
    repo.db
        .with_transaction(|tx| {
            let rows = tx
                .execute(
                    "UPDATE quotes SET task_id = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                    params![tid, qid],
                )
                .map_err(|e| format!("Failed to link task to quote: {}", e))?;
            if rows == 0 {
                return Err(format!("Quote {} not found or already deleted", qid));
            }
            tx.execute(
                "UPDATE quotes SET status = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                params![status_str, qid],
            )
            .map_err(|e| format!("Failed to update quote status: {}", e))?;
            Ok(())
        })
        .map_err(RepoError::Database)?;
    helpers::invalidate_cache(repo, quote_id);
    Ok(())
}

pub(super) fn add_items_batch(repo: &QuoteRepository, items: &[QuoteItem]) -> RepoResult<()> {
    if items.is_empty() {
        return Ok(());
    }
    let quote_id = items[0].quote_id.clone();
    repo.db
        .with_transaction(|tx| {
            for item in items {
                tx.execute(
                    r#"
                    INSERT INTO quote_items (
                        id, quote_id, kind, label, description, qty, unit_price,
                        tax_rate, material_id, position, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                    params![
                        item.id,
                        item.quote_id,
                        item.kind.to_string(),
                        item.label,
                        item.description,
                        item.qty,
                        item.unit_price,
                        item.tax_rate,
                        item.material_id,
                        item.position,
                        item.created_at,
                        item.updated_at,
                    ],
                )
                .map_err(|e| format!("Failed to batch-insert quote item: {}", e))?;
            }
            Ok(())
        })
        .map_err(RepoError::Database)?;
    helpers::invalidate_cache(repo, &quote_id);
    Ok(())
}

pub(super) fn update_item(
    repo: &QuoteRepository,
    item_id: &str,
    quote_id: &str,
    req: &UpdateQuoteItemRequest,
) -> RepoResult<()> {
    let mut sets = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(ref v) = req.kind {
        sets.push("kind = ?");
        params_vec.push(v.to_string().into());
    }
    if let Some(ref v) = req.label {
        sets.push("label = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.description {
        sets.push("description = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(v) = req.qty {
        sets.push("qty = ?");
        params_vec.push(v.into());
    }
    if let Some(v) = req.unit_price {
        sets.push("unit_price = ?");
        params_vec.push(v.into());
    }
    if let Some(v) = req.tax_rate {
        sets.push("tax_rate = ?");
        params_vec.push(v.into());
    }
    if let Some(ref v) = req.material_id {
        sets.push("material_id = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(v) = req.position {
        sets.push("position = ?");
        params_vec.push((v as i64).into());
    }

    if sets.is_empty() {
        return Ok(());
    }

    sets.push("updated_at = (unixepoch() * 1000)");
    params_vec.push(item_id.to_string().into());
    params_vec.push(quote_id.to_string().into());

    let sql = format!(
        "UPDATE quote_items SET {} WHERE id = ? AND quote_id = ?",
        sets.join(", ")
    );

    let rows = repo
        .db
        .execute(&sql, rusqlite::params_from_iter(params_vec.iter()))
        .map_err(|e| RepoError::Database(format!("Failed to update quote item: {}", e)))?;

    if rows == 0 {
        return Err(RepoError::NotFound("Quote item not found".to_string()));
    }

    helpers::invalidate_cache(repo, quote_id);
    Ok(())
}

pub(super) fn delete_item(
    repo: &QuoteRepository,
    item_id: &str,
    quote_id: &str,
) -> RepoResult<bool> {
    let rows = repo
        .db
        .execute(
            "DELETE FROM quote_items WHERE id = ? AND quote_id = ?",
            params![item_id, quote_id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to delete quote item: {}", e)))?;

    if rows > 0 {
        helpers::invalidate_cache(repo, quote_id);
    }
    Ok(rows > 0)
}
