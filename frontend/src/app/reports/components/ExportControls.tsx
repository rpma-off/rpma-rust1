'use client';

import { useState } from 'react';
import { Download, FileText, Table, Calendar, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReportType, ExportFormat, ReportFilters } from '@/lib/backend';
import { reportsService } from '@/lib/services/entities/reports.service';

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

export function ExportControls({ reportType, dateRange, filters, onExport }: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
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

        // Call the onExport callback for any additional handling
        onExport(format, reportType);
      } else {
        throw new Error(result.error || 'Export failed');
      }

    } catch (error) {
      console.error('Export failed:', error);
      // You might want to show a toast notification here
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
