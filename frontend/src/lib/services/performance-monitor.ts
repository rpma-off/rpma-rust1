/**
 * Performance monitoring service for frontend
 * Records and tracks IPC call performance metrics
 */

interface PerformanceMetric {
  command: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  slowestCommands: Array<{ command: string; avgDuration: number }>;
  mostFrequentCommands: Array<{ command: string; count: number }>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests
    if (metric.duration > 5000) { // 5 seconds
      console.warn(`Slow IPC call: ${metric.command} took ${metric.duration}ms`);
    }
  }

  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        slowestCommands: [],
        mostFrequentCommands: [],
      };
    }

    const successful = this.metrics.filter(m => m.success);
    const failed = this.metrics.filter(m => !m.success);

    const durations = this.metrics.map(m => m.duration);
    const averageResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Calculate percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p99Index = Math.floor(sortedDurations.length * 0.99);

    const p95ResponseTime = sortedDurations[p95Index] || 0;
    const p99ResponseTime = sortedDurations[p99Index] || 0;

    // Calculate requests per minute (based on time span of metrics)
    const timeSpanMs = this.metrics.length > 1
      ? this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp
      : 60000; // Default to 1 minute if not enough data

    const requestsPerMinute = (this.metrics.length / timeSpanMs) * 60000;

    const errorRate = failed.length / this.metrics.length;

    // Calculate slowest commands
    const commandDurations = new Map<string, number[]>();
    this.metrics.forEach(metric => {
      if (!commandDurations.has(metric.command)) {
        commandDurations.set(metric.command, []);
      }
      commandDurations.get(metric.command)!.push(metric.duration);
    });

    const slowestCommands = Array.from(commandDurations.entries())
      .map(([command, durations]) => ({
        command,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // Calculate most frequent commands
    const commandCounts = new Map<string, number>();
    this.metrics.forEach(metric => {
      commandCounts.set(metric.command, (commandCounts.get(metric.command) || 0) + 1);
    });

    const mostFrequentCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.metrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerMinute,
      errorRate,
      slowestCommands,
      mostFrequentCommands,
    };
  }

  getRecentMetrics(limit = 50): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();