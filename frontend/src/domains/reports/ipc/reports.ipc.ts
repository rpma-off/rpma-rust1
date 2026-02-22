import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type {
  DateRange,
  ReportFilters,
  TaskCompletionReport,
  TechnicianPerformanceReport,
  ClientAnalyticsReport,
  QualityComplianceReport,
  MaterialUsageReport,
  GeographicReport,
  SeasonalReport,
  OperationalIntelligenceReport,
  ExportFormat,
  ReportResponse,
  ExportResult,
  InterventionReportResult,
  ReportType
} from '@/lib/ipc/types/index';
import type { JsonValue } from '@/types/json';

export const reportsIpc = {
  getTaskCompletionReport: (dateRange: DateRange, filters?: ReportFilters): Promise<TaskCompletionReport> =>
    safeInvoke<TaskCompletionReport>(IPC_COMMANDS.GET_TASK_COMPLETION_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  getTechnicianPerformanceReport: (dateRange: DateRange, filters?: ReportFilters): Promise<TechnicianPerformanceReport> =>
    safeInvoke<TechnicianPerformanceReport>(IPC_COMMANDS.GET_TECHNICIAN_PERFORMANCE_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  getClientAnalyticsReport: (dateRange: DateRange, filters?: ReportFilters): Promise<ClientAnalyticsReport> =>
    safeInvoke<ClientAnalyticsReport>(IPC_COMMANDS.GET_CLIENT_ANALYTICS_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  getQualityComplianceReport: (dateRange: DateRange, filters?: ReportFilters): Promise<QualityComplianceReport> =>
    safeInvoke<QualityComplianceReport>(IPC_COMMANDS.GET_QUALITY_COMPLIANCE_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  getMaterialUsageReport: (dateRange: DateRange, filters?: ReportFilters): Promise<MaterialUsageReport> =>
    safeInvoke<MaterialUsageReport>(IPC_COMMANDS.GET_MATERIAL_USAGE_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  getOverviewReport: (dateRange: DateRange, filters?: ReportFilters): Promise<{
    task_completion: TaskCompletionReport;
    technician_performance: TechnicianPerformanceReport;
    client_analytics: ClientAnalyticsReport;
    quality_compliance: QualityComplianceReport;
    material_usage: MaterialUsageReport;
    geographic: GeographicReport;
    seasonal: SeasonalReport;
    operational_intelligence: OperationalIntelligenceReport;
  }> =>
    safeInvoke<{
      task_completion: TaskCompletionReport;
      technician_performance: TechnicianPerformanceReport;
      client_analytics: ClientAnalyticsReport;
      quality_compliance: QualityComplianceReport;
      material_usage: MaterialUsageReport;
      geographic: GeographicReport;
      seasonal: SeasonalReport;
      operational_intelligence: OperationalIntelligenceReport;
    }>(IPC_COMMANDS.GET_OVERVIEW_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  exportReport: (
    reportType: ReportType,
    dateRange: DateRange,
    filters: ReportFilters,
    format: ExportFormat,
    sessionToken: string
  ): Promise<ExportResult> =>
    safeInvoke<ExportResult>(IPC_COMMANDS.EXPORT_REPORT_DATA, {
      report_type: reportType,
      format,
      dateRange: dateRange,
      filters: filters || {},
      session_token: sessionToken
    }),

  exportInterventionReport: (interventionId: string, sessionToken: string): Promise<InterventionReportResult> =>
    safeInvoke<InterventionReportResult>(IPC_COMMANDS.EXPORT_INTERVENTION_REPORT, {
      intervention_id: interventionId,
      session_token: sessionToken
    }),

  saveInterventionReport: (interventionId: string, filePath: string, sessionToken: string): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.SAVE_INTERVENTION_REPORT, {
      intervention_id: interventionId,
      filePath: filePath,
      session_token: sessionToken
    }),

  getReportStatus: (reportId: string): Promise<ReportResponse> =>
    safeInvoke<ReportResponse>(IPC_COMMANDS.GET_REPORT_STATUS, {
      report_id: reportId
    }),

  cancelReport: (reportId: string): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.CANCEL_REPORT, {
      report_id: reportId
    }),

  getAvailableReportTypes: (sessionToken: string): Promise<ReportType[]> =>
    safeInvoke<ReportType[]>(IPC_COMMANDS.GET_AVAILABLE_REPORT_TYPES, {
      session_token: sessionToken
    }),

  searchRecords: (query: JsonValue, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.SEARCH_RECORDS, {
      query,
      session_token: sessionToken
    }),
};
