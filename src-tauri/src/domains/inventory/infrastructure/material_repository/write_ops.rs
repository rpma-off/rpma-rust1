//! Write operations for `MaterialRepository`.

use crate::shared::repositories::base::{RepoError, RepoResult};
use rusqlite::params;

impl super::MaterialRepository {
    /// Update material stock
    pub async fn update_stock(
        &self,
        material_id: &str,
        quantity_adjustment: f64,
    ) -> RepoResult<f64> {
        use crate::shared::repositories::base::Repository;

        self.db
            .execute(
                r#"
                UPDATE materials SET
                    current_stock = current_stock + ?,
                    updated_at = (unixepoch() * 1000)
                WHERE id = ?
                "#,
                params![quantity_adjustment, material_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update material stock: {}", e)))?;

        // Invalidate cache for this material
        self.invalidate_material_cache(material_id);

        // Fetch and return new stock level
        let material = self
            .find_by_id(material_id.to_string())
            .await?
            .ok_or_else(|| {
                RepoError::NotFound("Material not found after stock update".to_string())
            })?;

        Ok(material.current_stock)
    }
}
