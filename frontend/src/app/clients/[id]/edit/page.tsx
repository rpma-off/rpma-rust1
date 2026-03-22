'use client';

import Link from 'next/link';
import { ArrowLeft, Save, X, Edit, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { EmptyState } from '@/components/ui';
import { useEditClientPage } from '@/domains/clients';
import { ClientAddressFields } from '@/domains/clients/components/ClientAddressFields';

interface EditClientPageProps {
  params: {
    id: string;
  };
}

export default function EditClientPage({ params }: EditClientPageProps) {
  const {
    client,
    loading,
    error,
    submitting,
    formData,
    formErrors,
    t,
    handleSubmit,
    handleCancel,
    handleInputChange,
  } = useEditClientPage({ params });

  if (loading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !client) {
    return (
      <PageShell>
        <div className="flex items-center space-x-4 mb-6">
          <Link
            href="/clients"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('clients.backToClients')}</span>
          </Link>
        </div>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <EmptyState
              icon={<ArrowLeft className="h-12 w-12 text-muted-foreground" />}
              title={error || t('clients.notFound')}
              description={t('clients.checkIdOrRetry')}
            />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="rpma-shell p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link
              href={`/clients/${params?.id}`}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{t('common.back')} {client.name}</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Edit className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{t('clients.editClient')}</h1>
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
              <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
                <p className="text-destructive text-sm font-medium">{formErrors.general}</p>
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
                name="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                placeholder={t('clients.enterClientName')}
                required
              />
              {formErrors.name && <p className="text-destructive text-sm">{formErrors.name}</p>}
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
                    className="w-4 h-4 text-primary bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] focus:ring-primary"
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
                    className="w-4 h-4 text-primary bg-[hsl(var(--rpma-surface))] border-[hsl(var(--rpma-border))] focus:ring-primary"
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
                name="email"
                value={formData.email ?? ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={formErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                placeholder={t('clients.enterEmailAddress')}
              />
              {formErrors.email && <p className="text-destructive text-sm">{formErrors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground">
                {t('clients.phoneNumber')}
              </label>
              <Input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone ?? ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={formErrors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}
                placeholder={t('clients.enterPhoneNumber')}
              />
              {formErrors.phone && <p className="text-destructive text-sm">{formErrors.phone}</p>}
            </div>

            {/* Address */}
            <ClientAddressFields
              formData={formData}
              formErrors={formErrors}
              onChange={handleInputChange}
            />

            {/* Company Name (only for business) */}
            {formData.customer_type === 'business' && (
              <div className="space-y-2">
                <label htmlFor="company_name" className="block text-sm font-medium text-muted-foreground">
                  {t('clients.companyName')}
                </label>
                <Input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name ?? ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className={formErrors.company_name ? 'border-destructive focus-visible:ring-destructive' : ''}
                  placeholder={t('clients.enterCompanyName')}
                />
                {formErrors.company_name && <p className="text-destructive text-sm">{formErrors.company_name}</p>}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
                {t('clients.additionalNotes')}
              </label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes ?? ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className={formErrors.notes ? 'border-destructive focus-visible:ring-destructive' : ''}
                placeholder={t('clients.enterNotes')}
                rows={4}
              />
              {formErrors.notes && <p className="text-destructive text-sm">{formErrors.notes}</p>}
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
                variant="default"
                className="flex items-center space-x-2"
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
    </PageShell>
  );
}
