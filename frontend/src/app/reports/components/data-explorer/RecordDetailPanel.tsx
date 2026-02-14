'use client';

import React from 'react';
import { X, Car, Users, FileText, Calendar, Mail, Star, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { reportsService } from '@/lib/services/entities/reports.service';
import type { SearchResult, EntityType } from '@/lib/backend';

interface RecordDetailPanelProps {
  record: SearchResult | null;
  onClose: () => void;
}

export function RecordDetailPanel({ record, onClose }: RecordDetailPanelProps) {
  const router = useRouter();

  const handleNavigate = () => {
    if (!record) return;

    // Navigate to appropriate detail page based on entity type
    switch (record.entity_type) {
      case 'task':
        router.push(`/tasks/${record.id}`);
        break;
      case 'client':
        router.push(`/clients/${record.id}`);
        break;
      case 'intervention':
        // Interventions are typically accessed through tasks
        // For now, we'll navigate to a general interventions page or back to search
        router.push('/tasks');
        break;
      default:
        console.warn('Unknown entity type for navigation:', record.entity_type);
    }
  };

  const handleExport = async () => {
    if (!record) return;

    try {
      // Export individual record as JSON
      const result = await reportsService.exportReport(
        'operational_intelligence', // Use operational intelligence for individual records
        {
          start: new Date().toISOString().split('T')[0], // Today
          end: new Date().toISOString().split('T')[0]
        },
        {
          technician_ids: null,
          client_ids: null,
          statuses: null,
          priorities: null,
          ppf_zones: null,
          vehicle_models: null
        },
        'csv'
      );

      if (result.success && result.data && result.data.download_url) {
        // Trigger download
        const link = document.createElement('a');
        link.href = result.data.download_url;
        link.download = `record-${record.entity_type}-${record.id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to export record:', error);
    }
  };

  if (!record) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Aucun élément sélectionné
            </h3>
            <p className="text-gray-400 text-sm">
              Cliquez sur un résultat pour voir les détails
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'task':
        return <Car className="h-5 w-5 text-blue-400" />;
      case 'client':
        return <Users className="h-5 w-5 text-green-400" />;
      case 'intervention':
        return <FileText className="h-5 w-5 text-purple-400" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-400" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-red-400" />;
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non spécifiée';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTaskDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Plaque d&apos;immatriculation</label>
          <p className="text-foreground">{record.metadata?.vehiclePlate || 'Non spécifiée'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Technicien</label>
          <p className="text-foreground">{record.metadata?.technicianName || 'Non assigné'}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-muted-foreground">Statut</label>
        <div className="mt-1">
          <Badge variant="secondary" className="capitalize">
            {record.status || 'Non défini'}
          </Badge>
        </div>
      </div>

      {record.metadata.qualityScore && (
        <div>
          <label className="text-sm font-medium text-gray-400">Score qualité</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor((Number(record.metadata?.qualityScore) || 0) / 20)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-white">{record.metadata?.qualityScore || 0}/100</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderClientDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <div className="flex items-center gap-2 mt-1">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-foreground">{record.metadata?.email || 'Non spécifié'}</p>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Type de client</label>
          <div className="flex items-center gap-2 mt-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-foreground capitalize">{record.metadata?.customerType || 'Non spécifié'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Nombre de tâches</label>
          <p className="text-foreground text-lg font-semibold">{record.metadata?.totalTasks || 0}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Statut</label>
          <div className="mt-1">
            <Badge variant="secondary" className="capitalize">
              {record.status || 'Non défini'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInterventionDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Type d&apos;intervention</label>
          <p className="text-foreground">{record.metadata?.interventionType || 'Non spécifié'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Technicien</label>
          <p className="text-foreground">{record.metadata?.technicianName || 'Non assigné'}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-muted-foreground">Client</label>
        <p className="text-foreground">{record.metadata?.clientName || 'Non spécifié'}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-muted-foreground">Statut</label>
        <div className="mt-1">
          <Badge variant="secondary" className="capitalize">
            {record.status || 'Non défini'}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            {getEntityIcon(record.entity_type)}
            Détails
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-gray-700 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">{record.title}</h3>
          <p className="text-gray-400 text-sm mb-3">{record.subtitle}</p>

          <div className="flex items-center gap-2 mb-4">
            {record.status && (
              <Badge
                variant="outline"
                className={`flex items-center gap-1 ${getStatusColor(record.status)}`}
              >
                {getStatusIcon(record.status)}
                {record.status === 'completed' ? 'Terminé' :
                 record.status === 'in_progress' ? 'En cours' :
                 record.status === 'pending' ? 'En attente' :
                 record.status === 'cancelled' ? 'Annulé' :
                 record.status === 'active' ? 'Actif' : record.status}
              </Badge>
            )}
            {record.date && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatDate(record.date)}
              </div>
            )}
          </div>
        </div>

        {/* Entity-specific details */}
        {record.entity_type === 'task' && renderTaskDetails()}
        {record.entity_type === 'client' && renderClientDetails()}
        {record.entity_type === 'intervention' && renderInterventionDetails()}

        {/* Actions */}
        <div className="pt-4 border-t border-gray-700/50">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={handleNavigate}
            >
              Voir complet
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={handleExport}
            >
              Exporter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
