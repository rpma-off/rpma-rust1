//! Quote repository implementation
//!
//! Provides database access patterns for Quote and QuoteItem entities.

use crate::db::Database;
use crate::models::quote::{Quote, QuoteItem, QuoteQuery, QuoteStatus};
use crate::repositories::base::{RepoError, RepoResult};
use crate::repositories::cache::{ttl, Cache, CacheKeyBuilder};
use rusqlite::params;
use std::sync::Arc;

/// Quote repository for database operations
#[derive(Debug)]
pub struct QuoteRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl QuoteRepository {
    /// Create a new QuoteRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("quote"),
        }
    }

    /// Generate the next quote number
    pub fn next_quote_number(&self) -> RepoResult<String> {
        let count: i64 = self
            .db
            .query_single_value("SELECT COUNT(*) FROM quotes", [])
            .map_err(|e| RepoError::Database(format!("Failed to count quotes: {}", e)))?;

        Ok(format!("DEV-{:05}", count + 1))
    }

    /// Create a new quote
    pub fn create(&self, quote: &Quote) -> RepoResult<()> {
        self.db
            .execute(
                r#"
                INSERT INTO quotes (
                    id, quote_number, client_id, task_id, status,
                    valid_until, notes, terms,
                    subtotal, tax_total, total,
                    vehicle_plate, vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
                    created_at, updated_at, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                params![
                    quote.id,
                    quote.quote_number,
                    quote.client_id,
                    quote.task_id,
                    quote.status.to_string(),
                    quote.valid_until,
                    quote.notes,
                    quote.terms,
                    quote.subtotal,
                    quote.tax_total,
                    quote.total,
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

        self.invalidate_cache(&quote.id);
        Ok(())
    }

    /// Find a quote by ID (includes items)
    pub fn find_by_id(&self, id: &str) -> RepoResult<Option<Quote>> {
        let cache_key = self.cache_key_builder.id(id);

        if let Some(quote) = self.cache.get::<Quote>(&cache_key) {
            return Ok(Some(quote));
        }

        let mut quote = match self.db.query_single_as::<Quote>(
            r#"
            SELECT
                id, quote_number, client_id, task_id, status,
                valid_until, notes, terms,
                subtotal, tax_total, total,
                vehicle_plate, vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
                created_at, updated_at, created_by
            FROM quotes
            WHERE id = ?
            "#,
            params![id],
        ) {
            Ok(q) => match q {
                Some(q) => q,
                None => return Ok(None),
            },
            Err(e) => return Err(RepoError::Database(format!("Failed to find quote: {}", e))),
        };

        // Load items
        quote.items = self.find_items_by_quote_id(&quote.id)?;

        self.cache.set(&cache_key, quote.clone(), ttl::MEDIUM);
        Ok(Some(quote))
    }

    /// List quotes with filtering and pagination
    pub fn list(&self, query: &QuoteQuery) -> RepoResult<(Vec<Quote>, i64)> {
        let (where_clause, params_vec) = self.build_where_clause(query);

        // Count
        let count_sql = format!("SELECT COUNT(*) FROM quotes {}", where_clause);
        let total: i64 = self
            .db
            .query_single_value(&count_sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count quotes: {}", e)))?;

        // Query
        let sort_by = match query.sort_by.as_deref() {
            Some("quote_number") => "quote_number",
            Some("status") => "status",
            Some("total") => "total",
            Some("updated_at") => "updated_at",
            _ => "created_at",
        };
        let sort_order = match query.sort_order.as_deref() {
            Some("ASC") | Some("asc") => "ASC",
            _ => "DESC",
        };

        let page = query.page.unwrap_or(1).max(1);
        let limit = query.limit.unwrap_or(20).max(1).min(100);
        let offset = (page - 1) * limit;

        let sql = format!(
            r#"
            SELECT
                id, quote_number, client_id, task_id, status,
                valid_until, notes, terms,
                subtotal, tax_total, total,
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

        let quotes = self
            .db
            .query_as::<Quote>(&sql, rusqlite::params_from_iter(all_params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to list quotes: {}", e)))?;

        Ok((quotes, total))
    }

    /// Update a quote (only if Draft)
    pub fn update(
        &self,
        id: &str,
        req: &crate::models::quote::UpdateQuoteRequest,
    ) -> RepoResult<()> {
        // Build dynamic SET clause
        let mut sets = Vec::new();
        let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(ref v) = req.valid_until {
            sets.push("valid_until = ?");
            params_vec.push((*v).into());
        }
        if let Some(ref v) = req.notes {
            sets.push("notes = ?");
            params_vec.push(v.clone().into());
        }
        if let Some(ref v) = req.terms {
            sets.push("terms = ?");
            params_vec.push(v.clone().into());
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

        let sql = format!(
            "UPDATE quotes SET {} WHERE id = ? AND status = 'draft'",
            sets.join(", ")
        );

        let rows = self
            .db
            .execute(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to update quote: {}", e)))?;

        if rows == 0 {
            return Err(RepoError::NotFound(
                "Quote not found or not in draft status".to_string(),
            ));
        }

        self.invalidate_cache(id);
        Ok(())
    }

    /// Delete a quote (only if Draft)
    pub fn delete(&self, id: &str) -> RepoResult<bool> {
        let rows = self
            .db
            .execute(
                "DELETE FROM quotes WHERE id = ? AND status = 'draft'",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete quote: {}", e)))?;

        if rows > 0 {
            self.invalidate_cache(id);
        }
        Ok(rows > 0)
    }

    /// Update quote status
    pub fn update_status(&self, id: &str, status: &QuoteStatus) -> RepoResult<()> {
        let rows = self
            .db
            .execute(
                "UPDATE quotes SET status = ?, updated_at = (unixepoch() * 1000) WHERE id = ?",
                params![status.to_string(), id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update quote status: {}", e)))?;

        if rows == 0 {
            return Err(RepoError::NotFound("Quote not found".to_string()));
        }

        self.invalidate_cache(id);
        Ok(())
    }

    /// Link a task to a quote
    pub fn link_task(&self, quote_id: &str, task_id: &str) -> RepoResult<()> {
        self.db
            .execute(
                "UPDATE quotes SET task_id = ?, updated_at = (unixepoch() * 1000) WHERE id = ?",
                params![task_id, quote_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to link task to quote: {}", e)))?;

        self.invalidate_cache(quote_id);
        Ok(())
    }

    /// Update quote totals
    pub fn update_totals(
        &self,
        id: &str,
        subtotal: i64,
        tax_total: i64,
        total: i64,
    ) -> RepoResult<()> {
        self.db
            .execute(
                "UPDATE quotes SET subtotal = ?, tax_total = ?, total = ?, updated_at = (unixepoch() * 1000) WHERE id = ?",
                params![subtotal, tax_total, total, id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update quote totals: {}", e)))?;

        self.invalidate_cache(id);
        Ok(())
    }

    // --- Quote Items ---

    /// Find all items for a quote
    pub fn find_items_by_quote_id(&self, quote_id: &str) -> RepoResult<Vec<QuoteItem>> {
        self.db
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

    /// Add an item to a quote
    pub fn add_item(&self, item: &QuoteItem) -> RepoResult<()> {
        self.db
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

        self.invalidate_cache(&item.quote_id);
        Ok(())
    }

    /// Update a quote item
    pub fn update_item(
        &self,
        item_id: &str,
        quote_id: &str,
        req: &crate::models::quote::UpdateQuoteItemRequest,
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

        let rows = self
            .db
            .execute(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to update quote item: {}", e)))?;

        if rows == 0 {
            return Err(RepoError::NotFound("Quote item not found".to_string()));
        }

        self.invalidate_cache(quote_id);
        Ok(())
    }

    /// Delete a quote item
    pub fn delete_item(&self, item_id: &str, quote_id: &str) -> RepoResult<bool> {
        let rows = self
            .db
            .execute(
                "DELETE FROM quote_items WHERE id = ? AND quote_id = ?",
                params![item_id, quote_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete quote item: {}", e)))?;

        if rows > 0 {
            self.invalidate_cache(quote_id);
        }
        Ok(rows > 0)
    }

    // --- Helpers ---

    fn build_where_clause(
        &self,
        query: &QuoteQuery,
    ) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = Vec::new();
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(ref client_id) = query.client_id {
            conditions.push("client_id = ?".to_string());
            params.push(client_id.clone().into());
        }

        if let Some(ref status) = query.status {
            conditions.push("status = ?".to_string());
            params.push(status.to_string().into());
        }

        if let Some(ref search) = query.search {
            conditions.push("(quote_number LIKE ? OR notes LIKE ?)".to_string());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
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

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }

    fn invalidate_cache(&self, id: &str) {
        self.cache.remove(&self.cache_key_builder.id(id));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::models::quote::*;

    async fn setup_test_db() -> Database {
        crate::test_utils::setup_test_db().await
    }

    fn make_test_quote(id: &str, client_id: &str) -> Quote {
        let now = chrono::Utc::now().timestamp_millis();
        Quote {
            id: id.to_string(),
            quote_number: format!("DEV-{}", id),
            client_id: client_id.to_string(),
            task_id: None,
            status: QuoteStatus::Draft,
            valid_until: None,
            notes: None,
            terms: None,
            subtotal: 0,
            tax_total: 0,
            total: 0,
            vehicle_plate: None,
            vehicle_make: None,
            vehicle_model: None,
            vehicle_year: None,
            vehicle_vin: None,
            created_at: now,
            updated_at: now,
            created_by: Some("test_user".to_string()),
            items: vec![],
        }
    }

    fn make_test_item(id: &str, quote_id: &str, position: i32) -> QuoteItem {
        let now = chrono::Utc::now().timestamp_millis();
        QuoteItem {
            id: id.to_string(),
            quote_id: quote_id.to_string(),
            kind: QuoteItemKind::Service,
            label: format!("Item {}", id),
            description: None,
            qty: 1.0,
            unit_price: 10000, // 100.00 in cents
            tax_rate: Some(20.0),
            material_id: None,
            position,
            created_at: now,
            updated_at: now,
        }
    }

    fn insert_test_client(db: &Database, client_id: &str) {
        let now = chrono::Utc::now().timestamp_millis();
        db.execute(
            r#"INSERT INTO clients (id, name, email, customer_type, total_tasks, active_tasks, completed_tasks, created_at, updated_at, synced)
               VALUES (?, 'Test Client', 'test@example.com', 'individual', 0, 0, 0, ?, ?, 0)"#,
            params![client_id, now, now],
        )
        .expect("insert test client");
    }

    #[tokio::test]
    async fn test_create_and_find_quote() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = QuoteRepository::new(db.clone(), cache);

        insert_test_client(&db, "client-1");

        let quote = make_test_quote("q1", "client-1");
        repo.create(&quote).unwrap();

        let found = repo.find_by_id("q1").unwrap();
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.id, "q1");
        assert_eq!(found.quote_number, "DEV-q1");
        assert_eq!(found.status, QuoteStatus::Draft);
    }

    #[tokio::test]
    async fn test_add_and_find_items() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = QuoteRepository::new(db.clone(), cache);

        insert_test_client(&db, "client-2");
        let quote = make_test_quote("q2", "client-2");
        repo.create(&quote).unwrap();

        let item1 = make_test_item("i1", "q2", 0);
        let item2 = make_test_item("i2", "q2", 1);
        repo.add_item(&item1).unwrap();
        repo.add_item(&item2).unwrap();

        let found = repo.find_by_id("q2").unwrap().unwrap();
        assert_eq!(found.items.len(), 2);
        assert_eq!(found.items[0].position, 0);
        assert_eq!(found.items[1].position, 1);
    }

    #[tokio::test]
    async fn test_delete_draft_only() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = QuoteRepository::new(db.clone(), cache);

        insert_test_client(&db, "client-3");

        let quote = make_test_quote("q3", "client-3");
        repo.create(&quote).unwrap();

        // Can delete a draft
        assert!(repo.delete("q3").unwrap());

        // Recreate and change status to sent
        let quote2 = make_test_quote("q4", "client-3");
        repo.create(&quote2).unwrap();
        repo.update_status("q4", &QuoteStatus::Sent).unwrap();

        // Cannot delete a sent quote
        assert!(!repo.delete("q4").unwrap());
    }

    #[tokio::test]
    async fn test_list_with_filters() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = QuoteRepository::new(db.clone(), cache);

        insert_test_client(&db, "client-5");

        for i in 0..5 {
            let quote = make_test_quote(&format!("ql{}", i), "client-5");
            repo.create(&quote).unwrap();
        }

        let query = QuoteQuery {
            client_id: Some("client-5".to_string()),
            ..Default::default()
        };
        let (quotes, total) = repo.list(&query).unwrap();
        assert_eq!(total, 5);
        assert_eq!(quotes.len(), 5);
    }

    #[tokio::test]
    async fn test_update_totals() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = QuoteRepository::new(db.clone(), cache);

        insert_test_client(&db, "client-6");

        let quote = make_test_quote("q6", "client-6");
        repo.create(&quote).unwrap();

        repo.update_totals("q6", 10000, 2000, 12000).unwrap();

        let found = repo.find_by_id("q6").unwrap().unwrap();
        assert_eq!(found.subtotal, 10000);
        assert_eq!(found.tax_total, 2000);
        assert_eq!(found.total, 12000);
    }
}
