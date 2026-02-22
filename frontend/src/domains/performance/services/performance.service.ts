import { performanceIpc } from '../ipc';
import { useAuth } from '@/domains/auth';
import type { ServiceResponse } from '@/types/unified.types';
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

  async getMetrics(limit: number = 100, sessionToken?: string): Promise<PerformanceMetrics[]> {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) throw new Error('No session token available');

      const result = await performanceIpc.getMetrics(limit, token);
      return (result as PerformanceMetrics[]) || [];
    } catch (error) {
      throw new Error(`Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStats(sessionToken?: string): Promise<PerformanceStats> {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) throw new Error('No session token available');

      const result = await performanceIpc.getStats(token);
      return (result as PerformanceStats) || {
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

  async getCacheStatistics(sessionToken?: string): Promise<CacheStatistics> {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) throw new Error('No session token available');

      const result = await performanceIpc.getCacheStatistics(token);
      return (result as CacheStatistics) || {
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

  async clearCache(cacheTypes?: string[], sessionToken?: string): Promise<void> {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) throw new Error('No session token available');

      await performanceIpc.clearApplicationCache({ cache_types: cacheTypes }, token);
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async configureCacheSettings(settings: Partial<CacheSettings>, sessionToken?: string): Promise<void> {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) throw new Error('No session token available');

      await performanceIpc.configureCacheSettings(settings as unknown as { cache_types?: string[] }, token);
    } catch (error) {
      throw new Error(`Failed to configure cache settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSystemHealth(sessionToken?: string): Promise<SystemHealth> {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) throw new Error('No session token available');

      const result = await performanceIpc.getStats(token);
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

  async cleanupMetrics(sessionToken?: string): Promise<void> {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) throw new Error('No session token available');

      await performanceIpc.cleanupMetrics(token);
    } catch (error) {
      throw new Error(`Failed to cleanup metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getSessionToken(): string | undefined {
    try {
      const { user } = useAuth();
      return user?.token;
    } catch {
      return undefined;
    }
  }
}

export const performanceService = PerformanceService.getInstance();
