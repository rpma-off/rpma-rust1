//! Repository implementation for the `trash` domain (ADR-005).

use crate::db::Database;
use crate::domains::trash::domain::models::trash::{DeletedItem, EntityType};
use crate::shared::error::AppError;
use rusqlite::params;
use std::sync::Arc;

/// Repository for `Trash` persistence operations.
pub struct TrashRepository {
    db: Arc<Database>,
}

impl TrashRepository {
    /// Create a new `TrashRepository`.
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// List soft-deleted items for a specific entity type
    pub fn list_deleted(
        &self,
        entity_type: &EntityType,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<DeletedItem>, AppError> {
        let table_name = entity_type.table_name();
        let display_col = entity_type.display_name_column();
        
        let query = format!(
            "SELECT t.id, t.{}, t.deleted_at, t.deleted_by, u.full_name as deleted_by_name 
             FROM {} t 
             LEFT JOIN users u ON t.deleted_by = u.id 
             WHERE t.deleted_at IS NOT NULL 
             ORDER BY t.deleted_at DESC 
             LIMIT ? OFFSET ?",
            display_col, table_name
        );

        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(&query).map_err(|e| AppError::Database(e.to_string()))?;
        
        let items_iter = stmt.query_map(params![limit, offset], |row| {
            let deleted_at: Option<i64> = row.get(2)?;
            // Attempt to get the display name, defaulting to a string "Unknown" if it's null
            let display_name: Option<String> = row.get(1)?;
            Ok(DeletedItem {
                id: row.get(0)?,
                entity_type: entity_type.clone(),
                display_name: display_name.unwrap_or_else(|| "Unknown".to_string()),
                deleted_at: deleted_at.unwrap_or(0),
                deleted_by: row.get(3)?,
                deleted_by_name: row.get(4)?,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut items = Vec::new();
        for item in items_iter {
            items.push(item.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(items)
    }

    /// Restore a soft-deleted item
    pub fn restore(&self, entity_type: &EntityType, id: &str) -> Result<(), AppError> {
        let table_name = entity_type.table_name();
        let query = format!(
            "UPDATE {} SET deleted_at = NULL, deleted_by = NULL WHERE id = ?",
            table_name
        );
        
        let conn = self.db.get_connection()?;
        let rows = conn.execute(&query, params![id])
            .map_err(|e| AppError::Database(e.to_string()))?;
            
        if rows == 0 {
            return Err(AppError::NotFound(format!("{} with id {} not found or not deleted", table_name, id)));
        }
        
        Ok(())
    }

    /// Hard delete an item
    pub fn hard_delete(&self, entity_type: &EntityType, id: &str) -> Result<(), AppError> {
        let table_name = entity_type.table_name();
        let query = format!("DELETE FROM {} WHERE id = ?", table_name);
        
        let conn = self.db.get_connection()?;
        let rows = conn.execute(&query, params![id])
            .map_err(|e| AppError::Database(e.to_string()))?;
            
        if rows == 0 {
            return Err(AppError::NotFound(format!("{} with id {} not found", table_name, id)));
        }
        
        Ok(())
    }

    /// Empty trash for a specific entity type, or all if None
    pub fn empty_trash(&self, entity_type: Option<EntityType>) -> Result<u64, AppError> {
        let conn = self.db.get_connection()?;
        let mut total_deleted = 0;
        
        let types_to_empty = match entity_type {
            Some(t) => vec![t],
            None => vec![
                EntityType::Task,
                EntityType::Client,
                EntityType::Quote,
                EntityType::Material,
                EntityType::Intervention,
                EntityType::Photo,
                EntityType::Rapport,
            ],
        };
        
        for t in types_to_empty {
            let table_name = t.table_name();
            let query = format!("DELETE FROM {} WHERE deleted_at IS NOT NULL", table_name);
            let rows = conn.execute(&query, [])
                .map_err(|e| AppError::Database(e.to_string()))?;
            total_deleted += rows as u64;
        }
        
        Ok(total_deleted)
    }
}
