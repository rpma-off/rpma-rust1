'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { clientService } from '@/lib/services/entities/client.service';
import { Plus, Edit, Trash2, ArrowLeft, Mail, Phone, MapPin, Building2, User, Building } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ClientWithTasks, Task } from '@/types';
import { convertTimestamps } from '@/lib/types';

interface ClientDetailPageProps {
  params: {
    id: string;
  };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<ClientWithTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load client
  const loadClient = useCallback(async () => {
    if (!params?.id || !user?.token) return;

    try {
      setLoading(true);
      setError(null);

      const clientData = await clientService.getClientWithTasks(params.id, user.token);
      if (clientData) {
        const convertedClient = convertTimestamps(clientData) as ClientWithTasks;
        if (convertedClient.tasks) {
          convertedClient.tasks = convertedClient.tasks.map(task => convertTimestamps(task) as Task);
        }
        setClient(convertedClient);
      }
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

      const response = await clientService.deleteClient(params.id, user.token);
      if (response.error) {
        setError(response.error || 'Failed to delete client');
        return;
      }

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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/clients"
            className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Clients</span>
          </Link>
        </div>
        <Card className="border-red-700/50 bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-400 text-lg font-medium">{error || 'Client not found'}</p>
              <p className="text-zinc-400 text-sm mt-2">Please check the client ID or try again later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="bg-zinc-900/50 rounded-xl p-4 md:p-6 border border-zinc-800">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-start space-x-4 md:space-x-6">
            <Link
              href="/clients"
              className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors mt-2 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Back to Clients</span>
              <span className="text-sm sm:hidden">Back</span>
            </Link>
            <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
              <Avatar className="h-12 w-12 md:h-16 md:w-16 flex-shrink-0">
                <AvatarFallback className="bg-zinc-700 text-white text-lg md:text-xl">
                  {client.customer_type === 'business' ? <Building className="h-6 w-6 md:h-8 md:w-8" /> : <User className="h-6 w-6 md:h-8 md:w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{client.name}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-2">
                  <Badge variant={client.customer_type === 'business' ? 'secondary' : 'default'} className="w-fit">
                    {client.customer_type === 'business' ? 'Business Client' : 'Individual Client'}
                  </Badge>
                  <span className="text-zinc-400 text-sm">
                    Since {client.created_at ? new Date(client.created_at as unknown as string).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
            <Button onClick={handleCreateTask} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Task</span>
            </Button>
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {client.email && (
                  <div className="flex items-center space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                    <Mail className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">Email</p>
                      <p className="text-zinc-200 font-medium">{client.email}</p>
                    </div>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                    <Phone className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">Phone</p>
                      <p className="text-zinc-200 font-medium">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.company_name && (
                  <div className="flex items-center space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                    <Building2 className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">Company</p>
                      <p className="text-zinc-200 font-medium">{client.company_name}</p>
                    </div>
                  </div>
                )}
                {(client.address_street || client.address_city) && (
                  <div className="flex items-center space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-400 uppercase tracking-wide">Address</p>
                      <p className="text-zinc-200 font-medium">
                        {[client.address_street, client.address_city, client.address_zip, client.address_country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Tasks</CardTitle>
                {client.tasks && client.tasks.length > 5 && (
                  <Link
                    href={`/tasks?clientId=${params.id}`}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    View all ({client.tasks.length})
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {client.tasks && client.tasks.length > 0 ? (
                <div className="space-y-4">
                  {client.tasks.slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{task.title}</p>
                          <div className="flex items-center space-x-4 text-sm text-zinc-400">
                            {task.vehicle_plate && <span>Plate: {task.vehicle_plate}</span>}
                            {task.vehicle_model && <span>Model: {task.vehicle_model}</span>}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <Badge
                            variant={
                              task.status === 'completed' ? 'success' :
                              task.status === 'in_progress' ? 'default' :
                              'secondary'
                            }
                          >
                            {task.status?.replace('_', ' ')}
                          </Badge>
                          <p className="text-zinc-400 text-xs">
                            {task.created_at ? new Date(task.created_at as unknown as string).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-400 mb-4">No tasks found for this client</p>
                  <Button onClick={handleCreateTask} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Client Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">{client.tasks?.length || 0}</div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Tasks</div>
                </div>
                <div className="text-center p-3 bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {client.tasks?.filter(t => t.status === 'completed').length || 0}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wide">Completed</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">In Progress</span>
                  <Badge variant="default">
                    {client.tasks?.filter(t => t.status === 'in_progress').length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Pending</span>
                  <Badge variant="secondary">
                    {client.tasks?.filter(t => t.status === 'pending').length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Client Since</span>
                  <span className="text-white text-sm font-medium">
                    {client.created_at ? new Date(client.created_at as unknown as string).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {client.tasks && client.tasks.length > 0 ? (
                <div className="space-y-3">
                  {client.tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-2 bg-zinc-800/30 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-zinc-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        <p className="text-xs text-zinc-400">
                          {task.created_at ? new Date(task.created_at as unknown as string).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {client.tasks.length > 3 && (
                    <Link
                      href={`/tasks?clientId=${params.id}`}
                      className="text-sm text-zinc-400 hover:text-white transition-colors block text-center pt-2"
                    >
                      View all activity →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 text-sm leading-relaxed">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
