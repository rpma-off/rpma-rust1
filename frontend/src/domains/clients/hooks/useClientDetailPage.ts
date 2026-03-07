import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/domains/auth';
import { clientService } from '../server';
import { ClientWithTasks, Task } from '@/shared/types';
import { convertTimestamps } from '@/shared/utils';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface UseClientDetailPageOptions {
  params: { id: string };
}

export function useClientDetailPage({ params }: UseClientDetailPageOptions) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<ClientWithTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return {
    client,
    loading,
    error,
    params,
    t,
    handleEdit,
    handleDelete,
    handleCreateTask,
  };
}
