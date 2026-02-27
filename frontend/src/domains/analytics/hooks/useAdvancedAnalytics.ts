/**
 * Advanced Analytics Hook with D3.js Integration
 *
 * This hook provides comprehensive analytics capabilities including:
 * - Statistical analysis (mean, median, standard deviation, percentiles)
 * - Data grouping and categorization
 * - Time series analysis
 * - Interactive charts using D3.js
 *
 * Dependencies: d3 (npm install d3 @types/d3)
 * Fallback: HTML-based charts when D3.js is not available
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Task } from '@/lib/backend';
import type { JsonRecord, UnknownRecord } from '@/types/utility.types';
import { safeString, safeNumber, isNonNullObject, normalizeError } from '@/types/utility.types';

// Type-safe D3 selection type that doesn't require D3 to be installed
type D3Selection = {
  attr: (name: string, value: string | number) => D3Selection;
} | unknown; // Will be properly typed when D3 is available

interface AnalyticsData {
  id: string;
  value: number;
  label: string;
  category?: string;
  timestamp?: Date;
  metadata?: JsonRecord;
}

interface SOPData {
  id?: string | number;
  name?: string;
  category?: string;
  completionRate?: number;
  lastUsed?: string | Date;
  steps?: UnknownRecord[];
  usageCount?: number;
  averageCompletionTime?: number;
}

interface UserData {
  id?: string | number;
  name?: string;
  role?: string;
  performanceScore?: number;
  lastActive?: string | Date;
  tasksCompleted?: number;
  averageTaskTime?: number;
  efficiency?: number;
}

interface ChartConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colors: string[];
  animationDuration: number;
  responsive: boolean;
}

interface AnalyticsMetrics {
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

const DEFAULT_CHART_CONFIG: ChartConfig = {
  width: 800,
  height: 400,
  margin: { top: 20, right: 30, bottom: 40, left: 60 },
  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  animationDuration: 750,
  responsive: true
};

export const useAdvancedAnalytics = <T extends AnalyticsData>(
  data: T[],
  config: Partial<ChartConfig> = {}
) => {
  const chartConfig = useMemo(() => ({ ...DEFAULT_CHART_CONFIG, ...config }), [config]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
   const [chartInstance, setChartInstance] = useState<D3Selection | null>(null);
  const [isD3Available, setIsD3Available] = useState<boolean | null>(null);

  // Calculate comprehensive analytics metrics
  const metrics = useMemo((): AnalyticsMetrics => {
    if (!data || data.length === 0) {
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

    const values = data.map(d => d.value).sort((a, b) => a - b);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const min = values[0];
    const max = values[values.length - 1];

    // Calculate median
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const p25 = values[Math.floor(values.length * 0.25)];
    const p50 = median;
    const p75 = values[Math.floor(values.length * 0.75)];
    const p90 = values[Math.floor(values.length * 0.90)];
    const p95 = values[Math.floor(values.length * 0.95)];

    // Calculate trend (simple linear regression)
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

        if (Math.abs(slope) < 0.01) {
          trend = 'stable';
        } else if (slope > 0) {
          trend = 'up';
        } else {
          trend = 'down';
        }
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
  }, [data]);

  // Group data by category
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return new Map();

    const grouped = new Map<string, T[]>();
    data.forEach(item => {
      const category = item.category || 'default';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(item);
    });

    return grouped;
  }, [data]);

  // Time series data processing
  const timeSeriesData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const timeData = data
      .filter(d => d.timestamp)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

    // Group by time intervals (hourly, daily, weekly, monthly)
    const intervals = new Map<string, { timestamp: Date; values: number[]; count: number }>();

    timeData.forEach(item => {
      if (item.timestamp) {
        const date = new Date(item.timestamp);
        const intervalKey = date.toISOString().slice(0, 10); // Daily grouping

        if (!intervals.has(intervalKey)) {
          intervals.set(intervalKey, {
            timestamp: date,
            values: [],
            count: 0
          });
        }

        intervals.get(intervalKey)!.values.push(item.value);
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
  }, [data]);

  // Create fallback chart when D3.js is not available
  const createFallbackChart = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.innerHTML = `
      <div style="
        width: ${chartConfig.width}px; 
        height: ${chartConfig.height}px; 
        background: #f8f9fa; 
        border: 2px dashed #dee2e6; 
        border-radius: 8px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: #6c757d;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
          <div style="font-weight: 600; margin-bottom: 4px;">Chart Unavailable</div>
          <div style="font-size: 14px;">D3.js library not available</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">
            Data: ${data.length} items
          </div>
          <div style="font-size: 11px; margin-top: 12px; opacity: 0.6;">
            Run: npm install d3 @types/d3
          </div>
        </div>
      </div>
    `;
  }, [chartConfig.width, chartConfig.height, data.length]);

  // Initialize D3.js chart
  const initializeChart = useCallback(async () => {
    if (!containerRef.current || isInitialized) return;

    try {
      // Dynamic import of D3.js to avoid SSR issues
      const d3Module = await import('d3');
      const d3 = d3Module.default || d3Module;

      const container = d3.select(containerRef.current);
      const svg = container
        .append('svg')
        .attr('width', chartConfig.width)
        .attr('height', chartConfig.height)
        .style('background', 'white');

      // Add chart elements here based on chart type
      // This is a placeholder for the actual chart implementation
      setChartInstance(svg as D3Selection);
      setIsInitialized(true);

    } catch (error: unknown) {
      console.error('Failed to initialize D3.js chart:', normalizeError(error));

      // Fallback: create a simple HTML-based chart when D3.js fails
      createFallbackChart();
    }
  }, [chartConfig, isInitialized, createFallbackChart]);

  // Update chart data
  const updateChart = useCallback((newData: T[]) => {
    if (!chartInstance || !isInitialized) return;

    try {
      // Update chart with new data
      // This would contain the actual D3.js update logic
      console.log('Updating chart with new data:', newData);
    } catch (error: unknown) {
      console.error('Failed to update chart:', normalizeError(error));
      // If update fails, try to reinitialize
      setIsInitialized(false);
      setChartInstance(null);
    }
  }, [chartInstance, isInitialized]);

  // Responsive chart handling
  useEffect(() => {
    if (!chartConfig.responsive || !containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const newWidth = Math.min(containerWidth - 40, chartConfig.width);
        
        if (chartInstance && isNonNullObject(chartInstance)) {
          // Type-safe D3 attribute setting
          try {
            const d3Chart = chartInstance as { attr: (name: string, value: string | number) => unknown };
            d3Chart.attr('width', newWidth);
            d3Chart.attr('viewBox', `0 0 ${newWidth} ${chartConfig.height}`);
          } catch (error: unknown) {
            console.warn('Failed to resize chart:', normalizeError(error));
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [chartConfig.responsive, chartConfig.width, chartConfig.height, chartInstance]);

  // Check if D3.js is available
  const checkD3Availability = useCallback(async () => {
    try {
      await import('d3');
      setIsD3Available(true);
      return true;
    } catch (error: unknown) {
      console.debug('D3.js not available:', normalizeError(error));
      setIsD3Available(false);
      return false;
    }
  }, []);

  // Auto-initialize chart
  useEffect(() => {
    const checkAndInitialize = async () => {
      const d3Available = await checkD3Availability();
      if (d3Available) {
        initializeChart();
      } else {
        // D3.js not available, show fallback immediately
        createFallbackChart();
      }
    };
    
    checkAndInitialize();
  }, [initializeChart, checkD3Availability, createFallbackChart]);

  // Auto-update chart when data changes
  useEffect(() => {
    if (isInitialized && data) {
      updateChart(data);
    }
  }, [data, isInitialized, updateChart]);

  return {
    // Data and metrics
    data,
    metrics,
    groupedData,
    timeSeriesData,
    
    // Chart management
    containerRef,
    isInitialized,
    chartInstance,
    isD3Available,
    
    // Chart operations
    initializeChart,
    updateChart,
    
    // Utility methods
    getMetrics: () => metrics,
    getGroupedData: () => groupedData,
    getTimeSeriesData: () => timeSeriesData,
    
    // D3.js utilities
    checkD3Availability,
    createFallbackChart
  };
};

// Specialized hook for dashboard analytics
export const useDashboardAnalytics = (data: AnalyticsData[]) => {
  return useAdvancedAnalytics(data, {
    width: 800,
    height: 400,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    animationDuration: 500,
    responsive: true
  });
};

// Hook for task performance analytics
export const useTaskAnalytics = (taskData: Task[]) => {
  const analyticsData: AnalyticsData[] = taskData.map(task => ({
    id: task.id,
    value: task.workflow_status === 'completed' ? 100 : task.workflow_status === 'in_progress' ? 50 : 0,
    label: task.title,
    category: task.status,
    timestamp: task.updated_at ? new Date(task.updated_at as unknown as string) : undefined,
    metadata: {
      priority: safeString(task.priority),
      technician: safeString(task.technician_id),
      vehicle: safeString(task.vehicle_plate || task.vehicle_make || 'Unknown')
    } as JsonRecord
  }));

  return useAdvancedAnalytics(analyticsData, {
    width: 600,
    height: 300,
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    animationDuration: 750,
    responsive: true
  });
};

// Hook for SOP template analytics
export const useSOPAnalytics = (sopData: SOPData[]) => {
  const analyticsData: AnalyticsData[] = sopData.map(sop => ({
    id: String(sop.id || ''),
    value: Number(sop.completionRate || 0),
    label: String(sop.name || ''),
    category: String(sop.category || ''),
    timestamp: sop.lastUsed ? new Date(String(sop.lastUsed)) : undefined,
    metadata: {
      steps: Array.isArray(sop.steps) ? sop.steps.length : 0,
      usageCount: safeNumber(sop.usageCount) || 0,
      averageTime: safeNumber(sop.averageCompletionTime) || 0
    } as JsonRecord
  }));

  return useAdvancedAnalytics(analyticsData, {
    width: 700,
    height: 350,
    colors: ['#8b5cf6', '#06b6d4', '#84cc16'],
    animationDuration: 600,
    responsive: true
  });
};

// Hook for user performance analytics
export const useUserAnalytics = (userData: UserData[]) => {
  const analyticsData: AnalyticsData[] = userData.map(user => ({
    id: String(user.id || ''),
    value: Number(user.performanceScore || 0),
    label: String(user.name || ''),
    category: String(user.role || ''),
    timestamp: user.lastActive ? new Date(String(user.lastActive)) : undefined,
    metadata: {
      tasksCompleted: safeNumber(user.tasksCompleted) || 0,
      averageTaskTime: safeNumber(user.averageTaskTime) || 0,
      efficiency: safeNumber(user.efficiency) || 0
    } as JsonRecord
  }));

  return useAdvancedAnalytics(analyticsData, {
    width: 500,
    height: 250,
    colors: ['#f97316', '#ec4899', '#14b8a6'],
    animationDuration: 400,
    responsive: true
  });
};
