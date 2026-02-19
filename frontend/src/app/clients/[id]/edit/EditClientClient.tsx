'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/domains/auth';
import { ArrowLeft, Save, X } from 'lucide-react';
import Link from 'next/link';
import type { Client } from '@/shared/types';
import { convertTimestamps } from '@/shared/utils';
import { ipcClient } from '@/shared/utils';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

interface EditClientClientProps {
  params: {
    id: string;
  };
}

export default function EditClientClient({ params }: EditClientClientProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_country: 'France',
    company_name: '',
    customer_type: 'individual' as 'individual' | 'business',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load client
  const loadClient = useCallback(async () => {
    if (!params?.id) return;

    try {
      setLoading(true);
      setError(null);

      const clientData = await ipcClient.clients.get(params.id, user?.token || '');

      if (!clientData) {
        setError(t('clients.notFound'));
        return;
      }

      setClient(convertTimestamps(clientData) as unknown as Client);
      setFormData({
        name: clientData.name,
        email: clientData.email || '',
        phone: clientData.phone || '',
        address_street: clientData.address_street || '',
        address_city: clientData.address_city || '',
        address_state: clientData.address_state || '',
        address_zip: clientData.address_zip || '',
        address_country: clientData.address_country || 'France',
        company_name: clientData.company_name || '',
        customer_type: (clientData.customer_type === 'individual' || clientData.customer_type === 'business') ? clientData.customer_type as 'individual' | 'business' : 'individual',
        notes: clientData.notes || ''
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!params?.id || !user) {
      toast.error(t('errors.invalidRequest'));
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({});

      if (!user?.id) {
        setFormErrors({ general: t('errors.authRequired') });
        return;
      }

      await ipcClient.clients.update(params.id, { ...formData, id: params.id }, user.token);

      router.push(`/clients/${params.id}`);
    } catch (error) {
      console.error('Error updating client:', error);
      setFormErrors({ general: t('errors.unexpected') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (params?.id) {
      router.push(`/clients/${params.id}`);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return <LoadingState />;
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
            <span>{t('clients.backToClients')}</span>
          </Link>
        </div>
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-8 text-center">
          <p className="text-red-400">{error || t('clients.notFound')}</p>
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
            href={`/clients/${params?.id}`}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('clients.backTo')} {client.name}</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('clients.editClient')}</h1>
            <p className="text-muted-foreground mt-1">{t('clients.updateClientInfo')}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {formErrors.general && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{formErrors.general}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
              {t('forms.name')} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 bg-[hsl(var(--rpma-surface))] border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500 ${
                formErrors.name ? 'border-red-500' : 'border-[hsl(var(--rpma-border))]'
              }`}
              placeholder={t('forms.enterClientName')}
              required
            />
            {formErrors.name && <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>}
          </div>

          {/* Customer Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('clients.customerType')} *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="customer_type"
                  value="individual"
                  checked={formData.customer_type === 'individual'}
                  onChange={(e) => handleInputChange('customer_type', e.target.value as 'individual' | 'business')}
                  className="mr-2"
                />
                <span className="text-muted-foreground">{t('clients.individual')}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="customer_type"
                  value="business"
                  checked={formData.customer_type === 'business'}
                  onChange={(e) => handleInputChange('customer_type', e.target.value as 'individual' | 'business')}
                  className="mr-2"
                />
                <span className="text-muted-foreground">{t('clients.business')}</span>
              </label>
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
              {t('clients.email')}
            </label>
            <input
              type="email"
              id="email"
              value={formData.email ?? ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 bg-[hsl(var(--rpma-surface))] border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500 ${
                formErrors.email ? 'border-red-500' : 'border-[hsl(var(--rpma-border))]'
              }`}
              placeholder={t('forms.enterEmail')}
            />
            {formErrors.email && <p className="text-red-400 text-sm mt-1">{formErrors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-2">
              {t('clients.phone')}
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone ?? ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full px-3 py-2 bg-[hsl(var(--rpma-surface))] border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500 ${
                formErrors.phone ? 'border-red-500' : 'border-[hsl(var(--rpma-border))]'
              }`}
              placeholder={t('forms.enterPhone')}
            />
            {formErrors.phone && <p className="text-red-400 text-sm mt-1">{formErrors.phone}</p>}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-muted-foreground mb-2">
              {t('clients.address')}
            </label>
            <textarea
              id="address_street"
              value={formData.address_street ?? ''}
              onChange={(e) => handleInputChange('address_street', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 bg-[hsl(var(--rpma-surface))] border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500 ${
                formErrors.address_street ? 'border-red-500' : 'border-[hsl(var(--rpma-border))]'
              }`}
              placeholder={t('forms.enterAddress')}
            />
            {formErrors.address && <p className="text-red-400 text-sm mt-1">{formErrors.address}</p>}
          </div>

          {/* Company Name (only for business) */}
          {formData.customer_type === 'business' && (
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-muted-foreground mb-2">
                {t('clients.company')}
              </label>
              <input
                type="text"
                id="company_name"
                value={formData.company_name ?? ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className={`w-full px-3 py-2 bg-[hsl(var(--rpma-surface))] border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500 ${
                  formErrors.company_name ? 'border-red-500' : 'border-[hsl(var(--rpma-border))]'
                }`}
                placeholder={t('forms.enterCompanyName')}
              />
              {formErrors.company_name && <p className="text-red-400 text-sm mt-1">{formErrors.company_name}</p>}
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-2">
              {t('clients.notes')}
            </label>
            <textarea
              id="notes"
              value={formData.notes ?? ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 bg-[hsl(var(--rpma-surface))] border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500 ${
                formErrors.notes ? 'border-red-500' : 'border-[hsl(var(--rpma-border))]'
              }`}
              placeholder={t('forms.enterNotes')}
            />
            {formErrors.notes && <p className="text-red-400 text-sm mt-1">{formErrors.notes}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-[hsl(var(--rpma-border))]">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>{t('common.cancel')}</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 disabled:bg-muted text-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{submitting ? t('common.updating') : t('clients.updateClient')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
