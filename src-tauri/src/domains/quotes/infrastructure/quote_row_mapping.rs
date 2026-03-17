//! Row-to-domain mapping for Quote entities.

use crate::db::FromSqlRow;
use crate::domains::quotes::domain::models::quote::{
    AttachmentType, Quote, QuoteAttachment, QuoteItem, QuoteItemKind, QuoteStatus,
};
use rusqlite::Row;

fn get_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<i64> {
    match row.get::<_, i64>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: String = row.get(column)?;
            value.parse::<i64>().map_err(|_| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    "Unable to parse integer".into(),
                )
            })
        }
    }
}

fn get_optional_i64_from_row(row: &Row, column: &str) -> rusqlite::Result<Option<i64>> {
    match row.get::<_, Option<i64>>(column) {
        Ok(value) => Ok(value),
        Err(_) => {
            let value: Option<String> = row.get(column)?;
            match value {
                Some(v) => v.parse::<i64>().map(Some).map_err(|_| {
                    rusqlite::Error::FromSqlConversionFailure(
                        0,
                        rusqlite::types::Type::Text,
                        "Unable to parse integer".into(),
                    )
                }),
                None => Ok(None),
            }
        }
    }
}

impl FromSqlRow for Quote {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            quote_number: row.get("quote_number")?,
            client_id: row.get("client_id")?,
            task_id: row.get("task_id")?,
            status: match row.get::<_, String>("status")?.as_str() {
                "sent" => QuoteStatus::Sent,
                "accepted" => QuoteStatus::Accepted,
                "rejected" => QuoteStatus::Rejected,
                "expired" => QuoteStatus::Expired,
                "converted" => QuoteStatus::Converted,
                "changes_requested" => QuoteStatus::ChangesRequested,
                _ => QuoteStatus::Draft,
            },
            valid_until: get_optional_i64_from_row(row, "valid_until")?,
            description: row.get("description")?,
            notes: row.get("notes")?,
            terms: row.get("terms")?,
            subtotal: get_i64_from_row(row, "subtotal")?,
            tax_total: get_i64_from_row(row, "tax_total")?,
            total: get_i64_from_row(row, "total")?,
            discount_type: row.get("discount_type")?,
            discount_value: get_optional_i64_from_row(row, "discount_value")?,
            discount_amount: get_optional_i64_from_row(row, "discount_amount")?,
            vehicle_plate: row.get("vehicle_plate")?,
            vehicle_make: row.get("vehicle_make")?,
            vehicle_model: row.get("vehicle_model")?,
            vehicle_year: row.get("vehicle_year")?,
            vehicle_vin: row.get("vehicle_vin")?,
            created_at: get_i64_from_row(row, "created_at")?,
            updated_at: get_i64_from_row(row, "updated_at")?,
            created_by: row.get("created_by")?,
            items: Vec::new(),
        })
    }
}

impl FromSqlRow for QuoteItem {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            quote_id: row.get("quote_id")?,
            kind: match row.get::<_, String>("kind")?.as_str() {
                "labor" => QuoteItemKind::Labor,
                "material" => QuoteItemKind::Material,
                "discount" => QuoteItemKind::Discount,
                _ => QuoteItemKind::Service,
            },
            label: row.get("label")?,
            description: row.get("description")?,
            qty: row.get("qty")?,
            unit_price: get_i64_from_row(row, "unit_price")?,
            tax_rate: row.get("tax_rate")?,
            material_id: row.get("material_id")?,
            position: row.get("position")?,
            created_at: get_i64_from_row(row, "created_at")?,
            updated_at: get_i64_from_row(row, "updated_at")?,
        })
    }
}

impl FromSqlRow for QuoteAttachment {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            quote_id: row.get("quote_id")?,
            file_name: row.get("file_name")?,
            file_path: row.get("file_path")?,
            file_size: get_i64_from_row(row, "file_size")?,
            mime_type: row.get("mime_type")?,
            attachment_type: match row.get::<_, String>("attachment_type")?.as_str() {
                "image" => AttachmentType::Image,
                "document" => AttachmentType::Document,
                _ => AttachmentType::Other,
            },
            description: row.get("description")?,
            created_at: get_i64_from_row(row, "created_at")?,
            created_by: row.get("created_by")?,
        })
    }
}
