import { toast } from 'sonner';
import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2, Zap } from 'lucide-react';

// Enhanced toast system with better animations and styling
export const enhancedToast = {
  success: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      icon: React.createElement(CheckCircle, { className: "w-5 h-5 text-emerald-400" }),
    });
  },

  error: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast.error(message, {
      duration: options?.duration || 6000,
      icon: React.createElement(XCircle, { className: "w-5 h-5 text-red-400" }),
    });
  },

  warning: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast.warning(message, {
      duration: options?.duration || 5000,
      icon: React.createElement(AlertCircle, { className: "w-5 h-5 text-amber-400" }),
    });
  },

  info: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast.info(message, {
      duration: options?.duration || 4000,
      icon: React.createElement(Info, { className: "w-5 h-5 text-blue-400" }),
    });
  },

  loading: (message: string, options?: { id?: string }) => {
    return toast.loading(message, {
      id: options?.id,
      icon: React.createElement(Loader2, { className: "w-5 h-5 text-blue-400 animate-spin" }),
    });
  },

  // Special toast for actions/achievements
  achievement: (message: string, options?: { duration?: number; icon?: string }) => {
    return toast.success(message, {
      duration: options?.duration || 6000,
      icon: React.createElement(Zap, { className: "w-5 h-5 text-yellow-400" }),
    });
  },

  // Update existing loading toast
  update: (toastId: string, message: string, type: 'success' | 'error' | 'loading') => {
    const icons = {
      success: React.createElement(CheckCircle, { className: "w-5 h-5 text-emerald-400" }),
      error: React.createElement(XCircle, { className: "w-5 h-5 text-red-400" }),
      loading: React.createElement(Loader2, { className: "w-5 h-5 text-blue-400 animate-spin" }),
    };

    if (type === 'success') {
      toast.success(message, { id: toastId, icon: icons[type] });
    } else if (type === 'error') {
      toast.error(message, { id: toastId, icon: icons[type] });
    } else {
      toast.loading(message, { id: toastId, icon: icons[type] });
    }
  },

  // Dismiss specific toast
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  // Promise-based toast for async operations
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: {
      success?: { duration?: number };
      error?: { duration?: number };
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },
};

export default enhancedToast;
