import { taskGateway } from '../api/taskGateway';
import { enhancedToast } from '@/shared/utils';

export interface ExportCsvOptions {
  includeNotes?: boolean;
  dateRange?: { from?: Date; to?: Date };
}

/**
 * Export tasks to a CSV file and trigger a browser download.
 */
export async function downloadTasksCsv(
  options: ExportCsvOptions,
): Promise<void> {
  const csvData = await taskGateway.exportTasksCsv(
    {
      include_notes: options.includeNotes ?? true,
      date_range: options.dateRange
        ? {
            start_date: options.dateRange.from?.toISOString(),
            end_date: options.dateRange.to?.toISOString(),
          }
        : undefined,
    },
  );

  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `tasks_export_${new Date().toISOString().split('T')[0]}.csv`,
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Import tasks from a CSV file via a browser file-picker.
 */
export async function importTasksFromCsv(
  onSuccess: () => void,
): Promise<void> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      enhancedToast.error('Fichier CSV invalide ou vide');
      return;
    }

    const result = await taskGateway.importTasksBulk(
      { csv_lines: lines, skip_duplicates: true, update_existing: false },
    );

    enhancedToast.success(`${result.successful} tâches importées avec succès`);
    onSuccess();
  };

  input.click();
}
