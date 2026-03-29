use crate::domains::quotes::domain::models::quote::{
    Quote, QuoteMonthlyCount, QuoteQuery, QuoteStats, QuoteStatus,
};
use crate::shared::repositories::base::{RepoError, RepoResult};
use crate::shared::repositories::cache::ttl;
use rusqlite::params;

use super::{helpers, QuoteRepository};

pub(super) fn next_quote_number(repo: &QuoteRepository) -> RepoResult<String> {
    let max_num: Option<i64> = repo
        .db
        .query_single_value(
            "SELECT MAX(CAST(SUBSTR(quote_number, 5) AS INTEGER)) FROM quotes WHERE quote_number LIKE 'DEV-%'",
            [],
        )
        .ok();
    let next = max_num.unwrap_or(0) + 1;
    Ok(format!("DEV-{:05}", next))
}

pub(super) fn find_by_id(repo: &QuoteRepository, id: &str) -> RepoResult<Option<Quote>> {
    let cache_key = repo.cache_key_builder.id(id);

    if let Some(quote) = repo.cache.get::<Quote>(&cache_key) {
        return Ok(Some(quote));
    }

    let mut quote = match repo.db.query_single_as::<Quote>(
        r#"
        SELECT
            id, quote_number, client_id, task_id, status,
            valid_until, description, notes, terms,
            subtotal, tax_total, total,
            discount_type, discount_value, discount_amount,
            vehicle_plate, vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
            created_at, updated_at, created_by
        FROM quotes
        WHERE id = ? AND deleted_at IS NULL
        "#,
        params![id],
    ) {
        Ok(q) => match q {
            Some(q) => q,
            None => return Ok(None),
        },
        Err(e) => return Err(RepoError::Database(format!("Failed to find quote: {}", e))),
    };

    quote.items = repo.find_items_by_quote_id(&quote.id)?;
    repo.cache.set(&cache_key, quote.clone(), ttl::MEDIUM);
    Ok(Some(quote))
}

pub(super) fn list(repo: &QuoteRepository, query: &QuoteQuery) -> RepoResult<(Vec<Quote>, i64)> {
    let (where_clause, params_vec) = helpers::build_where_clause(repo, query);

    let count_sql = format!("SELECT COUNT(*) FROM quotes {}", where_clause);
    let total: i64 = repo
        .db
        .query_single_value(&count_sql, rusqlite::params_from_iter(params_vec.iter()))
        .map_err(|e| RepoError::Database(format!("Failed to count quotes: {}", e)))?;

    let sort_by = match query.pagination.sort_by.as_deref() {
        Some("quote_number") => "quote_number",
        Some("client_id") => "client_id",
        Some("status") => "status",
        Some("total") => "total",
        Some("updated_at") => "updated_at",
        _ => "created_at",
    };
    let sort_order = query.pagination.sort_order_sql();
    let limit = query.pagination.page_size().min(100);
    let offset = query.pagination.offset();

    let sql = format!(
        r#"
        SELECT
            id, quote_number, client_id, task_id, status,
            valid_until, description, notes, terms,
            subtotal, tax_total, total,
            discount_type, discount_value, discount_amount,
            vehicle_plate, vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
            created_at, updated_at, created_by
        FROM quotes
        {}
        ORDER BY {} {}
        LIMIT ? OFFSET ?
        "#,
        where_clause, sort_by, sort_order
    );

    let mut all_params = params_vec;
    all_params.push((limit as i64).into());
    all_params.push((offset as i64).into());

    let quotes = repo
        .db
        .query_as::<Quote>(&sql, rusqlite::params_from_iter(all_params.iter()))
        .map_err(|e| RepoError::Database(format!("Failed to list quotes: {}", e)))?;

    Ok((quotes, total))
}

pub(super) fn get_stats(repo: &QuoteRepository) -> RepoResult<QuoteStats> {
    let conn = repo
        .db
        .get_connection()
        .map_err(|e| RepoError::Database(format!("Failed to get connection: {}", e)))?;

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| RepoError::Database(format!("Failed to count quotes: {}", e)))?;

    let mut stmt = conn
        .prepare("SELECT status, COUNT(*) FROM quotes WHERE deleted_at IS NULL GROUP BY status")
        .map_err(|e| RepoError::Database(format!("Failed to prepare stats: {}", e)))?;

    let mut draft = 0i64;
    let mut sent = 0i64;
    let mut accepted = 0i64;
    let mut rejected = 0i64;
    let mut expired = 0i64;
    let mut converted = 0i64;

    let rows = stmt
        .query_map([], |row| {
            let status: String = row.get(0)?;
            let count: i64 = row.get(1)?;
            Ok((status, count))
        })
        .map_err(|e| RepoError::Database(format!("Failed to query stats: {}", e)))?;

    for row in rows {
        let (status, count) =
            row.map_err(|e| RepoError::Database(format!("Failed to read status row: {}", e)))?;
        let Ok(qs) = status.parse::<QuoteStatus>() else {
            continue;
        };
        match qs {
            QuoteStatus::Draft => draft = count,
            QuoteStatus::Sent => sent = count,
            QuoteStatus::Accepted => accepted = count,
            QuoteStatus::Rejected => rejected = count,
            QuoteStatus::Expired => expired = count,
            QuoteStatus::Converted => converted = count,
            QuoteStatus::ChangesRequested => {}
        }
    }

    let mut monthly_stmt = conn
        .prepare(
            r#"
            SELECT
                strftime('%Y-%m', created_at / 1000, 'unixepoch') AS month,
                COUNT(*) AS count
            FROM quotes
            WHERE deleted_at IS NULL
              AND created_at >= (strftime('%s', 'now', '-6 months') * 1000)
            GROUP BY month
            ORDER BY month ASC
            "#,
        )
        .map_err(|e| RepoError::Database(format!("Failed to prepare monthly stats: {}", e)))?;

    let monthly_rows = monthly_stmt
        .query_map([], |row| {
            Ok(QuoteMonthlyCount {
                month: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| RepoError::Database(format!("Failed to query monthly stats: {}", e)))?;

    let mut monthly_counts = Vec::new();
    for row in monthly_rows {
        monthly_counts.push(
            row.map_err(|e| RepoError::Database(format!("Failed to read monthly row: {}", e)))?,
        );
    }

    Ok(QuoteStats {
        total,
        draft,
        sent,
        accepted,
        rejected,
        expired,
        converted,
        monthly_counts,
    })
}
