'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DesktopTable, Column } from '../ui/DesktopTable';
import { EntitySyncIndicator } from '../sync/EntitySyncIndicator';
import { DesktopForm } from '../forms/DesktopForm';
import { z } from 'zod';
import { Plus, Calendar, User } from 'lucide-react';
import { Task, Client } from '@/types';
import { convertTimestamps } from '@/lib/types';
import { UpdateTaskRequest } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { handleError } from '@/lib/utils/error-handler';
import { LogDomain } from '@/lib/logging/types';

// Validation schema for task creation/editing
const taskSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional(),
  client_id: z.string().min(1, 'Le client est requis'),
  priority: z.enum(['low', 'medium', 'high']),
  scheduled_date: z.string().optional(),
});

interface TaskWithClient extends Task {
  client_name?: string;
}

export default function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.token) return;

    try {
      setIsLoading(true);
      const [tasksResult, clientsResult, clientsResult2] = await Promise.all([
        ipcClient.tasks.list({ page: 1, limit: 100, status: null, technician_id: null, client_id: null, priority: null, search: null, from_date: null, to_date: null, sort_by: "created_at", sort_order: "desc" }, user.token),
        ipcClient.clients.list({ page: 1, limit: 100, sort_by: "created_at", sort_order: "desc" }, user.token),
        ipcClient.clients.list({ page: 1, limit: 100, sort_by: "name", sort_order: "asc" }, user.token),
      ]);

      const tasksData = tasksResult;
      const clientsData = clientsResult;
      const clientsData2 = clientsResult2;

      if (tasksData && clientsData && clientsData2) {
        // Convert data types and merge client names into tasks for display
        const convertedTasks = tasksData.data.map(task => convertTimestamps(task));
        const convertedClients = clientsData.data.map(client => convertTimestamps(client));

        const tasksWithClients = convertedTasks.map((task) => ({
          ...task,
          client_name: convertedClients.find((c) => c.id === task.client_id)?.name || 'Client inconnu',
        })) as unknown as TaskWithClient[];
        setTasks(tasksWithClients);
        setClients(convertedClients as unknown as Client[]);
      }
    } catch (error) {
      handleError(error, 'Failed to load tasks and clients', {
        domain: LogDomain.TASK,
        userId: user?.user_id,
        component: 'TaskManager',
        toastMessage: 'Erreur lors du chargement des données'
      });
     } finally {
      setIsLoading(false);
    }
  }, [user?.token, user?.user_id]);

  // Load tasks and clients on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = useCallback(async (data: z.infer<typeof taskSchema>) => {
    if (!user?.token) return;

    try {
      const taskData = {
        title: data.title,
        description: data.description || '',
        client_id: data.client_id,
        priority: data.priority,
        scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
        status: 'draft' as const,
        vehicle_plate: 'UNKNOWN', // Required field
        vehicle_model: 'UNKNOWN', // Required field
        ppf_zones: [], // Required field
        external_id: null,
        technician_id: null,
        start_time: null,
        end_time: null,
        checklist_completed: false,
        notes: null,
        vehicle_make: null,
        vehicle_year: null,
        vin: null,
        date_rdv: null,
        heure_rdv: null,
        lot_film: null,
        customer_name: null,
        customer_email: null,
        customer_phone: null,
        customer_address: null,
        custom_ppf_zones: null,
        template_id: null,
        workflow_id: null,
        task_number: null,
        creator_id: user?.user_id || null,
        created_by: user?.user_id || null,
        estimated_duration: null,
        tags: null,
      };

      await ipcClient.tasks.create(taskData, user.token);
      setShowCreateForm(false);
      loadData();
    } catch (error) {
      handleError(error, 'Task creation failed', {
        domain: LogDomain.TASK,
        userId: user?.user_id,
        component: 'TaskManager',
        toastMessage: 'Erreur lors de la création de la tâche'
      });
      throw error;
    }
  }, [loadData, user?.token, user?.user_id]);

  const handleUpdateTask = useCallback(async (data: z.infer<typeof taskSchema>) => {
    if (!editingTask || !user?.token) return;

    try {
      const updateData: UpdateTaskRequest = {
        id: editingTask.id,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: null,
        vehicle_plate: null,
        vehicle_model: null,
        vehicle_year: null,
        vehicle_make: null,
        vin: null,
        ppf_zones: null,
        custom_ppf_zones: null,
        client_id: data.client_id,
        customer_name: null,
        customer_email: null,
        customer_phone: null,
        customer_address: null,
        external_id: null,
        lot_film: null,
        checklist_completed: null,
        scheduled_date: data.scheduled_date || null,
        start_time: null,
        end_time: null,
        date_rdv: null,
        heure_rdv: null,
        template_id: null,
        workflow_id: null,
        estimated_duration: null,
        notes: null,
        tags: null,
        technician_id: null
      };

      await ipcClient.tasks.update(editingTask.id, updateData, user.token);
      setEditingTask(null);
      loadData();
    } catch (error) {
      handleError(error, 'Task update failed', {
        domain: LogDomain.TASK,
        userId: user?.user_id,
        component: 'TaskManager',
        toastMessage: 'Erreur lors de la mise à jour de la tâche'
      });
      throw error;
    }
  }, [editingTask, loadData, user?.token, user?.user_id]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!user?.token) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;

    try {
      await ipcClient.tasks.delete(taskId, user.token);
      loadData();
    } catch (error) {
      handleError(error, 'Task deletion failed', {
        domain: LogDomain.TASK,
        userId: user?.user_id,
        component: 'TaskManager',
        toastMessage: 'Erreur lors de la suppression de la tâche'
      });
    }
  }, [loadData, user?.token, user?.user_id]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  // Table columns configuration
  const taskColumns = useMemo(() => [
    {
      key: 'title',
      title: 'Titre',
      label: 'Titre',
      render: (value: unknown, item: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{(item as unknown as TaskWithClient).title}</span>
          <EntitySyncIndicator entityType="task" entityId={(item as unknown as TaskWithClient).id} />
        </div>
      ),
    },
    {
      key: 'client_name',
      title: 'Client',
      label: 'Client',
      render: (value: unknown, item: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          {(item as unknown as TaskWithClient).client_name}
        </div>
      ),
    },
    {
      key: 'priority',
      title: 'Priorité',
      label: 'Priorité',
      render: (value: unknown, item: Record<string, unknown>) => {
        const clientItem = item as unknown as TaskWithClient;
        const colors = {
          low: 'bg-green-100 text-green-800',
          medium: 'bg-yellow-100 text-yellow-800',
          high: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[clientItem.priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
            {clientItem.priority === 'low' ? 'Basse' : clientItem.priority === 'high' ? 'Haute' : 'Moyenne'}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Statut',
      label: 'Statut',
      render: (value: unknown, item: Record<string, unknown>) => {
        const clientItem = item as unknown as TaskWithClient;
        const colors = {
          draft: 'bg-gray-100 text-gray-800',
          scheduled: 'bg-yellow-100 text-yellow-800',
          in_progress: 'bg-blue-100 text-blue-800',
          completed: 'bg-green-100 text-green-800',
          cancelled: 'bg-red-100 text-red-800',
          on_hold: 'bg-orange-100 text-orange-800',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[clientItem.status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
            {clientItem.status === 'draft' ? 'Brouillon' :
             clientItem.status === 'scheduled' ? 'Planifiée' :
             clientItem.status === 'in_progress' ? 'En cours' :
             clientItem.status === 'completed' ? 'Terminée' :
             clientItem.status === 'cancelled' ? 'Annulée' :
             clientItem.status === 'on_hold' ? 'En attente' : clientItem.status}
          </span>
        );
      },
    },
    {
      key: 'scheduled_date',
      title: 'Date prévue',
      label: 'Date prévue',
      render: (value: unknown, item: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          {(item as unknown as TaskWithClient).scheduled_date ? new Date((item as unknown as TaskWithClient).scheduled_date! as unknown as string).toLocaleDateString('fr-FR') : '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      label: 'Actions',
      render: (value: unknown, item: Record<string, unknown>) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditTask(item as unknown as TaskWithClient)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Modifier
          </button>
          <button
            onClick={() => handleDeleteTask((item as unknown as TaskWithClient).id)}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Supprimer
          </button>
        </div>
      ),
    },
  ], [handleEditTask, handleDeleteTask]);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des tâches</h1>
          <p className="text-gray-600 mt-1">Suivez et gérez vos interventions PPF</p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nouvelle tâche
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingTask) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-2xl shadow-2xl border border-border/20 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTask(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <DesktopForm
              schema={taskSchema}
              onSubmit={(data) => {
                const taskData = data as z.infer<typeof taskSchema>;
                return editingTask ? handleUpdateTask(taskData) : handleCreateTask(taskData);
              }}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingTask(null);
              }}
              submitLabel={editingTask ? 'Mettre à jour' : 'Créer'}
             >
               {(form) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre
                    </label>
                    <input
                      {...form.register('title')}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titre de l'intervention"
                      defaultValue={editingTask?.title}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      {...form.register('description')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Description détaillée de l'intervention"
                       defaultValue={editingTask?.description || undefined}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client
                    </label>
                    <select
                      {...form.register('client_id')}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorité
                    </label>
                    <select
                      {...form.register('priority')}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={editingTask?.priority || 'medium'}
                    >
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date prévue (optionnel)
                    </label>
                    <input
                      {...form.register('scheduled_date')}
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </DesktopForm>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-muted/50 p-6 rounded-xl border border-border/20 shadow-lg backdrop-blur-sm">
        <DesktopTable
          data={tasks as unknown as Record<string, unknown>[]}
          columns={taskColumns as Column<Record<string, unknown>>[]}
          searchable={true}
          emptyMessage="Aucune tâche trouvée"
        />
      </div>
    </div>
  );
}