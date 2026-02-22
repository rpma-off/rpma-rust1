export interface PerformanceMetrics {
  id: string;
  timestamp: string;
  operation: string;
  duration_ms: number;
  status: 'success' | 'error';
  cpu_usage?: number;
  memory_usage_mb?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  total_operations: number;
  avg_duration_ms: number;
  success_rate: number;
  errors_count: number;
  metrics_count: number;
  last_updated: string;
}

export interface CacheStatistics {
  total_entries: number;
  total_size_bytes: number;
  hit_rate: number;
  miss_rate: number;
  evictions: number;
  entries: CacheEntry[];
  last_updated: string;
}

export interface CacheEntry {
  key: string;
  size_bytes: number;
  ttl_seconds: number;
  created_at: string;
  last_accessed: string;
  access_count: number;
}

export interface CacheSettings {
  max_memory_mb: number;
  default_ttl_seconds: number;
  enable_disk_cache: boolean;
  disk_cache_path?: string;
  max_disk_cache_mb?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  memory_usage_mb: number;
  memory_limit_mb: number;
  cpu_usage_percent: number;
  disk_usage_bytes: number;
  disk_limit_bytes: number;
  active_connections: number;
  last_check: string;
}

export interface PerformanceContextValue {
  metrics: PerformanceMetrics[];
  stats: PerformanceStats | null;
  cacheStats: CacheStatistics | null;
  systemHealth: SystemHealth | null;
  loading: boolean;
  error: string | null;
  refreshMetrics: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshCacheStats: () => Promise<void>;
  refreshSystemHealth: () => Promise<void>;
  clearCache: (types?: string[]) => Promise<void>;
  updateCacheSettings: (settings: Partial<CacheSettings>) => Promise<void>;
}

export type PerformanceContext = PerformanceContextValue;
