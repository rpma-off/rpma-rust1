import React from 'react';
import { Download, Share2, Printer, ArrowLeft, Home, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';

type CompletedActionBarProps = {
  onSaveReport: () => Promise<void>;
  onDownloadDataJson: () => void;
  onShareTask: () => void;
  onPrintReport: () => Promise<void>;
  onBackToTask?: () => void;
  onBackToTasks?: () => void;
  isExporting: boolean;
  exportProgress: string;
  lastExportTime: Date | null;
  taskId: string;
};

export function CompletedActionBar({
  onSaveReport,
  onDownloadDataJson,
  onShareTask,
  onPrintReport,
  onBackToTask,
  onBackToTasks,
  isExporting,
  exportProgress,
  lastExportTime,
}: CompletedActionBarProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            <span>Intervention terminee</span>
          </div>

          {lastExportTime && (
            <div className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-400">
              Dernier export:{' '}
              {lastExportTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}

          {isExporting && exportProgress && (
            <div className="flex items-center gap-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>{exportProgress}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onSaveReport}
            className="h-10 bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Telecharger le PDF
          </Button>

          <Button
            onClick={onDownloadDataJson}
            variant="outline"
            className="h-10 px-4 text-xs font-semibold"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Telecharger donnees JSON
          </Button>

          <Button
            onClick={onPrintReport}
            disabled={isExporting}
            variant="outline"
            className="h-10 px-4 text-xs font-semibold"
            size="sm"
          >
            {isExporting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                Generation...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </>
            )}
          </Button>

          <Button
            onClick={onShareTask}
            variant="outline"
            className="h-10 px-4 text-xs font-semibold"
            size="sm"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Partager
          </Button>

          {onBackToTask && (
            <Button
              onClick={onBackToTask}
              variant="ghost"
              className="h-10 px-4 text-xs text-gray-600 hover:text-gray-900"
              size="sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Details
            </Button>
          )}

          {onBackToTasks && (
            <Button
              onClick={onBackToTasks}
              variant="ghost"
              className="h-10 px-4 text-xs text-gray-600 hover:text-gray-900"
              size="sm"
            >
              <Home className="mr-2 h-4 w-4" />
              Taches
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
