import { dashboardIpc } from '../ipc';
import type { DashboardStats, RecentActivity } from '../api/types';

export class DashboardService {
  private static instance: DashboardService;

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async getStats(timeRange: 'day' | 'week' | 'month' | 'year' = 'day'): Promise<DashboardStats> {
    try {
      const result = await dashboardIpc.getStats(timeRange);
      
      return {
        tasks: {
          total: result.tasks?.total || 0,
          completed: result.tasks?.completed || 0,
          pending: result.tasks?.pending || 0,
          active: result.tasks?.active || 0,
          overdue: 0,
        },
        clients: {
          total: result.clients?.total || 0,
          active: result.clients?.active || 0,
          new_this_month: 0,
        },
        users: {
          total: result.users?.total || 0,
          active: result.users?.active || 0,
          admins: result.users?.admins || 0,
          technicians: result.users?.technicians || 0,
        },
        sync: {
          status: result.sync?.status as 'idle' | 'syncing' | 'error' || 'idle',
          pending_operations: result.sync?.pending_operations || 0,
          completed_operations: result.sync?.completed_operations || 0,
          last_sync: new Date().toISOString(),
        },
        interventions: {
          total: 0,
          in_progress: 0,
          completed_today: 0,
          upcoming: 0,
        },
        inventory: {
          total_materials: 0,
          low_stock: 0,
          out_of_stock: 0,
        },
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const mockActivities: RecentActivity[] = [
      {
        id: '1',
        type: 'task',
        title: 'Nouvelle tâche créée',
        description: 'Installation PPF - Peugeot 308',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        user: 'Jean Dupont',
      },
      {
        id: '2',
        type: 'intervention',
        title: 'Intervention complétée',
        description: 'Film complet - Renault Clio',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        user: 'Marie Martin',
      },
      {
        id: '3',
        type: 'client',
        title: 'Nouveau client ajouté',
        description: 'Sophie Bernard - sophie@email.com',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        user: 'Système',
      },
      {
        id: '4',
        type: 'quote',
        title: 'Devis envoyé',
        description: 'Devis #1234 pour Peugeot 208',
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        user: 'Jean Dupont',
      },
      {
        id: '5',
        type: 'inventory',
        title: 'Stock mis à jour',
        description: 'Matériel Xpel - 10 unités ajoutées',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        user: 'Marie Martin',
      },
      {
        id: '6',
        type: 'sync',
        title: 'Synchronisation terminée',
        description: '5 opérations synchronisées',
        timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
        user: 'Système',
      },
    ];

    return mockActivities.slice(0, limit);
  }
}

export const dashboardService = DashboardService.getInstance();
