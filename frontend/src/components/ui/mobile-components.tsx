import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Mobile-optimized bottom sheet component
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const heightClasses = {
    auto: 'max-h-[80vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]'
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl z-50',
              heightClasses[height],
              className
            )}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(event, info) => {
              setIsDragging(false);
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "bottom-sheet-title" : undefined}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 bg-border/50 rounded-full" />
            </div>

            {/* Content */}
            <div className="px-4 pb-4 overflow-y-auto">
              {title && (
                <div className="mb-4">
                  <h2 id="bottom-sheet-title" className="text-lg font-semibold text-foreground">{title}</h2>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Mobile-optimized action sheet
interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
  }>;
  title?: string;
  cancelLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  actions,
  title,
  cancelLabel = 'Annuler'
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="auto">
      {title && (
        <div className="text-center mb-4">
          <p className="text-border-light text-sm">{title}</p>
        </div>
      )}

      <div className="space-y-2">
        {actions.map((action, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            disabled={action.disabled}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-all active:scale-95 touch-manipulation min-h-[48px]',
              action.destructive
                ? 'text-red-400 hover:bg-red-500/10 active:bg-red-500/20'
                : 'text-foreground hover:bg-border/20 active:bg-border/30',
              action.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {action.icon && <div className="flex-shrink-0">{action.icon}</div>}
            <span className="font-medium">{action.label}</span>
          </motion.button>
        ))}

        <div className="h-2" /> {/* Spacer */}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: actions.length * 0.05 }}
          onClick={onClose}
          className="w-full px-4 py-4 text-foreground font-semibold bg-border/20 hover:bg-border/30 active:bg-border/40 rounded-xl transition-all active:scale-95 touch-manipulation min-h-[48px]"
        >
          {cancelLabel}
        </motion.button>
      </div>
    </BottomSheet>
  );
};

// Mobile-optimized swipe actions
interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface SwipeableItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  className = ''
}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (event: any, info: any) => {
    setOffset(info.offset.x);
  };

  const handleDragEnd = () => {
    setIsDragging(false);

    // Threshold for triggering actions
    const threshold = 80;

    if (offset > threshold && leftActions.length > 0) {
      leftActions[0].onClick();
    } else if (offset < -threshold && rightActions.length > 0) {
      rightActions[0].onClick();
    }

    setOffset(0);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Background actions */}
      <div className="absolute inset-y-0 left-0 flex">
        {leftActions.map((action, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-center px-4 min-w-[80px]',
              action.color
            )}
          >
            {action.icon}
            <span className="ml-2 text-sm font-medium">{action.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute inset-y-0 right-0 flex">
        {rightActions.map((action, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-center px-4 min-w-[80px]',
              action.color
            )}
          >
            <span className="mr-2 text-sm font-medium">{action.label}</span>
            {action.icon}
          </div>
        ))}
      </div>

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: leftActions.length * -80, right: rightActions.length * 80 }}
        onDrag={handleDrag}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{ x: isDragging ? offset : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
};

// Mobile-optimized pull-to-refresh
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  pullThreshold = 80
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);

  const handleDrag = (event: any, info: any) => {
    if (isRefreshing) return;

    const distance = Math.max(0, info.offset.y);
    setPullDistance(distance);
    setCanRefresh(distance >= pullThreshold);
  };

  const handleDragEnd = async () => {
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setCanRefresh(false);
  };

  const pullProgress = Math.min(pullDistance / pullThreshold, 1);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-background z-10"
        animate={{ y: pullDistance - 60 }}
      >
        <motion.div
          animate={{ rotate: pullProgress * 180 }}
          transition={{ duration: 0.2 }}
          className="mr-2"
        >
          ↓
        </motion.div>
        <span className="text-sm text-border-light">
          {isRefreshing ? 'Actualisation...' : canRefresh ? 'Relâcher pour actualiser' : 'Tirer pour actualiser'}
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 120 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ y: isRefreshing ? 60 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Mobile-optimized floating action button with expandable actions
interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  actions = [],
  position = 'bottom-right',
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const handleMainClick = () => {
    if (actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      onClick?.();
    }
  };

  return (
    <div className={cn('fixed z-30', positionClasses[position], className)}>
      {/* Expanded actions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-4 space-y-3"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  action.onClick();
                  setIsExpanded(false);
                }}
                className="flex items-center gap-3 bg-accent hover:bg-accent/90 text-black px-4 py-3 rounded-full shadow-lg hover:shadow-accent/25 transition-all duration-200"
              >
                {action.icon}
                <span className="font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleMainClick}
        className={cn(
          'w-14 h-14 bg-accent hover:bg-accent/90 text-black rounded-full shadow-lg hover:shadow-accent/25 transition-all duration-200 flex items-center justify-center',
          isExpanded && 'rotate-45'
        )}
      >
        {icon}
      </motion.button>
    </div>
  );
};