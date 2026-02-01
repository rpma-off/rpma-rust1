/**
 * Individual IPC metric entry
 */
export interface IpcMetric {
  command: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

/**
 * Aggregated metrics for a command
 */
export interface CommandMetrics {
  command: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  minDuration: number;
  maxDuration: number;
  lastError?: string;
  lastErrorTime?: number;
}

/**
 * Overall metrics summary
 */
export interface MetricsSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  commands: CommandMetrics[];
}

const MAX_METRICS = 1000;
const metrics: IpcMetric[] = [];

/**
 * Record a new metric
 */
export function recordMetric(metric: IpcMetric): void {
  metrics.push(metric);
  if (metrics.length > MAX_METRICS) {
    metrics.shift(); // Remove oldest
  }
}

/**
 * Get all raw metrics
 */
export function getRawMetrics(): IpcMetric[] {
  return [...metrics];
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

/**
 * Get aggregated metrics for a specific command
 */
export function getCommandMetrics(command: string): CommandMetrics | null {
  const commandMetrics = metrics.filter(m => m.command === command);
  if (commandMetrics.length === 0) return null;

  const successful = commandMetrics.filter(m => m.success);
  const failed = commandMetrics.filter(m => !m.success);
  const durations = commandMetrics.map(m => m.duration).sort((a, b) => a - b);

  const lastError = failed.length > 0 ? failed[failed.length - 1] : undefined;

  return {
    command,
    totalCalls: commandMetrics.length,
    successfulCalls: successful.length,
    failedCalls: failed.length,
    successRate: successful.length / commandMetrics.length,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    p95Duration: calculatePercentile(durations, 95),
    p99Duration: calculatePercentile(durations, 99),
    minDuration: durations[0],
    maxDuration: durations[durations.length - 1],
    lastError: lastError?.error,
    lastErrorTime: lastError?.timestamp,
  };
}

/**
 * Get overall metrics summary
 */
export function getMetricsSummary(): MetricsSummary {
  if (metrics.length === 0) {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      successRate: 0,
      averageDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      commands: [],
    };
  }

  const successful = metrics.filter(m => m.success);
  const failed = metrics.filter(m => !m.success);
  const durations = metrics.map(m => m.duration).sort((a, b) => a - b);

  // Get unique commands
  const commands = [...new Set(metrics.map(m => m.command))];

  return {
    totalCalls: metrics.length,
    successfulCalls: successful.length,
    failedCalls: failed.length,
    successRate: successful.length / metrics.length,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    p95Duration: calculatePercentile(durations, 95),
    p99Duration: calculatePercentile(durations, 99),
    commands: commands.map(getCommandMetrics).filter(Boolean) as CommandMetrics[],
  };
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * Export metrics to console
 */
export function logMetrics(): void {
  const summary = getMetricsSummary();
  console.group('IPC Metrics Summary');
  console.log('Total Calls:', summary.totalCalls);
  console.log('Success Rate:', `${(summary.successRate * 100).toFixed(2)}%`);
  console.log('Average Duration:', `${summary.averageDuration.toFixed(2)}ms`);
  console.log('P95 Duration:', `${summary.p95Duration.toFixed(2)}ms`);
  console.log('P99 Duration:', `${summary.p99Duration.toFixed(2)}ms`);

  console.group('Command Details');
  summary.commands.forEach(cmd => {
    console.log(`${cmd.command}: ${cmd.successfulCalls}/${cmd.totalCalls} (${(cmd.successRate * 100).toFixed(2)}%), avg: ${cmd.averageDuration.toFixed(2)}ms`);
  });
  console.groupEnd();
  console.groupEnd();
}

/**
 * Optional analytics integration hook
 * Can be set to send metrics to external service
 */
export let analyticsHook: ((metric: IpcMetric) => void) | null = null;

/**
 * Set analytics integration hook
 */
export function setAnalyticsHook(hook: (metric: IpcMetric) => void): void {
  analyticsHook = hook;
}