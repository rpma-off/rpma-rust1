'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import type { CreateOrganizationRequest } from '@/lib/backend';
import { useTranslation } from '@/shared/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OnboardingOrgStepProps {
  onNext: (orgData: CreateOrganizationRequest) => void;
}

export function OnboardingOrgStep({ onNext }: OnboardingOrgStepProps) {
  const { t } = useTranslation();
  const [orgData, setOrgData] = useState<CreateOrganizationRequest>({
    name: '',
    slug: null,
    legal_name: null,
    tax_id: null,
    siret: null,
    registration_number: null,
    email: '',
    phone: '',
    website: null,
    address_street: '',
    address_city: '',
    address_state: null,
    address_zip: '',
    address_country: 'France',
    industry: null,
    company_size: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!orgData.name.trim()) newErrors.name = t('onboarding.organization.nameRequired');
    if (orgData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgData.email)) {
      newErrors.email = t('onboarding.organization.emailInvalid');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext(orgData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <CardTitle>{t('onboarding.organization.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('onboarding.organization.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">{t('onboarding.organization.name')} *</Label>
            <Input
              id="name"
              value={orgData.name}
              onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
              placeholder="Mon Entreprise"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('onboarding.organization.email')}</Label>
            <Input
              id="email"
              type="email"
              value={orgData.email || ''}
              onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
              placeholder="contact@entreprise.com"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('onboarding.organization.phone')}</Label>
            <Input
              id="phone"
              value={orgData.phone || ''}
              onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">{t('onboarding.organization.streetAddress')}</Label>
            <Input
              id="street"
              value={orgData.address_street || ''}
              onChange={(e) => setOrgData({ ...orgData, address_street: e.target.value })}
              placeholder="123 Rue Principale"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t('onboarding.organization.city')}</Label>
            <Input
              id="city"
              value={orgData.address_city || ''}
              onChange={(e) => setOrgData({ ...orgData, address_city: e.target.value })}
              placeholder="Paris"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">{t('onboarding.organization.postalCode')}</Label>
            <Input
              id="zip"
              value={orgData.address_zip || ''}
              onChange={(e) => setOrgData({ ...orgData, address_zip: e.target.value })}
              placeholder="75001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{t('onboarding.organization.country')}</Label>
            <Input
              id="country"
              value={orgData.address_country || 'France'}
              onChange={(e) => setOrgData({ ...orgData, address_country: e.target.value })}
              placeholder="France"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleNext}>
          {t('onboarding.buttons.nextStep')}
        </Button>
      </CardFooter>
    </Card>
  );
}
