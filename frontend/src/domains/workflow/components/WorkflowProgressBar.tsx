'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock } from 'lucide-react';

export interface WorkflowProgressBarProps {
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  }>;
  currentStepIndex?: number;
}

export function WorkflowProgressBar({ steps, currentStepIndex }: WorkflowProgressBarProps) {
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'in_progress':
        return 'text-blue-500';
      case 'skipped':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const getStatusIcon = (status: string, index: number) => {
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5" />;
    }
    if (index === currentStepIndex) {
      return <Clock className="w-5 h-5 animate-pulse" />;
    }
    return <div className="w-5 h-5 rounded-full border-2 border-current" />;
  };

  return (
    <Card className="rpma-shell">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">
                {completedCount} / {totalCount} étapes complétées
              </span>
            </div>
            <span className="text-sm font-bold text-[hsl(var(--rpma-primary))]">{progress.toFixed(0)}%</span>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 p-2 rounded-md ${
                  index === currentStepIndex
                    ? 'bg-[hsl(var(--rpma-primary-light))]'
                    : 'bg-[hsl(var(--rpma-surface-light))]'
                }`}
              >
                <div className={getStatusColor(step.status)}>
                  {getStatusIcon(step.status, index)}
                </div>
                <span className="text-xs truncate">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
