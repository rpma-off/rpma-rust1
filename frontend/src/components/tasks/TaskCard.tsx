import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/backend';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const statusColors = {
  quote: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  paused: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const priorityColors = {
  high: 'border-red-500',
  medium: 'border-yellow-500',
  low: 'border-green-500',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const statusColor = statusColors[task.status as keyof typeof statusColors] || 'bg-gray-500';
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || 'border-gray-400';

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow border-l-4',
        priorityColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {task.task_number}: {task.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {task.vehicle_plate || 'No vehicle'}
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn('text-xs ml-2 flex-shrink-0', statusColor, 'text-white')}
          >
            {task.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {task.customer_name && (
            <div className="truncate">
              Client: {task.customer_name}
            </div>
          )}
          {task.technician_id && (
            <div className="truncate">
              Technician: Assigned
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}