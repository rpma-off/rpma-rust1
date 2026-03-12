import { safeInvoke } from '@/lib/ipc/utils';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { AuthSecureStorage } from '@/lib/secureStorage';
import type { ServiceResponse } from '@/types/unified.types';

export interface InterventionReportResult {
  success: boolean;
  download_url?: string;
  file_path?: string;
  file_name?: string;
  format: string;
  file_size?: number;
  generated_at: string;
}

export const documentReportOperations = {
  async exportInterventionReport(
    interventionId: string,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<ServiceResponse<InterventionReportResult>> {
    const { maxRetries = 2, retryDelay = 1000 } = options;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      try {
        const session = await AuthSecureStorage.getSession();
        if (!session.token) {
          return { success: false, error: 'Authentification requise', status: 401 };
        }

        const result = await safeInvoke<InterventionReportResult>(IPC_COMMANDS.EXPORT_INTERVENTION_REPORT, {
          intervention_id: interventionId,
          session_token: session.token
        });

        if (!result || !result.success) {
          throw new Error('Echec de generation du rapport');
        }

        if (!result.file_path && !result.download_url) {
          throw new Error('Rapport genere sans chemin de fichier');
        }

        return { success: true, data: result, status: 200 };
      } catch (error) {
        if (attempt > maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erreur export rapport',
            status: 500
          };
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return { success: false, error: 'Erreur export rapport', status: 500 };
  },

  async saveInterventionReport(interventionId: string): Promise<ServiceResponse<string>> {
    try {
      const session = await AuthSecureStorage.getSession();
      if (!session.token) {
        return { success: false, error: 'Authentification requise', status: 401 };
      }

      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        title: 'Sauvegarder le rapport d\'intervention',
        defaultPath: `intervention-report-${interventionId}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (!filePath) {
        return { success: false, error: 'Aucun chemin de fichier selectionne', status: 400 };
      }

      const result = await safeInvoke<string>(IPC_COMMANDS.SAVE_INTERVENTION_REPORT, {
        interventionId,
        filePath,
        sessionToken: session.token
      });

      return { success: true, data: result, status: 200 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur sauvegarde rapport',
        status: 500
      };
    }
  }
};
