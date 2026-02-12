"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Calendar, Car, User, Shield, Eye, Edit, Trash2, RefreshCw, Download, Upload, Grid, List, AlertCircle, Filter, X, ChevronRight, SearchX } from 'lucide-react';
import { CalendarView } from '@/components/calendar/CalendarView';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { TaskCardSkeleton } from '@/components/ui/skeleton';
import { VirtualizedTable } from '@/components/ui/virtualized-table';
import { FloatingActionButton, PullToRefresh } from '@/components/ui/mobile-components';
import { cn } from '@/lib/utils';

import { useAuth } from '@/lib/auth/compatibility';
import { getUserFullName } from '@/lib/types';
import { useTasks } from '@/hooks/useTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { ipcClient } from '@/lib/ipc/client';
import { useTranslation } from '@/hooks/useTranslation';
import { taskStatusLabels } from '@/lib/i18n/status-labels';

import { TaskWithDetails } from '@/lib/services/entities/task.service';
import { TaskStatus } from '@/lib/backend';
import { enhancedToast } from '@/lib/enhanced-toast';
import { logger } from '@/lib/logger';
import { getTaskDisplayTitle, getTaskDisplayStatus } from '@/lib/utils/task-display';

// TypeScript interfaces
// interface TaskPhoto {
//   id: string;
//   url: string;
//   type: 'before' | 'after' | 'during';
//   created_at: string;
// }

interface TechnicianUser {
  id: string;
  name: string;
  role: string;
}

// Loading skeleton component - now using standardized SkeletonCard

// Simplified task card component
const TaskCard = React.memo(({
  task,
  onView,
  onEdit,
  onDelete
}: {
  task: TaskWithDetails;
  onView: (task: TaskWithDetails) => void;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
}) => {
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return 'workflow-draft';
      case 'in_progress':
        return 'workflow-inProgress';
      case 'completed':
        return 'workflow-completed';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    return getTaskDisplayStatus(status as TaskStatus);
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'Non planifiée';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-sm transition-all duration-200 border border-[hsl(var(--rpma-border))] hover:border-primary/30 bg-white rounded-[10px]">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4">
            {/* Header with Title and Status */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base md:text-lg font-semibold text-foreground line-clamp-2 flex-1 leading-tight">
                {getTaskDisplayTitle(task)}
              </h3>
              <Badge
                variant={getStatusColor(task.status || 'pending') as "workflow-draft" | "workflow-inProgress" | "workflow-completed" | "workflow-cancelled" | "secondary"}
                className="shrink-0 text-xs px-2 py-1"
              >
                {getStatusLabel(task.status || 'pending')}
              </Badge>
            </div>

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-foreground font-medium text-sm block truncate">
                    {task.vehicle_plate || 'Plaque non définie'}
                  </span>
                  <span className="text-muted-foreground text-xs truncate block">
                    {task.vehicle_make && task.vehicle_model ?
                      `${task.vehicle_make} ${task.vehicle_model}` :
                      'Véhicule non spécifié'
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground text-sm truncate">
                  {task.customer_name || 'Client non spécifié'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground text-sm">
                  {task.scheduled_date ? formatDate(task.scheduled_date) : 'Non planifiée'}
                </span>
              </div>

              {task.technician && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-sm truncate">
                    {getUserFullName(task.technician)}
                  </span>
                </div>
              )}
            </div>

            {/* PPF Zones - Show if available */}
            {task.ppf_zones && task.ppf_zones.length > 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-border/10">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground text-xs font-medium block mb-1">Zones PPF</span>
                  <div className="flex flex-wrap gap-1">
                    {task.ppf_zones.slice(0, 3).map((zone, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/30"
                      >
                        {zone}
                      </span>
                    ))}
                    {task.ppf_zones.length > 3 && (
                      <span className="text-muted-foreground text-xs">
                        +{task.ppf_zones.length - 3} autres
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(task)}
                className="h-8 w-8 p-0 hover:bg-muted/10 text-muted-foreground hover:text-foreground"
                title="Voir les détails"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(task)}
                className="h-8 w-8 p-0 hover:bg-muted/10 text-muted-foreground hover:text-foreground"
                title="Modifier"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer la tâche &ldquo;{task.title || `Tâche #${task.id.slice(0, 8)}`}&rdquo; ?
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(task)}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

TaskCard.displayName = 'TaskCard';

// Table view component with virtualization
const TaskTable = React.memo(({
  tasks,
  onView,
  onEdit,
  onDelete
}: {
  tasks: TaskWithDetails[];
  onView: (task: TaskWithDetails) => void;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
}) => {
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return 'workflow-draft';
      case 'in_progress':
        return 'workflow-inProgress';
      case 'completed':
        return 'workflow-completed';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    return getTaskDisplayStatus(status as TaskStatus);
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const columns = [
    {
      key: 'title',
      header: 'Tâche',
      width: 200,
      sortable: true,
      render: (_value: unknown, task: TaskWithDetails) => (
        <div>
          <div className="text-sm font-medium text-foreground line-clamp-1">
            {getTaskDisplayTitle(task)}
          </div>
          <div className="text-xs text-muted-foreground md:hidden">
            {task.vehicle_plate && `${task.vehicle_plate} • `}
            {formatDate(task.scheduled_date)}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Véhicule',
      width: 150,
      sortable: true,
      className: 'hidden sm:table-cell',
      render: (_value: unknown, task: TaskWithDetails) => (
        <div>
          <div className="text-sm text-foreground">
            {task.vehicle_make && task.vehicle_model
              ? `${task.vehicle_make} ${task.vehicle_model}`
              : task.vehicle_plate || '-'
            }
          </div>
          <div className="text-xs text-muted-foreground">
            {task.vehicle_plate}
          </div>
        </div>
      ),
    },
    {
      key: 'customer_name',
      header: 'Client',
      width: 150,
      sortable: true,
      render: (value: unknown) => (
        <div className="text-sm text-foreground">
          {String(value || '-')}
        </div>
      ),
    },
    {
      key: 'scheduled_date',
      header: 'Date',
      width: 120,
      sortable: true,
      className: 'hidden md:table-cell',
      render: (value: unknown) => (
        <div className="text-sm text-foreground">
          {formatDate(value as string | null)}
        </div>
      ),
    },
    {
      key: 'ppf_zones',
      header: 'Zones PPF',
      width: 120,
      className: 'hidden md:table-cell',
      render: (value: unknown) => (
        <div className="text-sm text-foreground">
          {(value as string[])?.length ? (value as string[]).join(', ') : '-'}
        </div>
      ),
    },
    {
      key: 'technician',
      header: 'Technicien',
      width: 150,
      className: 'hidden lg:table-cell',
      render: (_value: unknown, task: TaskWithDetails) => (
        <div className="text-sm text-foreground">
          {task.technician ? getUserFullName(task.technician) : '-'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: 120,
      sortable: true,
      render: (value: unknown) => (
        <Badge
          variant={getStatusColor((value as string) || 'pending') as "workflow-draft" | "workflow-inProgress" | "workflow-completed" | "workflow-cancelled" | "secondary"}
          className="text-xs"
        >
          {getStatusLabel((value as string) || 'pending')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 140,
      render: (_value: unknown, task: TaskWithDetails) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(task);
            }}
            className="h-8 w-8 p-0 touch-manipulation"
            title="Voir les détails"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="h-8 w-8 p-0 touch-manipulation"
            title="Modifier"
          >
            <Edit className="h-3 w-3" />
          </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 touch-manipulation"
                  title="Supprimer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer la tâche &ldquo;{task.title || `Tâche #${task.id.slice(0, 8)}`}&rdquo; ?
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(task)}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <VirtualizedTable
      data={tasks}
      columns={columns}
      height={600}
      rowHeight={60}
      onRowClick={(task) => onView(task)}
      className="bg-background"
    />
  );
});

TaskTable.displayName = 'TaskTable';

// Compact filters component
const TaskFilters = React.memo(({
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
  onExport,
  onImport
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  technicianFilter: string;
  setTechnicianFilter: (tech: string) => void;
  ppfZoneFilter: string;
  setPpfZoneFilter: (zone: string) => void;
  technicians: Array<{ id: string; name: string }>;
    viewMode: 'cards' | 'table' | 'calendar' | 'kanban';
    setViewMode: (mode: 'cards' | 'table' | 'calendar' | 'kanban') => void;
  onExport: () => void;
  onImport: () => void;
}) => {
const debouncedSearchTerm = useDebounce(searchTerm, 300);

  React.useEffect(() => {
    // This will trigger search when debounced term changes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, [debouncedSearchTerm]);

  const activeFiltersCount = [statusFilter, dateFilter, technicianFilter, ppfZoneFilter].filter(f => f !== 'all').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-[hsl(var(--rpma-border))] rounded-[10px] p-4 mb-4 shadow-[var(--rpma-shadow-soft)]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher tâches, véhicules, clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 rounded-full bg-muted/30 border-border"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-border/60 rounded-full p-1 bg-muted/20">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue liste"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue cartes"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue calendrier"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={viewMode === 'kanban' ? 'bg-[hsl(var(--rpma-teal))] text-white rounded-full' : 'rounded-full'}
                title="Vue Kanban"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              className="rounded-full border-border/60"
              title="Importer"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Devis</option>
            <option value="scheduled">Planifié</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
            <option value="archived">Archivé</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm"
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd&apos;hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="overdue">En retard</option>
          </select>

          <select
            value={technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm"
          >
            <option value="all">Tous les techniciens</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Zone PPF"
            value={ppfZoneFilter === 'all' ? '' : ppfZoneFilter}
            onChange={(e) => setPpfZoneFilter(e.target.value || 'all')}
            className="px-3 h-9 bg-white border border-border/60 rounded-full text-foreground text-sm placeholder-muted-foreground"
          />

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setTechnicianFilter('all');
                setPpfZoneFilter('all');
                setSearchTerm('');
              }}
              className="text-muted-foreground"
            >
              Réinitialiser
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="rounded-full border-border/60"
            title="Exporter"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

TaskFilters.displayName = 'TaskFilters';

// Main tasks page component
export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [ppfZoneFilter, setPpfZoneFilter] = useState<string>('all');
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [refreshing, setRefreshing] = useState(false);
   const [viewMode, setViewMode] = useState<'cards' | 'table' | 'calendar' | 'kanban'>('table');
   const [selectedDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  // Task filters are handled centrally in AppNavigation component

  // Use the enhanced useTasks hook
  const {
    tasks,
    loading,
    error,
    deleteTask,
    refetch
  } = useTasks({
    status: statusFilter !== 'all' ? statusFilter as TaskStatus : undefined,
    search: searchTerm,
    assignedTo: technicianFilter !== 'all' ? technicianFilter : undefined,
    pageSize: 20,
    autoFetch: true
  });





  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        !searchTerm ||
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.vehicle_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      
      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        if (!task.scheduled_date) return false;
        
        const taskDate = new Date(task.scheduled_date);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        switch (dateFilter) {
          case 'today':
            return taskDate.toDateString() === today.toDateString();
          case 'week':
            return taskDate >= startOfWeek && taskDate <= today;
          case 'month':
            return taskDate >= startOfMonth && taskDate <= today;
          case 'overdue':
            return taskDate < today && task.status !== 'completed';
          default:
            return true;
        }
      })();
      
      const matchesTechnician = technicianFilter === 'all' || task.technician_id === technicianFilter;

      const matchesPpfZone = ppfZoneFilter === 'all' ||
        (task.ppf_zones && task.ppf_zones.some(zone =>
          zone.toLowerCase().includes(ppfZoneFilter.toLowerCase())
        ));

      return matchesSearch && matchesStatus && matchesDate && matchesTechnician && matchesPpfZone;
    });
  }, [tasks, searchTerm, statusFilter, dateFilter, technicianFilter, ppfZoneFilter]);

  const statusTabs = useMemo(() => ([
    { key: 'all', label: t('filters.all'), count: tasks.length, filter: 'all' },
    { key: 'draft', label: t('tasks.statusDraft'), count: tasks.filter(t => t.status === 'draft').length, filter: 'draft' },
    { key: 'scheduled', label: t('filters.scheduled'), count: tasks.filter(t => t.status === 'scheduled').length, filter: 'scheduled' },
    { key: 'in_progress', label: t('tasks.statusInProgress'), count: tasks.filter(t => t.status === 'in_progress').length, filter: 'in_progress' },
    { key: 'completed', label: t('tasks.statusCompleted'), count: tasks.filter(t => t.status === 'completed').length, filter: 'completed' },
    { key: 'cancelled', label: t('tasks.statusCancelled'), count: tasks.filter(t => t.status === 'cancelled').length, filter: 'cancelled' },
    { key: 'archived', label: t('tasks.statusArchived'), count: tasks.filter(t => t.status === 'archived').length, filter: 'archived' },
  ]), [tasks, t]);

  const formatTaskDate = (task: TaskWithDetails) => {
    if (!task.scheduled_date) return 'Date à définir';
    const date = new Date(task.scheduled_date);
    const dateText = date.toLocaleDateString('fr-FR', { month: 'numeric', day: 'numeric', year: '2-digit' });
    const timeText = task.start_time || task.heure_rdv;
    return timeText ? `${dateText} ${timeText}` : dateText;
  };

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500 text-white';
      case 'in_progress':
        return 'bg-amber-500 text-white';
      case 'scheduled':
        return 'bg-blue-500 text-white';
      case 'cancelled':
        return 'bg-slate-400 text-white';
      case 'draft':
        return 'bg-slate-500 text-white';
      case 'archived':
        return 'bg-slate-500 text-white';
      default:
        return 'bg-slate-400 text-white';
    }
  };

  // Fetch technicians (simplified version - keeping for filters)
  const fetchTechnicians = useCallback(async () => {
    try {
      const response = await fetch('/api/technicians', {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      if (!response.ok) {
        console.warn('Could not fetch technicians - falling back to empty array');
        setTechnicians([]);
        return;
      }

      const technicians = await response.json();
      const technicianList = Array.isArray(technicians) ? technicians : [];

      // Transform to expected format
      const technicianUsers = technicianList.map((tech: TechnicianUser) => ({
        id: tech.id,
        name: tech.name
      }));

      setTechnicians(technicianUsers);

    } catch (err) {
      console.error('Failed to fetch technicians:', err);
      setTechnicians([]);
    }
  }, [user?.token]);

  // Update task status - now uses the hook
  const handleStatusChange = useCallback(async (_taskId: string, _newStatus: TaskStatus) => {
    // This function is defined but not used - kept for reference
    console.warn('handleStatusChange is called but not implemented');
   }, []);

  // Handle task actions
  const handleViewTask = useCallback((task: TaskWithDetails) => {
    // Navigate to task detail page using Next.js router
    router.push(`/tasks/${task.id}`);
  }, [router]);

  const handleEditTask = useCallback((task: TaskWithDetails) => {
    // Navigate to task edit page using Next.js router
    router.push(`/tasks/edit/${task.id}`);
  }, [router]);

  const handleDeleteTask = useCallback(async (task: TaskWithDetails) => {
    // Confirmation is now handled in the UI component
    logger.info('Starting task deletion process', {
      taskId: task.id,
      taskTitle: task.title,
      status: task.status,
      component: 'TasksPage'
    });

    logger.info('Starting task deletion process', {
      taskId: task.id,
      taskTitle: task.title,
      status: task.status,
      component: 'TasksPage'
    });

    try {
      await deleteTask(task.id);
      logger.info('Task deletion successful', {
        taskId: task.id,
        component: 'TasksPage'
      });
      enhancedToast.success('Tâche supprimée avec succès', {
        action: {
          label: 'Annuler',
          onClick: () => {
            // Could implement undo functionality here
            console.log('Undo delete requested');
          }
        }
      });
    } catch (err) {
      logger.error('Task deletion failed', {
        taskId: task.id,
        error: err instanceof Error ? err.message : 'Unknown error',
        component: 'TasksPage'
      });

      // Extract meaningful error message for user
      let userErrorMessage = 'Erreur lors de la suppression de la tâche';
      if (err instanceof Error) {
        if (err.message.includes('Network')) {
          userErrorMessage = 'Erreur de réseau - vérifiez votre connexion';
        } else if (err.message.includes('401')) {
          userErrorMessage = 'Non autorisé - veuillez vous reconnecter';
        } else if (err.message.includes('403')) {
          userErrorMessage = 'Accès interdit - permissions insuffisantes';
        } else if (err.message.includes('404')) {
          userErrorMessage = 'Tâche introuvable - elle a peut-être déjà été supprimée';
        } else if (err.message.includes('500')) {
          userErrorMessage = 'Erreur serveur - veuillez réessayer plus tard';
        }
      }

      enhancedToast.error(userErrorMessage, {
        action: {
          label: 'Réessayer',
          onClick: () => handleDeleteTask(task)
        }
      });
    }
  }, [deleteTask]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleExport = useCallback(async () => {
    try {
      if (!user?.token) {
        enhancedToast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      const csvData = await ipcClient.tasks.exportTasksCsv({
        include_notes: true,
        date_range: selectedDateRange ? {
          start_date: selectedDateRange.from?.toISOString(),
          end_date: selectedDateRange.to?.toISOString(),
        } : undefined
      }, user.token);

      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enhancedToast.success('Export terminé avec succès');
    } catch (error) {
      console.error('Export failed:', error);
      enhancedToast.error('Erreur lors de l\'export');
    }
  }, []);

  const handleImport = useCallback(async () => {
    try {
      if (!user?.token) {
        enhancedToast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const lines = text.split('\n').filter(line => line.trim());

          if (lines.length < 2) {
            enhancedToast.error('Fichier CSV invalide ou vide');
            return;
          }

          const result = await ipcClient.tasks.importTasksBulk({
            csv_lines: lines,
            skip_duplicates: true,
            update_existing: false
          }, user.token);

          enhancedToast.success(`${result.successful} tâches importées avec succès`);
          refetch(); // Refresh the task list
        } catch (error) {
          console.error('Import failed:', error);
          enhancedToast.error('Erreur lors de l\'import');
        }
      };

      input.click();
    } catch (error) {
      console.error('Import setup failed:', error);
      enhancedToast.error('Erreur lors de la configuration de l\'import');
    }
  }, [refetch, user?.token]);

  // Initial data fetch
  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);



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
          <TaskFilters
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
                        {formatTaskDate(task)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold text-foreground">
                          {task.task_number} - {getTaskDisplayTitle(task)}
                        </div>
                        {secondary.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {secondary.join(' • ')}
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
              <CalendarView onTaskClick={handleViewTask} className="h-full" />
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="h-[800px]">
              <KanbanBoard />
            </div>
          ) : (
            <AnimatePresence>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onView={handleViewTask}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </AnimatePresence>
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
};

TaskTable.displayName = 'TaskTable';
