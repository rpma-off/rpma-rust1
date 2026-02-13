'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Image, AlertTriangle, CheckCircle, RefreshCw, Download, Eye } from 'lucide-react';

export interface PhotoDocumentationDashboardProps {
  data?: Record<string, unknown>;
  onPhotoSelect?: (photoId: string) => void;
  onRefresh?: () => void;
  onExport?: (format: string) => void;
}

// Mock data for demonstration
const mockPhotoData = {
  totalPhotos: 1247,
  photosThisWeek: 89,
  averagePhotosPerIntervention: 4.2,
  completionRate: 87.3,
  totalInterventions: 296,
  completedInterventions: 258,
  interventionsWithPhotos: 258,
  averagePhotoQuality: 8.1,
  storageUsed: '2.4 GB',
  recentUploads: [
    {
      id: '1',
      interventionId: 'INT-2024-001',
      fileName: 'before_cleaning.jpg',
      uploadedAt: '2024-12-12T11:30:00Z',
      size: '2.1 MB',
      quality: 8.5,
      status: 'processed'
    },
    {
      id: '2',
      interventionId: 'INT-2024-001',
      fileName: 'film_application.jpg',
      uploadedAt: '2024-12-12T11:35:00Z',
      size: '1.8 MB',
      quality: 9.2,
      status: 'processed'
    },
    {
      id: '3',
      interventionId: 'INT-2024-002',
      fileName: 'final_result.jpg',
      uploadedAt: '2024-12-12T10:15:00Z',
      size: '2.3 MB',
      quality: 7.8,
      status: 'processing'
    }
  ],
  qualityIssues: [
    {
      id: '1',
      type: 'Basse résolution',
      count: 12,
      description: 'Photos avec une résolution inférieure à 1920x1080'
    },
    {
      id: '2',
      type: 'Mauvais éclairage',
      count: 8,
      description: 'Éclairage insuffisant affectant la qualité des photos'
    },
    {
      id: '3',
      type: 'Images floues',
      count: 5,
      description: 'Flou de mouvement ou problèmes de mise au point'
    }
  ]
};

/**
 * Photo documentation dashboard component
 * Displays photo metrics and documentation status
 */
export function PhotoDocumentationDashboard({
  data,
  onPhotoSelect,
  onRefresh,
  onExport
}: PhotoDocumentationDashboardProps) {
  const [photoData, setPhotoData] = useState(mockPhotoData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use provided data or fallback to mock data
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setPhotoData(data as typeof mockPhotoData);
    }
  }, [data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onRefresh?.();
    setIsRefreshing(false);
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 8.5) return 'text-green-600';
    if (quality >= 7.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Image className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentation Photo</h2>
          <p className="text-muted-foreground">Métriques et gestion de la documentation photographique</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total photos</CardTitle>
            <Camera className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{photoData.totalPhotos.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{photoData.photosThisWeek} cette semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Complétion</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{photoData.completionRate}%</div>
            <Progress value={photoData.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {photoData.completedInterventions}/{photoData.totalInterventions} interventions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualité Moyenne</CardTitle>
            <Image className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getQualityColor(photoData.averagePhotoQuality)}`}>
              {photoData.averagePhotoQuality}/10
            </div>
            <Progress value={photoData.averagePhotoQuality * 10} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Sur 10 points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stockage Utilisé</CardTitle>
            <Camera className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{photoData.storageUsed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {photoData.averagePhotosPerIntervention} photos/intervention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Uploads Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {photoData.recentUploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => onPhotoSelect?.(upload.id)}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(upload.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{upload.fileName}</span>
                      <Badge variant="outline">
                        {upload.interventionId}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {upload.size} • Qualité: <span className={getQualityColor(upload.quality)}>{upload.quality}/10</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(upload.uploadedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quality Issues and Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Problèmes de Qualité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {photoData.qualityIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">{issue.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                  </div>
                  <Badge variant="destructive">
                    {issue.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques Détaillées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Interventions avec photos</span>
              <span className="font-medium">{photoData.interventionsWithPhotos}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Photos par intervention</span>
              <span className="font-medium">{photoData.averagePhotosPerIntervention}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Taille moyenne</span>
              <span className="font-medium">2.1 MB</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Résolution moyenne</span>
              <span className="font-medium">2048x1536</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Améliorer l&apos;éclairage</span>
              </div>
              <p className="text-sm text-muted-foreground">
                8 photos avec éclairage insuffisant détecté. Utilisez des sources de lumière appropriées.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Image className="h-5 w-5 text-green-500" />
                <span className="font-medium">Vérifier la résolution</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Assurez-vous que toutes les photos respectent la résolution minimale de 1920x1080.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Processus standardisé</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Maintenez le taux de complétion actuel en suivant les protocoles de documentation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}