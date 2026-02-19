import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import type { Client } from '@/lib/backend';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { normalizeError } from '@/types/utility.types';

export interface UseClientOptions {
  clientId?: string;
  autoFetch?: boolean;
}

export interface UseClientReturn {
  // Data
  client: Client | null;

  // Loading states
  loading: boolean;

  // Error states
  error: Error | null;

  // Actions
  refetch: () => Promise<void>;
  setClientId: (clientId: string | undefined) => void;
}

export const useClient = (options: UseClientOptions = {}): UseClientReturn => {
  const { user } = useAuth();
  const { logInfo, logError } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useClient'
  });

  const { clientId: initialClientId, autoFetch = true } = options;

  const [clientId, setClientId] = useState<string | undefined>(initialClientId);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchClient = useCallback(async () => {
    if (!user?.token || !clientId) {
      setClient(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logInfo('Fetching client with tasks', { clientId });

      const result = await ipcClient.clients.getWithTasks(clientId, user.token);

      setClient(result);

      logInfo('Client fetched successfully', { clientId });

    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      logError('Failed to fetch client', normalizedError, { clientId });
      setError(normalizedError);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [user?.token, clientId, logInfo, logError]);

  const refetch = useCallback(async () => {
    await fetchClient();
  }, [fetchClient]);

  const handleSetClientId = useCallback((newClientId: string | undefined) => {
    setClientId(newClientId);
  }, []);

  // Auto-fetch when clientId changes
  useEffect(() => {
    if (autoFetch && clientId) {
      fetchClient();
    } else if (!clientId) {
      setClient(null);
      setError(null);
    }
  }, [fetchClient, autoFetch, clientId]);

  return {
    // Data
    client,

    // Loading states
    loading,

    // Error states
    error,

    // Actions
    refetch,
    setClientId: handleSetClientId,
  };
};
