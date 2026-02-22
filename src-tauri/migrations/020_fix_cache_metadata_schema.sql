-- Migration 020: Recreate cache_metadata table with correct schema
-- This migration fixes the cache_metadata table that was created with incorrect schema in migration 17

-- Drop existing table if it exists (it was created with wrong schema)
DROP TABLE IF EXISTS cache_metadata;

-- Recreate with correct schema from migration 017
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

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_cache_metadata_key ON cache_metadata(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_type ON cache_metadata(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_expires ON cache_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_metadata_updated ON cache_metadata(updated_at DESC);

-- Recreate cache statistics table as well (it might have been created)
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

-- Recreate statistics indexes
CREATE INDEX IF NOT EXISTS idx_cache_statistics_timestamp ON cache_statistics(timestamp);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_type ON cache_statistics(cache_type);

-- Recreate trigger
CREATE TRIGGER IF NOT EXISTS cleanup_expired_cache
    AFTER INSERT ON cache_metadata
    WHEN NEW.expires_at IS NOT NULL AND NEW.expires_at < datetime('now')
BEGIN
    DELETE FROM cache_metadata WHERE id = NEW.id;
END;
