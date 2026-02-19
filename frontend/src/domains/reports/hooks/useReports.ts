'use client';

import { useCallback, useState } from 'react';
import { reportsService } from '../server';
import type {
  DateRange,
  ReportFilters,
  ReportType,
  ExportFormat,
  ExportResult,
} from '@/lib/backend';

interface UseReportsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetch: (dateRange: DateRange, filters?: ReportFilters) => Promise<void>;
}

export function useReports<T = unknown>(
  loader: (dateRange: DateRange, filters?: ReportFilters) => Promise<{
    success: boolean;
    data?: T;
    error?: string;
  }> = reportsService.getOverviewReport as unknown as (
    dateRange: DateRange,
    filters?: ReportFilters
  ) => Promise<{ success: boolean; data?: T; error?: string }>
): UseReportsState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (dateRange: DateRange, filters?: ReportFilters) => {
      setLoading(true);
      setError(null);

      try {
        const response = await loader(dateRange, filters);

        if (!response.success) {
          setData(null);
          setError(response.error ?? 'Failed to load report');
          return;
        }

        setData((response.data ?? null) as T | null);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    },
    [loader]
  );

  return {
    data,
    loading,
    error,
    fetch,
  };
}

export function useReportExports() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const exportReport = useCallback(
    async (
      reportType: ReportType,
      dateRange: DateRange,
      filters: ReportFilters,
      format: ExportFormat
    ): Promise<ExportResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await reportsService.exportReport(
          reportType,
          dateRange,
          filters,
          format
        );

        if (!response.success) {
          setError(response.error ?? 'Failed to export report');
          return null;
        }

        return (response.data ?? null) as ExportResult | null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export report');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    exportReport,
  };
}
