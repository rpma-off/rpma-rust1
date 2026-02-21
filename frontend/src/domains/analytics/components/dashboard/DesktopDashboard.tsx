'use client';

import { useState, useEffect, useCallback } from 'react';
import { DesktopTable } from '@/components/ui/DesktopTable';
import { DesktopGPS } from '@/components/GPS/DesktopGPS';
import { Task } from '@/lib/backend';
import {
  BarChart3,
  Users,
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';

import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import { getTaskDisplayTitle, getTaskDisplayStatus, getTaskDisplayPriority } from '@/lib/utils/task-display';

interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalClients: number;
  syncStatus: 'online' | 'offline' | 'syncing';
  lastSync: string | null;
}

interface RecentTask extends Record<string, unknown> {
  id: string;
  title: string;
  client: string;
  status: string;
  priority: string;
  createdAt: string;
}

export function DesktopDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalClients: 0,
    syncStatus: 'offline',
    lastSync: null
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // Load stats from Tauri backend
      const dashboardStats = await ipcClient.dashboard.getStats() as DashboardStats;
      setStats(dashboardStats);

      // Load recent tasks
      if (!user?.token) {
        throw new Error('User not authenticated');
      }
      const taskListResponse = await ipcClient.tasks.list({
        page: 1,
        limit: 5,
        status: null,
        technician_id: null,
        client_id: null,
        priority: null,
        search: null,
        from_date: null,
        to_date: null,
        sort_by: "created_at",
        sort_order: "desc"
      }, user.token);
      setRecentTasks(taskListResponse.data.map((task: Task) => ({
        id: task.id,
        title: getTaskDisplayTitle(task),
        client: task.customer_name || 'Client inconnu',
        status: getTaskDisplayStatus(task.status),
        priority: getTaskDisplayPriority(task.priority),
        createdAt: new Date(Number(task.created_at)).toISOString()
      })));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Fallback to mock data
      setStats({
        totalTasks: 24,
        activeTasks: 8,
        completedTasks: 16,
        pendingTasks: 3,
        totalClients: 45,
        syncStatus: 'offline',
        lastSync: new Date().toISOString()
      });
      setRecentTasks([
        { id: '1', title: 'Application PPF Audi A4', client: 'Garage Central', status: 'En cours', priority: 'Haute', createdAt: '2025-01-15' },
        { id: '2', title: 'Réparation BMW X3', client: 'Auto Plus', status: 'Terminé', priority: 'Moyenne', createdAt: '2025-01-14' },
        { id: '3', title: 'Contrôle qualité Mercedes', client: 'Elite Cars', status: 'En attente', priority: 'Basse', createdAt: '2025-01-13' },
      ]);
     } finally {
      setIsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSyncNow = async () => {
    try {
      setStats(prev => ({ ...prev, syncStatus: 'syncing' }));
      await ipcClient.sync.syncNow();
      await loadDashboardData(); // Refresh data after sync
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En cours': return 'bg-blue-100 text-blue-800';
      case 'Terminé': return 'bg-green-100 text-green-800';
      case 'En attente': return 'bg-yellow-100 text-yellow-800';
      case 'Annulé': return 'bg-red-100 text-red-800';
      case 'Planifiée': return 'bg-blue-100 text-blue-800';
      case 'Brouillon': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'text-red-600';
      case 'Haute': return 'text-red-600';
      case 'Moyenne': return 'text-yellow-600';
      case 'Basse': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const taskColumns = [
    { key: 'title', title: 'Titre', label: 'Titre', sortable: true },
    { key: 'client', title: 'Client', label: 'Client', filterable: true },
    {
      key: 'status',
      title: 'Status',
      label: 'Status',
      filterable: true,
      render: (value: unknown) => {
        const stringValue = value as string;
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(stringValue)}`}>
            {stringValue}
          </span>
        );
      }
    },
    {
      key: 'priority',
      title: 'Priorité',
      label: 'Priorité',
      render: (value: unknown) => {
        const stringValue = value as string;
        return (
          <span className={`font-medium ${getPriorityColor(stringValue)}`}>
            {stringValue}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      title: 'Créé',
      label: 'Créé',
      sortable: true,
      render: (value: unknown) => {
        const stringValue = value as string;
        return stringValue ? new Date(stringValue).toLocaleDateString('fr-FR') : '-';
      }
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-gray-600 mt-1">Vue d&apos;ensemble de vos interventions PPF</p>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {stats.syncStatus === 'online' && <Wifi className="h-5 w-5 text-green-500" />}
            {stats.syncStatus === 'offline' && <WifiOff className="h-5 w-5 text-red-500" />}
            {stats.syncStatus === 'syncing' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
            <span className="text-sm text-gray-600">
              {stats.syncStatus === 'online' && 'Connecté'}
              {stats.syncStatus === 'offline' && 'Hors ligne'}
              {stats.syncStatus === 'syncing' && 'Synchronisation...'}
            </span>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={stats.syncStatus === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${stats.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Synchroniser
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background p-6 rounded-2xl shadow-2xl border border-border/20">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tâches actives</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-background p-6 rounded-2xl shadow-2xl border border-border/20">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Terminées</p>
              <p className="text-2xl font-bold text-foreground">{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-background p-6 rounded-2xl shadow-2xl border border-border/20">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-background p-6 rounded-2xl shadow-2xl border border-border/20">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Clients</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks and GPS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="bg-background p-6 rounded-2xl shadow-2xl border border-border/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Tâches récentes</h2>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <DesktopTable
            data={recentTasks}
            columns={taskColumns}
            searchable={false}
            emptyMessage="Aucune tâche récente"
          />
        </div>

        {/* GPS Component */}
        <div className="bg-background p-6 rounded-2xl shadow-2xl border border-border/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Localisation GPS</h2>
            <AlertTriangle className="h-5 w-5 text-gray-400" />
          </div>
          <DesktopGPS />
        </div>
      </div>

      {/* Last Sync Info */}
      {stats.lastSync && (
        <div className="text-center text-sm text-border">
          Dernière synchronisation: {new Date(stats.lastSync).toLocaleString('fr-FR')}
        </div>
      )}
    </div>
  );
}
