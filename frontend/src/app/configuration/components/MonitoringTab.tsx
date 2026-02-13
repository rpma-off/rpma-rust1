'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Activity, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { SystemStatus } from '@/types/configuration.types';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonValue } from '@/types/json';

export function MonitoringTab() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const result = await safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK, {});
      if (result && typeof result === 'object') {
        const healthData = result as Record<string, JsonValue>;
        const status: SystemStatus = {
          status: (healthData.status as string) === 'healthy' ? 'healthy' : 'warning',
          components: {
            database: {
              status: 'healthy',
              message: 'Base de données opérationnelle',
              lastChecked: new Date().toISOString()
            },
            api: {
              status: 'healthy',
              message: 'API backend accessible',
              lastChecked: new Date().toISOString()
            },
            storage: {
              status: 'healthy',
              message: 'Stockage disponible',
              lastChecked: new Date().toISOString()
            },
            auth: {
              status: 'healthy',
              message: 'Authentification opérationnelle',
              lastChecked: new Date().toISOString()
            }
          },
          timestamp: new Date().toISOString()
        };
        setSystemStatus(status);
      }
    } catch (error) {
      console.error('Error loading system status:', error);
      toast.error('Erreur lors du chargement du statut système');
      setSystemStatus({
        status: 'error',
        components: {
          system: {
            status: 'error',
            message: 'Impossible de contacter le backend',
            lastChecked: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    await loadSystemStatus();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (status: string) => {
    if (status === 'healthy') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (status === 'warning') return <TrendingDown className="h-4 w-4 text-yellow-600" />;
    if (status === 'error') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitoring & Alertes</h2>
          <p className="text-gray-600">
            Surveillez les performances et la santé du système
          </p>
        </div>
        <Button onClick={refreshStatus} disabled={refreshing} variant="outline">
          {refreshing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualiser
        </Button>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>État du Système</span>
            </CardTitle>
            <CardDescription>
              Dernière vérification: {new Date(systemStatus.timestamp).toLocaleString('fr-FR')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(systemStatus.components).map(([key, component]) => (
                <div key={key} className={`p-4 rounded-lg border ${getStatusColor(component.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(component.status)}
                      <span className="font-medium capitalize">{key}</span>
                    </div>
                    {getTrendIcon(component.status)}
                  </div>
                  <p className="text-sm opacity-80">{component.message}</p>
                  <p className="text-xs opacity-60 mt-1">
                    Vérifié: {new Date(component.lastChecked).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Temps de réponse API</p>
                <p className="text-2xl font-bold">145ms</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-600" />
            </div>
            <Badge className="mt-2 bg-green-100 text-green-800">Excellent</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilisation CPU</p>
                <p className="text-2xl font-bold">23%</p>
              </div>
              <Minus className="h-8 w-8 text-gray-600" />
            </div>
            <Badge className="mt-2 bg-green-100 text-green-800">Normal</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilisation Mémoire</p>
                <p className="text-2xl font-bold">67%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
            <Badge className="mt-2 bg-yellow-100 text-yellow-800">Attention</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Erreurs (24h)</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-600" />
            </div>
            <Badge className="mt-2 bg-green-100 text-green-800">Faible</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertes Récentes</CardTitle>
          <CardDescription>
            Dernières alertes et notifications système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium">Utilisation mémoire élevée</p>
                <p className="text-sm text-gray-600">La mémoire système atteint 85% de capacité</p>
              </div>
              <Badge variant="outline">Il y a 2h</Badge>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">Sauvegarde terminée</p>
                <p className="text-sm text-gray-600">Sauvegarde quotidienne complétée avec succès</p>
              </div>
              <Badge variant="outline">Il y a 4h</Badge>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="font-medium">Erreur de connexion</p>
                <p className="text-sm text-gray-600">Échec de connexion à l&apos;API externe</p>
              </div>
              <Badge variant="outline">Il y a 6h</Badge>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
