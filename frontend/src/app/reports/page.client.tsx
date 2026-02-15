'use client';

import { useEffect, useState } from 'react';
import { DateRangePicker } from './components/DateRangePicker';
import { ReportTabs } from './components/ReportTabs';
import { ReportContent } from './components/ReportContent';
import { ExportControls } from './components/ExportControls';
import { reportsService } from '@/lib/services/entities/reports.service';
import { PageShell } from '@/components/layout/PageShell';
import { enhancedToast } from '@/lib/enhanced-toast';
import type { ReportType, ReportFilters as BackendReportFilters, DateRange as BackendDateRange, TaskCompletionReport, TechnicianPerformanceReport, ClientAnalyticsReport, QualityComplianceReport as BackendQualityComplianceReport, MaterialUsageReport as BackendMaterialUsageReport, GeographicReport as BackendGeographicReport, SeasonalReport, OperationalIntelligenceReport as BackendOperationalIntelligenceReport } from '@/lib/backend';
import { LoadingState } from '@/components/layout/LoadingState';

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

interface OverviewData {
  taskCompletion: TaskCompletionReport;
  technicianPerformance: TechnicianPerformanceReport;
  clientAnalytics: ClientAnalyticsReport;
  qualityCompliance: BackendQualityComplianceReport;
  materialUsage: BackendMaterialUsageReport;
  geographic: BackendGeographicReport;
  seasonal: SeasonalReport;
  operationalIntelligence: BackendOperationalIntelligenceReport;
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
  const [filters, _setFilters] = useState<ReportFilters>({});
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
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
          setOverviewData(result.data ?? null);
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
        <LoadingState message="Chargement des rapports..." />
      ) : (
        <ReportContent
          reportType={reportType}
          dateRange={dateRange}
          filters={filters}
          overviewData={overviewData ?? undefined}
          reportsGenerated={reportsGenerated}
        />
      )}
    </PageShell>
  );
}