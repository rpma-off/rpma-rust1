"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Plus, Shield, AlertCircle, Download, Filter, RefreshCw, ChevronRight, SearchX } from 'lucide-react';
import { getTaskDisplayTitle, getTaskDisplayStatus } from '@/domains/tasks/utils/display';
import {
  getStatusBadgeClass,
  formatTaskDateTime,
} from '@/domains/tasks/utils/task-presentation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  FloatingActionButton,
  PullToRefresh,
  TaskCardSkeleton,
} from '@/shared/ui/facade';
import { cn } from '@/shared/utils';
import { useTasksPage } from '@/domains/tasks/hooks/useTasksPage';
import { TaskListCard } from './TaskListCard';
import { TaskListFilters } from './TaskListFilters';

const CalendarView = dynamic(
  () => import('@/domains/calendar').then((mod) => mod.CalendarView),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[10px] bg-muted/20" /> }
);

const KanbanBoard = dynamic(
  () => import('./KanbanBoard').then((mod) => mod.KanbanBoard),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-[10px] bg-muted/20" /> }
);

// Main tasks page component
export default function TasksPageContent() {
  const {
    user,
    t,
    router,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    technicianFilter,
    setTechnicianFilter,
    ppfZoneFilter,
    setPpfZoneFilter,
    technicians,
    viewMode,
    setViewMode,
    showFilters,
    setShowFilters,
    tasks,
    loading,
    error,
    filteredTasks,
    statusTabs,
    handleViewTask,
    handleEditTask,
    handleDeleteTask,
    handleRefresh,
    handleExport,
    handleImport,
  } = useTasksPage();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Accès non autorisé</h1>
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  // Check if running in Tauri environment
  const isTauri = typeof window !== 'undefined' && (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

  if (!isTauri) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('errors.desktopAppRequired')}</h1>
          <p className="text-muted-foreground mb-4">
            {t('errors.desktopAppRequiredDesc')}
          </p>
          <p className="text-muted-foreground text-sm">
            {t('errors.runCommand')} <code className="bg-border/20 px-2 py-1 rounded">npm run dev</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-foreground">{t('nav.tasks')}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-[6px] gap-2">
              <Shield className="h-4 w-4" />
              {t('tasks.showProgress')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-[6px] gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              {t('common.filter')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-[6px] gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-[hsl(var(--rpma-border))] mb-4">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.filter;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.filter)}
                className={cn(
                  'flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 uppercase tracking-wide',
                  isActive ? 'border-[hsl(var(--rpma-teal))] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span className="h-5 px-2 rounded-full bg-muted text-xs text-muted-foreground">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {showFilters && (
          <TaskListFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            technicianFilter={technicianFilter}
            setTechnicianFilter={setTechnicianFilter}
            ppfZoneFilter={ppfZoneFilter}
            setPpfZoneFilter={setPpfZoneFilter}
            technicians={technicians}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}

        {error && (
          <Card className="mb-4 border-error/20 bg-error/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-error">
                <AlertCircle className="h-5 w-5" />
                <span>{String(error)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <PullToRefresh onRefresh={handleRefresh}>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
              <div className="rpma-empty">
                <SearchX />
                <h3 className="text-lg font-semibold">{t('tasks.noMatchingTasks')}</h3>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] shadow-[var(--rpma-shadow-soft)] overflow-hidden">
              <div className="grid grid-cols-[36px_140px_1fr_140px_24px] gap-2 px-4 py-2 text-xs rpma-table-header">
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 rounded border-border" aria-label="Select all" />
                </div>
                <div>{t('time.dateTime')}</div>
                <div>{t('tasks.taskNumber')} - {t('tasks.taskTitle')}</div>
                <div className="text-right">{t('tasks.status')}</div>
                <div />
              </div>
              <div className="divide-y divide-[hsl(var(--rpma-border))]">
                {filteredTasks.map((task) => {
                  const secondary = [
                    task.customer_name,
                    task.vehicle_make || task.vehicle_model ? `${task.vehicle_make || ''} ${task.vehicle_model || ''}`.trim() : null,
                    task.vehicle_plate
                  ].filter(Boolean);
                  return (
                    <div
                      key={task.id}
                      className="grid grid-cols-[36px_140px_1fr_140px_24px] gap-2 px-4 py-3 hover:bg-[hsl(var(--rpma-surface))] cursor-pointer"
                      onClick={() => handleViewTask(task)}
                    >
                      <div className="flex items-start pt-1">
                        <input type="checkbox" className="h-4 w-4 rounded border-border" aria-label={`Select ${task.task_number}`} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTaskDateTime(task)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold text-foreground">
                          {task.task_number} - {getTaskDisplayTitle(task)}
                        </div>
                        {secondary.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {secondary.join(' \u2022 ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-start justify-end">
                        <Badge className={cn('text-xs px-2 py-1 rounded-full', getStatusBadgeClass(task.status))}>
                          {getTaskDisplayStatus(task.status)}
                        </Badge>
                      </div>
                      <div className="flex items-start justify-end text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="h-[800px]">
              <CalendarView />
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="h-[800px]">
              <KanbanBoard />
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskListCard
                  key={task.id}
                  task={task}
                  onView={handleViewTask}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}
        </PullToRefresh>

        {filteredTasks.length > 0 && filteredTasks.length !== tasks.length && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            {filteredTasks.length} sur {tasks.length} tâches
          </div>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 hidden md:block">
          <Button
            onClick={() => router.push('/tasks/new')}
            className="h-11 px-6 rounded-full shadow-[var(--rpma-shadow-soft)] bg-[hsl(var(--rpma-teal))] text-white hover:bg-[hsl(var(--rpma-teal))]/90"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('common.add')}
          </Button>
        </div>

        <FloatingActionButton
          icon={<Plus className="w-6 h-6" />}
          actions={[
            {
              icon: <Plus className="w-4 h-4" />,
              label: 'Nouvelle tâche',
              onClick: () => router.push('/tasks/new')
            },
            {
              icon: <Filter className="w-4 h-4" />,
              label: 'Filtres',
              onClick: () => setShowFilters(!showFilters)
            },
            {
              icon: <RefreshCw className="w-4 h-4" />,
              label: 'Actualiser',
              onClick: handleRefresh
            }
          ]}
          className="md:hidden"
        />
      </div>
    </div>
  );
}
