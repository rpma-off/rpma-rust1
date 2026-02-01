'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc/client';
import { useRouter } from 'next/navigation';

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
  const { session } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine status color and icon
  const getStatusInfo = (status?: string | null) => {
    switch (status) {
      case 'not_started':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: Clock,
          label: 'Not Started'
        };
      case 'in_progress':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: Play,
          label: 'In Progress'
        };
      case 'paused':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: Pause,
          label: 'Paused'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          label: 'Completed'
        };
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800',
          icon: AlertCircle,
          label: 'Cancelled'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: Clock,
          label: 'Unknown'
        };
    }
  };

  // Get button configuration based on status
  const getButtonConfig = (status?: string | null) => {
    switch (status) {
      case 'not_started':
        return {
          text: 'Commencer le workflow',
          icon: Play,
          variant: 'default' as const,
          action: 'start'
        };
      case 'paused':
        return {
          text: 'Reprendre le workflow',
          icon: Play,
          variant: 'default' as const,
          action: 'resume'
        };
      case 'in_progress':
        return {
          text: 'Continuer le workflow',
          icon: ArrowRight,
          variant: 'default' as const,
          action: 'continue'
        };
      case 'completed':
        return {
          text: 'Voir le résumé',
          icon: CheckCircle,
          variant: 'outline' as const,
          action: 'view'
        };
      default:
        return {
          text: 'Workflow indisponible',
          icon: AlertCircle,
          variant: 'secondary' as const,
          action: 'disabled'
        };
    }
  };

  const statusInfo = getStatusInfo(workflowStatus);
  const buttonConfig = getButtonConfig(workflowStatus);
  const StatusIcon = statusInfo.icon;
  const ButtonIcon = buttonConfig.icon;

  // Handle workflow actions
  const handleWorkflowAction = useCallback(async () => {
    if (!session?.token || buttonConfig.action === 'disabled') return;

    setIsLoading(true);
    setError(null);

    try {
      switch (buttonConfig.action) {
        case 'start': {
          // Start a new intervention/workflow with proper data structure
          const interventionData = {
            task_id: taskId,
            intervention_number: null,
            ppf_zones: [], // Will be populated from task data if available
            custom_zones: null,
            film_type: 'standard',
            film_brand: null,
            film_model: null,
            weather_condition: 'sunny',
            lighting_condition: 'natural',
            work_location: 'outdoor',
            temperature: null,
            humidity: null,
            technician_id: session.id,
            assistant_ids: null,
            scheduled_start: new Date().toISOString(),
            estimated_duration: 120, // 2 hours default
            gps_coordinates: null,
            address: null,
            notes: null,
            customer_requirements: null,
            special_instructions: null,
          };

          const result = await ipcClient.interventions.start(interventionData, session.token);

          if (result?.intervention) {
            toast.success('Workflow démarré avec succès');
            // Navigate to the workflow page to continue
            router.push(`/tasks/${taskId}/workflow/ppf`);
          } else {
            throw new Error('Échec du démarrage du workflow');
          }
          break;
        }

        case 'resume':
        case 'continue': {
          // Navigate to the workflow page
          router.push(`/tasks/${taskId}/workflow/ppf`);
          break;
        }

        case 'view': {
          // Navigate to completion summary
          router.push(`/tasks/${taskId}/completed`);
          break;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      toast.error(`Erreur: ${errorMessage}`);
      console.error('Workflow action error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, buttonConfig.action, taskId, router]);

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
            <CardTitle className="text-lg">Workflow Progress</CardTitle>
          </div>
          <Badge className={statusInfo.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
        {templateName && (
          <CardDescription>
            Template: {templateName}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {workflowProgress && (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
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
                <div className="text-muted-foreground">Current Step</div>
                <div className="font-medium">
                  {workflowProgress.currentStep} of {workflowProgress.totalSteps}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Completed</div>
                <div className="font-medium">
                  {workflowProgress.completedSteps} steps
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
            disabled={isLoading || buttonConfig.action === 'disabled' || !session?.token}
            onClick={handleWorkflowAction}
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
