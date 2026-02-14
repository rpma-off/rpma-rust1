'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/compatibility';
import { clientService } from '@/lib/services/entities/client.service';
import { ArrowLeft, Save, X, Edit, User, Building } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Client } from '@/lib/backend';
import { LoadingState } from '@/components/layout/LoadingState';
import type { UpdateClientDTO, ClientType } from '@/types/client.types';
import { useTranslation } from '@/hooks/useTranslation';

interface EditClientPageProps {
  params: {
    id: string;
  };
}

export default function EditClientPage({ params }: EditClientPageProps) {
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
    notes: undefined
  });
  const [formErrors, setFormErrors] = useState<Partial<UpdateClientDTO & { general?: string }>>({});

  // Load client
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
          notes: response.data.notes || undefined
        });
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
    } catch (error) {
      console.error('Error updating client:', error);
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

  if (loading) {
    return <LoadingState />;
  }

  if (error || !client) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/clients"
            className="flex items-center space-x-2 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('clients.backToClients')}</span>
          </Link>
        </div>
        <Card className="border-red-700/50 bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-400 text-lg font-medium">{error || t('clients.notFound')}</p>
              <p className="text-muted-foreground text-sm mt-2">{t('clients.checkIdOrRetry')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="rpma-shell p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link
              href={`/clients/${params?.id}`}
              className="flex items-center space-x-2 text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t('common.back')} {client.name}</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600/20 rounded-full">
                <Edit className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{t('clients.editClient')}</h1>
                <p className="text-muted-foreground mt-1">{t('clients.updateClientInfo')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('clients.clientInformation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Error */}
            {formErrors.general && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <p className="text-red-400 text-sm font-medium">{formErrors.general}</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                {t('clients.clientName')} *
              </label>
              <Input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={formErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder={t('clients.enterClientName')}
                required
              />
              {formErrors.name && <p className="text-red-400 text-sm">{formErrors.name}</p>}
            </div>

            {/* Customer Type */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">
                {t('clients.customerType')} *
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer_type"
                    value="individual"
                    checked={formData.customer_type === 'individual'}
                    onChange={(e) => handleInputChange('customer_type', e.target.value as 'individual' | 'business')}
                    className="w-4 h-4 text-green-600 bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] focus:ring-green-500"
                  />
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{t('clients.individual')}</span>
                  </div>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="customer_type"
                    value="business"
                    checked={formData.customer_type === 'business'}
                    onChange={(e) => handleInputChange('customer_type', e.target.value as 'individual' | 'business')}
                    className="w-4 h-4 text-green-600 bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] focus:ring-green-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{t('clients.business')}</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                {t('clients.emailAddress')}
              </label>
              <Input
                type="email"
                id="email"
                value={formData.email ?? ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={formErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder={t('clients.enterEmailAddress')}
              />
              {formErrors.email && <p className="text-red-400 text-sm">{formErrors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground">
                {t('clients.phoneNumber')}
              </label>
              <Input
                type="tel"
                id="phone"
                value={formData.phone ?? ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={formErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder={t('clients.enterPhoneNumber')}
              />
              {formErrors.phone && <p className="text-red-400 text-sm">{formErrors.phone}</p>}
            </div>

            {/* Address */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground border-b border-[hsl(var(--rpma-border))] pb-2">{t('clients.address')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="address_street" className="block text-sm font-medium text-muted-foreground">
                    {t('clients.streetAddress')}
                  </label>
                  <Input
                    type="text"
                    id="address_street"
                    value={formData.address_street ?? ''}
                    onChange={(e) => handleInputChange('address_street', e.target.value)}
                    className={formErrors.address_street ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    placeholder={t('clients.enterStreetAddress')}
                  />
                  {formErrors.address_street && <p className="text-red-400 text-sm">{formErrors.address_street}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="address_city" className="block text-sm font-medium text-muted-foreground">
                    {t('clients.city')}
                  </label>
                  <Input
                    type="text"
                    id="address_city"
                    value={formData.address_city ?? ''}
                    onChange={(e) => handleInputChange('address_city', e.target.value)}
                    className={formErrors.address_city ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    placeholder={t('clients.enterCity')}
                  />
                  {formErrors.address_city && <p className="text-red-400 text-sm">{formErrors.address_city}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="address_state" className="block text-sm font-medium text-muted-foreground">
                    {t('clients.stateRegion')}
                  </label>
                  <Input
                    type="text"
                    id="address_state"
                    value={formData.address_state ?? ''}
                    onChange={(e) => handleInputChange('address_state', e.target.value)}
                    className={formErrors.address_state ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    placeholder={t('clients.enterStateRegion')}
                  />
                  {formErrors.address_state && <p className="text-red-400 text-sm">{formErrors.address_state}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="address_zip" className="block text-sm font-medium text-muted-foreground">
                    {t('clients.postalCode')}
                  </label>
                  <Input
                    type="text"
                    id="address_zip"
                    value={formData.address_zip ?? ''}
                    onChange={(e) => handleInputChange('address_zip', e.target.value)}
                    className={formErrors.address_zip ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    placeholder={t('clients.enterPostalCode')}
                  />
                  {formErrors.address_zip && <p className="text-red-400 text-sm">{formErrors.address_zip}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="address_country" className="block text-sm font-medium text-muted-foreground">
                    {t('clients.country')}
                  </label>
                  <Input
                    type="text"
                    id="address_country"
                    value={formData.address_country ?? ''}
                    onChange={(e) => handleInputChange('address_country', e.target.value)}
                    className={formErrors.address_country ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    placeholder={t('clients.enterCountry')}
                  />
                  {formErrors.address_country && <p className="text-red-400 text-sm">{formErrors.address_country}</p>}
                </div>
              </div>
            </div>

            {/* Company Name (only for business) */}
            {formData.customer_type === 'business' && (
              <div className="space-y-2">
                <label htmlFor="company_name" className="block text-sm font-medium text-muted-foreground">
                  {t('clients.companyName')}
                </label>
                <Input
                  type="text"
                  id="company_name"
                  value={formData.company_name ?? ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className={formErrors.company_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  placeholder={t('clients.enterCompanyName')}
                />
                {formErrors.company_name && <p className="text-red-400 text-sm">{formErrors.company_name}</p>}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
                {t('clients.additionalNotes')}
              </label>
              <Textarea
                id="notes"
                value={formData.notes ?? ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className={formErrors.notes ? 'border-red-500 focus-visible:ring-red-500' : ''}
                placeholder={t('clients.enterNotes')}
                rows={4}
              />
              {formErrors.notes && <p className="text-red-400 text-sm">{formErrors.notes}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-8 border-t border-[hsl(var(--rpma-border))]">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>{t('common.cancel')}</span>
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{submitting ? t('clients.updating') : t('clients.updateClient')}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
