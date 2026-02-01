import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Task, TaskStatus } from '@/lib/backend';
import { TaskWithDetails } from '@/types/task.types';
import { TaskChecklist } from './TaskChecklist';
import { TaskPhotos } from './TaskPhotos';
import { TaskHistory } from './TaskHistory';
import { useTasks } from '@/hooks/useTasks';

interface TaskDetailsProps {
  task: TaskWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

export function TaskDetails({ task, open, onOpenChange, onTaskUpdated }: TaskDetailsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('checklist');
  const { deleteTask } = useTasks();

  // Update task status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: TaskStatus) => {
      if (!task) return;
      
      const response = await fetch(`/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onTaskUpdated();
    }
  });

  // Assign task to current user
  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;

      const response = await fetch(`/api/v1/tasks/${task.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned: true })
      });

      if (!response.ok) {
        throw new Error('Failed to assign task');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onTaskUpdated();
    }
  });

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      await deleteTask(task.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onTaskUpdated();
      onOpenChange(false); // Close the dialog after successful deletion
    }
  });

  if (!task) return null;

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'draft': 'outline',
    'pending': 'outline',
    'scheduled': 'secondary',
    'assigned': 'secondary',
    'in_progress': 'secondary',
    'completed': 'default',
    'cancelled': 'destructive',
    'on_hold': 'outline',
    'invalid': 'destructive',
    'archived': 'outline',
    'failed': 'destructive',
    'overdue': 'destructive',
    'paused': 'outline'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">
                {task.vehicle_make} {task.vehicle_model}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusVariant[task.status as TaskStatus]}>
                  {task.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  #{task.id.slice(0, 8)}
                </span>
              </div>
            </div>
             <div className="flex gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => assignToMeMutation.mutate()}
                 disabled={assignToMeMutation.isPending}
               >
                 {assignToMeMutation.isPending ? (
                   <Icons.Spinner className="h-4 w-4 animate-spin mr-2" />
                 ) : (
                   <Icons.UserPlus className="h-4 w-4 mr-2" />
                 )}
                 Assign to Me
               </Button>
               <Button variant="outline" size="sm">
                 <Icons.Edit3 className="h-4 w-4 mr-2" />
                 Edit
               </Button>
               <AlertDialog>
                 <AlertDialogTrigger asChild>
                   <Button
                     variant="destructive"
                     size="sm"
                     disabled={deleteTaskMutation.isPending}
                   >
                     {deleteTaskMutation.isPending ? (
                       <Icons.Spinner className="h-4 w-4 animate-spin mr-2" />
                     ) : (
                       <Icons.Trash className="h-4 w-4 mr-2" />
                     )}
                     Delete
                   </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                   <AlertDialogHeader>
                     <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
                     <AlertDialogDescription>
                       This action cannot be undone. This will permanently delete the task
                       and all associated data including photos, checklist items, workflow history,
                       and intervention records.
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                     <AlertDialogAction
                       onClick={() => deleteTaskMutation.mutate()}
                       className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                     >
                       Delete Task
                     </AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
             </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">PPF Zone</h4>
              <p>{task.ppf_zones?.join(', ') || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Technician</h4>
              <p>{task.technician?.name || task.technician_id || 'Unassigned'}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
              <p>{task.scheduled_date ? format(new Date(task.scheduled_date), 'PPp') : 'Not scheduled'}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="checklist" className="mt-6">
              <TaskChecklist taskId={task.id} />
            </TabsContent>
            
            <TabsContent value="photos" className="mt-6">
              <TaskPhotos taskId={task.id} />
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <TaskHistory taskId={task.id} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {(task.status === 'draft' || task.status === 'scheduled') && (
            <Button
              variant="secondary"
              onClick={() => updateStatusMutation.mutate('in_progress')}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Icons.Spinner className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Icons.Play className="h-4 w-4 mr-2" />
              )}
              Start Task
            </Button>
          )}
          
           {task.status === 'in_progress' && (
            <>
              <Button
                variant="outline"
                 onClick={() => updateStatusMutation.mutate('invalid')}
                disabled={updateStatusMutation.isPending}
              >
                <Icons.XCircle className="h-4 w-4 mr-2" />
                Mark as Invalid
              </Button>
              <Button
                 onClick={() => updateStatusMutation.mutate('completed')}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <Icons.Spinner className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Icons.CheckCircle className="h-4 w-4 mr-2" />
                )}
                Complete Task
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
