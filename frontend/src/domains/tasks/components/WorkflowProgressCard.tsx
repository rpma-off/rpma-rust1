'use client';

import React from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Workflow,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWorkflowActions, getStatusInfo, getButtonConfig } from '../hooks/useWorkflowActions';

const iconMap = {
  Clock,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} as const;

interface WorkflowProgressCardProps {
  taskId: string;
  workflowStatus?: string | null;
  workflowProgress?: {
    percentage: number;
    currentStep: number;
    totalSteps: number;
    completedSteps: number;
  };
  templateName?: string;
  className?: string;
}

export function WorkflowProgressCard({
  taskId,
  workflowStatus,
  workflowProgress,
  templateName,
  className = ''
}: WorkflowProgressCardProps) {
  const { isLoading, error, hasSession, handleWorkflowAction } = useWorkflowActions(taskId);

  const statusInfo = getStatusInfo(workflowStatus);
  const buttonConfig = getButtonConfig(workflowStatus);
  const StatusIcon = iconMap[statusInfo.iconName];
  const ButtonIcon = iconMap[buttonConfig.iconName];

  // Don't render if no workflow data
  if (!workflowStatus && !workflowProgress) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Workflow className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Progression du workflow</CardTitle>
          </div>
          <Badge className={statusInfo.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
        {templateName && (
          <CardDescription>
            Modèle : {templateName}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {workflowProgress && (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avancement</span>
                <span className="font-medium">{workflowProgress.percentage}%</span>
              </div>
              <Progress
                value={workflowProgress.percentage}
                className="h-2"
              />
            </div>

            {/* Step Information */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Étape actuelle</div>
                <div className="font-medium">
                  {workflowProgress.currentStep} sur {workflowProgress.totalSteps}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Étapes terminées</div>
                <div className="font-medium">
                  {workflowProgress.completedSteps} étape{workflowProgress.completedSteps > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Button */}
        <div className="pt-2 space-y-2">
          <Button
            variant={buttonConfig.variant}
            size="sm"
            className="w-full"
            disabled={isLoading || buttonConfig.action === 'disabled' || !hasSession}
            onClick={() => handleWorkflowAction(buttonConfig.action)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ButtonIcon className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Chargement...' : buttonConfig.text}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
