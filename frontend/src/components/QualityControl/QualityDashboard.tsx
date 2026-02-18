/**
 * Quality Control Dashboard for PPF Workflow
 * Comprehensive QC monitoring with automated checks and manual inspections
 * @version 1.0
 * @date 2025-01-20
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  TrendingUp,
  Shield,
  Camera,
  Thermometer,
  HardHat
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QualityControlService } from '@/domains/interventions/server';
import type { QualityCheckpoint, QualityControlWorkflow } from '@/shared/types';
import { QualityIssue, CorrectiveAction } from '@/types/ppf-intervention';
import { useTranslation } from '@/hooks/useTranslation';

interface QualityDashboardProps {
  interventionId: string;
  onQualityIssue?: (issue: QualityIssue) => void;
  onEscalationRequired?: (checkpoint: QualityCheckpoint) => void;
}

export const QualityDashboard: React.FC<QualityDashboardProps> = ({
  interventionId,
  onQualityIssue: _onQualityIssue,
  onEscalationRequired
}) => {
  const [workflow, setWorkflow] = useState<QualityControlWorkflow | null>(null);
  const [checkpoints, setCheckpoints] = useState<QualityCheckpoint[]>([]);
  const [_selectedCheckpoint, _setSelectedCheckpoint] = useState<QualityCheckpoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const qualityService = QualityControlService.getInstance();

  const loadQualityData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load quality workflow
      const workflowResult = await qualityService.initializeQualityWorkflow(interventionId);
      if (workflowResult.success && workflowResult.data) {
        setWorkflow(workflowResult.data);
        setCheckpoints(workflowResult.data.checkpoints);
      } else {
        setError(workflowResult.error?.message || t('errors.loadFailed'));
      }

    } catch (err) {
      console.error('Error loading quality data:', err);
      setError(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
   }, [qualityService, interventionId, t]);

  useEffect(() => {
    loadQualityData();
  }, [loadQualityData]);

  const _handleCheckpointSelect = (checkpoint: QualityCheckpoint) => {
    _setSelectedCheckpoint(checkpoint);
  };

  const handleEscalateIssue = async (checkpoint: QualityCheckpoint) => {
    try {
      const result = await qualityService.escalateForReview(
        checkpoint.id,
        'Quality issue requires supervisor review',
        'system'
      );

      if (result.success) {
        onEscalationRequired?.(checkpoint);
        await loadQualityData(); // Refresh data
      }
    } catch (err) {
      console.error('Error escalating issue:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'escalated': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'escalated': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'photo_quality': return <Camera className="w-4 h-4" />;
      case 'process_compliance': return <FileText className="w-4 h-4" />;
      case 'material_quality': return <Shield className="w-4 h-4" />;
      case 'environmental': return <Thermometer className="w-4 h-4" />;
      case 'safety': return <HardHat className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>{t('qualityControl.loadingDashboard')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('qualityControl.errorLoading')}</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadQualityData}>{t('common.retry')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {checkpoints.filter(cp => cp.status === 'passed').length}
                </div>
                <div className="text-sm text-gray-600">{t('qualityControl.passed')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {checkpoints.filter(cp => cp.status === 'failed').length}
                </div>
                <div className="text-sm text-gray-600">{t('qualityControl.failed')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {checkpoints.filter(cp => cp.status === 'escalated').length}
                </div>
                <div className="text-sm text-gray-600">{t('qualityControl.escalated')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {workflow ? Math.round(workflow.qualityScore) : 0}%
                </div>
                <div className="text-sm text-gray-600">{t('qualityControl.qualityScore')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Score Progress */}
      {workflow && (
        <Card>
          <CardHeader>
            <CardTitle>{t('qualityControl.overallQualityScore')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('qualityControl.qualityCompliance')}</span>
                <span>{Math.round(workflow.qualityScore)}%</span>
              </div>
              <Progress value={workflow.qualityScore} className="h-3" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>{t('qualityControl.criticalIssues')}: {workflow.criticalIssues}</span>
                <span>{t('qualityControl.reviewRequired')}: {workflow.reviewRequired ? t('common.yes') : t('common.no')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Checkpoints */}
      <Card>
        <CardHeader>
          <CardTitle>{t('qualityControl.qualityCheckpoints')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">{t('qualityControl.all')} ({checkpoints.length})</TabsTrigger>
              <TabsTrigger value="passed">
                {t('qualityControl.passed')} ({checkpoints.filter(cp => cp.status === 'passed').length})
              </TabsTrigger>
              <TabsTrigger value="failed">
                {t('qualityControl.failed')} ({checkpoints.filter(cp => cp.status === 'failed').length})
              </TabsTrigger>
              <TabsTrigger value="escalated">
                {t('qualityControl.escalated')} ({checkpoints.filter(cp => cp.status === 'escalated').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {checkpoints.map((checkpoint) => (
                <Card key={checkpoint.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(checkpoint.status)}
                        <div>
                          <div className="font-medium">Step {checkpoint.stepId}</div>
                          <div className="text-sm text-gray-600">
                            {checkpoint.checkpointType} â€¢ {checkpoint.performedBy}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(checkpoint.status)}>
                          {checkpoint.status}
                        </Badge>
                        {checkpoint.reviewRequired && (
                          <Badge variant="destructive">{t('qualityControl.reviewRequiredBadge')}</Badge>
                        )}
                      </div>
                    </div>

                    {checkpoint.issues.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {checkpoint.issues.map((issue: QualityIssue, index: number) => (
                          <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{issue.description}</div>
                                  <div className="text-sm opacity-75">
                                    {getCategoryIcon(issue.category)}
                                    <span className="ml-1">{issue.category}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getSeverityColor(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                  {checkpoint.status === 'failed' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEscalateIssue(checkpoint)}
                                    >
                                      {t('qualityControl.escalate')}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}

                    {checkpoint.correctiveActions.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-2">{t('qualityControl.correctiveActions')}</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {checkpoint.correctiveActions.map((action: CorrectiveAction, index: number) => (
                            <li key={index}>â€¢ {action.description}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Similar content for other tabs - filtered by status */}
            <TabsContent value="passed">
              {checkpoints
                .filter(cp => cp.status === 'passed')
                .map((checkpoint) => (
                  <Card key={checkpoint.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium">Step {checkpoint.stepId}</div>
                          <div className="text-sm text-gray-600">
                            {t('qualityControl.passed')} â€¢ {checkpoint.performedBy}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="failed">
              {checkpoints
                .filter(cp => cp.status === 'failed')
                .map((checkpoint) => (
                  <Card key={checkpoint.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <div>
                            <div className="font-medium">Step {checkpoint.stepId}</div>
                            <div className="text-sm text-gray-600">
                              {t('qualityControl.failed')} â€¢ {checkpoint.issues.length} issues
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEscalateIssue(checkpoint)}
                        >
                          {t('qualityControl.escalate')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="escalated">
              {checkpoints
                .filter(cp => cp.status === 'escalated')
                .map((checkpoint) => (
                  <Card key={checkpoint.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="font-medium">Step {checkpoint.stepId}</div>
                          <div className="text-sm text-gray-600">
                            {t('qualityControl.escalatedForReview')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

