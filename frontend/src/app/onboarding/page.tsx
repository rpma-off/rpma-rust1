'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, User, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnboardingStatus, useCompleteOnboarding } from '@/domains/organizations';
import { useTranslation } from '@/shared/hooks';
import type { CreateOrganizationRequest, OnboardingData } from '@/domains/organizations';

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: status, isLoading } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();

  const STEPS = [
    { id: 1, title: t('onboarding.steps.organization'), description: t('onboarding.steps.organizationDesc') },
    { id: 2, title: t('onboarding.steps.adminUser'), description: t('onboarding.steps.adminUserDesc') },
    { id: 3, title: t('onboarding.steps.complete'), description: t('onboarding.steps.completeDesc') },
  ];
  
  const [step, setStep] = useState(1);
  const [orgData, setOrgData] = useState<CreateOrganizationRequest>({
    name: '',
    email: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_zip: '',
    address_country: 'France',
  });
  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status?.completed) {
      router.push('/dashboard');
    }
  }, [status?.completed, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>{t('onboarding.checkingSetup')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!orgData.name.trim()) newErrors.name = t('onboarding.organization.nameRequired');
      if (orgData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgData.email)) {
        newErrors.email = t('onboarding.organization.emailInvalid');
      }
    }

    if (currentStep === 2) {
      if (!adminData.email.trim()) newErrors.admin_email = t('onboarding.admin.emailRequired');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminData.email)) {
        newErrors.admin_email = t('onboarding.admin.emailInvalid');
      }
      if (!adminData.password || adminData.password.length < 8) {
        newErrors.password = t('onboarding.admin.passwordMinLength');
      }
      if (!adminData.first_name.trim()) newErrors.first_name = t('onboarding.admin.firstNameRequired');
      if (!adminData.last_name.trim()) newErrors.last_name = t('onboarding.admin.lastNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    const data: OnboardingData = {
      organization: orgData,
      admin_email: adminData.email,
      admin_password: adminData.password,
      admin_first_name: adminData.first_name,
      admin_last_name: adminData.last_name,
    };

    try {
      await completeOnboarding.mutateAsync(data);
      setStep(3);
    } catch {
      setErrors({ submit: t('onboarding.errors.submitFailed') });
    }
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('onboarding.welcomeTitle')}</h1>
          <p className="text-muted-foreground">{t('onboarding.welcomeSubtitle')}</p>
        </div>

        <div className="flex justify-center gap-4">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s.id ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4 flex items-center justify-center text-sm font-medium">
                  {s.id}
                </span>
              )}
              <span className="text-sm font-medium">{s.title}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
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
        )}

        {step === 2 && (
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
              {errors.submit && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.submit}</AlertDescription>
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
              <Button variant="outline" onClick={handleBack}>
                {t('onboarding.buttons.back')}
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={completeOnboarding.isPending}
              >
                {completeOnboarding.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('onboarding.buttons.completeSetup')}
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{t('onboarding.complete.title')}</h2>
                <p className="text-muted-foreground">
                  {t('onboarding.complete.description')}
                </p>
                <Button onClick={handleFinish} size="lg">
                  {t('onboarding.buttons.goToDashboard')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
