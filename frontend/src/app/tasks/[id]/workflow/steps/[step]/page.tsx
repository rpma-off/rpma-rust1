'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/shared/hooks/useTranslation';

export default function WorkflowStepRedirect() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  const step = params.step as string;

  useEffect(() => {
    // Redirect to the correct PPF workflow step URL
    router.replace(`/tasks/${taskId}/workflow/ppf/steps/${step}`);
  }, [router, taskId, step]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    </div>
  );
}
