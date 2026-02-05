import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import { TaskHistory } from './TaskHistory';

interface TaskTimelineProps {
  taskId: string;
}

export function TaskTimeline({ taskId }: TaskTimelineProps) {
  return (
    <div className="bg-muted border border-border rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <History className="w-5 h-5 text-[hsl(var(--rpma-teal))]" />
          <h2 className="text-xl font-semibold text-foreground">Historique des activitÃ©s</h2>
        </div>
        <TaskHistory taskId={taskId} />
      </div>
    </div>
  );
}
