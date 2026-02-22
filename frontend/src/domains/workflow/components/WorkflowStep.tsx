'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Play, Pause, SkipForward } from 'lucide-react';
import type { WorkflowStep } from '@/lib/backend';

export interface WorkflowStepProps {
  step: WorkflowStep;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  isActive?: boolean;
  onActivate?: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function WorkflowStep({ step, status, isActive, onActivate, onComplete, onSkip }: WorkflowStepProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'skipped':
        return <SkipForward className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="bg-green-500/10 text-green-500">Complété</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-500">En cours</Badge>;
      case 'skipped':
        return <Badge variant="outline">Ignoré</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  return (
    <Card className={`rpma-shell ${isActive ? 'ring-2 ring-[hsl(var(--rpma-primary))]' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {getStatusIcon()}
            <div className="flex-1">
              <CardTitle className="text-lg">{step.name}</CardTitle>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      {isActive && step.data && (
        <CardContent>
          <div className="space-y-3">
            {step.data.notes && (
              <div>
                <h4 className="text-sm font-medium mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{step.data.notes as string}</p>
              </div>
            )}
            <div className="flex gap-2">
              {status === 'pending' && onActivate && (
                <button
                  onClick={onActivate}
                  className="px-3 py-2 text-sm bg-[hsl(var(--rpma-primary))] text-white rounded-md hover:bg-[hsl(var(--rpma-primary-dark))]"
                >
                  Commencer
                </button>
              )}
              {status === 'in_progress' && onComplete && (
                <button
                  onClick={onComplete}
                  className="px-3 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Terminer
                </button>
              )}
              {status !== 'completed' && status !== 'skipped' && onSkip && (
                <button
                  onClick={onSkip}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Ignorer
                </button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
