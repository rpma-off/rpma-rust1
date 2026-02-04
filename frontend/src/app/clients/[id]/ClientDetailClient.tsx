'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { Plus, Edit, Trash2, ArrowLeft, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import Link from 'next/link';
import type { Client, Task } from '@/types';
import { convertTimestamps } from '@/lib/types';
import { ipcClient } from '@/lib/ipc/client';

interface ClientDetailClientProps {
  params: {
    id: string;
  };
}

export default function ClientDetailClient({ params }: ClientDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load client
  const loadClient = useCallback(async () => {
    if (!params?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [clientData, tasksResponse] = await Promise.all([
        ipcClient.clients.get(params.id, user?.token || ''),
        ipcClient.tasks.list({ client_id: params.id }, user?.token || '')
      ]);

      if (!clientData) {
        setError('Client not found');
        return;
      }

      setClient(convertTimestamps(clientData) as unknown as Client);
      setTasks(tasksResponse.data.map(task => convertTimestamps(task)) as unknown as Task[]);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading client:', err);
    } finally {
      setLoading(false);
    }
  }, [params?.id, user?.token]);

  useEffect(() => {
    if (params?.id && user) {
      loadClient();
    }
  }, [params?.id, user, loadClient]);

  const handleEdit = () => {
    if (params?.id) {
      router.push(`/clients/${params.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!client || !params?.id) return;

    if (!confirm(`Are you sure you want to delete ${client.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      if (!user?.id) {
        setError('Authentication required');
        return;
      }

      await ipcClient.clients.delete(params.id, user.token);

      router.push('/clients');
    } catch (err) {
      setError('An unexpected error occurred while deleting the client');
      console.error('Error deleting client:', err);
    }
  };

  const handleCreateTask = () => {
    if (params?.id) {
      router.push(`/tasks/new?clientId=${params.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/clients"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Clients</span>
          </Link>
        </div>
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-8 text-center">
          <p className="text-red-400 text-lg">{error || 'Client not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/clients"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Clients</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-muted-foreground mt-1">
              {client.customer_type === 'business' ? 'Business Client' : 'Individual Client'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateTask}
            className="bg-green-600 hover:bg-green-700 text-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
          <button
            onClick={handleEdit}
            className="bg-[hsl(var(--rpma-surface))] hover:bg-[hsl(var(--rpma-teal))]/90 text-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Client Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
            <div className="space-y-3">
              {client.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{client.phone}</span>
                </div>
              )}
              {(client.address_street || client.address_city) && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {[client.address_street, client.address_city, client.address_zip, client.address_country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {client.company_name && (
                <div className="flex items-center space-x-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{client.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Tasks</h2>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
                    <div>
                      <p className="text-foreground font-medium">{task.title}</p>
                          <p className="text-muted-foreground text-sm">
                            {task.vehicle_plate && `Plate: ${task.vehicle_plate}`}
                            {task.vehicle_model && ` • ${task.vehicle_model}`}
                          </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'completed'
                          ? 'bg-green-900 text-green-300'
                          : task.status === 'in_progress'
                          ? 'bg-blue-900 text-blue-300'
                          : 'bg-[hsl(var(--rpma-surface))] text-muted-foreground'
                      }`}>
                        {task.status}
                      </span>
                          <p className="text-muted-foreground text-xs mt-1">
                            {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}
                          </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No tasks found for this client</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Tasks</span>
                <span className="text-foreground font-semibold">{tasks?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completed Tasks</span>
                <span className="text-foreground font-semibold">
                  {tasks?.filter(t => t.status === 'completed').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground font-semibold">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                  </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>
              <p className="text-muted-foreground">{client.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
