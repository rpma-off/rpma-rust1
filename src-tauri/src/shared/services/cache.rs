//! Simple in-memory cache for desktop application.
//!
//! This replaces the complex multi-backend caching system (Redis, disk, memory)
//! with a simple HashMap-based TTL cache.

use crate::commands::AppError;
use serde::{de::DeserializeOwned, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
struct CacheEntry {
    data: Vec<u8>,
    expires_at: Instant,
}

/// Stores JSON-serialized values in memory with TTL expiration. Uses a process-local mutex-protected HashMap.
#[derive(Debug, Clone)]
pub struct SimpleCache {
    // Mutex retained: get() evicts expired entries under the same lock — can't split into read+write without restructuring.
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
    default_ttl: Duration,
}

impl SimpleCache {
    /// Creates an empty cache with the given default TTL. Applies that TTL when `set` receives `None`.
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            default_ttl,
        }
    }

    /// Returns a deserialized cached value by key. Expired or invalid entries are evicted before returning.
    pub fn get<T: DeserializeOwned>(&self, key: &str) -> Option<T> {
        let mut cache = self.lock_cache();
        if let Some(entry) = cache.get(key) {
            if entry.expires_at <= Instant::now() {
                cache.remove(key);
                return None;
            }
            match serde_json::from_slice(&entry.data) {
                Ok(value) => Some(value),
                Err(_) => {
                    cache.remove(key);
                    None
                }
            }
        } else {
            None
        }
    }

    /// Stores a serializable value under a cache key. Uses the provided TTL or the cache default.
    pub fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<(), AppError> {
        let mut cache = self.lock_cache();
        let ttl = ttl.unwrap_or(self.default_ttl);
        let json = serde_json::to_vec(value)
            .map_err(|e| AppError::Internal(format!("Cache serialization error: {}", e)))?;
        cache.insert(
            key.to_string(),
            CacheEntry {
                data: json,
                expires_at: Instant::now() + ttl,
            },
        );
        Ok(())
    }

    /// Removes a cached value by key. Missing keys are ignored.
    pub fn invalidate(&self, key: &str) {
        self.lock_cache().remove(key);
    }

    /// Removes all cached values. Resets the in-memory store immediately.
    pub fn clear(&self) {
        self.lock_cache().clear();
    }

    /// Returns the number of stored cache entries. Expired entries remain until cleanup occurs.
    pub fn len(&self) -> usize {
        self.lock_cache().len()
    }

    /// Returns whether the cache currently has no stored entries. Expired entries remain until cleanup occurs.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    fn lock_cache(&self) -> MutexGuard<'_, HashMap<String, CacheEntry>> {
        self.cache
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

impl Default for SimpleCache {
    fn default() -> Self {
        Self::new(Duration::from_secs(3600))
    }
}

pub type CacheService = SimpleCache;

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_cache_set_and_get() {
        let cache = SimpleCache::new(Duration::from_secs(60));
        cache.set("key1", &"value1", None).unwrap();
        let result: Option<String> = cache.get("key1");
        assert_eq!(result, Some("value1".to_string()));
    }

    #[test]
    fn test_cache_expiration() {
        let cache = SimpleCache::new(Duration::from_millis(10));
        cache.set("key1", &"value1", None).unwrap();
        thread::sleep(Duration::from_millis(50));
        let result: Option<String> = cache.get("key1");
        assert!(result.is_none());
    }

    #[test]
    fn test_cache_invalidate() {
        let cache = SimpleCache::new(Duration::from_secs(60));
        cache.set("key1", &"value1", None).unwrap();
        cache.invalidate("key1");
        let result: Option<String> = cache.get("key1");
        assert!(result.is_none());
    }

    #[test]
    fn test_cache_clear() {
        let cache = SimpleCache::new(Duration::from_secs(60));
        cache.set("key1", &"value1", None).unwrap();
        cache.set("key2", &"value2", None).unwrap();
        cache.clear();
        assert_eq!(cache.len(), 0);
    }
}
