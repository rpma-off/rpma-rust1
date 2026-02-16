import { safeInvoke } from './utils';
import type { JsonObject, JsonValue } from '@/types/json';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
let stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
};

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return { ...stats };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats = { hits: 0, misses: 0, sets: 0, invalidations: 0 };
}

/**
 * Check if cache entry is expired
 */
function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

/**
 * Get cached data if valid
 */
export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    stats.misses++;
    return undefined;
  }
  if (isExpired(entry)) {
    cache.delete(key);
    stats.misses++;
    return undefined;
  }
  stats.hits++;
  return entry.data;
}

/**
 * Set cache entry
 */
export function setCached<T>(key: string, data: T, ttl: number = 60000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
  stats.sets++;
}

/**
 * Invalidate specific cache key
 */
export function invalidateKey(key: string): void {
  if (cache.delete(key)) {
    stats.invalidations++;
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  const count = cache.size;
  cache.clear();
  stats.invalidations += count;
}

/**
 * Invalidate cache entries matching pattern
 */
export function invalidatePattern(pattern: string): void {
  let invalidated = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      invalidated++;
    }
  }
  stats.invalidations += invalidated;
}

/**
 * Cached invoke wrapper for read operations
 * Automatically caches results with TTL and handles cache invalidation
 */
export async function cachedInvoke<T>(
  cacheKey: string,
  command: string,
  args?: JsonObject,
  validator?: (data: JsonValue) => T,
  ttl: number = 60000
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(cacheKey);
  if (cached !== undefined) {
    console.log(`[IPC Cache] ${command} -> cache hit for key: ${cacheKey}`);
    return cached;
  }

  // Cache miss, invoke via safeInvoke (which handles correlation_id, logging, metrics)
  console.log(`[IPC Cache] ${command} -> cache miss for key: ${cacheKey}, invoking...`);

  const data = await safeInvoke<T>(command, args, validator);

  // Cache the result
  setCached(cacheKey, data, ttl);

  return data;
}
