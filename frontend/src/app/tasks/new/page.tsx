'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { TaskFormProps } from '@/domains/tasks';
// Import test utility for debugging IPC calls
// import '@/lib/test-task-creation';

// Dynamically import TaskForm for better performance
const TaskForm = dynamic<TaskFormProps>(() => import('@/domains/tasks').then(mod => ({ default: mod.TaskForm })), {
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

export default function NewTaskPage() {
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
                  className="flex items-center gap-2 border-border/60 text-muted-foreground hover:bg-border/20 hover:text-foreground hover:border-primary/50 transition-all duration-200"
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
                  <span className="text-foreground font-medium">{t('tasks.newTask')}</span>
                </nav>
              </div>

              {/* Title and Description */}
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {t('tasks.createTask')}
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm md:text-base">
                    {t('tasks.fillFormSteps')}
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
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            isEditing={false}
            showHeader={true}
            className="shadow-none border-none bg-transparent p-0"
          />
        </div>
      </div>
    </div>
  );
}

