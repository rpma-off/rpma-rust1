import type {
  ReportType,
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
   ReportRequest,
   ReportResponse,
    ExportResult
} from '@/lib/backend';
import { safeInvoke } from '@/lib/ipc/utils';

// Temporary local definition until backend.ts includes this type
interface InterventionReportResult {
  success: boolean;
  download_url?: string;
  file_path?: string;
  file_name?: string;
  format: string;
  file_size?: number;
  generated_at: string;
}
import { AuthSecureStorage } from '@/lib/secureStorage';
import type { ServiceResponse } from '@/types/unified.types';

/**
 * Frontend Reports Service - Client-side reports management
 *
 * Provides interface for reports operations in React frontend.
 * Handles IPC communication with backend reports commands.
 * Uses singleton pattern to ensure consistent state across application.
 *
 * @example
 * ```typescript
 * const reportsService = ReportsService.getInstance();
 * const taskReport = await reportsService.getTaskCompletionReport(dateRange, filters);
 * ```
 */
export class ReportsService {
  private static instance: ReportsService;

  /**
   * Gets singleton instance of ReportsService
   * @returns The ReportsService instance
   */
  static getInstance(): ReportsService {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService();
    }
    return ReportsService.instance;
  }

  /**
   * Generates a task completion report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to task completion report data
   */
  async getTaskCompletionReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<TaskCompletionReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<TaskCompletionReport>(
        'get_task_completion_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate task completion report',
        status: 500
      };
    }
  }

  /**
   * Generates a technician performance report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to technician performance report data
   */
  async getTechnicianPerformanceReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<TechnicianPerformanceReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<TechnicianPerformanceReport>(
        'get_technician_performance_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate technician performance report',
        status: 500
      };
    }
  }

  /**
   * Generates a client analytics report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to client analytics report data
   */
  async getClientAnalyticsReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<ClientAnalyticsReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<ClientAnalyticsReport>(
        'get_client_analytics_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate client analytics report',
        status: 500
      };
    }
  }

  /**
   * Generates a quality compliance report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to quality compliance report data
   */
  async getQualityComplianceReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<QualityComplianceReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<QualityComplianceReport>(
        'get_quality_compliance_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate quality compliance report',
        status: 500
      };
    }
  }

  /**
   * Generates a material usage report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to material usage report data
   */
  async getMaterialUsageReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<MaterialUsageReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<MaterialUsageReport>(
        'get_material_usage_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate material usage report',
        status: 500
      };
    }
  }

  /**
   * Generates a geographic analytics report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to geographic analytics report data
   */
  async getGeographicReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<GeographicReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<GeographicReport>(
        'get_geographic_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate geographic report',
        status: 500
      };
    }
  }

  /**
   * Generates a seasonal report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to seasonal report data
   */
  async getSeasonalReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<SeasonalReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<SeasonalReport>(
        'get_seasonal_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate seasonal report',
        status: 500
      };
    }
  }

  /**
   * Generates an operational intelligence report
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to operational intelligence report data
   */
  async getOperationalIntelligenceReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<OperationalIntelligenceReport>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<OperationalIntelligenceReport>(
        'get_operational_intelligence_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate operational intelligence report',
        status: 500
      };
    }
  }

  /**
   * Generates an overview report (summary of all reports)
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @returns Promise resolving to overview report data
   */
  async getOverviewReport(
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<ServiceResponse<{
    taskCompletion: TaskCompletionReport;
    technicianPerformance: TechnicianPerformanceReport;
    clientAnalytics: ClientAnalyticsReport;
    qualityCompliance: QualityComplianceReport;
    materialUsage: MaterialUsageReport;
    geographic: GeographicReport;
    seasonal: SeasonalReport;
    operationalIntelligence: OperationalIntelligenceReport;
  }>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<{
        task_completion: TaskCompletionReport;
        technician_performance: TechnicianPerformanceReport;
        client_analytics: ClientAnalyticsReport;
        quality_compliance: QualityComplianceReport;
        material_usage: MaterialUsageReport;
        geographic: GeographicReport;
        seasonal: SeasonalReport;
        operational_intelligence: OperationalIntelligenceReport;
      }>(
        'get_overview_report',
        {
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      // Convert snake_case to camelCase for frontend consistency
      const transformedResult = {
        taskCompletion: result.task_completion,
        technicianPerformance: result.technician_performance,
        clientAnalytics: result.client_analytics,
        qualityCompliance: result.quality_compliance,
        materialUsage: result.material_usage,
        geographic: result.geographic,
        seasonal: result.seasonal,
        operationalIntelligence: result.operational_intelligence
      };

      return {
        success: true,
        data: transformedResult,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate overview report',
        status: 500
      };
    }
  }

  /**
   * Exports a report to the specified format
   * @param reportType - Type of report to export
   * @param dateRange - Date range for the report
   * @param filters - Optional filters to apply
   * @param format - Export format (pdf, csv, excel)
   * @returns Promise resolving to export result with download URL
   */
  async exportReport(
    reportType: ReportType,
    dateRange: DateRange,
    filters: ReportFilters,
    format: ExportFormat
  ): Promise<ServiceResponse<ExportResult>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      console.log('ReportsService: Calling export_report_data with params:', {
        report_type: reportType,
        format,
        date_range: dateRange,
        filters: filters || {},
        session_token_present: !!session.token
      });

      const result = await safeInvoke<ExportResult>(
        'export_report_data',
        {
          report_type: reportType,
          format,
          date_range: dateRange,
          filters: filters || {},
          session_token: session.token
        }
      );

      console.log('ReportsService: export_report_data result:', {
        result_present: !!result,
        download_url_present: !!(result as any)?.download_url,
        file_name: (result as any)?.file_name,
        format: (result as any)?.format
      });

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export report',
        status: 500
      };
    }
  }

  /**
   * Exports an individual intervention report to PDF with retry logic
   * @param interventionId - ID of the intervention to export
   * @param options - Export options
   * @returns Promise resolving to export result with download URL
   */
  async exportInterventionReport(
    interventionId: string,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<ServiceResponse<InterventionReportResult>> {
    const { maxRetries = 2, retryDelay = 1000 } = options;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const session = await AuthSecureStorage.getSession();
        if (!session.token) {
          return {
            success: false,
            error: 'Authentification requise. Veuillez vous reconnecter.',
            status: 401
          };
        }

        console.log(`ReportsService: Export attempt ${attempt}/${maxRetries + 1} for intervention ${interventionId}`);

        const result = await safeInvoke<InterventionReportResult>(
          'export_intervention_report',
          {
            interventionId: interventionId,
            sessionToken: session.token
          }
        );

        console.log('ReportsService: export_intervention_report result:', {
          attempt,
          result_present: !!result,
          success: result?.success,
          download_url_present: !!result?.download_url,
          file_path_present: !!result?.file_path,
          file_name: result?.file_name,
          generated_at: result?.generated_at
        });

        if (!result) {
          throw new Error('Aucune réponse reçue du service d\'export');
        }

        if (!result.success) {
          // Check for specific error types
          if (result.file_path && !result.download_url) {
            console.warn('PDF generated but no download URL provided');
          }

          const errorMessage = this.getDetailedErrorMessage(result);
          throw new Error(errorMessage);
        }

        // Validate the result has required fields
        if (!result.file_path && !result.download_url) {
          throw new Error('Le rapport a été généré mais aucun lien de téléchargement n\'est disponible');
        }

        console.log(`ReportsService: Export successful on attempt ${attempt}`);
        return {
          success: true,
          data: result,
          status: 200
        };

      } catch (error) {
        const isLastAttempt = attempt > maxRetries;
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'export';

        console.error(`Export attempt ${attempt} failed:`, { error: errorMessage, interventionId });

        if (isLastAttempt) {
          // Return detailed error for last attempt
          return {
            success: false,
            error: `Échec de l'export après ${maxRetries + 1} tentatives: ${errorMessage}`,
            status: 500
          };
        }

        // Wait before retrying
        console.log(`Retrying export in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: 'Erreur inattendue lors de l\'export',
      status: 500
    };
  }

  /**
   * Gets detailed error message based on result structure
   */
  private getDetailedErrorMessage(result: InterventionReportResult): string {
    // Check for common error patterns
    if (!result.file_path && !result.download_url) {
      return 'Le rapport n\'a pas pu être généré correctement';
    }

    if (result.file_path && !result.download_url) {
      return 'Le rapport PDF a été créé mais le lien de téléchargement n\'est pas disponible';
    }

    // Default error message
    return 'Échec de la génération du rapport d\'intervention';
  }

  /**
   * Save intervention report with file dialog
   * @param interventionId - ID of the intervention
   * @returns Promise resolving to saved file path
   */
  async saveInterventionReport(interventionId: string): Promise<ServiceResponse<string>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      // Import dialog dynamically to avoid issues if not available
      const { save } = await import('@tauri-apps/plugin-dialog');

      // Show save dialog
      const defaultName = `intervention-report-${interventionId}.pdf`;
      const filePath = await save({
        title: 'Sauvegarder le rapport d\'intervention',
        defaultPath: defaultName,
        filters: [{
          name: 'PDF Files',
          extensions: ['pdf']
        }]
      });

      if (!filePath) {
        return { success: false, error: 'Aucun chemin de fichier sélectionné', status: 400 };
      }

      console.log('ReportsService: Calling save_intervention_report with interventionId:', interventionId, 'filePath:', filePath);

      const result = await safeInvoke<string>(
        'save_intervention_report',
        {
          interventionId: interventionId,
          filePath: filePath,
          sessionToken: session.token
        }
      );

      console.log('ReportsService: saveInterventionReport result:', result);

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      console.error('Save intervention report error', { error, interventionId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save failed',
        status: 500
      };
    }
  }

  /**
   * Gets the status of a report generation request
   * @param reportId - ID of the report generation request
   * @returns Promise resolving to report response with status
   */
  async getReportStatus(reportId: string): Promise<ServiceResponse<ReportResponse>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<ReportResponse>(
        'get_report_status',
        {
          report_id: reportId,
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report status',
        status: 500
      };
    }
  }

  /**
   * Cancels a report generation request
   * @param reportId - ID of the report generation request to cancel
   * @returns Promise resolving to success status
   */
  async cancelReport(reportId: string): Promise<ServiceResponse<boolean>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<boolean>(
        'cancel_report',
        {
          report_id: reportId,
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel report',
        status: 500
      };
    }
  }
  /**
   * Searches for records in the database
   * @param query - Search query string
   * @param entityType - Type of entity to search (tasks, clients, interventions)
   * @param filters - Optional filters
   * @param limit - Max number of results (default 50)
   * @param offset - Offset for pagination (default 0)
   * @returns Promise resolving to search results
   */
  async searchRecords(
    query: string,
    entityType: string,
    filters?: any,
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResponse<{ results: any[]; total_count: number; has_more: boolean }>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentication required', status: 401 };
      }

      const result = await safeInvoke<{
        results: any[];
        total_count: number;
        has_more: boolean;
      }>(
        'search_records',
        {
          query,
          entity_type: entityType,
          filters,
          limit,
          offset,
          session_token: session.token
        }
      );

      return {
        success: true,
        data: result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search records',
        status: 500
      };
    }
  }
}

// Export singleton instance
export const reportsService = ReportsService.getInstance();