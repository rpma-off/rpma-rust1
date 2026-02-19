/**
 * reports Domain - Public API
 */

export { ReportsProvider, useReportsContext } from './ReportsProvider';
export { useReports, useReportExports } from '../hooks/useReports';

export { DateRangePicker } from '../components/DateRangePicker';
export { ReportTabs } from '../components/ReportTabs';
export { ReportContent } from '../components/ReportContent';
export { ExportControls } from '../components/ExportControls';
export { AdvancedFilters } from '../components/AdvancedFilters';
export { GeographicHeatMap } from '../components/GeographicHeatMap';

export { reportsService, reportOperations } from '../server';

export type {
  ReportType,
  DateRange,
  ReportFilters,
  ExportFormat,
  ExportResult,
  TaskCompletionReport,
  TechnicianPerformanceReport,
  ClientAnalyticsReport,
  QualityComplianceReport,
  MaterialUsageReport,
  GeographicReport,
  SeasonalReport,
  OperationalIntelligenceReport,
} from './types';
