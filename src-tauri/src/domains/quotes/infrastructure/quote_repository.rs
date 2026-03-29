//! Quote repository implementation.
//!
//! Keeps `QuoteRepository` as the public façade while delegating concrete SQL
//! operations to focused internal modules.

mod attachment_ops;
mod helpers;
mod item_ops;
mod quote_write_ops;
mod read_ops;

use crate::db::Database;
use crate::domains::quotes::domain::models::quote::{
    CreateQuoteAttachmentRequest, IQuoteRepository, Quote, QuoteAttachment, QuoteItem, QuoteQuery,
    QuoteStats, QuoteStatus, UpdateQuoteAttachmentRequest, UpdateQuoteItemRequest,
    UpdateQuoteRequest,
};
use crate::shared::repositories::base::RepoResult;
use crate::shared::repositories::cache::{Cache, CacheKeyBuilder};
use std::sync::Arc;

#[derive(Debug)]
pub struct QuoteRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl IQuoteRepository for QuoteRepository {
    fn next_quote_number(&self) -> RepoResult<String> {
        self.next_quote_number()
    }

    fn create(&self, quote: &Quote) -> RepoResult<()> {
        self.create(quote)
    }

    fn find_by_id(&self, id: &str) -> RepoResult<Option<Quote>> {
        self.find_by_id(id)
    }

    fn list(&self, query: &QuoteQuery) -> RepoResult<(Vec<Quote>, i64)> {
        self.list(query)
    }

    fn update(&self, id: &str, req: &UpdateQuoteRequest) -> RepoResult<()> {
        self.update(id, req)
    }

    fn delete(&self, id: &str) -> RepoResult<bool> {
        self.delete(id)
    }

    fn update_status(&self, id: &str, status: &QuoteStatus) -> RepoResult<()> {
        self.update_status(id, status)
    }

    fn link_task(&self, quote_id: &str, task_id: &str) -> RepoResult<()> {
        self.link_task(quote_id, task_id)
    }

    fn update_totals(&self, id: &str, subtotal: i64, tax_total: i64, total: i64) -> RepoResult<()> {
        self.update_totals(id, subtotal, tax_total, total)
    }

    fn update_totals_with_discount(
        &self,
        id: &str,
        subtotal: i64,
        discount_amount: i64,
        tax_total: i64,
        total: i64,
    ) -> RepoResult<()> {
        self.update_totals_with_discount(id, subtotal, discount_amount, tax_total, total)
    }

    fn find_items_by_quote_id(&self, quote_id: &str) -> RepoResult<Vec<QuoteItem>> {
        self.find_items_by_quote_id(quote_id)
    }

    fn add_item(&self, item: &QuoteItem) -> RepoResult<()> {
        self.add_item(item)
    }

    fn create_with_items(&self, quote: &Quote, items: &[QuoteItem]) -> RepoResult<()> {
        self.create_with_items(quote, items)
    }

    fn link_task_and_update_status(
        &self,
        quote_id: &str,
        task_id: &str,
        status: &QuoteStatus,
    ) -> RepoResult<()> {
        self.link_task_and_update_status(quote_id, task_id, status)
    }

    fn add_items_batch(&self, items: &[QuoteItem]) -> RepoResult<()> {
        self.add_items_batch(items)
    }

    fn update_item(
        &self,
        item_id: &str,
        quote_id: &str,
        req: &UpdateQuoteItemRequest,
    ) -> RepoResult<()> {
        self.update_item(item_id, quote_id, req)
    }

    fn delete_item(&self, item_id: &str, quote_id: &str) -> RepoResult<bool> {
        self.delete_item(item_id, quote_id)
    }

    fn find_attachments_by_quote_id(&self, quote_id: &str) -> RepoResult<Vec<QuoteAttachment>> {
        self.find_attachments_by_quote_id(quote_id)
    }

    fn find_attachment_by_id(&self, id: &str) -> RepoResult<Option<QuoteAttachment>> {
        self.find_attachment_by_id(id)
    }

    fn create_attachment(
        &self,
        quote_id: &str,
        req: &CreateQuoteAttachmentRequest,
        created_by: Option<&str>,
    ) -> RepoResult<String> {
        self.create_attachment(quote_id, req, created_by)
    }

    fn update_attachment(
        &self,
        id: &str,
        quote_id: &str,
        req: &UpdateQuoteAttachmentRequest,
    ) -> RepoResult<()> {
        self.update_attachment(id, quote_id, req)
    }

    fn delete_attachment(&self, id: &str, quote_id: &str) -> RepoResult<bool> {
        self.delete_attachment(id, quote_id)
    }

    fn get_stats(&self) -> RepoResult<QuoteStats> {
        self.get_stats()
    }
}

impl QuoteRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("quote"),
        }
    }

    pub fn next_quote_number(&self) -> RepoResult<String> {
        read_ops::next_quote_number(self)
    }

    pub fn create(&self, quote: &Quote) -> RepoResult<()> {
        quote_write_ops::create(self, quote)
    }

    pub fn find_by_id(&self, id: &str) -> RepoResult<Option<Quote>> {
        read_ops::find_by_id(self, id)
    }

    pub fn list(&self, query: &QuoteQuery) -> RepoResult<(Vec<Quote>, i64)> {
        read_ops::list(self, query)
    }

    pub fn update(&self, id: &str, req: &UpdateQuoteRequest) -> RepoResult<()> {
        quote_write_ops::update(self, id, req)
    }

    pub fn delete(&self, id: &str) -> RepoResult<bool> {
        quote_write_ops::delete(self, id)
    }

    pub fn update_status(&self, id: &str, status: &QuoteStatus) -> RepoResult<()> {
        quote_write_ops::update_status(self, id, status)
    }

    pub fn link_task(&self, quote_id: &str, task_id: &str) -> RepoResult<()> {
        quote_write_ops::link_task(self, quote_id, task_id)
    }

    pub fn update_totals(
        &self,
        id: &str,
        subtotal: i64,
        tax_total: i64,
        total: i64,
    ) -> RepoResult<()> {
        quote_write_ops::update_totals(self, id, subtotal, tax_total, total)
    }

    pub fn update_totals_with_discount(
        &self,
        id: &str,
        subtotal: i64,
        discount_amount: i64,
        tax_total: i64,
        total: i64,
    ) -> RepoResult<()> {
        quote_write_ops::update_totals_with_discount(
            self,
            id,
            subtotal,
            discount_amount,
            tax_total,
            total,
        )
    }

    pub fn find_items_by_quote_id(&self, quote_id: &str) -> RepoResult<Vec<QuoteItem>> {
        item_ops::find_items_by_quote_id(self, quote_id)
    }

    pub fn add_item(&self, item: &QuoteItem) -> RepoResult<()> {
        item_ops::add_item(self, item)
    }

    pub fn create_with_items(&self, quote: &Quote, items: &[QuoteItem]) -> RepoResult<()> {
        item_ops::create_with_items(self, quote, items)
    }

    pub fn link_task_and_update_status(
        &self,
        quote_id: &str,
        task_id: &str,
        status: &QuoteStatus,
    ) -> RepoResult<()> {
        item_ops::link_task_and_update_status(self, quote_id, task_id, status)
    }

    pub fn add_items_batch(&self, items: &[QuoteItem]) -> RepoResult<()> {
        item_ops::add_items_batch(self, items)
    }

    pub fn update_item(
        &self,
        item_id: &str,
        quote_id: &str,
        req: &UpdateQuoteItemRequest,
    ) -> RepoResult<()> {
        item_ops::update_item(self, item_id, quote_id, req)
    }

    pub fn delete_item(&self, item_id: &str, quote_id: &str) -> RepoResult<bool> {
        item_ops::delete_item(self, item_id, quote_id)
    }

    pub fn find_attachments_by_quote_id(&self, quote_id: &str) -> RepoResult<Vec<QuoteAttachment>> {
        attachment_ops::find_attachments_by_quote_id(self, quote_id)
    }

    pub fn find_attachment_by_id(&self, id: &str) -> RepoResult<Option<QuoteAttachment>> {
        attachment_ops::find_attachment_by_id(self, id)
    }

    pub fn create_attachment(
        &self,
        quote_id: &str,
        req: &CreateQuoteAttachmentRequest,
        created_by: Option<&str>,
    ) -> RepoResult<String> {
        attachment_ops::create_attachment(self, quote_id, req, created_by)
    }

    pub fn update_attachment(
        &self,
        id: &str,
        quote_id: &str,
        req: &UpdateQuoteAttachmentRequest,
    ) -> RepoResult<()> {
        attachment_ops::update_attachment(self, id, quote_id, req)
    }

    pub fn delete_attachment(&self, id: &str, quote_id: &str) -> RepoResult<bool> {
        attachment_ops::delete_attachment(self, id, quote_id)
    }

    pub fn get_stats(&self) -> RepoResult<QuoteStats> {
        read_ops::get_stats(self)
    }
}

// Cross-domain SQL (inserting into the `tasks` table from the quotes repository)
// violated ADR-001 / ADR-004 bounded-context rules.
// Task creation from accepted quotes is handled by the QuoteService directly
// using the Database handle, then delegated to the tasks domain via events.

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::domains::quotes::domain::models::quote::*;
    use rusqlite::params;

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
            description: None,
            notes: None,
            terms: None,
            subtotal: 0,
            tax_total: 0,
            total: 0,
            discount_type: None,
            discount_value: None,
            discount_amount: None,
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
            unit_price: 10000,
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
        assert!(repo.delete("q3").unwrap());

        let quote2 = make_test_quote("q4", "client-3");
        repo.create(&quote2).unwrap();
        repo.update_status("q4", &QuoteStatus::Sent).unwrap();
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

    #[tokio::test]
    async fn test_soft_deleted_quote_cannot_be_updated() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = QuoteRepository::new(db.clone(), cache);

        insert_test_client(&db, "client-7");

        let quote = make_test_quote("q7", "client-7");
        repo.create(&quote).unwrap();
        assert!(repo.delete("q7").unwrap());

        let update_result = repo.update_totals("q7", 10000, 2000, 12000);
        assert!(update_result.is_err());

        let subtotal: i64 = db
            .query_single_value("SELECT subtotal FROM quotes WHERE id = ?", params!["q7"])
            .expect("read subtotal");
        let tax_total: i64 = db
            .query_single_value("SELECT tax_total FROM quotes WHERE id = ?", params!["q7"])
            .expect("read tax total");
        let total: i64 = db
            .query_single_value("SELECT total FROM quotes WHERE id = ?", params!["q7"])
            .expect("read total");

        assert_eq!((subtotal, tax_total, total), (0, 0, 0));
    }

    #[tokio::test]
    async fn test_get_stats_counts_by_status() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = QuoteRepository::new(db.clone(), cache);

        insert_test_client(&db, "client-stats");

        let q1 = make_test_quote("qs1", "client-stats");
        let q2 = make_test_quote("qs2", "client-stats");
        let mut q3 = make_test_quote("qs3", "client-stats");
        q3.status = QuoteStatus::Sent;

        repo.create(&q1).unwrap();
        repo.create(&q2).unwrap();
        repo.create(&q3).unwrap();

        let stats = repo.get_stats().expect("get_stats should succeed");

        assert_eq!(stats.total, 3);
        assert_eq!(stats.draft, 2);
        assert_eq!(stats.sent, 1);
        assert_eq!(stats.accepted, 0);
    }
}
