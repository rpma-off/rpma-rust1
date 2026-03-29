import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BottomSheet } from './bottom-sheet';

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
          <p className="text-muted-foreground text-sm">{title}</p>
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
                : 'text-foreground hover:bg-[hsl(var(--rpma-surface))] active:bg-[hsl(var(--rpma-surface))]',
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
          className="w-full px-4 py-4 text-foreground font-semibold bg-[hsl(var(--rpma-surface))] hover:bg-[hsl(var(--rpma-surface))] active:bg-[hsl(var(--rpma-surface))] rounded-xl transition-all active:scale-95 touch-manipulation min-h-[48px]"
        >
          {cancelLabel}
        </motion.button>
      </div>
    </BottomSheet>
  );
};
