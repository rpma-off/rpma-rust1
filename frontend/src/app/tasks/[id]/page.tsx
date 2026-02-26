'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Settings } from 'lucide-react';
import { Button, TaskErrorBoundary } from '@/shared/ui';
import { TaskAttachments, TaskOverview, TaskTimeline, taskGateway, TaskWithDetails } from '@/domains/tasks';
import { TaskHeaderBand, TaskStepperBand, StatusBadge } from '@/domains/tasks/components/TaskDetail';
import EnhancedActionsCard from '@/domains/tasks/components/TaskActions/EnhancedActionsCard';
import { InterventionWorkflowService } from '@/domains/interventions/services/intervention-workflow.service';
import { bigintToNumber, handleError, LogDomain } from '@/shared/utils';
import { getTaskDisplayTitle } from '@/domains/tasks/utils/display';
import { toast } from 'sonner';
import { useAuth } from '@/domains/auth';
import { useTranslation } from '@/shared/hooks';

const QUICK_NAV_SECTIONS = [
  { id: 'task-actions', label: 'tasks.actions' },
  { id: 'task-overview', label: 'tasks.overview' },
  { id: 'task-attachments', label: 'tasks.attachments' },
  { id: 'task-timeline', label: 'tasks.history' },
  { id: 'task-admin', label: 'tasks.administration' }
] as const;

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const taskId = params.id as string;

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignedToCurrentUser, setIsAssignedToCurrentUser] = useState(false);
  const [isTaskAvailable, setIsTaskAvailable] = useState(true);
  const [isStartingIntervention, setIsStartingIntervention] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(QUICK_NAV_SECTIONS[0].id);

  const isInProgress = task?.status === 'in_progress';
  const isCompleted = task?.status === 'completed';
  const canStartTask = task?.status === 'pending' || task?.status === 'draft';

  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await taskGateway.getTaskById(taskId);

        if (result.error) {
          if (result.status === 404) {
            setError(t('tasks.notFound'));
            toast.error(t('tasks.notFound'));
          } else if (result.status === 403) {
            setError(t('tasks.unauthorized'));
            toast.error(t('tasks.unauthorized'));
          } else {
            const errorMessage = result.error || t('errors.loadFailed');
            setError(errorMessage);
            toast.error(errorMessage);
          }
          return;
        }

        setTask(result.data || null);

        if (result.data && user?.token) {
          try {
            const assignmentCheck = await taskGateway.checkTaskAssignment(result.data.id, user.user_id, user.token);
            setIsAssignedToCurrentUser(assignmentCheck.status === 'assigned');

            const availabilityCheck = await taskGateway.checkTaskAvailability(result.data.id, user.token);
            setIsTaskAvailable(availabilityCheck.status === 'available');
          } catch (validationErr) {
            const validationError = validationErr as Error;
            console.warn('Task validation failed:', {
              taskId: result.data.id,
              userId: user.user_id,
              error: validationError.message,
              code: (validationError as { code?: string }).code,
              details: (validationError as { details?: unknown }).details
            });

            if (validationError.message?.includes('authentication') || validationError.message?.includes('token')) {
              handleError(new Error(t('errors.sessionExpired')), 'Authentication failed during task validation', {
                domain: LogDomain.API,
                userId: user?.user_id,
                component: 'TaskValidation',
                showToast: true
              });
            } else if (validationError.message?.includes('authorization') || validationError.message?.includes('permission')) {
              handleError(new Error(t('errors.permissionDenied')), 'Authorization failed during task validation', {
                domain: LogDomain.API,
                userId: user?.user_id,
                component: 'TaskValidation',
                showToast: true
              });
            } else if (validationError.message?.includes('rate limit')) {
              handleError(new Error(t('errors.rateLimitExceeded')), 'Rate limit exceeded during task validation', {
                domain: LogDomain.API,
                userId: user?.user_id,
                component: 'TaskValidation',
                showToast: true
              });
            } else {
              console.warn('Task validation encountered an issue but continuing with defaults');
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('errors.connectionError');
        setError(errorMessage);
        handleError(err, 'Failed to fetch task details', {
          domain: LogDomain.TASK,
          component: 'TaskDetailPage',
          showToast: false
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, user?.token, user?.user_id, t]);

  useEffect(() => {
    if (!task || loading) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.2, 0.4, 0.7]
      }
    );

    QUICK_NAV_SECTIONS.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [task, loading]);

  const formatDate = (timestamp: bigint | string | null | undefined) => {
    try {
      if (!timestamp) return t('common.noData');
      const date = typeof timestamp === 'bigint' ? new Date(bigintToNumber(timestamp) || 0) : new Date(timestamp);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return t('errors.invalidDate');
    }
  };

  const progressValue = useMemo(() => {
    if (!task) return 0;

    let progress = 0;
    let total = 0;

    if (task.photos_before && task.photos_before.length > 0) {
      progress += 1;
      total += 1;
    }
    if (task.photos_after && task.photos_after.length > 0) {
      progress += 1;
      total += 1;
    }
    if (task.checklist_items && task.checklist_items.length > 0) {
      const completedItems = task.checklist_items.filter(item => item.is_completed).length;
      progress += completedItems;
      total += task.checklist_items.length;
    }

    return total > 0 ? Math.round((progress / total) * 100) : 0;
  }, [task]);

  const workflowSteps = useMemo(() => {
    const hasBeforePhotos = task?.photos_before && task.photos_before.length > 0;
    const hasAfterPhotos = task?.photos_after && task.photos_after.length > 0;
    const hasChecklist = task?.checklist_items && task.checklist_items.length > 0;
    const checklistCompleted = task?.checklist_items?.filter(item => item.is_completed).length === task?.checklist_items?.length;

    return [
      {
        id: 'photos_before',
        label: 'Photos Avant',
        status: (hasBeforePhotos ? 'completed' : 'pending') as 'completed' | 'in_progress' | 'pending',
        count: task?.photos_before?.length,
      },
      {
        id: 'workflow',
        label: 'Workflow',
        status: (isInProgress ? 'in_progress' : isCompleted ? 'completed' : 'pending') as 'completed' | 'in_progress' | 'pending',
      },
      {
        id: 'photos_after',
        label: 'Photos Après',
        status: (hasAfterPhotos ? 'completed' : 'pending') as 'completed' | 'in_progress' | 'pending',
        count: task?.photos_after?.length,
      },
      {
        id: 'checklist',
        label: 'Validation',
        status: (checklistCompleted ? 'completed' : hasChecklist ? 'in_progress' : 'pending') as 'completed' | 'in_progress' | 'pending',
        count: task?.checklist_items?.filter(item => item.is_completed).length,
      },
    ];
   }, [task, isInProgress, isCompleted]);

  const handlePrimaryAction = async () => {
    if (isCompleted) {
      router.push(`/tasks/${taskId}/completed`);
    } else if (isInProgress) {
      router.push(`/tasks/${taskId}/workflow/ppf`);
    } else if (canStartTask) {
      if (!task) return;
      if (!user?.token) {
        toast.error(t('errors.sessionExpired'));
        return;
      }

      try {
        setIsStartingIntervention(true);

        const interventionData = {
          task_id: task.id,
          intervention_number: null,
          intervention_type: 'ppf',
          priority: task.priority || 'medium',
          ppf_zones: task.ppf_zones || [],
          custom_ppf_zones: task.custom_ppf_zones || null,
          film_type: 'standard',
          film_brand: null,
          film_model: null,
          weather_condition: 'sunny',
          lighting_condition: 'natural',
          work_location: 'outdoor',
          temperature: null,
          humidity: null,
          technician_id: task.technician_id || user.user_id,
          assistant_ids: null,
          scheduled_start: new Date().toISOString(),
          estimated_duration: task.estimated_duration || 120,
          gps_coordinates: null,
          address: task.customer_address || null,
          notes: task.notes || null,
          customer_requirements: null,
          special_instructions: null
        };

        const response = await InterventionWorkflowService.startIntervention(task.id, interventionData, user.token);
        if (!response.success) {
          throw new Error(response.error?.message || 'Impossible de démarrer l\'intervention');
        }

        setTask(prev => (prev ? { ...prev, status: 'in_progress' } : prev));
        toast.success('Intervention démarrée avec succès');
        router.push(`/tasks/${taskId}/workflow/ppf`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur au démarrage de l\'intervention';
        toast.error(message);
        handleError(err, 'Failed to start intervention from task detail page', {
          domain: LogDomain.TASK,
          component: 'TaskDetailPage',
          showToast: false
        });
      } finally {
        setIsStartingIntervention(false);
      }
    }
  };

  const handleSecondaryAction = (actionId: string) => {
    switch (actionId) {
      case 'workflow':
        if (isInProgress || isCompleted) {
          router.push(`/tasks/${taskId}/workflow/ppf`);
        }
        break;
      case 'photos':
        router.push(`/tasks/${taskId}/photos`);
        break;
      case 'checklist':
        router.push(`/tasks/${taskId}/checklist`);
        break;
      case 'call':
        if (task?.customer_phone) {
          window.location.href = `tel:${task.customer_phone}`;
        }
        break;
      case 'message':
      case 'edit':
      case 'delay':
      case 'report':
        toast.info(`Action "${actionId}" en cours de développement`);
        break;
    }
  };

  const showMobileActionBar = !!task && task.status !== 'completed';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
          </div>
          <p className="text-foreground font-medium">{t('tasks.loadingDetails')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t('tasks.error')}</h2>
          <p className="text-border-light">{error}</p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-border text-border-light hover:text-foreground hover:border-primary transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-foreground font-medium">{t('tasks.notFound')}</p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-border text-border-light hover:text-foreground hover:border-primary transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TaskErrorBoundary>
      <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
        {/* Enhanced Header with TaskHeaderBand */}
        <TaskHeaderBand
          stepLabel={isCompleted ? 'TERMINÉ' : isInProgress ? 'EN COURS' : 'PLANIFIÉ'}
          title={getTaskDisplayTitle(task)}
          subtitle={
            `${task?.vehicle_make || ''} ${task?.vehicle_model || ''} ${task?.vehicle_year ? `· ${task.vehicle_year}` : ''} · ${task?.customer_name || 'Client non spécifié'}`
          }
          temperature={null}
          humidity={null}
          surfaceValue={task?.ppf_zones?.length ? `${task.ppf_zones.length}` : '—'}
          surfaceLabel="zones PPF"
          hasEnvironmentalData={false}
        />

        {/* Workflow Stepper */}
        <TaskStepperBand
          steps={workflowSteps}
          totalProgress={progressValue}
        />

        {/* Quick Navigation */}
        <div className="sticky top-0 z-30 bg-[hsl(var(--rpma-surface))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--rpma-surface))]/80 border-b border-[hsl(var(--rpma-border))] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.back()}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/5"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                 <StatusBadge status={(task.status as 'completed' | 'in_progress' | 'pending' | 'scheduled' | 'on_hold' | 'cancelled' | 'failed' | 'overdue' | 'draft') || 'pending'} size="sm" />
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_NAV_SECTIONS.map(section => (
                  <button
                    key={section.id}
                    type="button"
                     onClick={() => {
                       const target = document.getElementById(section.id);
                       if (!target) return;
                       const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                       target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' } as ScrollIntoViewOptions);
                     }}
                    aria-current={activeSection === section.id ? 'page' : undefined}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-full border transition-all duration-200 ${
                      activeSection === section.id
                        ? 'border-primary/40 bg-primary/15 text-primary shadow-sm'
                        : 'border-border/70 bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-background'
                    }`}
                  >
                    {t(section.label)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-7 lg:py-9 space-y-6 ${showMobileActionBar ? 'pb-28 md:pb-9' : ''}`}>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            {/* Main Content Area */}
            <main className="space-y-6">
              {/* Enhanced Actions Section */}
              <section id="task-actions" className="scroll-mt-28">
                <EnhancedActionsCard
                  task={task}
                  isAssignedToCurrentUser={isAssignedToCurrentUser}
                  isAvailable={isTaskAvailable}
                  canStartTask={task.status === 'pending' || task.status === 'draft'}
                  onPrimaryAction={handlePrimaryAction}
                  onSecondaryAction={handleSecondaryAction}
                  isPending={isStartingIntervention}
                />
              </section>

              {/* Task Overview */}
              <section id="task-overview" className="scroll-mt-28 rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <TaskOverview task={task} defaultExpandedSections={['notes-operationnelles']} />
              </section>

              {/* Task Attachments */}
              <section id="task-attachments" className="scroll-mt-28 rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <TaskAttachments taskId={taskId} />
              </section>

              {/* Task Timeline */}
              <section id="task-timeline" className="scroll-mt-28 rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <TaskTimeline taskId={taskId} />
              </section>
            </main>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Admin Info */}
              <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-accent" />
                  {t('tasks.administration')}
                </h3>

                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors">
                    <dt className="text-muted-foreground">{t('tasks.taskId')}</dt>
                    <dd className="font-mono text-foreground text-xs">{task.id?.slice(-8) || t('common.noData')}</dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors">
                    <dt className="text-muted-foreground">{t('tasks.createdOn')}</dt>
                    <dd className="text-foreground">{formatDate(task.created_at as unknown as string)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors">
                    <dt className="text-muted-foreground">{t('tasks.updated')}</dt>
                    <dd className="text-foreground">{formatDate(task.updated_at as unknown as string)}</dd>
                  </div>
                  {task.external_id && (
                    <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors">
                      <dt className="text-muted-foreground">{t('tasks.externalRef')}</dt>
                      <dd className="text-foreground">{task.external_id}</dd>
                    </div>
                  )}
                  {task.task_number && (
                    <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors">
                      <dt className="text-muted-foreground">{t('tasks.taskNum')}</dt>
                      <dd className="text-foreground">{task.task_number}</dd>
                    </div>
                  )}
                  {task.template_id && (
                    <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors">
                      <dt className="text-muted-foreground">{t('tasks.template')}</dt>
                      <dd className="font-mono text-foreground text-xs">{task.template_id.slice(-8)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </aside>
          </div>
        </div>

        {showMobileActionBar && (
          <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--rpma-surface))]/85 pb-[calc(env(safe-area-inset-bottom)+8px)] px-3 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <EnhancedActionsCard
              task={task}
              isAssignedToCurrentUser={isAssignedToCurrentUser}
              isAvailable={isTaskAvailable}
              canStartTask={task.status === 'pending' || task.status === 'draft'}
              onPrimaryAction={handlePrimaryAction}
              onSecondaryAction={handleSecondaryAction}
              isPending={isStartingIntervention}
              compact
              mobileDocked
            />
          </div>
        )}
      </div>
    </TaskErrorBoundary>
  );
}


