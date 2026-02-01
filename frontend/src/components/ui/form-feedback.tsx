import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  showIcon?: boolean;
  className?: string;
}

export const FormFeedback: React.FC<FormFeedbackProps> = ({
  type,
  message,
  showIcon = true,
  className = ''
}) => {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-400',
      iconColor: 'text-emerald-500'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      textColor: 'text-red-400',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      textColor: 'text-amber-400',
      iconColor: 'text-amber-500'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
      iconColor: 'text-blue-500'
    }
  };

  const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[type];

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 animate-in slide-in-from-top-2',
      bgColor,
      borderColor,
      className
    )}>
      {showIcon && (
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColor)} />
      )}
      <p className={cn('text-sm leading-relaxed', textColor)}>
        {message}
      </p>
    </div>
  );
};

// Enhanced input wrapper with validation feedback
interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: string;
  warning?: string;
  info?: string;
  showFeedback?: boolean;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  error,
  success,
  warning,
  info,
  showFeedback = true,
  className = '',
  ...props
}) => {
  const getFeedbackType = () => {
    if (error) return 'error';
    if (warning) return 'warning';
    if (success) return 'success';
    if (info) return 'info';
    return null;
  };

  const feedbackType = getFeedbackType();
  const feedbackMessage = error || warning || success || info;

  return (
    <div className="space-y-2">
      <input
        className={cn(
          'w-full px-3 py-2 bg-border/10 border rounded-lg text-foreground placeholder-border-light transition-all duration-200',
          feedbackType === 'error' && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
          feedbackType === 'warning' && 'border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/20',
          feedbackType === 'success' && 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20',
          feedbackType === 'info' && 'border-blue-500/50 focus:border-blue-500 focus:ring-blue-500/20',
          !feedbackType && 'border-border/30 focus:border-accent focus:ring-accent/20',
          'focus:outline-none focus:ring-2 hover:border-border/50',
          className
        )}
        {...props}
      />
      {showFeedback && feedbackMessage && feedbackType && (
        <FormFeedback
          type={feedbackType}
          message={feedbackMessage}
          className="text-xs"
        />
      )}
    </div>
  );
};