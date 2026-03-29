use crate::domains::quotes::domain::models::quote::{
    AttachmentType, CreateQuoteAttachmentRequest, QuoteAttachment, UpdateQuoteAttachmentRequest,
};
use crate::shared::repositories::base::{RepoError, RepoResult};
use rusqlite::params;

use super::{helpers, QuoteRepository};

pub(super) fn find_attachments_by_quote_id(
    repo: &QuoteRepository,
    quote_id: &str,
) -> RepoResult<Vec<QuoteAttachment>> {
    repo.db
        .query_as::<QuoteAttachment>(
            r#"
            SELECT id, quote_id, file_name, file_path, file_size, mime_type,
                   attachment_type, description, created_at, created_by
            FROM quote_attachments
            WHERE quote_id = ?
            ORDER BY created_at DESC
            "#,
            params![quote_id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to find quote attachments: {}", e)))
}

pub(super) fn find_attachment_by_id(
    repo: &QuoteRepository,
    id: &str,
) -> RepoResult<Option<QuoteAttachment>> {
    repo.db
        .query_single_as::<QuoteAttachment>(
            r#"
            SELECT id, quote_id, file_name, file_path, file_size, mime_type,
                   attachment_type, description, created_at, created_by
            FROM quote_attachments
            WHERE id = ?
            "#,
            params![id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to find attachment: {}", e)))
}

pub(super) fn create_attachment(
    repo: &QuoteRepository,
    quote_id: &str,
    req: &CreateQuoteAttachmentRequest,
    created_by: Option<&str>,
) -> RepoResult<String> {
    let id = crate::shared::utils::uuid::generate_uuid_string();
    let now = chrono::Utc::now().timestamp_millis();
    let attachment_type = req
        .attachment_type
        .as_ref()
        .unwrap_or(&AttachmentType::Other)
        .to_string();

    repo.db
        .execute(
            r#"
            INSERT INTO quote_attachments (
                id, quote_id, file_name, file_path, file_size, mime_type,
                attachment_type, description, created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                id,
                quote_id,
                req.file_name,
                req.file_path,
                req.file_size,
                req.mime_type,
                attachment_type,
                req.description,
                now,
                created_by,
            ],
        )
        .map_err(|e| RepoError::Database(format!("Failed to create attachment: {}", e)))?;

    helpers::invalidate_cache(repo, quote_id);
    Ok(id)
}

pub(super) fn update_attachment(
    repo: &QuoteRepository,
    id: &str,
    quote_id: &str,
    req: &UpdateQuoteAttachmentRequest,
) -> RepoResult<()> {
    let mut sets = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(ref v) = req.description {
        sets.push("description = ?");
        params_vec.push(v.clone().into());
    }
    if let Some(ref v) = req.attachment_type {
        sets.push("attachment_type = ?");
        params_vec.push(v.to_string().into());
    }

    if sets.is_empty() {
        return Ok(());
    }

    params_vec.push(id.to_string().into());
    params_vec.push(quote_id.to_string().into());

    let sql = format!(
        "UPDATE quote_attachments SET {} WHERE id = ? AND quote_id = ?",
        sets.join(", ")
    );

    let rows = repo
        .db
        .execute(&sql, rusqlite::params_from_iter(params_vec.iter()))
        .map_err(|e| RepoError::Database(format!("Failed to update attachment: {}", e)))?;

    if rows == 0 {
        return Err(RepoError::NotFound("Attachment not found".to_string()));
    }

    helpers::invalidate_cache(repo, quote_id);
    Ok(())
}

pub(super) fn delete_attachment(
    repo: &QuoteRepository,
    id: &str,
    quote_id: &str,
) -> RepoResult<bool> {
    let rows = repo
        .db
        .execute(
            "DELETE FROM quote_attachments WHERE id = ? AND quote_id = ?",
            params![id, quote_id],
        )
        .map_err(|e| RepoError::Database(format!("Failed to delete attachment: {}", e)))?;

    if rows > 0 {
        helpers::invalidate_cache(repo, quote_id);
    }
    Ok(rows > 0)
}
