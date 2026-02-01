import React from 'react';
import { Loader2 } from 'lucide-react';
import { SkeletonList } from './skeleton';

interface PageLoadingProps {
  message?: string;
  showSkeleton?: boolean;
  skeletonCount?: number;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Chargement...',
  showSkeleton = false,
  skeletonCount = 3
}) => (
  <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-in fade-in-0 duration-300">
    {showSkeleton ? (
      <SkeletonList count={skeletonCount} />
    ) : (
      <>
        <div className="relative">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent/40 rounded-full animate-spin animation-delay-150"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent/60 rounded-full animate-spin animation-delay-300"></div>
        </div>
        <div className="text-center space-y-2 animate-in slide-in-from-bottom-2 duration-300 delay-150">
          <p className="text-foreground text-lg font-medium">{message}</p>
          <p className="text-border-light text-sm">Veuillez patienter...</p>
        </div>
      </>
    )}
  </div>
);

export const InlineLoading: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center space-x-3 animate-in fade-in-0 duration-200">
      <div className="relative">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-accent`} />
        <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping"></div>
      </div>
      {message && <span className="text-border-light animate-in slide-in-from-right-2 duration-200 delay-100">{message}</span>}
    </div>
  );
};

// Enhanced Progress Indicator for long operations
export const ProgressIndicator: React.FC<{
  progress?: number;
  message?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  progress,
  message = 'Traitement en cours...',
  showPercentage = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: { container: 'w-32 h-1', text: 'text-xs' },
    md: { container: 'w-48 h-2', text: 'text-sm' },
    lg: { container: 'w-64 h-3', text: 'text-base' }
  };

  return (
    <div className="flex flex-col items-center space-y-3 animate-in fade-in-0 duration-300">
      <div className="text-center">
        <p className="text-foreground font-medium">{message}</p>
        {showPercentage && progress !== undefined && (
          <p className="text-border-light text-sm">{Math.round(progress)}%</p>
        )}
      </div>
      <div className={`bg-border/20 rounded-full overflow-hidden ${sizeClasses[size].container}`}>
        <div
          className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all duration-300 ease-out"
          style={{ width: progress !== undefined ? `${progress}%` : '100%' }}
        >
          {progress === undefined && (
            <div className="h-full bg-gradient-to-r from-transparent via-accent/60 to-transparent animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );
};