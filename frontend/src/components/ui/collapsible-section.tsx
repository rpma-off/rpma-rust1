import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

/**
 * Collapsible Section Component
 *
 * Provides collapsible sections for better information organization
 * with smooth animations and consistent styling.
 */
export const CollapsibleSection = React.memo<CollapsibleSectionProps>(({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = true,
  className,
  headerClassName,
  contentClassName
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-zinc-800/30 transition-colors duration-200',
          headerClassName
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0 w-8 h-8 bg-[hsl(var(--rpma-teal))]/10 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-semibold text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-zinc-400 truncate mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 ml-3"
        >
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn('px-4 md:px-6 pb-4 md:pb-6', contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CollapsibleSection.displayName = 'CollapsibleSection';
