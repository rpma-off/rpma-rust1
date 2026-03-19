'use client';

import { ArrowLeft, AlertCircle, Settings } from 'lucide-react';
import { Button, TaskErrorBoundary } from '@/shared/ui';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import {
  TaskOverviewEditable,
  TaskHeaderBand,
  StatusBadge,
  ActionsCard,
  getTaskDisplayTitle,
  useTaskDetailPage,
} from '@/domains/tasks';
import { useInterventionData } from '@/domains/interventions';
import { InterventionReportSection } from '@/domains/reports';

export default function TaskDetailPage() {
  const {
    taskId,
    task,
    loading,
    error,
    isInProgress,
    isCompleted,
    isAssignedToCurrentUser,
    isTaskAvailable,
    isStartingIntervention,
    showMobileActionBar,
    formatDate,
    handlePrimaryAction,
    handleSecondaryAction,
    router,
    t,
  } = useTaskDetailPage();

  const { data: interventionData } = useInterventionData(taskId);
  const interventionId = interventionData?.id as string | undefined;

  if (loading) {
    return (
      <PageShell>
        <LoadingState message={t('tasks.loadingDetails')} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-destructive/20">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t('tasks.error')}</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell>
        <div className="text-center space-y-4 max-w-md mx-auto">
          <p className="text-foreground font-medium">{t('tasks.notFound')}</p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <TaskErrorBoundary>
      <PageShell>
        <div className="mb-4 flex items-center gap-2">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-accent/5 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <StatusBadge status={(task.status as 'completed' | 'in_progress' | 'pending' | 'scheduled' | 'on_hold' | 'cancelled' | 'failed' | 'overdue' | 'draft') || 'pending'} size="sm" />
        </div>

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

        <div className={`mt-6 space-y-6 ${showMobileActionBar ? 'pb-28' : ''}`}>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            {/* Main Content Area */}
            <main className="space-y-6">
              {/* Enhanced Actions Section */}
              <section id="task-actions" className="scroll-mt-28">
                <ActionsCard
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
                <TaskOverviewEditable task={task} defaultExpandedSections={['notes-operationnelles']} />
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

              {/* Intervention Report */}
              {interventionId && (
                <div id="task-admin" className="rounded-xl border border-[hsl(var(--rpma-border))] bg-white p-4 shadow-sm">
                  <InterventionReportSection interventionId={interventionId} />
                </div>
              )}
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
              onPrimaryAction={handlePrimaryAction}
              onSecondaryAction={handleSecondaryAction}
              isPending={isStartingIntervention}
              compact
              mobileDocked
            />
          </div>
        )}
      </PageShell>
    </TaskErrorBoundary>
  );
}
