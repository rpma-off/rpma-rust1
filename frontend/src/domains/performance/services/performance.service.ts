import { performanceIpc } from '../ipc';
import type {
  PerformanceMetrics,
  PerformanceStats,
  CacheStatistics,
  CacheSettings,
  SystemHealth,
} from '../api/types';

export class PerformanceService {
  private static instance: PerformanceService;

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  async getMetrics(limit: number = 100): Promise<PerformanceMetrics[]> {
    try {
      const result = await performanceIpc.getMetrics(limit);
      return (result as unknown as PerformanceMetrics[]) || [];
    } catch (error) {
      throw new Error(`Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStats(): Promise<PerformanceStats> {
    try {
      const result = await performanceIpc.getStats();
      return (result as unknown as PerformanceStats) || {
        total_operations: 0,
        avg_duration_ms: 0,
        success_rate: 0,
        errors_count: 0,
        metrics_count: 0,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCacheStatistics(): Promise<CacheStatistics> {
    try {
      const result = await performanceIpc.getCacheStatistics();
      return (result as unknown as CacheStatistics) || {
        total_entries: 0,
        total_size_bytes: 0,
        hit_rate: 0,
        miss_rate: 0,
        evictions: 0,
        entries: [],
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get cache statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearCache(cacheTypes?: string[]): Promise<void> {
    try {
      await performanceIpc.clearApplicationCache({ cache_types: cacheTypes });
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async configureCacheSettings(settings: Partial<CacheSettings>): Promise<void> {
    try {
      await performanceIpc.configureCacheSettings(settings);
    } catch (error) {
      throw new Error(`Failed to configure cache settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const result = await performanceIpc.getStats();
      return (result as unknown as SystemHealth) || {
        status: 'degraded',
        uptime_seconds: 0,
        memory_usage_mb: 0,
        memory_limit_mb: 0,
        cpu_usage_percent: 0,
        disk_usage_bytes: 0,
        disk_limit_bytes: 0,
        active_connections: 0,
        last_check: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get system health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanupMetrics(): Promise<void> {
    try {
      await performanceIpc.cleanupMetrics();
    } catch (error) {
      throw new Error(`Failed to cleanup metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const performanceService = PerformanceService.getInstance();
