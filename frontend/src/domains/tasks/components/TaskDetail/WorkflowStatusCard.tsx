import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Workflow, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface WorkflowStatusCardProps {
  taskId: string;
  workflowId?: string;
  currentStepId?: string | null;
  status?: string;
  progress?: number;
}

export const WorkflowStatusCard: React.FC<WorkflowStatusCardProps> = ({
  taskId: _taskId,
  workflowId,
  currentStepId,
  status,
  progress,
}) => {
  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'paused':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Workflow className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Workflow className="h-4 w-4" />
          Statut du workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">État actuel</span>
          <Badge className={getStatusColor(status)}>
            {getStatusIcon(status)}
            <span className="ml-1 capitalize">
              {status || 'Non démarré'}
            </span>
          </Badge>
        </div>

        {workflowId && (
          <div className="text-xs text-gray-500">
            Workflow ID: {workflowId}
          </div>
        )}

        {currentStepId && (
          <div className="text-xs text-gray-500">
            Étape actuelle: {currentStepId}
          </div>
        )}

        {/* Real progress bar with actual progress data */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progression</span>
            <span>{progress !== undefined ? `${progress}%` : (status === 'completed' ? '100%' : 'En cours')}</span>
          </div>
          <Progress
            value={progress !== undefined ? progress : (status === 'completed' ? 100 : 50)}
            className="h-2"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowStatusCard;