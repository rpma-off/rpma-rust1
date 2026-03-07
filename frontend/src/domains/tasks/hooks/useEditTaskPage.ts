'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/domains/auth/api/useAuth';
import { taskGateway } from '../api/taskGateway';
import { useTranslation } from '@/shared/hooks';
import type { TaskFormData } from '../components/TaskForm/types';
import type { Task } from '../api/types';

export function useEditTaskPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [taskData, setTaskData] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskId = params.id as string;

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !user?.token) return;

      try {
        setLoading(true);
        const task = await taskGateway.getTask(taskId, user.token);
        setTaskData(task);
      } catch (err) {
        console.error('Failed to fetch task:', err);
        setError(t('errors.taskLoadError'));
        toast.error(t('errors.taskLoadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, user?.token, t]);

  const handleSuccess = (updatedTask?: { id: string }) => {
    if (updatedTask?.id) {
      toast.success(t('tasks.taskUpdated'));
      router.push(`/tasks/${updatedTask.id}`);
    }
  };

  const handleCancel = () => {
    router.push('/tasks');
  };

  return {
    t,
    taskId,
    taskData: taskData as unknown as Partial<TaskFormData> | null,
    loading,
    error,
    handleSuccess,
    handleCancel,
  };
}
