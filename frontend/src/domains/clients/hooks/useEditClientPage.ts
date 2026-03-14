import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { logger } from '@/lib/logging';
import { LogDomain } from '@/lib/logging/types';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { Client, UpdateClientDTO } from '@/shared/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { clientService } from '../server';

interface UseEditClientPageOptions {
  params: { id: string };
}

export function useEditClientPage({ params }: UseEditClientPageOptions) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    id: '',
    name: '',
    email: undefined,
    phone: undefined,
    address_street: undefined,
    address_city: undefined,
    address_state: undefined,
    address_zip: undefined,
    address_country: undefined,
    company_name: undefined,
    customer_type: 'individual',
    notes: undefined,
  });
  const [formErrors, setFormErrors] = useState<Partial<UpdateClientDTO & { general?: string }>>({});

  const loadClient = useCallback(async () => {
    if (!params?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await clientService.getClientById(params.id, user?.token);
      if (response.error) {
        setError(typeof response.error === 'string' ? response.error : response.error.message || 'Client not found');
        return;
      }

      if (response.data) {
        setClient(response.data);
        setFormData({
          id: response.data.id,
          name: response.data.name,
          email: response.data.email || undefined,
          phone: response.data.phone || undefined,
          address_street: response.data.address_street || undefined,
          address_city: response.data.address_city || undefined,
          address_state: response.data.address_state || undefined,
          address_zip: response.data.address_zip || undefined,
          address_country: response.data.address_country || undefined,
          company_name: response.data.company_name || undefined,
          customer_type: response.data.customer_type === 'business' ? 'business' : 'individual',
          notes: response.data.notes || undefined,
        });
      }
    } catch (err) {
      setError('An unexpected error occurred');
      logger.error(LogDomain.CLIENT, 'Error loading client', err instanceof Error ? err : new Error(String(err)), { client_id: params?.id });
    } finally {
      setLoading(false);
    }
  }, [params?.id, user?.token]);

  useEffect(() => {
    if (params?.id && user) {
      loadClient();
    }
  }, [params?.id, user, loadClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!params?.id || !user) {
      toast.error('Invalid request');
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({});

      if (!user?.token) {
        setFormErrors({ general: 'Authentification requise' });
        return;
      }

      const response = await clientService.updateClient(params.id, formData, user.token);
      if (response.error) {
        setFormErrors({ general: response.error || 'Échec de la mise à jour du client' });
        return;
      }

      router.push(`/clients/${params.id}`);
    } catch (submitError) {
      logger.error(LogDomain.CLIENT, 'Error updating client', submitError instanceof Error ? submitError : new Error(String(submitError)), { client_id: params?.id });
      setFormErrors({ general: 'An unexpected error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (params?.id) {
      router.push(`/clients/${params.id}`);
    }
  };

  const handleInputChange = (field: keyof UpdateClientDTO, value: string) => {
    const finalValue = value.trim() === '' ? undefined : value;
    setFormData((prev: Partial<Client>) => ({ ...prev, [field]: finalValue }));
    if (formErrors[field]) {
      setFormErrors((prev: Record<string, string | undefined>) => ({ ...prev, [field]: undefined }));
    }
  };

  return {
    client,
    loading,
    error,
    submitting,
    formData,
    formErrors,
    params,
    t,
    handleSubmit,
    handleCancel,
    handleInputChange,
  };
}
