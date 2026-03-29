import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => {
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
        <span className="text-sm text-muted-foreground">
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
