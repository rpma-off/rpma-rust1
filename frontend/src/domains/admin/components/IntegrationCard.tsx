'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Play, Pause, RefreshCw, TestTube } from 'lucide-react';
import type { IntegrationConfig } from '@/shared/types';
import {
  getIntegrationTypeIcon,
  getIntegrationTypeLabel,
  getStatusColor,
  getHealthStatusIcon,
} from './integration-utils';

interface IntegrationCardProps {
  integration: IntegrationConfig;
  testingIntegration: string | null;
  onTest: (id: string) => void;
  onToggleStatus: (integration: IntegrationConfig) => void;
  onEdit: (integration: IntegrationConfig) => void;
  onDelete: (integration: IntegrationConfig) => void;
}

export function IntegrationCard({
  integration,
  testingIntegration,
  onTest,
  onToggleStatus,
  onEdit,
  onDelete,
}: IntegrationCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {getIntegrationTypeIcon(integration.type)}
              <h3 className="text-lg font-semibold">{integration.name}</h3>
              <Badge variant="outline">{getIntegrationTypeLabel(integration.type)}</Badge>
              <Badge className={getStatusColor(integration.status)}>
                {integration.status}
              </Badge>
              <Badge variant={integration.isActive ? 'default' : 'secondary'}>
                {integration.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Fournisseur:</h4>
                <p className="text-gray-600">{integration.provider}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Dernière synchronisation:</h4>
                <p className="text-gray-600">
                  {integration.lastSync
                    ? new Date(integration.lastSync).toLocaleString('fr-FR')
                    : 'Jamais'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">État de santé:</h4>
                <div className="flex items-center space-x-2">
                  {getHealthStatusIcon(integration.healthCheck?.status || 'unknown')}
                  <span className="text-gray-600">
                    {integration.healthCheck?.error ||
                      (integration.healthCheck?.status === 'healthy'
                        ? 'Connexion réussie'
                        : 'Non vérifié')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTest(integration.id)}
              disabled={testingIntegration === integration.id}
            >
              {testingIntegration === integration.id ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleStatus(integration)}
            >
              {integration.isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(integration)}
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(integration)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
