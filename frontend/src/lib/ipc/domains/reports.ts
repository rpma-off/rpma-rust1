import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
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
} from '../types/index';
import type { JsonValue } from '@/types/json';

/**
 * Report generation and management operations
 */
export const reportOperations = {
  /**
   * Generates a task completion report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to task completion report data
   */
  getTaskCompletionReport: (dateRange: DateRange, filters?: ReportFilters): Promise<TaskCompletionReport> =>
    safeInvoke<TaskCompletionReport>(IPC_COMMANDS.GET_TASK_COMPLETION_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  /**
   * Generates a technician performance report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to technician performance report data
   */
  getTechnicianPerformanceReport: (dateRange: DateRange, filters?: ReportFilters): Promise<TechnicianPerformanceReport> =>
    safeInvoke<TechnicianPerformanceReport>(IPC_COMMANDS.GET_TECHNICIAN_PERFORMANCE_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  /**
   * Generates a client analytics report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to client analytics report data
   */
  getClientAnalyticsReport: (dateRange: DateRange, filters?: ReportFilters): Promise<ClientAnalyticsReport> =>
    safeInvoke<ClientAnalyticsReport>(IPC_COMMANDS.GET_CLIENT_ANALYTICS_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  /**
   * Generates a quality compliance report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to quality compliance report data
   */
  getQualityComplianceReport: (dateRange: DateRange, filters?: ReportFilters): Promise<QualityComplianceReport> =>
    safeInvoke<QualityComplianceReport>(IPC_COMMANDS.GET_QUALITY_COMPLIANCE_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  /**
   * Generates a material usage report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to material usage report data
   */
  getMaterialUsageReport: (dateRange: DateRange, filters?: ReportFilters): Promise<MaterialUsageReport> =>
    safeInvoke<MaterialUsageReport>(IPC_COMMANDS.GET_MATERIAL_USAGE_REPORT, {
      dateRange: dateRange,
      filters: filters || {}
    }),

  /**
   * Generates an overview report (summary of all reports)
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to overview report data
   */
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

  /**
   * Exports a report to the specified format
   * @param reportType - Type of report to export
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @param format - Export format (pdf, csv, excel)
   * @param sessionToken - User's session token
   * @returns Promise resolving to export result with download URL
   */
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

  /**
   * Export individual intervention report
   * @param interventionId - ID of the intervention to export
   * @param sessionToken - User's session token
   * @returns Promise resolving to intervention report result
   */
  exportInterventionReport: (interventionId: string, sessionToken: string): Promise<InterventionReportResult> =>
    safeInvoke<InterventionReportResult>(IPC_COMMANDS.EXPORT_INTERVENTION_REPORT, {
      intervention_id: interventionId,
      session_token: sessionToken
    }),

  /**
   * Save intervention report to specified path
   * @param interventionId - ID of the intervention
   * @param filePath - Path where to save the file
   * @param sessionToken - User's session token
   * @returns Promise resolving to saved file path
   */
  saveInterventionReport: (interventionId: string, filePath: string, sessionToken: string): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.SAVE_INTERVENTION_REPORT, {
      interventionId: interventionId,
      filePath: filePath,
      sessionToken: sessionToken
    }),

  /**
   * Gets the status of a report generation request
   * @param reportId - ID of the report generation request
   * @returns Promise resolving to report response with status
   */
  getReportStatus: (reportId: string): Promise<ReportResponse> =>
    safeInvoke<ReportResponse>(IPC_COMMANDS.GET_REPORT_STATUS, {
      report_id: reportId
    }),

  /**
   * Cancels a report generation request
   * @param reportId - ID of the report generation request to cancel
   * @returns Promise resolving to success status
   */
  cancelReport: (reportId: string): Promise<boolean> =>
    safeInvoke<boolean>(IPC_COMMANDS.CANCEL_REPORT, {
      report_id: reportId
    }),

  /**
   * Gets available report types for the current user
   * @param sessionToken - User's session token
   * @returns Promise resolving to array of available report types
   */
  getAvailableReportTypes: (sessionToken: string): Promise<ReportType[]> =>
    safeInvoke<ReportType[]>(IPC_COMMANDS.GET_AVAILABLE_REPORT_TYPES, {
      session_token: sessionToken
    }),

  /**
   * Searches records across different entities
   * @param query - Search query parameters
   * @param sessionToken - User's session token
   * @returns Promise resolving to search results
   */
  searchRecords: (query: JsonValue, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.SEARCH_RECORDS, {
      query,
      session_token: sessionToken
    }),
};
