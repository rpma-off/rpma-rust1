import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  onSwipeLeft: _onSwipeLeft,
  onSwipeRight: _onSwipeRight,
  className = ''
}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => {
    setOffset(info.offset.x);
  };

  const handleDragEnd = () => {
    setIsDragging(false);

    // Threshold for triggering actions
    const threshold = 80;

    if (offset > threshold && leftActions.length > 0) {
      const firstLeft = leftActions[0];
      if (firstLeft) firstLeft.onClick();
    } else if (offset < -threshold && rightActions.length > 0) {
      const firstRight = rightActions[0];
      if (firstRight) firstRight.onClick();
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
