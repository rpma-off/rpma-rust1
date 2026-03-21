'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { CreateOrganizationRequest, OnboardingData } from '@/lib/backend';
import { useTranslation } from '@/shared/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboardingStatus, useCompleteOnboarding } from '@/domains/settings';
import { OnboardingStepIndicator } from '@/domains/settings/components/onboarding/OnboardingStepIndicator';
import { OnboardingOrgStep } from '@/domains/settings/components/onboarding/OnboardingOrgStep';
import { OnboardingAdminStep, type AdminFormData } from '@/domains/settings/components/onboarding/OnboardingAdminStep';
import { OnboardingCompleteStep } from '@/domains/settings/components/onboarding/OnboardingCompleteStep';

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: status, isLoading } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();

  const STEPS = [
    { id: 1, title: t('onboarding.steps.organization') },
    { id: 2, title: t('onboarding.steps.adminUser') },
    { id: 3, title: t('onboarding.steps.complete') },
  ];

  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const orgDataRef = useRef<CreateOrganizationRequest | null>(null);

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

  const handleOrgNext = (orgData: CreateOrganizationRequest) => {
    orgDataRef.current = orgData;
    setStep(2);
  };

  const handleAdminSubmit = async (adminData: AdminFormData) => {
    setSubmitError(null);
    const data: OnboardingData = {
      organization: orgDataRef.current!,
      admin_email: adminData.email,
      admin_password: adminData.password,
      admin_first_name: adminData.first_name,
      admin_last_name: adminData.last_name,
    };
    try {
      await completeOnboarding.mutateAsync(data);
      setStep(3);
    } catch {
      setSubmitError(t('onboarding.errors.submitFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t('onboarding.welcomeTitle')}</h1>
          <p className="text-muted-foreground">{t('onboarding.welcomeSubtitle')}</p>
        </div>

        <OnboardingStepIndicator steps={STEPS} currentStep={step} />

        {step === 1 && <OnboardingOrgStep onNext={handleOrgNext} />}
        {step === 2 && (
          <OnboardingAdminStep
            onBack={() => setStep(1)}
            onSubmit={handleAdminSubmit}
            isPending={completeOnboarding.isPending}
            submitError={submitError}
          />
        )}
        {step === 3 && <OnboardingCompleteStep onFinish={() => router.push('/dashboard')} />}
      </div>
    </div>
  );
}
