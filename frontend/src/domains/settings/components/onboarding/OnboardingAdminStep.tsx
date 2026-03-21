'use client';

import { useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { useTranslation } from '@/shared/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface AdminFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface OnboardingAdminStepProps {
  onBack: () => void;
  onSubmit: (adminData: AdminFormData) => Promise<void>;
  isPending: boolean;
  submitError: string | null;
}

export function OnboardingAdminStep({ onBack, onSubmit, isPending, submitError }: OnboardingAdminStepProps) {
  const { t } = useTranslation();
  const [adminData, setAdminData] = useState<AdminFormData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!adminData.email.trim()) newErrors.admin_email = t('onboarding.admin.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminData.email)) {
      newErrors.admin_email = t('onboarding.admin.emailInvalid');
    }
    if (!adminData.password || adminData.password.length < 8) {
      newErrors.password = t('onboarding.admin.passwordMinLength');
    }
    if (!adminData.first_name.trim()) newErrors.first_name = t('onboarding.admin.firstNameRequired');
    if (!adminData.last_name.trim()) newErrors.last_name = t('onboarding.admin.lastNameRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(adminData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <CardTitle>{t('onboarding.admin.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('onboarding.admin.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin_first_name">{t('onboarding.admin.firstName')} *</Label>
            <Input
              id="admin_first_name"
              value={adminData.first_name}
              onChange={(e) => setAdminData({ ...adminData, first_name: e.target.value })}
              placeholder="Jean"
            />
            {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_last_name">{t('onboarding.admin.lastName')} *</Label>
            <Input
              id="admin_last_name"
              value={adminData.last_name}
              onChange={(e) => setAdminData({ ...adminData, last_name: e.target.value })}
              placeholder="Dupont"
            />
            {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="admin_email">{t('onboarding.admin.email')} *</Label>
            <Input
              id="admin_email"
              type="email"
              value={adminData.email}
              onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
              placeholder="admin@entreprise.com"
            />
            {errors.admin_email && <p className="text-sm text-destructive">{errors.admin_email}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="admin_password">{t('onboarding.admin.password')} *</Label>
            <Input
              id="admin_password"
              type="password"
              value={adminData.password}
              onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
              placeholder="Minimum 8 caractères"
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={onBack}>
          {t('onboarding.buttons.back')}
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('onboarding.buttons.completeSetup')}
        </Button>
      </CardFooter>
    </Card>
  );
}
