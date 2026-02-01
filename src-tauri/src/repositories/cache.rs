//! Repository caching layer
//!
//! Provides in-memory caching for repository queries to improve performance.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Simple in-memory cache entry
#[derive(Clone)]
struct CacheEntry<T: Clone> {
    data: T,
    expires_at: Instant,
}

impl<T: Clone> CacheEntry<T> {
    fn new(data: T, ttl: Duration) -> Self {
        Self {
            data,
            expires_at: Instant::now() + ttl,
        }
    }

    fn is_expired(&self) -> bool {
        Instant::now() > self.expires_at
    }
}

/// Simple in-memory cache with LRU eviction
#[derive(Debug)]
pub struct Cache {
    entries: Arc<Mutex<HashMap<String, Box<dyn std::any::Any + Send + Sync>>>>,
    max_size: usize,
}

impl Cache {
    /// Create a new cache with specified maximum size
    pub fn new(max_size: usize) -> Self {
        Self {
            entries: Arc::new(Mutex::new(HashMap::new())),
            max_size,
        }
    }

    /// Get value from cache
    pub fn get<T>(&self, key: &str) -> Option<T>
    where
        T: Clone + 'static + Send + Sync,
    {
        let entries = self.entries.lock().unwrap();
        let entry = entries.get(key)?;

        let typed_entry = entry.downcast_ref::<CacheEntry<T>>()?;

        if typed_entry.is_expired() {
            drop(entries);
            self.remove(key);
            return None;
        }

        Some(typed_entry.data.clone())
    }

    /// Set value in cache with TTL
    pub fn set<T>(&self, key: &str, value: T, ttl: Duration)
    where
        T: Clone + 'static + Send + Sync,
    {
        let mut entries = self.entries.lock().unwrap();

        // Evict oldest entries if at capacity
        if entries.len() >= self.max_size {
            // Simple eviction: clear all entries if at capacity
            // In production, implement proper LRU
            if entries.len() >= self.max_size {
                entries.clear();
            }
        }

        entries.insert(key.to_string(), Box::new(CacheEntry::new(value, ttl)));
    }

    /// Remove value from cache
    pub fn remove(&self, key: &str) {
        let mut entries = self.entries.lock().unwrap();
        entries.remove(key);
    }

    /// Clear all entries from cache
    pub fn clear(&self) {
        let mut entries = self.entries.lock().unwrap();
        entries.clear();
    }

    /// Check if key exists
    pub fn exists(&self, key: &str) -> bool {
        let entries = self.entries.lock().unwrap();
        entries.contains_key(key)
    }

    /// Get cache size
    pub fn size(&self) -> usize {
        let entries = self.entries.lock().unwrap();
        entries.len()
    }
}

impl Clone for Cache {
    fn clone(&self) -> Self {
        Self {
            entries: Arc::clone(&self.entries),
            max_size: self.max_size,
        }
    }
}

/// Cache statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "ts-rs", derive(ts_rs::TS))]
pub struct CacheStats {
    pub size: usize,
}

/// Common cache TTL values
pub mod ttl {
    use std::time::Duration;

    pub const SHORT: Duration = Duration::from_secs(60); // 1 minute
    pub const MEDIUM: Duration = Duration::from_secs(300); // 5 minutes
    pub const LONG: Duration = Duration::from_secs(900); // 15 minutes
    pub const VERY_LONG: Duration = Duration::from_secs(1800); // 30 minutes
    pub const HOUR: Duration = Duration::from_secs(3600); // 1 hour
}

/// Cache key builder
#[derive(Debug)]
pub struct CacheKeyBuilder {
    prefix: String,
}

impl CacheKeyBuilder {
    pub fn new(prefix: &str) -> Self {
        Self {
            prefix: prefix.to_string(),
        }
    }

    pub fn id(&self, id: &str) -> String {
        format!("{}:{}", self.prefix, id)
    }

    pub fn query(&self, parts: &[&str]) -> String {
        format!("{}:query:{}", self.prefix, parts.join(":"))
    }

    pub fn list(&self, filters: &[&str]) -> String {
        format!("{}:list:{}", self.prefix, filters.join(":"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_cache_set_get() {
        let cache = Cache::new(10);

        cache.set("test_key", "test_value", ttl::MEDIUM);
        let result = cache.get::<String>("test_key");

        assert_eq!(result, Some("test_value".to_string()));
    }

    #[test]
    fn test_cache_miss() {
        let cache = Cache::new(10);

        let result = cache.get::<String>("nonexistent_key");
        assert_eq!(result, None);
    }

    #[test]
    fn test_cache_expiration() {
        let cache = Cache::new(10);

        cache.set("expiring_key", "value", Duration::from_millis(100));

        // Should exist immediately
        assert!(cache.get::<String>("expiring_key").is_some());

        // Wait for expiration
        thread::sleep(Duration::from_millis(150));

        // Should be expired
        assert!(cache.get::<String>("expiring_key").is_none());
    }

    #[test]
    fn test_cache_remove() {
        let cache = Cache::new(10);

        cache.set("to_remove", "value", ttl::MEDIUM);
        assert!(cache.get::<String>("to_remove").is_some());

        cache.remove("to_remove");
        assert!(cache.get::<String>("to_remove").is_none());
    }

    #[test]
    fn test_cache_clear() {
        let cache = Cache::new(10);

        cache.set("key1", "value1", ttl::MEDIUM);
        cache.set("key2", "value2", ttl::MEDIUM);
        cache.set("key3", "value3", ttl::MEDIUM);

        assert_eq!(cache.size(), 3);

        cache.clear();

        assert_eq!(cache.size(), 0);
        assert!(cache.get::<String>("key1").is_none());
        assert!(cache.get::<String>("key2").is_none());
        assert!(cache.get::<String>("key3").is_none());
    }

    #[test]
    fn test_cache_key_builder() {
        let builder = CacheKeyBuilder::new("client");

        assert_eq!(builder.id("123"), "client:123");
        assert_eq!(
            builder.query(&["active", "2024"]),
            "client:query:active:2024"
        );
        assert_eq!(builder.list(&["all"]), "client:list:all");
    }

    #[test]
    fn test_cache_different_types() {
        let cache = Cache::new(10);

        cache.set("string_key", "string_value", ttl::MEDIUM);
        cache.set("int_key", 42i64, ttl::MEDIUM);
        cache.set("bool_key", true, ttl::MEDIUM);

        assert_eq!(
            cache.get::<String>("string_key"),
            Some("string_value".to_string())
        );
        assert_eq!(cache.get::<i64>("int_key"), Some(42));
        assert_eq!(cache.get::<bool>("bool_key"), Some(true));
    }
}
