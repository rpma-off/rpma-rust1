'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { logger } from '@/lib/logging';
import { LogDomain } from '@/lib/logging/types';
import type { CreateClientDTO } from '@/shared/types';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/shared/hooks/useAuth';
import { clientService } from '../server';

export function useNewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateClientDTO>({
    name: '',
    email: '',
    phone: '',
    address_street: '',
    company_name: '',
    customer_type: 'individual',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<CreateClientDTO & { general?: string }>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t('errors.unauthorized'));
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      if (!user?.id) {
        setErrors({ general: t('auth.authRequired') });
        return;
      }

      const response = await clientService.createClient(formData, user.token);
      if (response.error) {
        setErrors({ general: response.error });
        return;
      }

      if (response.data) {
        toast.success(t('clients.clientCreated'));
        router.push(`/clients/${response.data.id}`);
      }
    } catch (err) {
      logger.error(LogDomain.CLIENT, 'Error creating client', err instanceof Error ? err : new Error(String(err)));
      setErrors({ general: t('errors.unexpectedError') });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/clients');
  };

  const handleInputChange = (field: keyof CreateClientDTO, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return {
    t,
    loading,
    formData,
    errors,
    handleSubmit,
    handleCancel,
    handleInputChange,
  };
}
