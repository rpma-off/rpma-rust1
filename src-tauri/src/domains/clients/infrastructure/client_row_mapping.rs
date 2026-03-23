//! Row-mapping helpers for the `clients` table (ADR-001: DB mapping belongs in infrastructure).

use crate::db::FromSqlRow;
use crate::domains::clients::domain::models::{Client, CustomerType};
use rusqlite::Row;

/// Parse an i64 from a row column that may be stored as integer or text timestamp.
pub(crate) fn get_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<i64> {
    match row.get::<_, i64>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: String = row.get(column)?;
            parse_timestamp_millis(&value).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    "Unable to parse timestamp".into(),
                )
            })
        }
    }
}

/// Parse an optional i64 from a nullable column.
pub(crate) fn get_optional_i64_from_row(
    row: &Row,
    column: &str,
) -> rusqlite::Result<Option<i64>> {
    match row.get::<_, Option<i64>>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: Option<String> = row.get(column)?;
            match value {
                Some(v) => parse_timestamp_millis(&v).map(Some).ok_or_else(|| {
                    rusqlite::Error::FromSqlConversionFailure(
                        0,
                        rusqlite::types::Type::Text,
                        "Unable to parse timestamp".into(),
                    )
                }),
                None => Ok(None),
            }
        }
    }
}

fn parse_timestamp_millis(value: &str) -> Option<i64> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(v) = trimmed.parse::<i64>() {
        return Some(v);
    }
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.timestamp_millis());
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S") {
        return Some(dt.and_utc().timestamp_millis());
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S%.f") {
        return Some(dt.and_utc().timestamp_millis());
    }
    if let Ok(d) = chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        let dt = d.and_hms_opt(0, 0, 0)?;
        return Some(dt.and_utc().timestamp_millis());
    }
    None
}

// ── FromSqlRow impl ───────────────────────────────────────────────────────────

impl FromSqlRow for Client {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Client {
            id: row.get("id")?,
            name: row.get("name")?,
            email: row.get("email")?,
            phone: row.get("phone")?,
            customer_type: match row.get::<_, String>("customer_type")?.as_str() {
                "business" => CustomerType::Business,
                _ => CustomerType::Individual,
            },
            address_street: row.get("address_street")?,
            address_city: row.get("address_city")?,
            address_state: row.get("address_state")?,
            address_zip: row.get("address_zip")?,
            address_country: row.get("address_country")?,
            tax_id: row.get("tax_id")?,
            company_name: row.get("company_name")?,
            contact_person: row.get("contact_person")?,
            notes: row.get("notes")?,
            tags: row.get("tags")?,
            total_tasks: row.get("total_tasks")?,
            active_tasks: row.get("active_tasks")?,
            completed_tasks: row.get("completed_tasks")?,
            last_task_date: row.get("last_task_date")?,
            created_at: get_i64_from_row(row, "created_at")?,
            updated_at: get_i64_from_row(row, "updated_at")?,
            created_by: row.get("created_by")?,
            deleted_at: get_optional_i64_from_row(row, "deleted_at")?,
            deleted_by: row.get("deleted_by")?,
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: get_optional_i64_from_row(row, "last_synced_at")?,
        })
    }
}
