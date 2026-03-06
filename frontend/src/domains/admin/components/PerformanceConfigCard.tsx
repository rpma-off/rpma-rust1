'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Database,
  HardDrive,
  Activity,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { PerformanceConfig, PerformanceCategory, PerformanceThreshold } from '@/shared/types';

function getCategoryLabel(category: PerformanceCategory) {
  const labels: Record<PerformanceCategory, string> = {
    cache: 'Cache',
    caching: 'Cache',
    database: 'Base de données',
    network: 'Réseau',
    ui: 'Interface utilisateur',
    file_upload: 'Upload de fichiers',
    api: 'API',
    monitoring: 'Monitoring'
  };
  return labels[category] || category;
}

function getCategoryIcon(category: PerformanceCategory) {
  switch (category) {
    case 'caching':
      return <Zap className="h-4 w-4" />;
    case 'database':
      return <Database className="h-4 w-4" />;
    case 'file_upload':
      return <HardDrive className="h-4 w-4" />;
    case 'api':
      return <Activity className="h-4 w-4" />;
    case 'monitoring':
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
}

interface PerformanceConfigCardProps {
  config: PerformanceConfig;
  onToggleStatus: (config: PerformanceConfig) => void;
  onEdit: (config: PerformanceConfig) => void;
  onDelete: (config: PerformanceConfig) => void;
}

export function PerformanceConfigCard({ config, onToggleStatus, onEdit, onDelete }: PerformanceConfigCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {getCategoryIcon(config.category as PerformanceCategory)}
              <h3 className="text-lg font-semibold">{getCategoryLabel(config.category as PerformanceCategory)}</h3>
              <Badge variant="outline">{config.category}</Badge>
              <Badge variant={config.isActive ? 'default' : 'secondary'}>
                {config.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Paramètres:</h4>
                <ul className="space-y-1">
                  {Object.entries(config.settings || {}).slice(0, 3).map(([key, value]) => (
                    <li key={key} className="text-gray-600">
                      {key}: {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : value}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Seuils:</h4>
                <ul className="space-y-1">
                   {Object.entries(config.thresholds || {}).slice(0, 3).map(([key, threshold]) => (
                     <li key={key} className="text-gray-600">
                        {key}: {typeof threshold === 'object' && threshold && 'value' in threshold && 'unit' in threshold ? `${(threshold as PerformanceThreshold).value} ${(threshold as PerformanceThreshold).unit}` : String(threshold)}
                     </li>
                   ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Monitoring:</h4>
                <p className="text-gray-600">
                  {config.monitoring?.enabled ? 'Activé' : 'Désactivé'}
                </p>
                <p className="text-gray-600">
                  Intervalle: {config.monitoring?.intervalSeconds}s
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleStatus(config)}
            >
              {config.isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(config)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(config)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceConfigEmptyStateProps {
  onCreateClick: () => void;
}

export function PerformanceConfigEmptyState({ onCreateClick }: PerformanceConfigEmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucune configuration de performance
        </h3>
        <p className="text-gray-600 mb-4">
          Créez votre première configuration de performance pour optimiser votre système
        </p>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une configuration
        </Button>
      </CardContent>
    </Card>
  );
}
