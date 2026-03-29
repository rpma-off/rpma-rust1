'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldStatus = 'default' | 'success' | 'error';

export function focusFirstInvalidField(errors: Record<string, string>) {
  const firstErrorField = Object.keys(errors)[0];
  if (!firstErrorField) {
    return;
  }

  const element = document.querySelector(`[name="${firstErrorField}"]`);
  if (element) {
    (element as HTMLElement).focus();
  }
}

export function getInputStateClass(status: FieldStatus, neutralClass: string) {
  if (status === 'error') {
    return 'border-red-500 focus:border-red-500 focus:ring-red-500/50';
  }

  if (status === 'success') {
    return 'border-[hsl(var(--rpma-teal))] focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20';
  }

  return neutralClass;
}

export function getInputClassName(baseClassName: string, status: FieldStatus, neutralClass: string) {
  return cn(
    baseClassName,
    getInputStateClass(status, neutralClass),
    'focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  );
}

export function FieldStatusIcon({ status }: { status: FieldStatus }) {
  if (status === 'error') {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }

  if (status === 'success') {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }

  return null;
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-1 flex items-center text-sm text-red-400">
      <AlertCircle className="mr-1 h-4 w-4 flex-shrink-0" />
      {message}
    </p>
  );
}
