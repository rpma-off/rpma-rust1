import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createButtonClass } from '@/lib/component-standards';

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  actions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color?: string;
  }>;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  variant?: 'primary' | 'secondary';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  actions = [],
  onClick,
  className,
  size = 'md',
  position = 'bottom-right',
  variant = 'primary',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const handleMainClick = () => {
    if (actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      onClick?.();
    }
  };

  const handleActionClick = (action: typeof actions[0]) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop for expanded actions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Expanded Actions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "fixed z-50 flex flex-col gap-3",
              positionClasses[position]
            )}
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { delay: index * 0.1 }
                }}
                exit={{
                  opacity: 0,
                  y: 20,
                  scale: 0.8,
                  transition: { delay: (actions.length - index - 1) * 0.05 }
                }}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg text-white font-medium min-w-[160px] justify-start",
                  action.color || "bg-muted hover:bg-border"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {action.icon}
                <span className="text-sm">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        className={cn(
          "fixed z-50 rounded-full shadow-2xl flex items-center justify-center text-white border-2 border-white/20",
          positionClasses[position],
          sizeClasses[size],
          variant === 'primary'
            ? "bg-accent hover:bg-accent/90"
            : "bg-muted hover:bg-border",
          variant === 'primary'
            ? "bg-accent hover:bg-accent/90 shadow-accent/25"
            : "bg-muted hover:bg-border"
        )}
        onClick={handleMainClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={{ duration: 0.2 }}
        aria-label={actions.length > 0 ? "Actions rapides" : "Action principale"}
        aria-expanded={isExpanded}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
      </motion.button>
    </>
  );
};

// Mobile-optimized quick actions bar
interface QuickActionsBarProps {
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
  }>;
  className?: string;
  position?: 'bottom' | 'top';
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  actions,
  className,
  position = 'bottom',
}) => {
  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0',
    top: 'top-0 left-0 right-0',
  };

  return (
    <motion.div
      initial={{ y: position === 'bottom' ? 100 : -100 }}
      animate={{ y: 0 }}
      exit={{ y: position === 'bottom' ? 100 : -100 }}
      className={cn(
        "fixed z-40 bg-background border-t border-border/20 px-4 py-3",
        positionClasses[position],
        className
      )}
    >
      <div className="flex items-center justify-around gap-2 max-w-md mx-auto">
        {actions.map((action, index) => (
          <motion.button
            key={index}
            onClick={action.onClick}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg min-h-[60px] min-w-[60px] flex-1 touch-manipulation",
              action.variant === 'primary' && "text-accent hover:bg-accent/10",
              action.variant === 'secondary' && "text-border-light hover:bg-border/20",
              action.variant === 'destructive' && "text-red-400 hover:bg-red-500/10"
            )}
            whileTap={{ scale: 0.95 }}
          >
            {action.icon}
            <span className="text-xs font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};