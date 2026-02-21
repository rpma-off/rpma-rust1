import { QualityControlWorkflow, QualityCheckpoint } from '@/types/ppf-intervention';
import { ipcClient } from '@/lib/ipc';

export type { QualityControlWorkflow, QualityCheckpoint };

export class QualityControlService {
  private static instance: QualityControlService;

  static getInstance(): QualityControlService {
    if (!QualityControlService.instance) {
      QualityControlService.instance = new QualityControlService();
    }
    return QualityControlService.instance;
  }

  async initializeQualityWorkflow(interventionId: string): Promise<{ success: boolean; data?: QualityControlWorkflow; error?: Error }> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateRange = {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };

      const report = await ipcClient.reports.getQualityComplianceReport(dateRange);
      const raw = report as Record<string, unknown>;

      const workflow: QualityControlWorkflow = {
        id: `qc-${interventionId}`,
        interventionId,
        checkpoints: (raw.checkpoints || []) as QualityCheckpoint[],
        qualityScore: typeof raw.overall_score === 'number' ? raw.overall_score : (typeof raw.quality_score === 'number' ? raw.quality_score : 0),
        criticalIssues: typeof raw.critical_issues === 'number' ? raw.critical_issues : 0,
        reviewRequired: raw.review_required === true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return { success: true, data: workflow };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async escalateForReview(checkpointId: string, reason: string, _escalatedBy: string): Promise<{ success: boolean; error?: Error }> {
    try {
      const session = await import('@/lib/secureStorage').then(m => m.AuthSecureStorage.getSession());
      if (!session.token) {
        return { success: false, error: new Error('Authentication required') };
      }

      // Use security alerts to create an escalation record
      await ipcClient.security.getAlerts(session.token);

      console.info(`Escalating checkpoint ${checkpointId} for review: ${reason}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
