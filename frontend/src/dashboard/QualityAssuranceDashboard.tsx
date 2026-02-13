'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Download } from 'lucide-react';

export interface QualityAssuranceDashboardProps {
  data?: Record<string, unknown>;
  onQualityIssueSelect?: (issueId: string) => void;
  onRefresh?: () => void;
  onExport?: (format: string) => void;
}

// Mock data for demonstration
const mockQualityData = {
  complianceRate: 94.2,
  totalInspections: 156,
  passedInspections: 147,
  failedInspections: 9,
  pendingReviews: 12,
  recentIssues: [
    {
      id: '1',
      type: 'Surface Preparation',
      severity: 'high',
      status: 'open',
      description: 'Insufficient surface cleaning detected',
      interventionId: 'INT-2024-001',
      reportedAt: '2024-12-12T10:30:00Z'
    },
    {
      id: '2',
      type: 'Film Application',
      severity: 'medium',
      status: 'in_review',
      description: 'Minor bubbles in film application',
      interventionId: 'INT-2024-002',
      reportedAt: '2024-12-12T09:15:00Z'
    },
    {
      id: '3',
      type: 'Curing Process',
      severity: 'low',
      status: 'resolved',
      description: 'Curing time slightly under specification',
      interventionId: 'INT-2024-003',
      reportedAt: '2024-12-11T16:45:00Z'
    }
  ],
  qualityMetrics: {
    averageQualityScore: 8.7,
    defectRate: 2.3,
    reworkRate: 1.8,
    customerSatisfaction: 4.6
  }
};

/**
 * Quality assurance dashboard component
 * Displays QA metrics and control data
 */
export function QualityAssuranceDashboard({
  data,
  onQualityIssueSelect,
  onRefresh,
  onExport
}: QualityAssuranceDashboardProps) {
  const [qualityData, setQualityData] = useState(mockQualityData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setQualityData(data as typeof mockQualityData);
    }
  }, [data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_review': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assurance Qualité</h2>
          <p className="text-muted-foreground">Métriques et contrôles qualité des interventions</p>
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
            <CardTitle className="text-sm font-medium">Taux de Conformité</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{qualityData.complianceRate}%</div>
            <Progress value={qualityData.complianceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {qualityData.passedInspections}/{qualityData.totalInspections} inspections réussies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Qualité Moyen</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualityData.qualityMetrics.averageQualityScore}/10</div>
            <Progress value={qualityData.qualityMetrics.averageQualityScore * 10} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Sur 10 points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Défauts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{qualityData.qualityMetrics.defectRate}%</div>
            <Progress value={qualityData.qualityMetrics.defectRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {qualityData.failedInspections} défauts identifiés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Révisions en Attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{qualityData.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nécessitent attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quality Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Problèmes Qualité Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityData.recentIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => onQualityIssueSelect?.(issue.id)}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(issue.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{issue.type}</span>
                      <Badge variant={getSeverityColor(issue.severity) as any}>
                        {issue.severity}
                      </Badge>
                      <Badge variant="outline">
                        {issue.interventionId}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(issue.reportedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <Badge variant={issue.status === 'resolved' ? 'default' : 'secondary'}>
                  {issue.status === 'open' ? 'Ouvert' :
                   issue.status === 'in_review' ? 'En révision' : 'Résolu'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Métriques Détaillées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Taux de retravail</span>
              <span className="font-medium">{qualityData.qualityMetrics.reworkRate}%</span>
            </div>
            <Progress value={qualityData.qualityMetrics.reworkRate} />

            <div className="flex justify-between items-center">
              <span className="text-sm">Satisfaction client</span>
              <span className="font-medium">{qualityData.qualityMetrics.customerSatisfaction}/5 ⭐</span>
            </div>
            <Progress value={(qualityData.qualityMetrics.customerSatisfaction / 5) * 100} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions Recommandées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Réviser {qualityData.pendingReviews} inspections en attente</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Maintenir le taux de conformité actuel</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Planifier audit qualité trimestriel</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}