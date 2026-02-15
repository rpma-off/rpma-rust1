'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Home, Calendar, Car, User, Gauge, CheckCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskWithDetails, TaskService } from '@/lib/services/entities/task.service';
import { bigintToNumber } from '@/lib/utils/timestamp-conversion';
import { toast } from 'sonner';
import { TaskErrorBoundary } from '@/error-boundaries/TaskErrorBoundary';
import { TaskOverview } from '@/components/tasks/TaskOverview';
import { ActionsCard } from '@/components/tasks/TaskActions';
import { TaskTimeline } from '@/components/tasks/TaskTimeline';
import { TaskAttachments } from '@/components/tasks/TaskAttachments';
import { getTaskDisplayTitle } from '@/lib/utils/task-display';
import { handleError } from '@/lib/utils/error-handler';
import { LogDomain } from '@/lib/logging/types';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { useTranslation } from '@/hooks/useTranslation';
import { taskStatusLabels } from '@/lib/i18n/status-labels';

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
  const [activeSection, setActiveSection] = useState<string>(QUICK_NAV_SECTIONS[0].id);

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
            const assignmentCheck = await ipcClient.tasks.checkTaskAssignment(result.data.id, user.user_id, user.token);
            setIsAssignedToCurrentUser((assignmentCheck as { assigned?: boolean })?.assigned || false);

            const availabilityCheck = await ipcClient.tasks.checkTaskAvailability(result.data.id, user.token);
            setIsTaskAvailable((availabilityCheck as { available?: boolean })?.available !== false);
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

  const statusMeta = {
    label: taskStatusLabels[task?.status || ''] || task?.status || t('tasks.statusDraft'),
    color:
      task?.status === 'completed'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
        : task?.status === 'in_progress'
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
          : task?.status === 'pending'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
            : 'bg-gray-500/20 text-gray-300 border-gray-500/50'
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
        <div className="border-b border-[hsl(var(--rpma-border))] bg-gradient-to-br from-[hsl(var(--rpma-surface))] via-[hsl(var(--rpma-surface))] to-background/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => router.back()}
                  variant="ghost"
                  size="sm"
                  className="text-border-light hover:text-foreground hover:bg-border/20 border border-border/30 hover:border-primary/50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('common.back')}</span>
                </Button>

                <nav className="hidden sm:flex items-center gap-2 text-xs md:text-sm text-border-light">
                  <a href="/dashboard" className="flex items-center hover:text-foreground transition-colors p-1 rounded hover:bg-border/20">
                    <Home className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    <span>{t('nav.dashboard')}</span>
                  </a>
                  <span className="text-border/50">/</span>
                  <a href="/tasks" className="hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-border/20">{t('nav.tasks')}</a>
                  <span className="text-border/50">/</span>
                  <span className="text-foreground font-medium px-2 py-1 bg-border/20 rounded">{getTaskDisplayTitle(task)}</span>
                </nav>
              </div>

              <Badge variant="outline" className={`px-3 py-1.5 text-xs sm:text-sm font-semibold ${statusMeta.color}`}>
                {statusMeta.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
              <div className="space-y-3 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight">{getTaskDisplayTitle(task)}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-border-light">
                  <span className="inline-flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-accent" />
                    {task.vehicle_make && task.vehicle_model ? `${task.vehicle_make} ${task.vehicle_model}` : t('tasks.vehicleNotSpecified')}
                  </span>
                  {task.vehicle_plate && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gradient-to-br from-border/20 to-border/30 text-foreground font-semibold border border-border/40 shadow-sm">
                      {task.vehicle_plate}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-accent" />{t('tasks.planned')}: {formatDate(task.scheduled_date)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-border-light"><User className="w-3.5 h-3.5 text-accent" />
                    {t('tasks.client')}: <span className="text-foreground font-medium">{task.customer_name || t('tasks.customerNotSpecified')}</span>
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-border-light">
                  <span className="inline-flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-accent" /> {t('tasks.progress')}</span>
                  <span className="text-foreground font-semibold text-sm tabular-nums">{progressValue}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-border/60 overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-[hsl(var(--rpma-teal))] to-accent transition-all duration-500 ease-out" style={{ width: `${progressValue}%` }} />
                </div>
                {progressValue === 100 && (
                  <p className="text-xs text-accent font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t('tasks.completed')}
                  </p>
                )}
              </div>
            </div>

            <div className="sticky top-16 z-20 -mx-1 px-1 py-1 rounded-xl bg-[hsl(var(--rpma-surface))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--rpma-surface))]/80 border border-[hsl(var(--rpma-border))] shadow-sm">
              <div className="flex flex-wrap gap-2">
                {QUICK_NAV_SECTIONS.map(section => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      const target = document.getElementById(section.id);
                      if (!target) return;
                      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
                    }}
                    aria-current={activeSection === section.id ? 'page' : undefined}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-full border transition-all duration-200 ${
                      activeSection === section.id
                        ? 'border-primary/40 bg-primary/15 text-primary shadow-sm'
                        : 'border-border/70 bg-background/70 text-border-light hover:text-foreground hover:border-primary/30 hover:bg-background'
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
          <section id="task-actions" className="hidden md:block rounded-xl border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] p-4 md:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200">
            <ActionsCard
              task={task}
              isAssignedToCurrentUser={isAssignedToCurrentUser}
              isAvailable={isTaskAvailable}
              canStartTask={task.status === 'pending' || task.status === 'draft'}
            />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            <main className="xl:col-span-2 space-y-4 md:space-y-6 lg:space-y-8">
              <section id="task-overview" className="scroll-mt-28 rounded-xl border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200">
                <TaskOverview task={task} defaultExpandedSections={['notes-operationnelles']} />
              </section>

              <section id="task-attachments" className="scroll-mt-28 rounded-xl border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200">
                <TaskAttachments taskId={taskId} />
              </section>

              <section id="task-timeline" className="scroll-mt-28 rounded-xl border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] p-4 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200">
                <TaskTimeline taskId={taskId} />
              </section>
            </main>

            <aside id="task-admin" className="space-y-4 md:space-y-6">
              <div className="xl:sticky xl:top-24 rounded-xl border border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-accent" />
                  {t('tasks.administration')}
                </h3>

                <details className="group md:hidden">
                  <summary className="list-none cursor-pointer rounded-lg border border-border/60 px-3 py-2 text-sm text-border-light hover:text-foreground hover:border-primary/40 transition-all duration-200 hover:bg-background/50">
                    {t('tasks.showAdminInfo')}
                  </summary>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div className="flex justify-between gap-3 py-1"><dt className="text-border-light">{t('tasks.taskId')}</dt><dd className="font-mono text-foreground text-xs">{task.id?.slice(-8) || t('common.noData')}</dd></div>
                    <div className="flex justify-between gap-3 py-1"><dt className="text-border-light">{t('tasks.createdOn')}</dt><dd className="text-foreground">{formatDate(task.created_at as unknown as string)}</dd></div>
                    <div className="flex justify-between gap-3 py-1"><dt className="text-border-light">{t('tasks.updated')}</dt><dd className="text-foreground">{formatDate(task.updated_at as unknown as string)}</dd></div>
                    {task.external_id && <div className="flex justify-between gap-3 py-1"><dt className="text-border-light">{t('tasks.externalRef')}</dt><dd className="text-foreground">{task.external_id}</dd></div>}
                    {task.task_number && <div className="flex justify-between gap-3 py-1"><dt className="text-border-light">{t('tasks.taskNum')}</dt><dd className="text-foreground">{task.task_number}</dd></div>}
                  </dl>
                </details>

                <dl className="hidden md:block space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors"><dt className="text-border-light">{t('tasks.taskId')}</dt><dd className="font-mono text-foreground text-xs">{task.id?.slice(-8) || t('common.noData')}</dd></div>
                  <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors"><dt className="text-border-light">{t('tasks.createdOn')}</dt><dd className="text-foreground">{formatDate(task.created_at as unknown as string)}</dd></div>
                  <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors"><dt className="text-border-light">{t('tasks.updated')}</dt><dd className="text-foreground">{formatDate(task.updated_at as unknown as string)}</dd></div>
                  {task.external_id && <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors"><dt className="text-border-light">{t('tasks.externalRef')}</dt><dd className="text-foreground">{task.external_id}</dd></div>}
                  {task.task_number && <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors"><dt className="text-border-light">{t('tasks.taskNum')}</dt><dd className="text-foreground">{task.task_number}</dd></div>}
                  {task.template_id && (
                    <div className="flex justify-between gap-3 py-1 hover:bg-background/50 -mx-1 px-1 rounded transition-colors"><dt className="text-border-light">{t('tasks.template')}</dt><dd className="font-mono text-foreground text-xs">{task.template_id.slice(-8)}</dd></div>
                  )}
                </dl>
              </div>
            </aside>
          </div>
        </div>

        {showMobileActionBar && (
          <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--rpma-border))] bg-[hsl(var(--rpma-surface))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--rpma-surface))]/85 pb-[calc(env(safe-area-inset-bottom)+8px)] px-3 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <ActionsCard
              task={task}
              isAssignedToCurrentUser={isAssignedToCurrentUser}
              isAvailable={isTaskAvailable}
              canStartTask={task.status === 'pending' || task.status === 'draft'}
              compact
              mobileDocked
            />
          </div>
        )}
      </div>
    </TaskErrorBoundary>
  );
}

