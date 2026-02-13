'use client';

import { useEffect, useMemo, useState } from 'react';
import { DateRangePicker } from './components/DateRangePicker';
import { ReportTabs } from './components/ReportTabs';
import { ReportContent } from './components/ReportContent';
import { ExportControls } from './components/ExportControls';
import { reportsService } from '@/lib/services/entities/reports.service';
import { PageShell } from '@/components/layout/PageShell';
import { enhancedToast } from '@/lib/enhanced-toast';
import type { ReportType, ReportFilters as BackendReportFilters, DateRange as BackendDateRange } from '@/lib/backend';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  technicians?: string[];
  clients?: string[];
  statuses?: string[];
  priorities?: string[];
  ppfZones?: string[];
}

const toBackendDateRange = (range: DateRange): BackendDateRange => ({
  start: range.start.toISOString(),
  end: range.end.toISOString(),
});

const toBackendFilters = (filters: ReportFilters): BackendReportFilters => ({
  technician_ids: filters.technicians || null,
  client_ids: filters.clients || null,
  statuses: filters.statuses || null,
  priorities: filters.priorities || null,
  ppf_zones: filters.ppfZones || null,
  vehicle_models: null,
});

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  });
  const [filters, setFilters] = useState<ReportFilters>({});
  const [overviewData, setOverviewData] = useState<any>(null);
  const [reportsGenerated, setReportsGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setIsLoading(true);
      try {
        const result = await reportsService.getOverviewReport(
          toBackendDateRange(dateRange),
          toBackendFilters(filters)
        );

        if (cancelled) return;

        if (result.success) {
          setOverviewData(result.data);
          setReportsGenerated(true);
        } else {
          setOverviewData(null);
          setReportsGenerated(false);
          enhancedToast.error(result.error || 'Erreur lors du chargement des rapports');
        }
      } catch {
        if (!cancelled) {
          enhancedToast.error('Erreur lors du chargement des rapports');
          setOverviewData(null);
          setReportsGenerated(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      cancelled = true;
    };
  }, [dateRange, filters]);

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        <ExportControls
          reportType={reportType}
          dateRange={dateRange}
          filters={filters}
          onExport={() => undefined}
        />
      </div>

      <ReportTabs selectedType={reportType} onTypeChange={setReportType} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Chargement des rapports...</span>
        </div>
      ) : (
        <ReportContent
          reportType={reportType}
          dateRange={dateRange}
          filters={filters}
          overviewData={overviewData}
          reportsGenerated={reportsGenerated}
        />
      )}
    </PageShell>
  );
}