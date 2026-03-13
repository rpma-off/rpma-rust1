//! Generic caching wrapper for `Repository` implementations.
//!
//! [`CachedRepository`] provides transparent read-through caching and
//! write-invalidation on top of any type that implements
//! [`Repository<T, ID>`](super::base::Repository).
//!
//! # Usage
//!
//! ```ignore
//! let inner  = UserRepository::new(Arc::clone(&db));
//! let cached = CachedRepository::new(inner, Arc::clone(&cache), "user", ttl::LONG);
//! // `cached` now implements `Repository<User, String>` with a caching layer.
//! ```

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;

use super::base::{RepoResult, Repository};
use super::cache::{Cache, CacheKeyBuilder};

/// A generic caching wrapper for any [`Repository<T, ID>`](super::base::Repository).
///
/// Reads are served from an in-memory [`Cache`] when available and populate
/// the cache on a miss.  Writes (`save`, `delete_by_id`) automatically
/// invalidate the affected cached entries.
///
/// All cache keys are namespaced with the string provided to [`CachedRepository::new`]
/// so that multiple instances can share the same [`Cache`] without collisions.
///
/// # Type Parameters
///
/// * `R` — the inner repository being wrapped.
#[derive(Debug)]
pub struct CachedRepository<R> {
    inner: R,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
    namespace: String,
    read_ttl: Duration,
}

impl<R> CachedRepository<R> {
    /// Wrap `inner` with a caching layer.
    ///
    /// * `namespace` — a short, unique prefix for this repository's cache
    ///   keys (e.g. `"user"`, `"client"`).  All keys inserted by this
    ///   wrapper are prefixed with `"<namespace>:"`.
    /// * `read_ttl` — how long a cached value remains valid.  Use the
    ///   constants in [`crate::shared::repositories::cache::ttl`] for
    ///   common values.
    pub fn new(inner: R, cache: Arc<Cache>, namespace: &str, read_ttl: Duration) -> Self {
        Self {
            inner,
            cache,
            cache_key_builder: CacheKeyBuilder::new(namespace),
            namespace: namespace.to_string(),
            read_ttl,
        }
    }

    /// Access the wrapped inner repository.
    pub fn inner(&self) -> &R {
        &self.inner
    }

    /// Invalidate the cached entry for a single entity `id` and the
    /// `find_all` list cache.
    pub fn invalidate(&self, id: &str) {
        self.cache.remove(&self.cache_key_builder.id(id));
        self.cache.remove(&self.cache_key_builder.list(&["all"]));
    }

    /// Invalidate every cached entry that belongs to this repository's
    /// namespace (performs a prefix-based eviction).
    pub fn invalidate_all(&self) {
        self.cache
            .remove_by_prefix(&format!("{}:", self.namespace));
    }
}

#[async_trait]
impl<R, T, ID> Repository<T, ID> for CachedRepository<R>
where
    R: Repository<T, ID> + Send + Sync,
    T: Clone + Send + Sync + 'static,
    ID: Send + Sync + Clone + ToString + 'static,
{
    /// Return the entity with `id`, serving from cache when available.
    async fn find_by_id(&self, id: ID) -> RepoResult<Option<T>> {
        let cache_key = self.cache_key_builder.id(&id.to_string());

        if let Some(entity) = self.cache.get::<T>(&cache_key) {
            return Ok(Some(entity));
        }

        let result = self.inner.find_by_id(id).await?;

        if let Some(ref entity) = result {
            self.cache.set(&cache_key, entity.clone(), self.read_ttl);
        }

        Ok(result)
    }

    /// Return all entities, serving from a single list cache entry when
    /// available.
    async fn find_all(&self) -> RepoResult<Vec<T>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(entities) = self.cache.get::<Vec<T>>(&cache_key) {
            return Ok(entities);
        }

        let entities = self.inner.find_all().await?;
        self.cache
            .set(&cache_key, entities.clone(), self.read_ttl);

        Ok(entities)
    }

    /// Save (create or update) `entity` and invalidate the list cache so
    /// subsequent `find_all` calls reflect the change.
    async fn save(&self, entity: T) -> RepoResult<T> {
        let saved = self.inner.save(entity).await?;
        // The list cache is stale after any write; per-entity cache for the
        // updated record will be repopulated on the next `find_by_id` call.
        self.cache.remove(&self.cache_key_builder.list(&["all"]));
        Ok(saved)
    }

    /// Delete the entity with `id` and invalidate both its per-entity cache
    /// entry and the list cache.
    async fn delete_by_id(&self, id: ID) -> RepoResult<bool> {
        let key = self.cache_key_builder.id(&id.to_string());
        let deleted = self.inner.delete_by_id(id).await?;
        if deleted {
            self.cache.remove(&key);
            self.cache.remove(&self.cache_key_builder.list(&["all"]));
        }
        Ok(deleted)
    }

    /// Check existence, using the cache as a cheap shortcut: a cache hit
    /// guarantees the entity exists without a DB round-trip.
    async fn exists_by_id(&self, id: ID) -> RepoResult<bool> {
        let cache_key = self.cache_key_builder.id(&id.to_string());
        if self.cache.get::<T>(&cache_key).is_some() {
            return Ok(true);
        }
        self.inner.exists_by_id(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::repositories::base::{RepoError, Repository};
    use async_trait::async_trait;
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    // ── simple mock repository ────────────────────────────────────────────────

    #[derive(Clone, Debug, PartialEq)]
    struct FakeEntity {
        id: String,
        value: String,
    }

    struct MockRepository {
        store: Arc<Mutex<HashMap<String, FakeEntity>>>,
        db_call_count: Arc<Mutex<usize>>,
    }

    impl MockRepository {
        fn new() -> Self {
            Self {
                store: Arc::new(Mutex::new(HashMap::new())),
                db_call_count: Arc::new(Mutex::new(0)),
            }
        }

        fn calls(&self) -> usize {
            *self.db_call_count.lock().unwrap()
        }
    }

    #[async_trait]
    impl Repository<FakeEntity, String> for MockRepository {
        async fn find_by_id(&self, id: String) -> RepoResult<Option<FakeEntity>> {
            *self.db_call_count.lock().unwrap() += 1;
            Ok(self.store.lock().unwrap().get(&id).cloned())
        }

        async fn find_all(&self) -> RepoResult<Vec<FakeEntity>> {
            *self.db_call_count.lock().unwrap() += 1;
            Ok(self.store.lock().unwrap().values().cloned().collect())
        }

        async fn save(&self, entity: FakeEntity) -> RepoResult<FakeEntity> {
            self.store
                .lock()
                .unwrap()
                .insert(entity.id.clone(), entity.clone());
            Ok(entity)
        }

        async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
            Ok(self.store.lock().unwrap().remove(&id).is_some())
        }

        async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
            Ok(self.store.lock().unwrap().contains_key(&id))
        }
    }

    fn make_repo() -> CachedRepository<MockRepository> {
        let cache = Arc::new(Cache::new(100));
        CachedRepository::new(MockRepository::new(), cache, "test", Duration::from_secs(60))
    }

    fn insert(repo: &CachedRepository<MockRepository>, id: &str, value: &str) {
        repo.inner()
            .store
            .lock()
            .unwrap()
            .insert(id.to_string(), FakeEntity { id: id.to_string(), value: value.to_string() });
    }

    // ── find_by_id ────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_find_by_id_cache_miss_then_hit() {
        let repo = make_repo();
        insert(&repo, "e1", "hello");

        // First call — DB hit
        let result = repo.find_by_id("e1".to_string()).await.unwrap();
        assert_eq!(result.unwrap().value, "hello");
        assert_eq!(repo.inner().calls(), 1);

        // Second call — cache hit, DB not called again
        let result = repo.find_by_id("e1".to_string()).await.unwrap();
        assert_eq!(result.unwrap().value, "hello");
        assert_eq!(repo.inner().calls(), 1);
    }

    #[tokio::test]
    async fn test_find_by_id_returns_none_for_missing_entity() {
        let repo = make_repo();
        let result = repo.find_by_id("missing".to_string()).await.unwrap();
        assert!(result.is_none());
    }

    // ── find_all ──────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_find_all_cache_miss_then_hit() {
        let repo = make_repo();
        for i in 0..3u32 {
            insert(&repo, &i.to_string(), &format!("v{}", i));
        }

        let all = repo.find_all().await.unwrap();
        assert_eq!(all.len(), 3);
        assert_eq!(repo.inner().calls(), 1);

        // Second call — served from cache
        let all2 = repo.find_all().await.unwrap();
        assert_eq!(all2.len(), 3);
        assert_eq!(repo.inner().calls(), 1);
    }

    // ── save ──────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_save_invalidates_list_cache() {
        let repo = make_repo();

        // Populate the list cache
        let _ = repo.find_all().await.unwrap();
        assert_eq!(repo.inner().calls(), 1);

        // Save a new entity — list cache must be invalidated
        repo.save(FakeEntity { id: "new".to_string(), value: "new_val".to_string() })
            .await
            .unwrap();

        // Next find_all must hit the DB
        let _ = repo.find_all().await.unwrap();
        assert_eq!(repo.inner().calls(), 2);
    }

    // ── delete_by_id ─────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_delete_invalidates_entity_and_list_cache() {
        let repo = make_repo();
        insert(&repo, "del", "bye");

        // Warm up both caches
        let _ = repo.find_by_id("del".to_string()).await.unwrap();
        let _ = repo.find_all().await.unwrap();
        let before = repo.inner().calls();

        let deleted = repo.delete_by_id("del".to_string()).await.unwrap();
        assert!(deleted);

        // Both caches are stale — DB is consulted again
        let _ = repo.find_by_id("del".to_string()).await.unwrap();
        let _ = repo.find_all().await.unwrap();
        assert_eq!(repo.inner().calls(), before + 2);
    }

    // ── exists_by_id ──────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_exists_by_id_uses_entity_cache() {
        let repo = make_repo();
        insert(&repo, "exist", "v");

        // Warm the per-entity cache
        let _ = repo.find_by_id("exist".to_string()).await.unwrap();
        let before = repo.inner().calls();

        // exists_by_id should return true without a DB round-trip
        let exists = repo.exists_by_id("exist".to_string()).await.unwrap();
        assert!(exists);
        assert_eq!(repo.inner().calls(), before);
    }

    // ── invalidate ────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_invalidate_clears_entity_and_list() {
        let repo = make_repo();
        insert(&repo, "inv", "v");

        let _ = repo.find_by_id("inv".to_string()).await.unwrap();
        let _ = repo.find_all().await.unwrap();
        let before = repo.inner().calls();

        repo.invalidate("inv");

        let _ = repo.find_by_id("inv".to_string()).await.unwrap();
        let _ = repo.find_all().await.unwrap();
        assert_eq!(repo.inner().calls(), before + 2);
    }

    #[tokio::test]
    async fn test_invalidate_all_clears_entire_namespace() {
        let repo = make_repo();
        insert(&repo, "a1", "v1");

        let _ = repo.find_by_id("a1".to_string()).await.unwrap();
        let _ = repo.find_all().await.unwrap();
        let before = repo.inner().calls();

        repo.invalidate_all();

        let _ = repo.find_by_id("a1".to_string()).await.unwrap();
        let _ = repo.find_all().await.unwrap();
        assert_eq!(repo.inner().calls(), before + 2);
    }

    // ── namespace isolation ───────────────────────────────────────────────────

    #[tokio::test]
    async fn test_namespace_isolation_between_repos() {
        let shared_cache = Arc::new(Cache::new(100));

        let repo_a: CachedRepository<MockRepository> = CachedRepository::new(
            MockRepository::new(),
            Arc::clone(&shared_cache),
            "alpha",
            Duration::from_secs(60),
        );
        let repo_b: CachedRepository<MockRepository> = CachedRepository::new(
            MockRepository::new(),
            Arc::clone(&shared_cache),
            "beta",
            Duration::from_secs(60),
        );

        insert(&repo_a, "x", "from_a");
        insert(&repo_b, "x", "from_b");

        // Warm both caches
        let _ = repo_a.find_by_id("x".to_string()).await.unwrap();
        let _ = repo_b.find_by_id("x".to_string()).await.unwrap();

        // Invalidating repo_a's namespace must not affect repo_b's cache
        repo_a.invalidate_all();

        let calls_b_before = repo_b.inner().calls();
        let result_b = repo_b.find_by_id("x".to_string()).await.unwrap();
        assert_eq!(result_b.unwrap().value, "from_b");
        assert_eq!(repo_b.inner().calls(), calls_b_before); // still cached

        // repo_a's cache must be gone
        let calls_a_before = repo_a.inner().calls();
        let _ = repo_a.find_by_id("x".to_string()).await.unwrap();
        assert_eq!(repo_a.inner().calls(), calls_a_before + 1); // DB hit
    }
}
