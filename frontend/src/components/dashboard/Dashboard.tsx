'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Menu,
  X,
  ClipboardList,
  CheckCircle,
  BarChart3,
  Activity,
  RefreshCw,
  AlertCircle,
  Workflow,
  Shield,
  Camera,
  UserCheck
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Import dashboard components
import { DashboardSection } from './DashboardSection';
import { DashboardWidget } from './DashboardWidget';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { StatsGrid } from './StatsGrid';
import { PerformanceMetrics } from './PerformanceMetrics';
import { QuickActions } from './QuickActions';
import { RecentTasksPreview } from './RecentTasksPreview';
import { WorkflowExecutionDashboard } from './WorkflowExecutionDashboard';
import { QualityAssuranceDashboard } from './QualityAssuranceDashboard';
import { PhotoDocumentationDashboard } from './PhotoDocumentationDashboard';

// Import types
import { DashboardTask, TaskStatus, Priority, DashboardProps, ViewMode, DashboardStats } from './types';

// Dynamically import charts to avoid SSR issues
const StatisticsCharts = dynamic(
  () => import('../Charts/StatisticsCharts').then((mod) => mod.StatisticsCharts),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" /> }
);

// Animation variants
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

/**
 * Unified Dashboard Component
 * 
 * Features:
 * - Multiple view modes: overview, analytics, tasks, management
 * - Configurable components and features
 * - Advanced filtering and sorting
 * - Real-time statistics and performance metrics
 * - Responsive design with sidebar
 * - Auto-save and real-time updates
 * - Accessibility improvements
 * - Performance optimizations
 */
export const Dashboard: React.FC<DashboardProps> = ({
  // Core data
  tasks = [],
  technicians = [],
  
  // Configuration
  viewMode = 'overview',
  onViewModeChange,
  showSidebar = true,
  showAnalytics = true,
  showPerformanceMetrics = true,
  showQuickActions = true,
  showRecentTasks = true,
   
   // Task management
  enableSearch = true,
  enableStatusFilter = true,
  enablePriorityFilter = true,
  enableTechnicianFilter = true,
  showTaskCount = true,
  
  // Filtering and sorting
  initialStatus = 'all',
  initialPriority = 'all',
  initialSearchQuery = '',
  initialTechnician = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
  
  // Custom content
  headerContent,
  footerContent,
  emptyState,
  statusFilterOptions,
  priorityFilterOptions,
  
  // Callbacks
  onTaskSelect,
  onTaskUpdate,
  onTaskDelete,
  onSearch,
  onStatusFilterChange,
  onPriorityFilterChange,
  onTechnicianSelect,
  onRefresh,
  onNewTask,
  
  // State
  isLoading = false,
  error = null,
  selectedTaskId,
  
  // Styling
  className
}) => {
  const router = useRouter();

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true); // Open by default for desktop
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(viewMode);
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [activeStatusFilter, setActiveStatusFilter] = useState(initialStatus);
  const [activePriorityFilter, setActivePriorityFilter] = useState(initialPriority);
  const [selectedTechnicianFilter, setSelectedTechnicianFilter] = useState(initialTechnician);
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = useState<'asc' | 'desc'>(sortOrder);

  // Initialize filters from props
  useEffect(() => {
    setCurrentViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    setSearchTerm(initialSearchQuery);
  }, [initialSearchQuery]);

  // Handle sidebar state on screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Custom hooks for optimized computations
  const dashboardStats = useMemo<DashboardStats>(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'scheduled').length;
    
    // Calculate completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate average completion time from task data
    const completedTasksWithDuration = tasks.filter(t => t.status === 'completed' && t.duration);
    const averageCompletionTime = completedTasksWithDuration.length > 0
      ? completedTasksWithDuration.reduce((sum, t) => sum + (typeof t.duration === 'number' ? t.duration : 0), 0) / completedTasksWithDuration.length
      : 2.5; // fallback to reasonable default

    // Calculate efficiency rate
    const efficiencyRate = completionRate;

    // Calculate productivity trend (simplified - could be enhanced with historical data)
    const recentTasks = tasks.filter(t => {
      const created = t.createdAt ? new Date(t.createdAt) : new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created > weekAgo;
    });
    const recentCompletionRate = recentTasks.length > 0 ? (recentTasks.filter(t => t.status === 'completed').length / recentTasks.length) * 100 : 0;
    const productivityTrend = recentCompletionRate - completionRate;
    
    // Find top technician
    const technicianStats = tasks.reduce((acc, task) => {
      if (task.technician) {
        const techName = task.technician.name || `${task.technician.first_name || ''} ${task.technician.last_name || ''}`.trim();
        if (!acc[techName]) {
          acc[techName] = { completed: 0, inProgress: 0, pending: 0, total: 0 };
        }
        // Only increment for valid status values
        if (task.status === 'completed') {
          acc[techName].completed++;
        } else if (task.status === 'in_progress') {
          acc[techName].inProgress++;
        } else if (task.status === 'scheduled') {
          acc[techName].pending++;
        }
        acc[techName].total++;
      }
      return acc;
    }, {} as Record<string, { completed: number; inProgress: number; pending: number; total: number }>);
    
    const topTechnician = Object.entries(technicianStats)
      .sort(([,a], [,b]) => b.completed - a.completed)[0]?.[0] || 'N/A';
    
    // Calculate average tasks per technician
    const uniqueTechnicians = new Set(tasks.map(t => t.technician?.id).filter(Boolean)).size;
    const avgTasksPerTechnician = uniqueTechnicians > 0 ? total / uniqueTechnicians : 0;
    
    // Find most active zone
    const zoneStats = tasks.reduce((acc, task) => {
      task.zones.forEach(zone => {
        acc[zone] = (acc[zone] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveZone = Object.entries(zoneStats)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    
    // Generate byTechnician data
    const byTechnician = Object.entries(technicianStats).map(([technician, stats]) => ({
      technician,
      completed: stats.completed,
      inProgress: stats.inProgress,
      pending: stats.pending,
      total: stats.total,
      efficiency: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    }));
    
    // Generate byPPFZone data
    const byPPFZone = Object.entries(zoneStats).map(([zone, count]) => {
      const zoneTasks = tasks.filter(t => t.zones.includes(zone));
      return {
        zone,
        count,
        completed: zoneTasks.filter(t => t.status === 'completed').length,
        inProgress: zoneTasks.filter(t => t.status === 'in_progress').length,
        pending: zoneTasks.filter(t => t.status === 'scheduled').length
      };
    });
    
    // Generate byVehicleModel data
    const vehicleModelStats = tasks.reduce((acc, task) => {
      const model = task.vehicle_model || 'Unknown';
      if (!acc[model]) {
        acc[model] = { completed: 0, inProgress: 0, pending: 0, total: 0 };
      }
      // Only increment for valid status values
      if (task.status === 'completed') {
        acc[model].completed++;
      } else if (task.status === 'in_progress') {
        acc[model].inProgress++;
      } else if (task.status === 'scheduled') {
        acc[model].pending++;
      }
      acc[model].total++;
      return acc;
    }, {} as Record<string, { completed: number; inProgress: number; pending: number; total: number }>);
    
    const byVehicleModel = Object.entries(vehicleModelStats).map(([model, stats]) => ({
      model,
      count: stats.total,
      completed: stats.completed,
      inProgress: stats.inProgress,
      pending: stats.pending
    }));
    
    // Generate byDate data from real task data - last 7 days
    const byDate = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = tasks.filter(task => {
        const taskDate = task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : null;
        return taskDate === dateStr;
      });

      return {
        date: dateStr,
        count: dayTasks.length,
        completed: dayTasks.filter(t => t.status === 'completed').length,
        inProgress: dayTasks.filter(t => t.status === 'in_progress').length,
        pending: dayTasks.filter(t => t.status === 'scheduled').length
      };
    });
    
    // Generate trendData (mock data for now)
    const trendData = byDate.map(item => ({
      date: item.date,
      tasks: item.count,
      completionRate: item.count > 0 ? Math.round((item.completed / item.count) * 100) : 0,
      avgTime: averageCompletionTime
    }));
    
    return {
      total,
      completed,
      inProgress,
      pending,
      averageCompletionTime,
      efficiencyRate,
      productivityTrend,
      topTechnician,
      completionRate,
      avgTasksPerTechnician,
      mostActiveZone,
      byTechnician,
      byDate,
      byPPFZone,
      byVehicleModel,
      trendData
    };
  }, [tasks]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === activeStatusFilter);
    }

    // Apply priority filter
    if (activePriorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === activePriorityFilter);
    }

    // Apply technician filter
    if (selectedTechnicianFilter) {
      filtered = filtered.filter(task => task.technician?.id === selectedTechnicianFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[currentSortBy as keyof DashboardTask];
      const bValue = b[currentSortBy as keyof DashboardTask];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return currentSortOrder === 'asc' ? -1 : 1;
      if (bValue == null) return currentSortOrder === 'asc' ? 1 : -1;
      
      if (currentSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tasks, searchTerm, activeStatusFilter, activePriorityFilter, selectedTechnicianFilter, currentSortBy, currentSortOrder]);

  // Event handlers
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    console.log('Changing view mode to:', mode, 'Current mode:', currentViewMode);
    setCurrentViewMode(mode);
    onViewModeChange?.(mode);
    // Only close mobile sidebar when navigating (not on desktop)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [onViewModeChange, currentViewMode]);

  // Handle task selection
  const handleTaskSelect = useCallback((taskId: string) => {
    onTaskSelect?.(taskId);
  }, [onTaskSelect]);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    onSearch?.(term);
  }, [onSearch]);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((status: TaskStatus | 'all') => {
    setActiveStatusFilter(status);
    onStatusFilterChange?.(status);
  }, [onStatusFilterChange]);

  // Handle priority filter change
  const handlePriorityFilterChange = useCallback((priority: Priority | 'all') => {
    setActivePriorityFilter(priority);
    onPriorityFilterChange?.(priority);
  }, [onPriorityFilterChange]);

  // Handle technician selection
  const handleTechnicianSelect = useCallback((technicianId: string) => {
    setSelectedTechnicianFilter(technicianId);
    onTechnicianSelect?.(technicianId);
  }, [onTechnicianSelect]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Handle new task
  const handleNewTask = useCallback(() => {
    onNewTask?.();
  }, [onNewTask]);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setActiveStatusFilter('all');
    setActivePriorityFilter('all');
    setSelectedTechnicianFilter('');
    setCurrentSortBy('created_at');
    setCurrentSortOrder('desc');
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        <span className="sr-only">Loading dashboard...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex justify-center mb-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-red-400 mb-1">Erreur</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/50"
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-40 lg:hidden"
            onClick={handleSidebarToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {showSidebar && (
        <motion.aside
          initial={false}
          animate={{ x: sidebarOpen ? 0 : '-100%' }}
          className={cn(
            'fixed left-0 top-0 z-50 h-full w-64 bg-muted shadow-lg transform transition-transform duration-300 ease-in-out border-r border-border',
            'lg:fixed lg:translate-x-0 lg:z-40',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Sidebar Header */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
                <p className="text-xs text-border-light capitalize">{currentViewMode}</p>
                <p className="text-xs text-accent">✓ Barre latérale active</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSidebarToggle}
                className="lg:hidden text-border-light hover:text-foreground hover:bg-border"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 space-y-1 px-2 py-4">
              <SidebarItem
                icon={Home}
                isActive={currentViewMode === 'overview'}
                onClick={() => handleViewModeChange('overview')}
              >
                Vue d&apos;ensemble
              </SidebarItem>
              <SidebarItem
                icon={ClipboardList}
                isActive={currentViewMode === 'tasks'}
                onClick={() => handleViewModeChange('tasks')}
              >
                Tâches
              </SidebarItem>
              {showAnalytics && (
                <SidebarItem
                  icon={BarChart3}
                  isActive={currentViewMode === 'analytics'}
                  onClick={() => handleViewModeChange('analytics')}
                >
                  Analyses
                </SidebarItem>
              )}
              <SidebarItem
                icon={Workflow}
                isActive={currentViewMode === 'workflows'}
                onClick={() => handleViewModeChange('workflows')}
              >
                <div className="flex items-center gap-2">
                  <span>Workflows</span>
                  <span className="px-1.5 py-0.5 text-xs bg-accent/20 text-accent rounded-full">NOUVEAU</span>
                </div>
              </SidebarItem>
              <SidebarItem
                icon={Shield}
                isActive={currentViewMode === 'quality'}
                onClick={() => handleViewModeChange('quality')}
              >
                <div className="flex items-center gap-2">
                  <span>Qualité</span>
                  <span className="px-1.5 py-0.5 text-xs bg-accent/20 text-accent rounded-full">NOUVEAU</span>
                </div>
              </SidebarItem>
              <SidebarItem
                icon={Camera}
                isActive={currentViewMode === 'photos'}
                onClick={() => handleViewModeChange('photos')}
              >
                <div className="flex items-center gap-2">
                  <span>Photos</span>
                  <span className="px-1.5 py-0.5 text-xs bg-purple-400/20 text-purple-300 rounded-full">NOUVEAU</span>
                </div>
              </SidebarItem>
              <SidebarItem
                icon={UserCheck}
                isActive={false}
                onClick={() => router.push('/clients')}
              >
                Clients
              </SidebarItem>
              <SidebarItem
                icon={Users}
                isActive={currentViewMode === 'management'}
                onClick={() => handleViewModeChange('management')}
              >
                Gestion
              </SidebarItem>
            </nav>
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <div className={cn('flex-1 min-h-screen', showSidebar && 'lg:ml-64')}>
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between bg-muted/95 backdrop-blur-sm px-4 shadow-sm lg:hidden border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSidebarToggle}
            className="text-foreground hover:bg-border"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <div className="w-10" />
        </div>

        {/* Mobile New Features Banner */}
        <div className="lg:hidden bg-gradient-to-r from-accent/20 to-accent/10 border-b border-accent/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-foreground">Nouvelles fonctionnalités disponibles</span>
          </div>
          <p className="text-xs text-border-light mt-1">
            Appuyez sur le menu pour accéder aux tableaux de bord Workflows, Qualité et Photos
          </p>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block bg-muted/95 backdrop-blur-sm border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-border-light mb-2">
                <span>Dashboard</span>
                <span>/</span>
                <span className="text-foreground font-medium">
                  {currentViewMode === 'overview' && 'Overview'}
                  {currentViewMode === 'tasks' && 'Tasks'}
                  {currentViewMode === 'analytics' && 'Analytics'}
                  {currentViewMode === 'workflows' && 'Workflows'}
                  {currentViewMode === 'quality' && 'Quality'}
                  {currentViewMode === 'photos' && 'Photos'}
                  {currentViewMode === 'management' && 'Management'}
                </span>
              </nav>
              <h1 className="text-2xl font-bold text-foreground">
                {currentViewMode === 'overview' && 'Vue d\'ensemble du tableau de bord'}
                {currentViewMode === 'tasks' && 'Gestion des tâches'}
                {currentViewMode === 'analytics' && 'Analyses et performances'}
                {currentViewMode === 'workflows' && 'Exécution des workflows'}
                {currentViewMode === 'quality' && 'Assurance qualité'}
                {currentViewMode === 'photos' && 'Documentation photo'}
                {currentViewMode === 'management' && 'Outils de gestion'}
              </h1>
              <p className="text-sm text-border-light mt-1">
                {currentViewMode === 'overview' && 'Vue d\'ensemble en temps réel des tâches et des performances'}
                {currentViewMode === 'tasks' && 'Gérer et suivre les tâches d\'installation'}
                {currentViewMode === 'analytics' && 'Métriques de performance et insights'}
                {currentViewMode === 'workflows' && 'Surveiller l\'avancement des workflows en temps réel'}
                {currentViewMode === 'quality' && 'Suivre les métriques qualité et la conformité'}
                {currentViewMode === 'photos' && 'Gérer la documentation photo et les galeries'}
                {currentViewMode === 'management' && 'Administration système et gestion'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2 border-border text-border-light hover:text-foreground hover:border-accent"
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6"
          >
            {/* Custom Header Content */}
            {headerContent}

            {/* Overview View */}
            {currentViewMode === 'overview' && (
              <motion.div variants={itemVariants} className="space-y-6">
                <StatsGrid stats={dashboardStats} />

                {/* New Dashboard Features Quick Access */}
                <DashboardSection title="Fonctionnalités du Dashboard">
                  <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                      <span className="text-sm text-accent font-medium">Nouvelles fonctionnalités disponibles</span>
                    </div>
                    <p className="text-xs text-border-light mt-1">
                       Accédez aux outils avancés de surveillance des workflows, d&apos;assurance qualité et de documentation photo
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DashboardWidget
                      title="Exécution de Workflow"
                      icon={Workflow}
                      content="Surveiller l'avancement des workflows en temps réel et la completion des étapes"
                      onClick={() => handleViewModeChange('workflows')}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-accent"
                    />
                    <DashboardWidget
                      title="Assurance Qualité"
                      icon={Shield}
                      content="Suivre les métriques qualité, la conformité et la résolution des problèmes"
                      onClick={() => handleViewModeChange('quality')}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-accent"
                    />
                    <DashboardWidget
                      title="Documentation Photo"
                      icon={Camera}
                      content="Gérer les uploads de photos, galeries et évaluation de qualité"
                      onClick={() => handleViewModeChange('photos')}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-purple-400"
                    />
                  </div>
                </DashboardSection>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {showPerformanceMetrics && (
                    <PerformanceMetrics metrics={dashboardStats} />
                  )}
                  {showQuickActions && (
                    <QuickActions onNewTask={handleNewTask} />
                  )}
                </div>

                {showRecentTasks && (
                  <RecentTasksPreview
                    tasks={filteredTasks.slice(0, 5)}
                    onTaskClick={handleTaskSelect}
                  />
                )}
              </motion.div>
            )}

            {/* Tasks View */}
            {currentViewMode === 'tasks' && (
              <motion.div variants={itemVariants} className="space-y-6">
                <DashboardSection title="Task Management">
                  <TaskFilters
                    searchQuery={searchTerm}
                    onSearch={handleSearch}
                    statusFilter={activeStatusFilter}
                    onStatusFilterChange={handleStatusFilterChange}
                    priorityFilter={activePriorityFilter}
                    onPriorityFilterChange={handlePriorityFilterChange}
                    technicianFilter={selectedTechnicianFilter}
                    onTechnicianFilterChange={handleTechnicianSelect}
                    technicians={technicians}
                    sortBy={currentSortBy}
                    sortOrder={currentSortOrder}
                    onSortChange={setCurrentSortBy}
                    onResetFilters={handleResetFilters}
                    enableSearch={enableSearch}
                    enableStatusFilter={enableStatusFilter}
                    enablePriorityFilter={enablePriorityFilter}
                    enableTechnicianFilter={enableTechnicianFilter}
                    statusFilterOptions={statusFilterOptions}
                    priorityFilterOptions={priorityFilterOptions}
                  />
                  <TaskList
                    tasks={filteredTasks}
                    onTaskUpdate={onTaskUpdate}
                    onTaskDelete={onTaskDelete}
                    onTaskSelect={onTaskSelect}
                    selectedTaskId={selectedTaskId}
                    showTaskCount={showTaskCount}
                    emptyState={emptyState}
                  />
                </DashboardSection>
              </motion.div>
            )}

            {/* Analytics View */}
            {currentViewMode === 'analytics' && showAnalytics && (
              <motion.div variants={itemVariants} className="space-y-6">
                <DashboardSection title="Analytics & Performance">
                  <StatisticsCharts 
                    stats={dashboardStats} 
                  />
                </DashboardSection>
              </motion.div>
            )}

            {/* Workflow Execution View */}
            {currentViewMode === 'workflows' && (
              <motion.div variants={itemVariants} className="space-y-6">
                <WorkflowExecutionDashboard />
              </motion.div>
            )}

            {/* Quality Assurance View */}
            {currentViewMode === 'quality' && (
              <motion.div variants={itemVariants} className="space-y-6">
                <QualityAssuranceDashboard />
              </motion.div>
            )}

            {/* Photo Documentation View */}
            {currentViewMode === 'photos' && (
              <motion.div variants={itemVariants} className="space-y-6">
                <PhotoDocumentationDashboard />
              </motion.div>
            )}

            {/* Management View */}
            {currentViewMode === 'management' && (
              <motion.div variants={itemVariants} className="space-y-6">
                <DashboardSection title="Management Tools">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DashboardWidget
                      title="Team Performance"
                      icon={Users}
                      content="Team performance metrics and insights"
                    />
                    <DashboardWidget
                      title="Quality Assurance"
                      icon={CheckCircle}
                      content="Quality metrics and compliance tracking"
                    />
                    <DashboardWidget
                      title="System Health"
                      icon={Activity}
                      content="System status and health monitoring"
                    />
                  </div>
                </DashboardSection>
              </motion.div>
            )}

            {/* Custom Footer Content */}
            {footerContent}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

// Sidebar Item Component
const SidebarItem = ({
  icon: Icon,
  children,
  isActive = false,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}) => {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-left cursor-pointer border border-transparent',
        isActive
          ? 'bg-accent/20 border-l-2 border-accent text-accent shadow-sm'
          : 'text-border-light hover:bg-border hover:text-foreground hover:shadow-sm hover:border-border'
      )}
    >
      <Icon className={cn('mr-3 h-5 w-5', isActive ? 'text-accent' : 'text-border-light group-hover:text-foreground')} />
      {children}
    </button>
  );
};

export default Dashboard;