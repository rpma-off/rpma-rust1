'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { TaskFormProps } from '@/domains/tasks';

const TaskForm = dynamic<TaskFormProps>(() => import('@/domains/tasks').then(mod => ({ default: mod.TaskForm })), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-foreground text-lg font-medium">Chargement du formulaire...</span>
      </div>
    </div>
  ),
  ssr: false
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('tasks.backToTasks')}</span>
              <span className="sm:hidden">{t('common.back')}</span>
            </Button>

            <nav className="hidden sm:flex items-center text-sm text-slate-600">
              <a href="/dashboard" className="hover:text-slate-900 transition-colors">Tableau de bord</a>
              <span className="mx-2">/</span>
              <a href="/tasks" className="hover:text-slate-900 transition-colors">Tâches</a>
              <span className="mx-2">/</span>
              <span className="text-slate-900 font-medium">Nouvelle tâche</span>
            </nav>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <TaskForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            isEditing={false}
            showHeader={false}
            className="shadow-none border-none bg-transparent p-0"
          />
        </div>
      </div>
    </div>
  );
}


