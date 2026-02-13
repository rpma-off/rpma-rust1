'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { clientService } from '@/lib/services/entities/client.service';
import { Plus, Edit, Trash2, ArrowLeft, Mail, Phone, MapPin, Building2, User, Building } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientWithTasks, Task } from '@/types';
import { convertTimestamps } from '@/lib/types';
import { useTranslation } from '@/hooks/useTranslation';
import { formatClientDate } from './date-format';

interface ClientDetailPageProps {
  params: {
    id: string;
  };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { t } = useTranslation();
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

      const response = await clientService.getClientWithTasks(params.id, user.token);
      if (!response.success || !response.data) {
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error?.message || t('clients.notFound');
        setError(errorMessage);
        return;
      }

      const convertedClient = convertTimestamps(response.data) as ClientWithTasks;
      if (convertedClient.tasks) {
        convertedClient.tasks = convertedClient.tasks.map(task => convertTimestamps(task) as Task);
      }
      setClient(convertedClient);
    } catch (err) {
      setError(t('errors.unexpected'));
      console.error('Error loading client:', err);
    } finally {
      setLoading(false);
    }
  }, [params?.id, user?.token, t]);

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

    if (!confirm(t('confirm.deleteClient', { name: client.name }))) {
      return;
    }

    try {
      if (!user?.id) {
        setError(t('errors.authRequired'));
        return;
      }

      const response = await clientService.deleteClient(params.id, user.token);
      if (response.error) {
        setError(response.error || t('errors.deleteFailed'));
        return;
      }

      router.push('/clients');
    } catch (err) {
      setError(t('errors.unexpected'));
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
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('clients.backToClients')}</span>
          </Link>
        </div>
        <Card className="border-red-700/50 bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-400 text-lg font-medium">{error || t('clients.notFound')}</p>
              <p className="text-muted-foreground text-sm mt-2">{t('clients.checkId')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="rpma-shell p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-start space-x-4 md:space-x-6">
            <Link
              href="/clients"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mt-2 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">{t('clients.backToClients')}</span>
              <span className="text-sm sm:hidden">{t('common.back')}</span>
            </Link>
            <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
              <Avatar className="h-12 w-12 md:h-16 md:w-16 flex-shrink-0">
                <AvatarFallback className="bg-[hsl(var(--rpma-surface))] text-foreground text-lg md:text-xl">
                  {client.customer_type === 'business' ? <Building className="h-6 w-6 md:h-8 md:w-8" /> : <User className="h-6 w-6 md:h-8 md:w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{client.name}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-2">
                  <Badge variant={client.customer_type === 'business' ? 'secondary' : 'default'} className="w-fit">
                    {client.customer_type === 'business' ? t('clients.businessClient') : t('clients.individualClient')}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {t('clients.since')} {formatClientDate(client.created_at as unknown as string)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
            <Button onClick={handleCreateTask} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tasks.newTask')}</span>
            </Button>
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.edit')}</span>
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.delete')}</span>
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
              <CardTitle>{t('clients.contactInformation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {client.email && (
                  <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.email')}</p>
                      <p className="text-foreground font-medium">{client.email}</p>
                    </div>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.phone')}</p>
                      <p className="text-foreground font-medium">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.company_name && (
                  <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.company')}</p>
                      <p className="text-foreground font-medium">{client.company_name}</p>
                    </div>
                  </div>
                )}
                {(client.address_street || client.address_city) && (
                  <div className="flex items-center space-x-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.address')}</p>
                      <p className="text-foreground font-medium">
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
                <CardTitle>{t('clients.recentTasks')}</CardTitle>
                {client.tasks && client.tasks.length > 5 && (
                  <Link
                    href={`/tasks?clientId=${params.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('clients.viewAll')} ({client.tasks.length})
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
                      className="block p-4 bg-[hsl(var(--rpma-surface))] rounded-lg hover:bg-[hsl(var(--rpma-surface))] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-foreground font-medium mb-1">{task.title}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {task.vehicle_plate && <span>{t('tasks.plate')}: {task.vehicle_plate}</span>}
                            {task.vehicle_model && <span>{t('tasks.model')}: {task.vehicle_model}</span>}
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
                          <p className="text-muted-foreground text-xs">
                            {formatClientDate(task.created_at as unknown as string)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{t('clients.noTasks')}</p>
                  <Button onClick={handleCreateTask} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('clients.createFirstTask')}
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
              <CardTitle>{t('clients.clientOverview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[hsl(var(--rpma-surface))] rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{client.tasks?.length || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.totalTasks')}</div>
                </div>
                <div className="text-center p-3 bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {client.tasks?.filter(t => t.status === 'completed').length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('clients.completed')}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t('clients.inProgress')}</span>
                  <Badge variant="default">
                    {client.tasks?.filter(t => t.status === 'in_progress').length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t('clients.pending')}</span>
                  <Badge variant="secondary">
                    {client.tasks?.filter(t => t.status === 'pending').length || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t('clients.clientSince')}</span>
                  <span className="text-foreground text-sm font-medium">
                    {formatClientDate(client.created_at as unknown as string)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('clients.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              {client.tasks && client.tasks.length > 0 ? (
                <div className="space-y-3">
                  {client.tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-2 bg-[hsl(var(--rpma-surface))] rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-[hsl(var(--rpma-teal))]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatClientDate(task.created_at as unknown as string)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {client.tasks.length > 3 && (
                    <Link
                      href={`/tasks?clientId=${params.id}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors block text-center pt-2"
                    >
                      {t('clients.viewAllActivity')} →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">{t('clients.noRecentActivity')}</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('clients.notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
