import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Edit3, Trash, Play, XCircle, CheckCircle } from 'lucide-react';
import { TaskStatus, UpdateTaskRequest } from '@/lib/backend';
import { getUserFullName } from '@/lib/types';
import { TaskWithDetails } from '@/types/task.types';
import { TaskChecklist } from './TaskChecklist';
import { TaskPhotos } from './TaskPhotos';
import { TaskHistory } from './TaskHistory';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { taskService } from '@/lib/services/entities/task.service';
import { useTranslation } from '@/hooks/useTranslation';

interface TaskDetailsProps {
  task: TaskWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

export function TaskDetails({ task, open, onOpenChange, onTaskUpdated }: TaskDetailsProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('checklist');
  const { deleteTask } = useTasks();

  // Helper functions to create proper UpdateTaskRequest objects
  const createStatusUpdate = (status: TaskStatus): UpdateTaskRequest => ({
    id: null,
    title: null,
    description: null,
    priority: null,
    status,
    vehicle_plate: null,
    vehicle_model: null,
    vehicle_year: null,
    vehicle_make: null,
    vin: null,
    ppf_zones: null,
    custom_ppf_zones: null,
    client_id: null,
    customer_name: null,
    customer_email: null,
    customer_phone: null,
    customer_address: null,
    external_id: null,
    lot_film: null,
    checklist_completed: null,
    scheduled_date: null,
    start_time: null,
    end_time: null,
    date_rdv: null,
    heure_rdv: null,
    template_id: null,
    workflow_id: null,
    estimated_duration: null,
    notes: null,
    tags: null,
    technician_id: null
  });

  const createTechnicianUpdate = (technician_id: string): UpdateTaskRequest => ({
    id: null,
    title: null,
    description: null,
    priority: null,
    status: null,
    vehicle_plate: null,
    vehicle_model: null,
    vehicle_year: null,
    vehicle_make: null,
    vin: null,
    ppf_zones: null,
    custom_ppf_zones: null,
    client_id: null,
    customer_name: null,
    customer_email: null,
    customer_phone: null,
    customer_address: null,
    external_id: null,
    lot_film: null,
    checklist_completed: null,
    scheduled_date: null,
    start_time: null,
    end_time: null,
    date_rdv: null,
    heure_rdv: null,
    template_id: null,
    workflow_id: null,
    estimated_duration: null,
    notes: null,
    tags: null,
    technician_id
  });

  // Update task status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: TaskStatus) => {
      if (!task || !user?.token) return;

      return await taskService.updateTask(task.id, createStatusUpdate(status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onTaskUpdated();
    }
  });

  // Assign task to current user
  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!task || !user?.token) return;

      return await taskService.updateTask(task.id, createTechnicianUpdate(user.id));
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

  const statusVariant: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'draft': 'outline',
    'scheduled': 'secondary',
    'in_progress': 'secondary',
    'on_hold': 'outline',
    'completed': 'default',
    'cancelled': 'destructive',
    'pending': 'outline',
    'invalid': 'destructive',
    'archived': 'outline',
    'failed': 'destructive',
    'overdue': 'destructive',
    'assigned': 'secondary',
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
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {t('tasks.assignToMe')}
                </Button>
                <Button variant="outline" size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteTaskMutation.isPending}
                    >
                      {deleteTaskMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash className="h-4 w-4 mr-2" />
                      )}
                      {t('common.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('tasks.deleteConfirm.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('tasks.deleteConfirm.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTaskMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('tasks.deleteTask')}
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
               <h4 className="text-sm font-medium text-muted-foreground">{t('tasks.ppfZone')}</h4>
               <p>{task.ppf_zones?.join(', ') || 'N/A'}</p>
             </div>
             <div className="space-y-1">
               <h4 className="text-sm font-medium text-muted-foreground">{t('tasks.assignedTechnician')}</h4>
               <p>{task.technician ? getUserFullName(task.technician) : t('tasks.unassigned')}</p>
             </div>
             <div className="space-y-1">
               <h4 className="text-sm font-medium text-muted-foreground">{t('tasks.scheduledDate')}</h4>
               <p>{task.scheduled_date ? format(new Date(task.scheduled_date), 'PPp') : t('tasks.notScheduled')}</p>
             </div>
           </div>

           <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
             <TabsList className="grid w-full grid-cols-3">
               <TabsTrigger value="checklist">{t('tasks.tabs.checklist')}</TabsTrigger>
               <TabsTrigger value="photos">{t('tasks.tabs.photos')}</TabsTrigger>
               <TabsTrigger value="history">{t('tasks.tabs.history')}</TabsTrigger>
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
           {task.status === 'draft' && (
             <Button
               variant="secondary"
               onClick={() => updateStatusMutation.mutate('in_progress')}
               disabled={updateStatusMutation.isPending}
             >
               {updateStatusMutation.isPending ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <Play className="h-4 w-4 mr-2" />
               )}
               {t('tasks.startTask')}
             </Button>
           )}

           {task.status === 'in_progress' && (
             <>
               <Button
                 variant="outline"
                 onClick={() => updateStatusMutation.mutate('cancelled')}
                 disabled={updateStatusMutation.isPending}
               >
                 <XCircle className="h-4 w-4 mr-2" />
                 {t('tasks.markInvalid')}
               </Button>
               <Button
                 onClick={() => updateStatusMutation.mutate('completed')}
                 disabled={updateStatusMutation.isPending}
               >
                 {updateStatusMutation.isPending ? (
                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                 ) : (
                   <CheckCircle className="h-4 w-4 mr-2" />
                 )}
                 {t('tasks.completeTask')}
               </Button>
             </>
           )}
         </div>
      </DialogContent>
    </Dialog>
  );
}