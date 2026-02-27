import React from 'react';
import { Download, Share2, Printer, ArrowLeft, Home, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { cn } from '@/lib/utils';

type CompletedActionBarProps = {
  onSaveReport: () => Promise<void>;
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
  onShareTask,
  onPrintReport,
  onBackToTask,
  onBackToTasks,
  isExporting,
  exportProgress,
  lastExportTime,
  taskId,
}: CompletedActionBarProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            <span>Intervention terminée</span>
          </div>

          {lastExportTime && (
            <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
              Dernier export: {lastExportTime.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            </div>
          )}

          {isExporting && exportProgress && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent" />
              <span>{exportProgress}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onSaveReport}
            className="h-10 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger le PDF
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
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent mr-2" />
                Génération...
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
              Détails
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
              Tâches
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
