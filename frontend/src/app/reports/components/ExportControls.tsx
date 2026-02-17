'use client';

import { useState } from 'react';
import { Download, FileText, Table, Calendar, Share2 } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';
import type { ReportType, ExportFormat, ReportFilters } from '@/shared/types';
import { reportsService } from '@/shared/utils';
import { enhancedToast } from '@/shared/utils';

interface DateRange {
  start: Date;
  end: Date;
}



interface FrontendFilters {
  technicians?: string[];
  clients?: string[];
  statuses?: string[];
  priorities?: string[];
  ppfZones?: string[];
}

interface ExportControlsProps {
  reportType: ReportType;
  dateRange: DateRange;
  filters: FrontendFilters;
  onExport: (format: ExportFormat, reportType: ReportType) => void;
}

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function validateFilters(filters: FrontendFilters): string | null {
  if (filters.statuses?.length) {
    const invalid = filters.statuses.filter(s => !VALID_STATUSES.includes(s));
    if (invalid.length > 0) {
      return `Statut(s) invalide(s) : ${invalid.join(', ')}`;
    }
  }
  if (filters.priorities?.length) {
    const invalid = filters.priorities.filter(p => !VALID_PRIORITIES.includes(p));
    if (invalid.length > 0) {
      return `Priorité(s) invalide(s) : ${invalid.join(', ')}`;
    }
  }
  return null;
}

function validateDateRange(dateRange: DateRange): string | null {
  if (dateRange.start >= dateRange.end) {
    return 'La date de début doit être antérieure à la date de fin';
  }
  const diffMs = dateRange.end.getTime() - dateRange.start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    return 'La plage de dates ne peut pas dépasser 365 jours';
  }
  return null;
}

export function ExportControls({ reportType, dateRange, filters, onExport }: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    // Client-side validation
    const dateError = validateDateRange(dateRange);
    if (dateError) {
      enhancedToast.error(dateError);
      return;
    }

    const filterError = validateFilters(filters);
    if (filterError) {
      enhancedToast.error(filterError);
      return;
    }

    setIsExporting(format);
    const toastId = enhancedToast.loading('Exportation en cours...');
    try {
      // Convert frontend date range to backend format
      const backendDateRange = {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0]
      };

      // Convert frontend filters to backend format
      const backendFilters: ReportFilters = {
        technician_ids: filters.technicians || null,
        client_ids: filters.clients || null,
        statuses: filters.statuses || null,
        priorities: filters.priorities || null,
        ppf_zones: filters.ppfZones || null,
        vehicle_models: null
      };

      // Call the reports service
      const result = await reportsService.exportReport(
        reportType,
        backendDateRange,
        backendFilters,
        format
      );

      if (result.success && result.data && result.data.download_url && result.data.file_name) {
        // Trigger download
        const link = document.createElement('a');
        link.href = result.data.download_url;
        link.download = result.data.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        enhancedToast.update(toastId, 'Export terminé avec succès', 'success');

        // Call the onExport callback for any additional handling
        onExport(format, reportType);
      } else {
        throw new Error(result.error || 'Export failed');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'exportation';
      enhancedToast.update(toastId, message, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gray-600 hover:bg-gray-800"
            disabled={isExporting !== null}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mr-2"></div>
                Exportation...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-800 border-gray-700" align="end">
          <div className="px-2 py-1.5">
            <p className="text-xs text-gray-400 font-medium">Format d&apos;export</p>
          </div>
          <DropdownMenuItem 
            onClick={() => handleExport('pdf')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
            <Badge variant="secondary" className="ml-auto text-xs bg-gray-700 text-gray-300">
              Rapport complet
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport('csv')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
          >
            <Table className="h-4 w-4 mr-2" />
            CSV
            <Badge variant="secondary" className="ml-auto text-xs bg-gray-700 text-gray-300">
              Données brutes
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport('excel')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
          >
            <Table className="h-4 w-4 mr-2" />
            Excel
            <Badge variant="secondary" className="ml-auto text-xs bg-gray-700 text-gray-300">
              Analyse
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem 
            className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Programmer un export
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Partager le rapport
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Export Buttons */}
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleExport('pdf')}
          className="text-gray-400 hover:text-white hover:bg-gray-700 px-2"
          title="Exporter en PDF"
        >
          <FileText className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleExport('csv')}
          className="text-gray-400 hover:text-white hover:bg-gray-700 px-2"
          title="Exporter en CSV"
        >
          <Table className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

