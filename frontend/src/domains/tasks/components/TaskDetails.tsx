import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, UserPlus, Edit3, Trash, Play, XCircle, CheckCircle } from 'lucide-react';
import type { UpdateTaskRequest } from '@/lib/backend';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, Tabs, TabsContent, TabsList, TabsTrigger, Badge } from '@/shared/ui';
import { TaskStatus, TaskWithDetails } from '@/shared/types';
import { getUserFullName } from '@/shared/utils';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/shared/hooks/useAuth';
import { useInterventionData } from '@/domains/interventions';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { useTaskHistory } from '../hooks/useTaskHistory';
import { TaskChecklist } from './TaskChecklist';
import { TaskPhotos } from './TaskPhotos';
import { TaskHistory } from './TaskHistory';

interface TaskDetailsProps {
  task: TaskWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

export function TaskDetails({ task, open, onOpenChange, onTaskUpdated }: TaskDetailsProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('checklist');
  
  const { updateTask, deleteTask } = useTaskMutations();
  const { data: historyEntries, isLoading: historyLoading, error: historyError } = useTaskHistory(task?.id || '');
  const { data: interventionData } = useInterventionData(task?.id || '');
  const interventionId = interventionData?.id;

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

  const handleUpdateStatus = async (status: TaskStatus) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, data: createStatusUpdate(status) });
      onTaskUpdated();
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  const handleAssignToMe = async () => {
    if (!task || !user) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, data: createTechnicianUpdate(user.id) });
      onTaskUpdated();
    } catch (error) {
      console.error('Assign to me error:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await deleteTask.mutateAsync(task.id);
      onTaskUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete task error:', error);
    }
  };

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
                  onClick={handleAssignToMe}
                  disabled={updateTask.isPending}
                >
                  {updateTask.isPending ? (
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
                      disabled={deleteTask.isPending}
                    >
                      {deleteTask.isPending ? (
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
                        onClick={handleDeleteTask}
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
              <TaskPhotos taskId={task.id} interventionId={interventionId} />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <TaskHistory 
                taskId={task.id} 
                historyEntries={historyEntries}
                isLoading={historyLoading}
                error={historyError as Error | null}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
           {task.status === 'draft' && (
             <Button
               variant="secondary"
               onClick={() => handleUpdateStatus('in_progress')}
               disabled={updateTask.isPending}
             >
               {updateTask.isPending ? (
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
                 onClick={() => handleUpdateStatus('cancelled')}
                 disabled={updateTask.isPending}
               >
                 <XCircle className="h-4 w-4 mr-2" />
                 {t('tasks.markInvalid')}
               </Button>
               <Button
                 onClick={() => handleUpdateStatus('completed')}
                 disabled={updateTask.isPending}
               >
                 {updateTask.isPending ? (
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
