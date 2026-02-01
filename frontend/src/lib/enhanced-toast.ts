import toast from 'react-hot-toast';
import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2, Zap } from 'lucide-react';

// Enhanced toast system with better animations and styling
export const enhancedToast = {
  success: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      icon: React.createElement(CheckCircle, { className: "w-5 h-5 text-emerald-400 animate-in zoom-in-50 duration-300" }),
      style: {
        background: 'linear-gradient(135deg, #064e3b 0%, #1a1a1a 100%)',
        border: '1px solid #10b981',
        color: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out',
      },
      ...options,
    });
  },

  error: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast.error(message, {
      duration: options?.duration || 6000,
      icon: React.createElement(XCircle, { className: "w-5 h-5 text-red-400 animate-in zoom-in-50 duration-300" }),
      style: {
        background: 'linear-gradient(135deg, #7f1d1d 0%, #1a1a1a 100%)',
        border: '1px solid #ef4444',
        color: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out',
      },
      ...options,
    });
  },

  warning: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast(message, {
      duration: options?.duration || 5000,
      icon: React.createElement(AlertCircle, { className: "w-5 h-5 text-amber-400 animate-in zoom-in-50 duration-300" }),
      style: {
        background: 'linear-gradient(135deg, #78350f 0%, #1a1a1a 100%)',
        border: '1px solid #f59e0b',
        color: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(245, 158, 11, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out',
      },
      ...options,
    });
  },

  info: (message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
    return toast(message, {
      duration: options?.duration || 4000,
      icon: React.createElement(Info, { className: "w-5 h-5 text-blue-400 animate-in zoom-in-50 duration-300" }),
      style: {
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1a1a1a 100%)',
        border: '1px solid #3b82f6',
        color: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out',
      },
      ...options,
    });
  },

  loading: (message: string, options?: { id?: string }) => {
    return toast.loading(message, {
      id: options?.id,
      icon: React.createElement(Loader2, { className: "w-5 h-5 text-blue-400 animate-spin" }),
      style: {
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1a1a1a 100%)',
        border: '1px solid #3b82f6',
        color: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out',
      },
    });
  },

  // Special toast for actions/achievements
  achievement: (message: string, options?: { duration?: number; icon?: string }) => {
    return toast.success(message, {
      duration: options?.duration || 6000,
      icon: React.createElement(Zap, { className: "w-5 h-5 text-yellow-400 animate-in zoom-in-50 duration-300" }),
      style: {
        background: 'linear-gradient(135deg, #7c2d12 0%, #1a1a1a 100%)',
        border: '1px solid #eab308',
        color: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(234, 179, 8, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out, bounce 0.6s ease-out 0.3s',
        fontWeight: '600',
      },
    });
  },

  // Update existing loading toast
  update: (toastId: string, message: string, type: 'success' | 'error' | 'loading') => {
    const icons = {
      success: React.createElement(CheckCircle, { className: "w-5 h-5 text-emerald-400" }),
      error: React.createElement(XCircle, { className: "w-5 h-5 text-red-400" }),
      loading: React.createElement(Loader2, { className: "w-5 h-5 text-blue-400 animate-spin" }),
    };

    const styles = {
      success: {
        background: 'linear-gradient(135deg, #064e3b 0%, #1a1a1a 100%)',
        border: '1px solid #10b981',
      },
      error: {
        background: 'linear-gradient(135deg, #7f1d1d 0%, #1a1a1a 100%)',
        border: '1px solid #ef4444',
      },
      loading: {
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1a1a1a 100%)',
        border: '1px solid #3b82f6',
      },
    };

    toast.loading(message, {
      id: toastId,
      icon: icons[type],
      style: {
        ...styles[type],
        color: '#fff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out',
      },
    });
  },

  // Dismiss specific toast
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  // Promise-based toast for async operations
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
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
    }, {
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid #374151',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        animation: 'slideInFromRight 0.3s ease-out',
      },
      success: {
        duration: options?.success?.duration || 4000,
        icon: React.createElement(CheckCircle, { className: "w-5 h-5 text-emerald-400 animate-in zoom-in-50 duration-300" }),
        style: {
          background: 'linear-gradient(135deg, #064e3b 0%, #1a1a1a 100%)',
          border: '1px solid #10b981',
          color: '#fff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        },
      },
      error: {
        duration: options?.error?.duration || 6000,
        icon: React.createElement(XCircle, { className: "w-5 h-5 text-red-400 animate-in zoom-in-50 duration-300" }),
        style: {
          background: 'linear-gradient(135deg, #7f1d1d 0%, #1a1a1a 100%)',
          border: '1px solid #ef4444',
          color: '#fff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        },
      },
    });
  },
};

// Add custom CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInFromRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }
`;
document.head.appendChild(style);

export default enhancedToast;