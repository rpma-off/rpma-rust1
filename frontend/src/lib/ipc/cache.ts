import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { logger, LogContext } from '@/lib/logger';

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

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
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
  args?: Record<string, unknown>,
  validator?: (data: unknown) => T,
  ttl: number = 60000
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(cacheKey);
  if (cached !== undefined) {
    logger.debug(LogContext.PERFORMANCE, `[IPC Cache] ${command} -> cache hit for key: ${cacheKey}`);
    return cached;
  }

  // Cache miss, invoke and cache
  logger.debug(LogContext.PERFORMANCE, `[IPC Cache] ${command} -> cache miss for key: ${cacheKey}, invoking...`);

  const rawResult = await tauriInvoke(command, args) as ApiResponse<T> | T;

  // Extract data from ApiResponse wrapper if present
  let result: T;
  if (rawResult && typeof rawResult === 'object' && 'success' in rawResult) {
    const apiResult = rawResult as ApiResponse<T>;
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'Unknown error');
    }
    result = apiResult.data as T;
  } else {
    result = rawResult as T;
  }

  // Validate if validator provided
  const data = validator ? validator(result) : result;

  // Cache the result
  setCached(cacheKey, data, ttl);

  return data;
}