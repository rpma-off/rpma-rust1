'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/shared/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingCompleteStepProps {
  onFinish: () => void;
}

export function OnboardingCompleteStep({ onFinish }: OnboardingCompleteStepProps) {
  const { t } = useTranslation();

  return (
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
          <Button onClick={onFinish} size="lg">
            {t('onboarding.buttons.goToDashboard')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
