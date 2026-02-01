import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';

interface DesktopFormProps {
  schema: z.ZodSchema<Record<string, unknown>>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  children: (form: ReturnType<typeof useForm<Record<string, unknown>>>) => React.ReactNode;
  submitLabel?: string;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function DesktopForm({
  schema,
  onSubmit,
  children,
  submitLabel = 'Enregistrer',
  isLoading = false,
  onCancel
}: DesktopFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<Record<string, unknown>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
  });

  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    setSubmitError(null);
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }, [onSubmit, form]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
    if (event.key === 'Escape' && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }, [form, handleSubmit, onCancel]);

  const handleCancel = useCallback(() => {
    form.reset();
    onCancel?.();
  }, [form, onCancel]);

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      onKeyDown={handleKeyDown}
      className="space-y-6"
    >
      {children(form)}

      {submitError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 text-border-light bg-muted/50 border border-border/30 rounded hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          <X size={16} />
          Annuler
        </button>
        <button
          type="submit"
          disabled={isLoading || !form.formState.isValid}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={16} />
          {isLoading ? 'Enregistrement...' : submitLabel}
        </button>
      </div>

      <div className="text-xs text-border text-center space-y-1">
        <div>💡 Ctrl+Enter pour enregistrer rapidement</div>
        <div>💡 Échap pour annuler</div>
      </div>
    </form>
  );
}