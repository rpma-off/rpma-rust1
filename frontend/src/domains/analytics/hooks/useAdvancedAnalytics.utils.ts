import type { JsonRecord } from '@/types/utility.types';

export interface AnalyticsData {
  id: string;
  value: number;
  label: string;
  category?: string;
  timestamp?: Date;
  metadata?: JsonRecord;
}

export interface AnalyticsMetrics {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

export function emptyAnalyticsMetrics(): AnalyticsMetrics {
  return {
    total: 0,
    average: 0,
    median: 0,
    min: 0,
    max: 0,
    standardDeviation: 0,
    trend: 'stable',
    trendValue: 0,
    percentiles: { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 }
  };
}

export function computeAnalyticsMetrics<T extends AnalyticsData>(data: T[]): AnalyticsMetrics {
  if (!data || data.length === 0) return emptyAnalyticsMetrics();

  const values = data.map(d => d.value).sort((a, b) => a - b);
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = total / values.length;
  const min = values[0];
  const max = values[values.length - 1];
  const median =
    values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const p25 = values[Math.floor(values.length * 0.25)];
  const p50 = median;
  const p75 = values[Math.floor(values.length * 0.75)];
  const p90 = values[Math.floor(values.length * 0.90)];
  const p95 = values[Math.floor(values.length * 0.95)];

  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendValue = 0;
  if (data.length > 1 && data.some(d => d.timestamp)) {
    const sortedData = data
      .filter(d => d.timestamp)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
    if (sortedData.length > 1) {
      const xValues = sortedData.map((_, index) => index);
      const yValues = sortedData.map(d => d.value);
      const n = xValues.length;
      const sumX = xValues.reduce((sum, x) => sum + x, 0);
      const sumY = yValues.reduce((sum, y) => sum + y, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      trendValue = slope;
      if (Math.abs(slope) < 0.01) trend = 'stable';
      else if (slope > 0) trend = 'up';
      else trend = 'down';
    }
  }

  return {
    total,
    average,
    median,
    min,
    max,
    standardDeviation,
    trend,
    trendValue,
    percentiles: { p25, p50, p75, p90, p95 }
  };
}

export function groupAnalyticsData<T extends AnalyticsData>(data: T[]): Map<string, T[]> {
  if (!data || data.length === 0) return new Map();
  const grouped = new Map<string, T[]>();
  data.forEach(item => {
    const category = item.category || 'default';
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)?.push(item);
  });
  return grouped;
}

export function buildTimeSeriesData<T extends AnalyticsData>(data: T[]) {
  if (!data || data.length === 0) return [];
  const timeData = data
    .filter(d => d.timestamp)
    .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

  const intervals = new Map<string, { timestamp: Date; values: number[]; count: number }>();
  timeData.forEach(item => {
    if (item.timestamp) {
      const date = new Date(item.timestamp);
      const intervalKey = date.toISOString().slice(0, 10);
      if (!intervals.has(intervalKey)) {
        intervals.set(intervalKey, { timestamp: date, values: [], count: 0 });
      }
      intervals.get(intervalKey)?.values.push(item.value);
      intervals.get(intervalKey)!.count++;
    }
  });

  return Array.from(intervals.values()).map(interval => ({
    timestamp: interval.timestamp,
    average: interval.values.reduce((sum, val) => sum + val, 0) / interval.values.length,
    count: interval.count,
    min: Math.min(...interval.values),
    max: Math.max(...interval.values)
  }));
}
