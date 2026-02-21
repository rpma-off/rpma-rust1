//! Comprehensive cache management system for the application
//!
//! This service provides multi-level caching with support for:
//! - Multiple cache types (query results, image thumbnails, computed analytics, API responses)
//! - Multiple backends (memory, disk, Redis)
//! - Cache key namespaces and invalidation strategies
//! - Cache statistics and monitoring
//! - Cache policies (TTL, LRU, LFU, manual invalidation)

use crate::commands::AppError;
use base64::{engine::general_purpose, Engine as _};
use redis::{Client, Commands, RedisResult};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime};
use tracing::{debug, info, warn};

/// Cache types supported by the system
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CacheType {
    QueryResult,
    ImageThumbnail,
    ComputedAnalytics,
    ApiResponse,
}

/// Cache backend types
#[derive(Debug, Clone)]
pub enum CacheBackend {
    Memory,
    Disk(PathBuf),
    Redis(String),
}

/// Cache entry metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry {
    pub key: String,
    pub cache_type: CacheType,
    pub created_at: SystemTime,
    pub last_accessed: SystemTime,
    pub access_count: u64,
    pub size_bytes: usize,
    pub ttl: Option<Duration>,
}

/// Cache statistics for monitoring
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub total_keys: u64,
    pub used_memory_bytes: u64,
    pub hit_rate: Option<f64>,
    pub miss_rate: Option<f64>,
    pub avg_response_time_ms: Option<f64>,
    pub cache_type_stats: HashMap<CacheType, CacheTypeStats>,
}

/// Statistics for a specific cache type
#[derive(Debug, Clone)]
pub struct CacheTypeStats {
    pub keys_count: u64,
    pub memory_used: u64,
    pub hit_rate: Option<f64>,
    pub avg_access_time_ms: Option<f64>,
}

/// Cache configuration
#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub max_memory_mb: usize,
    pub default_ttl: Duration,
    pub enable_disk_cache: bool,
    pub disk_cache_path: Option<PathBuf>,
    pub redis_url: Option<String>,
    pub compression_threshold: usize,
}

/// Comprehensive cache manager supporting multiple cache types and backends
#[derive(Debug)]
pub struct CacheManager {
    backend: CacheBackend,
    redis_client: Option<Client>,
    config: CacheConfig,
    stats: Arc<Mutex<CacheStats>>,
    compression_threshold: usize,
    memory_cache: Arc<Mutex<HashMap<String, (CacheEntry, Vec<u8>)>>>,
    disk_cache_path: Option<PathBuf>,
}

impl CacheManager {
    /// Create a new cache manager with the given configuration
    pub fn new(config: CacheConfig) -> Result<Self, AppError> {
        let mut redis_client = None;

        // Initialize Redis client if URL is provided
        if let Some(redis_url) = &config.redis_url {
            match Client::open(redis_url.clone()) {
                Ok(client) => {
                    // Test connection
                    if let Ok(mut conn) = client.get_connection() {
                        if redis::cmd("PING").query::<String>(&mut conn).is_ok() {
                            redis_client = Some(client);
                            info!("Redis cache backend initialized");
                        }
                    }
                }
                Err(e) => {
                    warn!("Failed to initialize Redis client: {}", e);
                }
            }
        }

        // Create disk cache directory if enabled
        if config.enable_disk_cache {
            if let Some(disk_path) = &config.disk_cache_path {
                if let Err(e) = fs::create_dir_all(disk_path) {
                    warn!("Failed to create disk cache directory: {}", e);
                } else {
                    info!("Disk cache directory initialized at: {:?}", disk_path);
                }
            }
        }

        let compression_threshold = config.compression_threshold;

        let cache_manager = CacheManager {
            backend: CacheBackend::Memory,
            memory_cache: Arc::new(Mutex::new(HashMap::new())),
            disk_cache_path: config.disk_cache_path.clone(),
            redis_client,
            config,
            stats: Arc::new(Mutex::new(CacheStats {
                total_keys: 0,
                used_memory_bytes: 0,
                hit_rate: None,
                miss_rate: None,
                avg_response_time_ms: None,
                cache_type_stats: HashMap::new(),
            })),
            compression_threshold,
        };

        info!("Cache manager initialized successfully");
        Ok(cache_manager)
    }

    /// Create a cache manager with default configuration
    pub fn default() -> Result<Self, AppError> {
        let config = CacheConfig {
            max_memory_mb: 512,
            default_ttl: Duration::from_secs(3600), // 1 hour
            enable_disk_cache: true,
            disk_cache_path: Some(PathBuf::from("./cache")),
            redis_url: std::env::var("REDIS_URL").ok(),
            compression_threshold: 1024, // 1KB
        };

        Self::new(config)
    }

    /// Generate a namespaced cache key
    pub fn generate_key(&self, cache_type: CacheType, key: &str) -> String {
        match cache_type {
            CacheType::QueryResult => format!("query:{}", key),
            CacheType::ImageThumbnail => format!("thumbnail:{}", key),
            CacheType::ComputedAnalytics => format!("analytics:{}", key),
            CacheType::ApiResponse => format!("api:{}", key),
        }
    }

    /// Store data in cache
    pub fn set<T: Serialize>(
        &self,
        cache_type: CacheType,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<(), AppError> {
        let start_time = Instant::now();
        let full_key = self.generate_key(cache_type.clone(), key);
        let ttl = ttl.or(Some(self.config.default_ttl));

        let serialized = serde_json::to_string(value)
            .map_err(|e| AppError::Internal(format!("Serialization error: {}", e)))?;

        let size_bytes = serialized.len();

        // Check memory limits
        if self.should_use_memory_cache(size_bytes) {
            self.set_memory(&full_key, cache_type, serialized, ttl)?;
        } else if self.config.enable_disk_cache && self.disk_cache_path.is_some() {
            self.set_disk(&full_key, cache_type, serialized, ttl)?;
        } else if let Some(_) = &self.redis_client {
            self.set_redis(&full_key, &serialized, ttl)?;
        }

        let duration = start_time.elapsed();
        debug!(
            "Cache set operation completed in {:?} for key: {}",
            duration, full_key
        );

        Ok(())
    }

    /// Retrieve data from cache
    pub fn get<T: DeserializeOwned>(
        &self,
        cache_type: CacheType,
        key: &str,
    ) -> Result<Option<T>, AppError> {
        let start_time = Instant::now();
        let full_key = self.generate_key(cache_type.clone(), key);

        let result = if let Some(data) = self.get_memory(&full_key)? {
            Some(data)
        } else if self.config.enable_disk_cache && self.disk_cache_path.is_some() {
            self.get_disk(&full_key)?
        } else if let Some(_) = &self.redis_client {
            self.get_redis(&full_key)?
        } else {
            None
        };

        let duration = start_time.elapsed();

        // Update statistics
        let mut stats = self.stats.lock().unwrap();
        if result.is_some() {
            // Cache hit
            stats.total_keys += 1;
            let type_stats = stats
                .cache_type_stats
                .entry(cache_type)
                .or_insert(CacheTypeStats {
                    keys_count: 0,
                    memory_used: 0,
                    hit_rate: Some(0.0),
                    avg_access_time_ms: Some(0.0),
                });
            type_stats.keys_count += 1;
        }

        debug!(
            "Cache get operation completed in {:?} for key: {}",
            duration, full_key
        );

        match result {
            Some(data) => {
                let deserialized: T = serde_json::from_str(&data)
                    .map_err(|e| AppError::Internal(format!("Deserialization error: {}", e)))?;
                Ok(Some(deserialized))
            }
            None => Ok(None),
        }
    }

    /// Delete data from cache
    pub fn delete(&self, cache_type: CacheType, key: &str) -> Result<(), AppError> {
        let full_key = self.generate_key(cache_type, key);

        // Try all backends
        self.delete_memory(&full_key)?;
        if self.config.enable_disk_cache {
            self.delete_disk(&full_key)?;
        }
        if let Some(_) = &self.redis_client {
            self.delete_redis(&full_key)?;
        }

        debug!("Deleted cache key: {}", full_key);
        Ok(())
    }

    /// Clear all cache data for a specific type
    pub fn clear_type(&self, cache_type: CacheType) -> Result<(), AppError> {
        let prefix = match cache_type {
            CacheType::QueryResult => "query:",
            CacheType::ImageThumbnail => "thumbnail:",
            CacheType::ComputedAnalytics => "analytics:",
            CacheType::ApiResponse => "api:",
        };

        // Clear memory cache
        let mut memory_cache = self.memory_cache.lock().unwrap();
        memory_cache.retain(|key, _| !key.starts_with(prefix));

        // Clear disk cache
        if let Some(disk_path) = &self.disk_cache_path {
            if disk_path.exists() {
                for entry in fs::read_dir(disk_path)? {
                    let entry = entry?;
                    let path = entry.path();
                    if let Some(file_name) = path.file_name() {
                        if let Some(name_str) = file_name.to_str() {
                            if name_str.starts_with(prefix) {
                                let _ = fs::remove_file(path);
                            }
                        }
                    }
                }
            }
        }

        // Clear Redis cache
        if let Some(client) = &self.redis_client {
            if let Ok(mut conn) = client.get_connection() {
                let keys: Vec<String> = redis::cmd("KEYS")
                    .arg(format!("{}*", prefix))
                    .query(&mut conn)
                    .unwrap_or_default();

                for key in keys {
                    let _: RedisResult<()> = conn.del(&key);
                }
            }
        }

        info!("Cleared all cache data for type: {:?}", cache_type);
        Ok(())
    }

    /// Clear all cache data
    pub fn clear_all(&self) -> Result<(), AppError> {
        // Clear memory cache
        let mut memory_cache = self.memory_cache.lock().unwrap();
        memory_cache.clear();

        // Clear disk cache
        if let Some(disk_path) = &self.disk_cache_path {
            if disk_path.exists() {
                let _ = fs::remove_dir_all(disk_path);
                let _ = fs::create_dir_all(disk_path);
            }
        }

        // Clear Redis cache
        if let Some(client) = &self.redis_client {
            if let Ok(mut conn) = client.get_connection() {
                let _: RedisResult<()> = redis::cmd("FLUSHDB").query(&mut conn);
            }
        }

        info!("Cleared all cache data");
        Ok(())
    }

    /// Get cache statistics
    pub fn get_stats(&self) -> Result<CacheStats, AppError> {
        let mut stats = self.stats.lock().unwrap().clone();

        // Update memory usage
        let memory_cache = self.memory_cache.lock().unwrap();
        stats.total_keys = memory_cache.len() as u64;
        stats.used_memory_bytes = memory_cache
            .values()
            .map(|(entry, _data)| entry.size_bytes)
            .sum::<usize>() as u64;

        Ok(stats)
    }

    /// Store data in cache with custom TTL
    pub fn set_with_ttl<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl: Duration,
    ) -> Result<(), AppError> {
        let serialized = serde_json::to_string(value)
            .map_err(|e| AppError::Internal(format!("Serialization error: {}", e)))?;

        let original_size = serialized.len();
        let data_to_store = if original_size > self.config.compression_threshold {
            // Compress large data
            self.compress_data(&serialized)?.into_bytes()
        } else {
            serialized.into_bytes()
        };

        let mut conn = self
            .get_connection()
            .map_err(|e| AppError::Internal(format!("Redis connection error: {}", e)))?;

        let _: RedisResult<()> = conn.set_ex(key, &data_to_store, ttl.as_secs() as u64);

        debug!(
            "Cached data for key: {} (size: {} bytes, compressed: {})",
            key,
            original_size,
            data_to_store.len() < original_size
        );
        Ok(())
    }

    /// Generate cache key for reports
    pub fn report_cache_key(&self, report_type: &str, params_hash: &str) -> String {
        format!("report:{}:{}", report_type, params_hash)
    }

    /// Generate cache key for dashboard data
    pub fn dashboard_cache_key(&self, user_id: &str, date_range_hash: &str) -> String {
        format!("dashboard:{}:{}", user_id, date_range_hash)
    }

    // Backend-specific implementations

    fn should_use_memory_cache(&self, size_bytes: usize) -> bool {
        let max_memory_bytes = self.config.max_memory_mb * 1024 * 1024;
        let current_memory = self
            .memory_cache
            .lock()
            .unwrap()
            .values()
            .map(|(entry, _data)| entry.size_bytes)
            .sum::<usize>();

        current_memory + size_bytes <= max_memory_bytes
    }

    /// Compress data using gzip
    fn compress_data(&self, data: &str) -> Result<String, AppError> {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder
            .write_all(data.as_bytes())
            .map_err(|e| AppError::Internal(format!("Compression error: {}", e)))?;

        let compressed = encoder
            .finish()
            .map_err(|e| AppError::Internal(format!("Compression finish error: {}", e)))?;

        // Prefix with compression marker
        let mut result = b"COMPRESSED:".to_vec();
        result.extend(compressed);

        Ok(general_purpose::STANDARD.encode(&result))
    }

    /// Decompress data
    fn decompress_data(&self, data: &str) -> Result<String, AppError> {
        use flate2::read::GzDecoder;
        use std::io::Read;

        let decoded = general_purpose::STANDARD
            .decode(data)
            .map_err(|e| AppError::Internal(format!("Base64 decode error: {}", e)))?;

        if !decoded.starts_with(b"COMPRESSED:") {
            return Err(AppError::Internal(
                "Invalid compressed data format".to_string(),
            ));
        }

        let compressed_data = &decoded[12..]; // Skip "COMPRESSED:" prefix

        let mut decoder = GzDecoder::new(compressed_data);
        let mut decompressed = String::new();

        decoder
            .read_to_string(&mut decompressed)
            .map_err(|e| AppError::Internal(format!("Decompression error: {}", e)))?;

        Ok(decompressed)
    }

    /// Check if data is compressed
    #[allow(dead_code)]
    fn is_compressed(&self, data: &str) -> bool {
        data.starts_with("COMPRESSED:")
    }

    /// Get a Redis connection
    fn get_connection(&self) -> Result<redis::Connection, AppError> {
        if let Some(client) = &self.redis_client {
            client
                .get_connection()
                .map_err(|e| AppError::Internal(format!("Redis connection error: {}", e)))
        } else {
            Err(AppError::Internal("Redis client not available".to_string()))
        }
    }

    fn set_memory(
        &self,
        key: &str,
        cache_type: CacheType,
        data: String,
        ttl: Option<Duration>,
    ) -> Result<(), AppError> {
        let entry = CacheEntry {
            key: key.to_string(),
            cache_type,
            created_at: SystemTime::now(),
            last_accessed: SystemTime::now(),
            access_count: 0,
            size_bytes: data.len(),
            ttl,
        };

        let mut cache = self.memory_cache.lock().unwrap();
        cache.insert(key.to_string(), (entry, data.into_bytes()));

        debug!("Stored in memory cache: {}", key);
        Ok(())
    }

    fn get_memory(&self, key: &str) -> Result<Option<String>, AppError> {
        let mut cache = self.memory_cache.lock().unwrap();
        if let Some((entry, data)) = cache.get_mut(key) {
            entry.last_accessed = SystemTime::now();
            entry.access_count += 1;

            // Check TTL
            if let Some(ttl) = entry.ttl {
                if let Ok(elapsed) = entry.created_at.elapsed() {
                    if elapsed > ttl {
                        cache.remove(key);
                        return Ok(None);
                    }
                }
            }

            Ok(Some(String::from_utf8(data.clone()).map_err(|e| {
                AppError::Internal(format!("UTF-8 conversion error: {}", e))
            })?))
        } else {
            Ok(None)
        }
    }

    fn delete_memory(&self, key: &str) -> Result<(), AppError> {
        let mut cache = self.memory_cache.lock().unwrap();
        cache.remove(key);
        Ok(())
    }

    fn set_disk(
        &self,
        key: &str,
        cache_type: CacheType,
        data: String,
        ttl: Option<Duration>,
    ) -> Result<(), AppError> {
        if let Some(disk_path) = &self.disk_cache_path {
            let file_path = disk_path.join(key.replace(":", "_"));
            fs::write(&file_path, data)?;

            // Store metadata
            let metadata = CacheEntry {
                key: key.to_string(),
                cache_type,
                created_at: SystemTime::now(),
                last_accessed: SystemTime::now(),
                access_count: 0,
                size_bytes: fs::metadata(&file_path)?.len() as usize,
                ttl,
            };

            let metadata_path = file_path.with_extension("meta");
            let metadata_json = serde_json::to_string(&metadata)?;
            fs::write(metadata_path, metadata_json)?;

            debug!("Stored in disk cache: {}", key);
        }
        Ok(())
    }

    fn get_disk(&self, key: &str) -> Result<Option<String>, AppError> {
        if let Some(disk_path) = &self.disk_cache_path {
            let file_path = disk_path.join(key.replace(":", "_"));
            if file_path.exists() {
                // Check metadata for TTL
                let metadata_path = file_path.with_extension("meta");
                if metadata_path.exists() {
                    let metadata_content = fs::read_to_string(&metadata_path)?;
                    let metadata: CacheEntry = serde_json::from_str(&metadata_content)?;

                    // Check TTL
                    if let Some(ttl) = metadata.ttl {
                        if let Ok(elapsed) = metadata.created_at.elapsed() {
                            if elapsed > ttl {
                                let _ = fs::remove_file(&file_path);
                                let _ = fs::remove_file(&metadata_path);
                                return Ok(None);
                            }
                        }
                    }
                }

                let data = fs::read_to_string(&file_path)?;
                debug!("Retrieved from disk cache: {}", key);
                Ok(Some(data))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    fn delete_disk(&self, key: &str) -> Result<(), AppError> {
        if let Some(disk_path) = &self.disk_cache_path {
            let file_path = disk_path.join(key.replace(":", "_"));
            let metadata_path = file_path.with_extension("meta");

            let _ = fs::remove_file(&file_path);
            let _ = fs::remove_file(&metadata_path);
        }
        Ok(())
    }

    fn set_redis(&self, key: &str, data: &str, ttl: Option<Duration>) -> Result<(), AppError> {
        if let Some(client) = &self.redis_client {
            let mut conn = client
                .get_connection()
                .map_err(|e| AppError::Internal(format!("Redis connection error: {}", e)))?;

            let _: RedisResult<()> = if let Some(ttl) = ttl {
                conn.set_ex(key, data, ttl.as_secs() as u64)
            } else {
                conn.set(key, data)
            };

            debug!("Stored in Redis cache: {}", key);
        }
        Ok(())
    }

    fn get_redis(&self, key: &str) -> Result<Option<String>, AppError> {
        if let Some(client) = &self.redis_client {
            let mut conn = client
                .get_connection()
                .map_err(|e| AppError::Internal(format!("Redis connection error: {}", e)))?;

            let result: RedisResult<Option<String>> = conn.get(key);
            match result {
                Ok(Some(data)) => {
                    debug!("Retrieved from Redis cache: {}", key);
                    Ok(Some(data))
                }
                _ => Ok(None),
            }
        } else {
            Ok(None)
        }
    }

    fn delete_redis(&self, key: &str) -> Result<(), AppError> {
        if let Some(client) = &self.redis_client {
            let mut conn = client
                .get_connection()
                .map_err(|e| AppError::Internal(format!("Redis connection error: {}", e)))?;

            let _: RedisResult<i32> = conn.del(key);
        }
        Ok(())
    }
}

// Compatibility type alias for backward compatibility
pub type CacheService = CacheManager;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_key_generation() {
        let cache = CacheService::default().unwrap();
        let key = cache.report_cache_key("tasks", "hash123");
        assert_eq!(key, "report:tasks:hash123");
    }
}
