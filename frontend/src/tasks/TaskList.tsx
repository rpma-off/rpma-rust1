import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { TaskWithDetails } from '@/types/task.types';
import { TaskStatus } from '@/lib/backend';
import { TaskFilters } from './TaskFilters';
import { TaskDetails } from './TaskDetails';
import { Icons } from '@/components/icons';
import { useTasks } from '@/hooks/useTasks';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'draft': 'outline',
  'pending': 'outline',
  'scheduled': 'secondary',
  'assigned': 'secondary',
  'in_progress': 'secondary',
  'paused': 'outline',
  'on_hold': 'outline',
  'completed': 'default',
  'cancelled': 'destructive',
  'failed': 'destructive',
  'overdue': 'destructive',
  'invalid': 'destructive',
  'archived': 'outline'
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

  // Use the useTasks hook for proper cache management
  const { tasks, loading: isLoading, error, updateFilters: setTasksFilters, deleteTask: _deleteTask } = useTasks({
    status: filters.status !== 'all' ? filters.status as TaskStatus : undefined,
    assignedTo: filters.technicianId || undefined,
    search: filters.ppfZone ? `ppf_zones:${filters.ppfZone}` : undefined,
    autoFetch: true
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
          <Icons.AlertCircle className="h-5 w-5 text-red-400" />
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
          <Icons.Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

       <TaskFilters
         filters={filters}
         onFilterChange={(newFilters) => {
           setFilters(newFilters);
           setTasksFilters({
             status: newFilters.status !== 'all' ? newFilters.status as TaskStatus : undefined,
             assignedTo: newFilters.technicianId || undefined,
             search: newFilters.ppfZone ? `ppf_zones:${newFilters.ppfZone}` : undefined,
           });
         }}
       />

      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle>Task List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>PPF Zone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks?.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {task.vehicle_make} {task.vehicle_model}
                  </TableCell>
                  <TableCell>{task.ppf_zones?.join(', ') || 'N/A'}</TableCell>
                   <TableCell>
                     <Badge variant={statusVariant[task.status as keyof typeof statusVariant] || 'outline'}>
                       {task.status}
                     </Badge>
                   </TableCell>
                  <TableCell>
                    {task.technician?.name || task.technician_id || 'Unassigned'}
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
                      <Icons.Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {tasks?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tasks found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
