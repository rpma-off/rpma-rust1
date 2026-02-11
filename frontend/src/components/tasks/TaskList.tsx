import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Eye, AlertCircle } from 'lucide-react';

import { TaskStatus } from '@/lib/backend';
import { getUserFullName } from '@/lib/types';
import { TaskWithDetails } from '@/types/task.types';
import { TaskFilters } from './TaskFilters';
import { TaskDetails } from './TaskDetails';
import { useTasks } from '@/hooks/useTasks';

const statusVariant: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'draft': 'outline',
  'scheduled': 'secondary',
  'in_progress': 'secondary',
  'on_hold': 'outline',
  'completed': 'default',
  'cancelled': 'outline',
  'pending': 'outline',
  'invalid': 'destructive',
  'archived': 'outline',
  'failed': 'destructive',
  'overdue': 'destructive',
  'assigned': 'secondary',
  'paused': 'outline'
};

export function TaskList() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: 'all',
    technicianId: '',
    ppfZone: ''
  });
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Use the useTasks hook for proper cache management
  const { tasks, loading: isLoading, error, updateFilters: setTasksFilters } = useTasks({
    status: filters.status !== 'all' ? filters.status as TaskStatus : undefined,
    assignedTo: filters.technicianId || undefined,
    search: filters.ppfZone ? `ppf_zones:${filters.ppfZone}` : undefined,
    autoFetch: true
  });

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setTasksFilters({
      status: newFilters.status !== 'all' ? newFilters.status as TaskStatus : undefined,
      assignedTo: newFilters.technicianId || undefined,
      search: newFilters.ppfZone ? `ppf_zones:${newFilters.ppfZone}` : undefined,
    });
  }, [setTasksFilters]);

  const virtualizer = useVirtualizer({
    count: tasks?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading tasks
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

        <TaskFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />

      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle>Task List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={parentRef}
            className="h-96 overflow-auto"
            style={{
              contain: 'strict',
            }}
          >
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>PPF Zone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const task = tasks![virtualItem.index];
                  return (
                    <TableRow
                      key={task.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <TableCell className="font-medium">
                        {task.vehicle_make} {task.vehicle_model}
                      </TableCell>
                      <TableCell>{task.ppf_zones?.join(', ') || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[task.status as TaskStatus]}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.technician ? getUserFullName(task.technician) : 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {task.scheduled_date
                          ? new Date(task.scheduled_date).toLocaleDateString()
                          : 'Not scheduled'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {tasks?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tasks found. Try adjusting your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TaskDetails
        task={selectedTask}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onTaskUpdated={() => {
          // Refetch tasks when a task is updated
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }}
      />
    </div>
  );
}
