import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { TaskWithDetails, TaskStatus } from '@/types/task.types';
import { taskGateway } from '@/domains/tasks/api/taskGateway';
import { useTasks } from '@/domains/tasks/api/useTasks';
import { mapTaskErrorToUserMessage } from '@/domains/tasks/utils/task-presentation';
import { downloadTasksCsv, importTasksFromCsv } from '@/domains/tasks/services/task-csv.service';
import { enhancedToast, logger } from '@/shared/utils';
import { useAuth } from '@/domains/auth';
import { technicianService } from '@/domains/users';
import { useTranslation } from '@/shared/hooks';

export function useTasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [ppfZoneFilter, setPpfZoneFilter] = useState<string>('all');
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string }>>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'calendar' | 'kanban'>('table');
  const [selectedDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [showFilters, setShowFilters] = useState(false);

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

  // Fetch technicians
  const fetchTechnicians = useCallback(async () => {
    try {
      const technicians = await technicianService.getTechnicians();
      const technicianUsers = technicians.map((tech) => ({
        id: tech.id,
        name: tech.name
      }));
      setTechnicians(technicianUsers);
    } catch (err) {
      console.error('Failed to fetch technicians:', err);
      setTechnicians([]);
    }
  }, []);

  // Update task status via backend
  const _handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      if (!user?.token) {
        enhancedToast.error('Authentification requise');
        return;
      }
      await taskGateway.editTask(taskId, { status: newStatus });
      enhancedToast.success('Statut mis à jour avec succès');
      await refetch();
    } catch (err) {
      logger.error('Failed to update task status', { taskId, newStatus, error: err });
      enhancedToast.error('Erreur lors de la mise à jour du statut');
    }
   }, [user?.token, refetch]);

  const handleViewTask = useCallback((task: TaskWithDetails) => {
    router.push(`/tasks/${task.id}`);
  }, [router]);

  const handleEditTask = useCallback((task: TaskWithDetails) => {
    router.push(`/tasks/edit/${task.id}`);
  }, [router]);

  const handleDeleteTask = useCallback(async (task: TaskWithDetails) => {
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
          label: 'Actualiser',
          onClick: () => {
            void refetch();
          }
        }
      });
    } catch (err) {
      logger.error('Task deletion failed', {
        taskId: task.id,
        error: err instanceof Error ? err.message : 'Unknown error',
        component: 'TasksPage'
      });

      enhancedToast.error(mapTaskErrorToUserMessage(err), {
        action: {
          label: 'Réessayer',
          onClick: () => handleDeleteTask(task)
        }
      });
    }
  }, [deleteTask, refetch]);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  }, [refetch]);

  const handleExport = useCallback(async () => {
    try {
      if (!user?.token) {
        enhancedToast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      await downloadTasksCsv({ includeNotes: true, dateRange: selectedDateRange });
      enhancedToast.success('Export terminé avec succès');
    } catch (error) {
      console.error('Export failed:', error);
      enhancedToast.error('Erreur lors de l\'export');
    }
  }, [selectedDateRange, user?.token]);

  const handleImport = useCallback(async () => {
    try {
      if (!user?.token) {
        enhancedToast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      await importTasksFromCsv(() => refetch());
    } catch (error) {
      console.error('Import failed:', error);
      enhancedToast.error('Erreur lors de l\'import');
    }
  }, [refetch, user?.token]);

  // Initial data fetch
  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  return {
    // State
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
    // Data
    tasks,
    loading,
    error,
    filteredTasks,
    statusTabs,
    // Actions
    handleViewTask,
    handleEditTask,
    handleDeleteTask,
    handleRefresh,
    handleExport,
    handleImport,
  };
}
