'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from '@/shared/hooks/useTranslation';

export function useNewTaskPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSuccess = (createdTask?: { id: string }) => {
    if (createdTask?.id) {
      toast.success(t('success.taskCreated'));
      router.push(`/tasks/${createdTask.id}`);
    }
  };

  const handleCancel = () => {
    router.push('/tasks');
  };

  return {
    t,
    handleSuccess,
    handleCancel,
  };
}
