'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/compatibility';
import { ipcClient } from '@/lib/ipc';
import { useTranslation } from '@/hooks/useTranslation';

// Dynamically import TaskForm for better performance
const TaskForm = dynamic(() => import('@/components/TaskForm').then(mod => ({ default: mod.TaskForm })), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="text-white text-lg font-medium">Chargement du formulaire...</span>
      </div>
    </div>
  ),
  ssr: false // Disable SSR for this component as it likely uses browser APIs
});

export default function EditTaskPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { user, session } = useAuth();
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskId = params.id as string;

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !user?.token) return;

      try {
        setLoading(true);
        const task = await ipcClient.tasks.get(taskId, user.token);
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
      // Redirect to the updated task
      router.push(`/tasks/${updatedTask.id}`);
    }
  };

  const handleCancel = () => {
    // Return to task list
    router.push('/tasks');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--rpma-surface))] py-6 md:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <span className="text-white text-lg font-medium">{t('tasks.loadingDetails')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[hsl(var(--rpma-surface))] py-6 md:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[hsl(var(--rpma-surface))] rounded-xl p-4 md:p-6 border border-[hsl(var(--rpma-border))]">
            <div className="text-center py-12">
              <div className="text-red-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('errors.loadFailed')}</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={handleCancel} variant="outline">
                {t('tasks.backToTasks')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!taskData) {
    return (
      <div className="min-h-screen bg-[hsl(var(--rpma-surface))] py-6 md:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[hsl(var(--rpma-surface))] rounded-xl p-4 md:p-6 border border-[hsl(var(--rpma-border))]">
            <div className="text-center py-12">
              <h3 className="text-xl font-bold text-white mb-2">{t('tasks.notFound')}</h3>
              <p className="text-muted-foreground mb-6">{t('tasks.notFoundById')}</p>
              <Button onClick={handleCancel} variant="outline">
                {t('tasks.backToTasks')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))] py-6 md:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="mb-6 md:mb-8">
          <div className="bg-[hsl(var(--rpma-surface))] rounded-xl p-4 md:p-6 border border-[hsl(var(--rpma-border))]">
            <div className="flex flex-col gap-4">
              {/* Back Button and Breadcrumbs */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex items-center gap-2 border-[hsl(var(--rpma-border))] text-muted-foreground hover:bg-[hsl(var(--rpma-surface))] hover:text-foreground hover:border-[hsl(var(--rpma-teal))]/50 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('tasks.backToTasks')}</span>
                  <span className="sm:hidden">{t('common.back')}</span>
                </Button>

                {/* Breadcrumbs */}
                <nav className="hidden sm:flex items-center text-sm text-muted-foreground">
                  <a href="/dashboard" className="hover:text-foreground transition-colors">{t('nav.dashboard')}</a>
                  <span className="mx-2">/</span>
                  <a href="/tasks" className="hover:text-foreground transition-colors">{t('nav.tasks')}</a>
                  <span className="mx-2">/</span>
                  <a href={`/tasks/${taskId}`} className="hover:text-foreground transition-colors">{taskData.task_number}</a>
                  <span className="mx-2">/</span>
                  <span className="text-foreground font-medium">{t('common.edit')}</span>
                </nav>
              </div>

              {/* Title and Description */}
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Edit className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {t('tasks.editTask')} {taskData.task_number}
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm md:text-base">
                    Modifiez les informations de la tâche. Les changements seront sauvegardés automatiquement.
                  </p>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-500 mb-1">{t('tasks.quickTip')}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t('tasks.quickTipDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Form Container */}
        <div className="bg-[hsl(var(--rpma-surface))] rounded-xl border border-[hsl(var(--rpma-border))] p-4 md:p-6 shadow-xl">
          <TaskForm
            initialData={taskData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            isEditing={true}
            showHeader={true}
            className="shadow-none border-none bg-transparent p-0"
          />
        </div>
      </div>
    </div>
  );
}
