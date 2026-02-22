-- Migration 017: Add cache metadata and statistics tables
-- Created: December 11, 2025

-- Cache metadata table for tracking cache entries
CREATE TABLE IF NOT EXISTS cache_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    cache_type TEXT NOT NULL, -- 'query_result', 'image_thumbnail', 'computed_analytics', 'api_response'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    size_bytes INTEGER NOT NULL,
    ttl_seconds INTEGER, -- NULL means no expiration
    backend_type TEXT NOT NULL, -- 'memory', 'disk', 'redis'
    expires_at DATETIME GENERATED ALWAYS AS (
        CASE
            WHEN ttl_seconds IS NOT NULL THEN datetime(created_at, '+' || ttl_seconds || ' seconds')
            ELSE NULL
        END
    ) VIRTUAL
);

-- Cache statistics table for historical tracking
CREATE TABLE IF NOT EXISTS cache_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cache_type TEXT NOT NULL,
    total_keys INTEGER NOT NULL DEFAULT 0,
    memory_used_bytes INTEGER NOT NULL DEFAULT 0,
    hit_count INTEGER NOT NULL DEFAULT 0,
    miss_count INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms REAL,
    eviction_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_metadata_key ON cache_metadata(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_type ON cache_metadata(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_expires ON cache_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_updated ON cache_metadata(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_timestamp ON cache_statistics(timestamp);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_type ON cache_statistics(cache_type);

-- Trigger to clean up expired cache entries
CREATE TRIGGER IF NOT EXISTS cleanup_expired_cache
    AFTER INSERT ON cache_metadata
    WHEN NEW.expires_at IS NOT NULL AND NEW.expires_at < datetime('now')
BEGIN
    DELETE FROM cache_metadata WHERE id = NEW.id;
END;
