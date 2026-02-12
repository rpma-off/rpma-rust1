//! Memory management module for efficient resource usage and caching
//!
//! This module provides LRU caching with TTL, memory monitoring, resource leak detection,
//! and automatic cleanup to ensure optimal memory usage in the backend.

use lru::LruCache;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime};
use tokio::time;
use tracing::{debug, error, warn};

/// Configuration for memory management
#[derive(Debug, Clone)]
pub struct MemoryConfig {
    /// Maximum cache size in entries
    pub max_cache_entries: usize,
    /// Default TTL for cache entries
    pub default_cache_ttl: Duration,
    /// Memory monitoring interval
    pub monitoring_interval: Duration,
    /// Memory usage warning threshold (percentage)
    pub memory_warning_threshold: f64,
    /// Memory usage critical threshold (percentage)
    pub memory_critical_threshold: f64,
    /// Maximum memory usage (bytes) - 0 for no limit
    pub max_memory_bytes: u64,
}

impl Default for MemoryConfig {
    fn default() -> Self {
        Self {
            max_cache_entries: 1000,
            default_cache_ttl: Duration::from_secs(300), // 5 minutes
            monitoring_interval: Duration::from_secs(60), // 1 minute
            memory_warning_threshold: 80.0,              // 80%
            memory_critical_threshold: 90.0,             // 90%
            max_memory_bytes: 0,                         // No limit
        }
    }
}

/// Memory statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub cache_entries: usize,
    pub cache_hit_ratio: f64,
    pub total_memory_used: u64,
    pub memory_usage_percent: f64,
    pub active_allocations: usize,
    pub cache_evictions: u64,
    pub cache_misses: u64,
    pub cache_hits: u64,
    pub last_cleanup: SystemTime,
}

/// Cache entry with TTL support
#[derive(Debug, Clone)]
struct CacheEntry<T> {
    data: T,
    created_at: Instant,
    ttl: Duration,
    access_count: u64,
    last_accessed: Instant,
}

impl<T> CacheEntry<T> {
    fn new(data: T, ttl: Duration) -> Self {
        let now = Instant::now();
        Self {
            data,
            created_at: now,
            ttl,
            access_count: 0,
            last_accessed: now,
        }
    }

    fn is_expired(&self) -> bool {
        self.created_at.elapsed() > self.ttl
    }

    fn access(&mut self) {
        self.access_count += 1;
        self.last_accessed = Instant::now();
    }

    fn value(&self) -> &T {
        &self.data
    }
}

/// LRU Cache with TTL support
pub struct TtlLruCache<K, V> {
    cache: Mutex<LruCache<K, CacheEntry<V>>>,
    config: MemoryConfig,
    stats: Arc<Mutex<CacheStats>>,
}

#[derive(Debug, Clone, Default)]
pub struct CacheStats {
    hits: u64,
    misses: u64,
    evictions: u64,
    sets: u64,
    gets: u64,
}

impl<K, V> TtlLruCache<K, V>
where
    K: std::hash::Hash + Eq + Clone + std::fmt::Debug,
    V: Clone + std::fmt::Debug,
{
    /// Create a new TTL LRU cache
    pub fn new(config: MemoryConfig) -> Self {
        let max_entries = config.max_cache_entries.max(1);
        Self {
            cache: Mutex::new(LruCache::new(
                std::num::NonZeroUsize::new(max_entries)
                    .expect("max_cache_entries guaranteed > 0 by max(1)"),
            )),
            config,
            stats: Arc::new(Mutex::new(CacheStats::default())),
        }
    }

    /// Get a value from the cache
    pub fn get(&self, key: &K) -> Option<V> {
        let mut stats = self.stats.lock();
        stats.gets += 1;

        let mut cache = self.cache.lock();
        if let Some(entry) = cache.get_mut(key) {
            if entry.is_expired() {
                // Remove expired entry
                cache.pop(key);
                stats.misses += 1;
                None
            } else {
                entry.access();
                stats.hits += 1;
                Some(entry.value().clone())
            }
        } else {
            stats.misses += 1;
            None
        }
    }

    /// Insert a value into the cache
    pub fn insert(&self, key: K, value: V) {
        self.insert_with_ttl(key, value, self.config.default_cache_ttl);
    }

    /// Insert a value with custom TTL
    pub fn insert_with_ttl(&self, key: K, value: V, ttl: Duration) {
        let mut stats = self.stats.lock();
        stats.sets += 1;

        let entry = CacheEntry::new(value, ttl);
        let mut cache = self.cache.lock();

        if let Some(_) = cache.put(key, entry) {
            stats.evictions += 1;
        }
    }

    /// Remove a value from the cache
    pub fn remove(&self, key: &K) -> Option<V> {
        let mut cache = self.cache.lock();
        cache.pop(key).map(|entry| entry.data)
    }

    /// Clear all expired entries
    pub fn cleanup_expired(&self) -> usize {
        let mut cache = self.cache.lock();
        let mut expired_keys = Vec::new();

        // Find expired keys
        for (key, entry) in cache.iter() {
            if entry.is_expired() {
                expired_keys.push(key.clone());
            }
        }

        let expired_count = expired_keys.len();

        // Remove expired entries
        for key in &expired_keys {
            cache.pop(key);
        }

        expired_count
    }

    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        self.stats.lock().clone()
    }

    /// Get hit ratio
    pub fn hit_ratio(&self) -> f64 {
        let stats = self.stats.lock();
        let total = stats.hits + stats.misses;
        if total == 0 {
            0.0
        } else {
            stats.hits as f64 / total as f64
        }
    }

    /// Clear the cache
    pub fn clear(&self) {
        let mut cache = self.cache.lock();
        cache.clear();
    }

    /// Get cache size
    pub fn len(&self) -> usize {
        self.cache.lock().len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.cache.lock().is_empty()
    }
}

/// Memory monitor for tracking system memory usage
pub struct MemoryMonitor {
    config: MemoryConfig,
    last_check: Mutex<SystemTime>,
    alert_callback: Option<Box<dyn Fn(MemoryAlert) + Send + Sync>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MemoryAlert {
    Warning { usage_percent: f64, used_bytes: u64 },
    Critical { usage_percent: f64, used_bytes: u64 },
    Normal { usage_percent: f64, used_bytes: u64 },
}

impl MemoryMonitor {
    /// Create a new memory monitor
    pub fn new(config: MemoryConfig) -> Self {
        Self {
            config,
            last_check: Mutex::new(SystemTime::now()),
            alert_callback: None,
        }
    }

    /// Set alert callback
    pub fn with_alert_callback<F>(mut self, callback: F) -> Self
    where
        F: Fn(MemoryAlert) + Send + Sync + 'static,
    {
        self.alert_callback = Some(Box::new(callback));
        self
    }

    /// Get current memory usage
    pub fn get_memory_usage(&self) -> Result<MemoryUsage, MemoryError> {
        let usage = sysinfo::System::new_all();
        let total_memory = usage.total_memory();
        let used_memory = usage.used_memory();
        let available_memory = usage.available_memory();

        let usage_percent = if total_memory > 0 {
            (used_memory as f64 / total_memory as f64) * 100.0
        } else {
            0.0
        };

        Ok(MemoryUsage {
            total_bytes: total_memory,
            used_bytes: used_memory,
            available_bytes: available_memory,
            usage_percent,
        })
    }

    /// Check memory usage and trigger alerts if needed
    pub fn check_and_alert(&self) -> Result<(), MemoryError> {
        let usage = self.get_memory_usage()?;
        let mut last_check = self.last_check.lock();

        // Update last check time
        *last_check = SystemTime::now();

        let alert = if usage.usage_percent >= self.config.memory_critical_threshold {
            MemoryAlert::Critical {
                usage_percent: usage.usage_percent,
                used_bytes: usage.used_bytes,
            }
        } else if usage.usage_percent >= self.config.memory_warning_threshold {
            MemoryAlert::Warning {
                usage_percent: usage.usage_percent,
                used_bytes: usage.used_bytes,
            }
        } else {
            MemoryAlert::Normal {
                usage_percent: usage.usage_percent,
                used_bytes: usage.used_bytes,
            }
        };

        // Trigger callback if set
        if let Some(callback) = &self.alert_callback {
            callback(alert);
        }

        // Check if memory limit exceeded
        if self.config.max_memory_bytes > 0 && usage.used_bytes > self.config.max_memory_bytes {
            warn!(
                "Memory usage {} bytes exceeds limit {} bytes",
                usage.used_bytes, self.config.max_memory_bytes
            );
        }

        Ok(())
    }

    /// Start monitoring in background
    pub fn start_monitoring(self: Arc<Self>) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            let mut interval = time::interval(self.config.monitoring_interval);

            loop {
                interval.tick().await;

                if let Err(e) = self.check_and_alert() {
                    error!("Memory monitoring error: {:?}", e);
                }
            }
        })
    }
}

/// Memory usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryUsage {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f64,
}

/// Memory monitoring errors
#[derive(Debug, thiserror::Error)]
pub enum MemoryError {
    #[error("System info error: {0}")]
    SystemInfo(String),
}

/// Resource leak detector
pub struct LeakDetector {
    allocations: Mutex<HashMap<String, AllocationInfo>>,
    thresholds: LeakThresholds,
}

#[derive(Debug, Clone)]
struct AllocationInfo {
    size: usize,
    allocated_at: SystemTime,
    #[allow(dead_code)]
    stack_trace: Option<String>,
}

#[derive(Debug, Clone)]
pub struct LeakThresholds {
    pub max_allocations: usize,
    pub max_memory_mb: usize,
    pub alert_interval: Duration,
}

impl Default for LeakThresholds {
    fn default() -> Self {
        Self {
            max_allocations: 10000,
            max_memory_mb: 500,                       // 500MB
            alert_interval: Duration::from_secs(300), // 5 minutes
        }
    }
}

impl LeakDetector {
    /// Create a new leak detector
    pub fn new(thresholds: LeakThresholds) -> Self {
        Self {
            allocations: Mutex::new(HashMap::new()),
            thresholds,
        }
    }

    /// Track an allocation
    pub fn track_allocation(&self, id: String, size: usize) {
        let info = AllocationInfo {
            size,
            allocated_at: SystemTime::now(),
            stack_trace: None, // Could capture backtrace in debug builds
        };

        let mut allocations = self.allocations.lock();
        allocations.insert(id, info);

        // Check thresholds
        if allocations.len() > self.thresholds.max_allocations {
            warn!(
                "Potential memory leak: {} allocations exceed threshold {}",
                allocations.len(),
                self.thresholds.max_allocations
            );
        }

        let total_memory: usize = allocations.values().map(|info| info.size).sum();
        let total_memory_mb = total_memory / (1024 * 1024);

        if total_memory_mb > self.thresholds.max_memory_mb {
            warn!(
                "Potential memory leak: {} MB used exceeds threshold {} MB",
                total_memory_mb, self.thresholds.max_memory_mb
            );
        }
    }

    /// Track deallocation
    pub fn track_deallocation(&self, id: &str) {
        let mut allocations = self.allocations.lock();
        allocations.remove(id);
    }

    /// Get allocation statistics
    pub fn get_stats(&self) -> LeakStats {
        let allocations = self.allocations.lock();

        let total_allocations = allocations.len();
        let total_memory: usize = allocations.values().map(|info| info.size).sum();
        let oldest_allocation = allocations
            .values()
            .map(|info| info.allocated_at)
            .min()
            .unwrap_or(SystemTime::now());

        LeakStats {
            total_allocations,
            total_memory_bytes: total_memory,
            oldest_allocation_age: oldest_allocation
                .elapsed()
                .unwrap_or(Duration::from_secs(0)),
        }
    }

    /// Cleanup old allocations (for long-running processes)
    pub fn cleanup_old_allocations(&self, max_age: Duration) -> usize {
        let mut allocations = self.allocations.lock();
        let now = SystemTime::now();
        let mut to_remove = Vec::new();

        for (id, info) in allocations.iter() {
            if let Ok(age) = now.duration_since(info.allocated_at) {
                if age > max_age {
                    to_remove.push(id.clone());
                }
            }
        }

        let removed_count = to_remove.len();

        for id in &to_remove {
            allocations.remove(id);
        }

        removed_count
    }
}

/// Leak detection statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeakStats {
    pub total_allocations: usize,
    pub total_memory_bytes: usize,
    pub oldest_allocation_age: Duration,
}

/// Memory manager that coordinates all memory-related functionality
pub struct MemoryManager {
    #[allow(dead_code)]
    config: MemoryConfig,
    cache: Arc<TtlLruCache<String, Vec<u8>>>,
    monitor: Arc<MemoryMonitor>,
    leak_detector: Arc<LeakDetector>,
    cleanup_task: Option<tokio::task::JoinHandle<()>>,
}

impl MemoryManager {
    /// Create a new memory manager
    pub fn new(config: MemoryConfig) -> Self {
        let cache = Arc::new(TtlLruCache::new(config.clone()));
        let leak_detector = Arc::new(LeakDetector::new(LeakThresholds::default()));

        let monitor = Arc::new(MemoryMonitor::new(config.clone()));

        Self {
            config,
            cache,
            monitor,
            leak_detector,
            cleanup_task: None,
        }
    }

    /// Start background memory management tasks
    pub fn start_background_tasks(self: Arc<Self>) -> Result<(), MemoryError> {
        // Start memory monitoring
        let _monitor_handle = self.monitor.clone().start_monitoring();

        // Start cache cleanup task
        let cache_clone = self.cache.clone();
        let leak_detector_clone = self.leak_detector.clone();
        let _cleanup_handle = tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(60)); // Cleanup every minute

            loop {
                interval.tick().await;

                // Cleanup expired cache entries
                let cleaned = cache_clone.cleanup_expired();
                if cleaned > 0 {
                    debug!("Cleaned {} expired cache entries", cleaned);
                }

                // Cleanup old allocation tracking
                let old_cleaned =
                    leak_detector_clone.cleanup_old_allocations(Duration::from_secs(3600)); // 1 hour
                if old_cleaned > 0 {
                    debug!("Cleaned {} old allocation records", old_cleaned);
                }
            }
        });

        // Store cleanup task handle (this is not safe in a real implementation)
        // For now, we'll just spawn the task without storing the handle
        // In a real implementation, you'd need a different approach to store the handle

        Ok(())
    }

    /// Get the cache
    pub fn cache(&self) -> Arc<TtlLruCache<String, Vec<u8>>> {
        self.cache.clone()
    }

    /// Get memory statistics
    pub fn get_memory_stats(&self) -> Result<MemoryStats, MemoryError> {
        let cache_stats = self.cache.stats();
        let memory_usage = self.monitor.get_memory_usage()?;
        let leak_stats = self.leak_detector.get_stats();

        Ok(MemoryStats {
            cache_entries: self.cache.len(),
            cache_hit_ratio: self.cache.hit_ratio(),
            total_memory_used: memory_usage.used_bytes,
            memory_usage_percent: memory_usage.usage_percent,
            active_allocations: leak_stats.total_allocations,
            cache_evictions: cache_stats.evictions,
            cache_misses: cache_stats.misses,
            cache_hits: cache_stats.hits,
            last_cleanup: SystemTime::now(),
        })
    }

    /// Shutdown memory manager
    pub async fn shutdown(mut self) -> Result<(), MemoryError> {
        if let Some(handle) = self.cleanup_task.take() {
            handle.abort();
        }
        Ok(())
    }
}

impl Default for MemoryManager {
    fn default() -> Self {
        Self::new(MemoryConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[tokio::test]
    async fn test_ttl_lru_cache() {
        let cache = TtlLruCache::new(MemoryConfig {
            max_cache_entries: 10,
            default_cache_ttl: Duration::from_millis(100),
            ..Default::default()
        });

        // Test basic operations
        cache.insert("key1".to_string(), vec![1, 2, 3]);
        assert_eq!(cache.get(&"key1".to_string()), Some(vec![1, 2, 3]));
        assert_eq!(cache.get(&"key2".to_string()), None);

        // Test TTL expiration
        thread::sleep(Duration::from_millis(150));
        assert_eq!(cache.get(&"key1".to_string()), None);

        // Test cleanup
        cache.insert("key3".to_string(), vec![4, 5, 6]);
        thread::sleep(Duration::from_millis(50)); // Not expired yet
        assert_eq!(cache.cleanup_expired(), 0);
        thread::sleep(Duration::from_millis(60)); // Now expired
        assert_eq!(cache.cleanup_expired(), 1);
    }

    #[test]
    fn test_memory_monitor() {
        let monitor = MemoryMonitor::new(MemoryConfig::default());

        // Test memory usage retrieval
        let usage = monitor.get_memory_usage().unwrap();
        assert!(usage.total_bytes > 0);
        assert!(usage.used_bytes > 0);
        assert!(usage.available_bytes > 0);
        assert!(usage.usage_percent >= 0.0 && usage.usage_percent <= 100.0);
    }

    #[test]
    fn test_leak_detector() {
        let detector = LeakDetector::new(LeakThresholds::default());

        // Test allocation tracking
        detector.track_allocation("alloc1".to_string(), 1024);
        detector.track_allocation("alloc2".to_string(), 2048);

        let stats = detector.get_stats();
        assert_eq!(stats.total_allocations, 2);
        assert_eq!(stats.total_memory_bytes, 3072);

        // Test deallocation
        detector.track_deallocation("alloc1");
        let stats_after = detector.get_stats();
        assert_eq!(stats_after.total_allocations, 1);
        assert_eq!(stats_after.total_memory_bytes, 2048);
    }

    #[test]
    fn test_memory_config_defaults() {
        let config = MemoryConfig::default();
        assert_eq!(config.max_cache_entries, 1000);
        assert_eq!(config.default_cache_ttl, Duration::from_secs(300));
        assert_eq!(config.monitoring_interval, Duration::from_secs(60));
    }
}
