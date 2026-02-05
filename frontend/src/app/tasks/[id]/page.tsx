'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskWithDetails, TaskService } from '@/lib/services/entities/task.service';
import { TaskStatus } from '@/lib/backend';
import { bigintToNumber } from '@/lib/utils/timestamp-conversion';
import { toast } from 'sonner';
import { TaskErrorBoundary } from '@/error-boundaries/TaskErrorBoundary';
import { TaskHeader } from '@/components/tasks/TaskOverview';
import { TaskOverview } from '@/components/tasks/TaskOverview';
import { ActionsCard } from '@/components/tasks/TaskActions';
import { TaskTimeline } from '@/components/tasks/TaskTimeline';
import { TaskAttachments } from '@/components/tasks/TaskAttachments';
import { useTasks } from '@/hooks/useTasks';
import { getTaskDisplayTitle } from '@/lib/utils/task-display';
import { handleError } from '@/lib/utils/error-handler';
import { LogDomain } from '@/lib/logging/types';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';



export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignedToCurrentUser, setIsAssignedToCurrentUser] = useState(false);
  const [isTaskAvailable, setIsTaskAvailable] = useState(true);

  const { updateTaskStatus: updateStatus } = useTasks();

  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);

        const taskService = TaskService.getInstance();
        const result = await taskService.getTaskById(taskId);

        if (result.error) {
          if (result.status === 404) {
            setError('Tâche non trouvée');
            toast.error('Tâche non trouvée');
          } else if (result.status === 403) {
            setError('Accès non autorisé Ã  cette tâche');
            toast.error('Accès non autorisé Ã  cette tâche');
          } else {
            const errorMessage = result.error || 'Erreur lors du chargement de la tâche';
            setError(errorMessage);
            toast.error(errorMessage);
          }
          return;
        }

        setTask(result.data || null);

        // Validate task assignment and availability
        if (result.data && user?.token) {
          try {
            const assignmentCheck = await ipcClient.tasks.checkTaskAssignment(result.data.id, user.user_id, user.token);
            setIsAssignedToCurrentUser((assignmentCheck as any)?.assigned || false);

            const availabilityCheck = await ipcClient.tasks.checkTaskAvailability(result.data.id, user.token);
            setIsTaskAvailable((availabilityCheck as any)?.available !== false);
          } catch (validationErr) {
            // Enhanced error handling for task validation failures
            const error = validationErr as Error;
            console.warn('Task validation failed:', {
              taskId: result.data.id,
              userId: user.user_id,
              error: error.message,
              code: (error as any).code,
              details: (error as any).details
            });

            // Show user-friendly error message for critical validation failures
            if (error.message?.includes('authentication') || error.message?.includes('token')) {
              handleError(new Error('Your session has expired. Please log in again.'), 'Authentication failed during task validation', {
                domain: LogDomain.API,
                userId: user?.user_id,
                component: 'TaskValidation',
                showToast: true
              });
              // Could trigger logout here if needed
            } else if (error.message?.includes('authorization') || error.message?.includes('permission')) {
              handleError(new Error('You do not have permission to view task assignment details.'), 'Authorization failed during task validation', {
                domain: LogDomain.API,
                userId: user?.user_id,
                component: 'TaskValidation',
                showToast: true
              });
            } else if (error.message?.includes('rate limit')) {
              handleError(new Error('Too many requests. Please wait a moment before trying again.'), 'Rate limit exceeded during task validation', {
                domain: LogDomain.API,
                userId: user?.user_id,
                component: 'TaskValidation',
                showToast: true
              });
            } else {
              // For other errors, just log but don't show to user
              console.warn('Task validation encountered an issue but continuing with defaults');
            }

            // Keep default values on validation failure
          }
        }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
          setError(errorMessage);
          handleError(err, 'Failed to fetch task details', {
            domain: LogDomain.TASK,
            component: 'TaskDetailPage',
            showToast: false // Already showing toast above
          });
        } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, user?.token, user?.user_id]);



  const formatDate = (timestamp: bigint | string | null | undefined) => {
    try {
      if (!timestamp) return 'N/A';
      const date = typeof timestamp === 'bigint'
        ? new Date(bigintToNumber(timestamp) || 0)
        : new Date(timestamp);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-foreground">Chargement des détails de la tâche...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Erreur</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-[hsl(var(--rpma-border))] text-muted-foreground hover:text-foreground hover:border-[hsl(var(--rpma-teal))]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-foreground">Tâche non trouvée</p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-[hsl(var(--rpma-border))] text-muted-foreground hover:text-foreground hover:border-[hsl(var(--rpma-teal))]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }



  return (
    <TaskErrorBoundary>
      <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
       {/* Enhanced Header */}
       <div className="bg-[hsl(var(--rpma-surface))] backdrop-blur-sm border-b border-[hsl(var(--rpma-border))]">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
           <div className="flex items-center gap-3 md:gap-4">
             <Button
               onClick={() => router.back()}
               variant="ghost"
               size="sm"
               className="text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))]/30 hover:border-[hsl(var(--rpma-teal))]/50 transition-all duration-200"
             >
               <ArrowLeft className="w-4 h-4 mr-2" />
               <span className="hidden sm:inline">Retour</span>
             </Button>

             <div className="h-5 w-px bg-[hsl(var(--rpma-surface))]0 hidden sm:block" />

             <div className="flex-1 min-w-0">
               <TaskHeader
                 task={task}
                 statusInfo={{
                   label: task.status === 'completed' ? 'Terminée' :
                          task.status === 'in_progress' ? 'En cours' :
                          task.status === 'pending' ? 'En attente' : 'Brouillon',
                   color: task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' :
                          task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                          task.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                          'bg-gray-500/20 text-gray-300 border-gray-500/50'
                 }}
                  isAssignedToCurrentUser={user ? task.technician_id === user.user_id : false}
               />
             </div>

             {/* Mobile Status Badge */}
             <div className="block sm:hidden">
               <Badge
                 variant="outline"
                 className={`px-2 py-1 text-xs font-medium ${
                   task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' :
                   task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                   task.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                   'bg-gray-500/20 text-gray-300 border-gray-500/50'
                 }`}
               >
                 {task.status === 'completed' ? 'âœ“' :
                  task.status === 'in_progress' ? 'âŸ³' :
                  task.status === 'pending' ? 'â³' : '?'}
               </Badge>
             </div>
           </div>
         </div>
       </div>

       {/* Enhanced Breadcrumbs */}
       <div className="bg-[hsl(var(--rpma-surface))] border-b border-[hsl(var(--rpma-border))]">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-3">
           <nav className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
             <a href="/dashboard" className="flex items-center hover:text-foreground transition-colors p-1 rounded hover:bg-[hsl(var(--rpma-surface))]">
               <Home className="w-3 h-3 md:w-4 md:h-4 mr-1" />
               <span className="hidden sm:inline">Dashboard</span>
             </a>
             <span className="text-border/50">/</span>
             <a href="/tasks" className="hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-[hsl(var(--rpma-surface))]">
               Tâches
             </a>
             <span className="text-border/50">/</span>
             <span className="text-foreground font-medium px-2 py-1 bg-[hsl(var(--rpma-surface))] rounded">
               {getTaskDisplayTitle(task)}
             </span>
           </nav>
         </div>
       </div>

       {/* Enhanced Task Status Hero */}
       <div className="bg-[hsl(var(--rpma-surface))] border-b border-[hsl(var(--rpma-border))]">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
             {/* Enhanced Task Title and Status */}
             <div className="flex-1 min-w-0">
               <div className="flex flex-col gap-3">
                 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                   <div className="flex-1 min-w-0">
                     <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                       {getTaskDisplayTitle(task)}
                     </h1>
                     <p className="text-sm md:text-base text-muted-foreground mt-1 flex items-center gap-2">
                       <svg className="w-4 h-4 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                       </svg>
                       {task.vehicle_make && task.vehicle_model
                         ? `${task.vehicle_make} ${task.vehicle_model}`
                         : 'Véhicule non spécifié'}
                       {task.vehicle_plate && ` â€¢ ${task.vehicle_plate}`}
                     </p>
                   </div>

                   {/* Status Badge - Desktop */}
                   <div className="hidden sm:block">
                     <Badge
                       variant="outline"
                       className={`px-3 py-1.5 text-sm font-semibold ${
                         task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' :
                         task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                         task.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                         'bg-gray-500/20 text-gray-300 border-gray-500/50'
                       }`}
                     >
                       {task.status === 'completed' ? 'âœ“ Terminée' :
                        task.status === 'in_progress' ? 'âŸ³ En cours' :
                        task.status === 'pending' ? 'â³ En attente' : '? Autre'}
                     </Badge>
                   </div>
                 </div>

                 {/* Client Info */}
                 {task.customer_name && (
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                     <svg className="w-4 h-4 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                     </svg>
                     <span>Client: {task.customer_name}</span>
                   </div>
                 )}
               </div>
             </div>

             {/* Enhanced Key Metrics */}
             <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8">
               {task.scheduled_date && (
                 <div className="text-center min-w-0 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                   <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Planifiée</p>
                   <p className="text-sm font-semibold text-foreground">{formatDate(task.scheduled_date)}</p>
                 </div>
               )}
               {task.estimated_duration_minutes && (
                 <div className="text-center min-w-0 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                   <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Durée estimée</p>
                   <p className="text-sm font-semibold text-foreground">{Math.round(task.estimated_duration_minutes / 60)}h</p>
                 </div>
               )}
               <div className="text-center min-w-0 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                 <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Créée</p>
                 <p className="text-sm font-semibold text-foreground">{formatDate(task.created_at)}</p>
               </div>

               {/* Progress Indicator - Mobile */}
               <div className="block sm:hidden text-center min-w-0 p-3 bg-primary/10 rounded-lg border border-primary/20">
                 <p className="text-xs text-primary uppercase tracking-wide font-medium mb-1">Statut</p>
                 <p className="text-sm font-semibold text-primary">
                   {task.status === 'completed' ? 'Terminée' :
                    task.status === 'in_progress' ? 'En cours' :
                    task.status === 'pending' ? 'En attente' : 'Brouillon'}
                 </p>
               </div>
             </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

            {/* Main Content */}
            <div className="xl:col-span-2 space-y-4 md:space-y-6 lg:space-y-8 order-2 xl:order-1">
              <div className="bg-[hsl(var(--rpma-surface))] rounded-xl border border-[hsl(var(--rpma-border))] p-4 md:p-6">
                <TaskOverview task={task} />
              </div>

              <div className="bg-[hsl(var(--rpma-surface))] rounded-xl border border-[hsl(var(--rpma-border))] p-4 md:p-6">
                <TaskAttachments taskId={taskId} />
              </div>

              <div className="bg-[hsl(var(--rpma-surface))] rounded-xl border border-[hsl(var(--rpma-border))] p-4 md:p-6">
                <TaskTimeline taskId={taskId} />
              </div>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-4 md:space-y-6 order-1 xl:order-2">
              <div className="bg-[hsl(var(--rpma-surface))] rounded-xl border border-[hsl(var(--rpma-border))] p-4 md:p-6">
                <ActionsCard
                  task={task}
                  isAssignedToCurrentUser={isAssignedToCurrentUser}
                   isAvailable={isTaskAvailable}
                  canStartTask={task.status === 'pending' || task.status === 'draft'}
                />
              </div>

              {/* Quick Stats - Mobile Enhancement */}
              <div className="block xl:hidden bg-[hsl(var(--rpma-surface))] rounded-xl border border-[hsl(var(--rpma-border))] p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Aperçu rapide</h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-foreground">
                      {task.ppf_zones?.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Zones PPF</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-primary">
                      {task.status === 'completed' ? '100%' : '0%'}
                    </p>
                    <p className="text-xs text-muted-foreground">Progression</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
       </div>
    </div>
    </TaskErrorBoundary>
  );
}
