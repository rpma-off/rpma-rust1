import React, { useState, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createCardClass } from '@/lib/component-standards';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  className?: string;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
  interactive = false,
  size = 'md',
  onClick,
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const cardClasses = createCardClass(interactive, size);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100; // Minimum swipe distance
    const velocity = info.velocity.x;

    if (Math.abs(info.offset.x) > threshold || Math.abs(velocity) > 500) {
      if (info.offset.x > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (info.offset.x < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setDragOffset(0);
    setIsDragging(false);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragOffset(info.offset.x);
    setIsDragging(true);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Action Background */}
      {leftAction && dragOffset > 0 && (
        <motion.div
          className={cn(
            "absolute left-0 top-0 bottom-0 flex items-center justify-end pr-4 z-10",
            leftAction.color
          )}
          initial={{ width: 0 }}
          animate={{ width: Math.min(Math.abs(dragOffset), 120) }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center gap-2 text-white">
            {leftAction.icon}
            <span className="text-sm font-medium">{leftAction.label}</span>
          </div>
        </motion.div>
      )}

      {/* Right Action Background */}
      {rightAction && dragOffset < 0 && (
        <motion.div
          className={cn(
            "absolute right-0 top-0 bottom-0 flex items-center justify-start pl-4 z-10",
            rightAction.color
          )}
          initial={{ width: 0 }}
          animate={{ width: Math.min(Math.abs(dragOffset), 120) }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        ref={cardRef}
        className={cn(cardClasses, className)}
        drag="x"
        dragConstraints={{ left: leftAction ? -120 : 0, right: rightAction ? 120 : 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: isDragging ? dragOffset : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={interactive && !isDragging ? onClick : undefined}
        style={{ touchAction: 'pan-y pinch-zoom' }} // Allow vertical scrolling
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        } : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
};

interface PullToRefreshProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing = false,
  children,
  className,
  pullThreshold = 80,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);

    if (distance > 0) {
      e.preventDefault();
      setPullDistance(distance * 0.5); // Dampen the pull
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling || isRefreshing) return;

    if (pullDistance >= pullThreshold) {
      onRefresh();
    }

    setPullDistance(0);
    setIsPulling(false);
  };

  const refreshProgress = Math.min(pullDistance / pullThreshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-4 bg-background"
        animate={{
          y: isRefreshing ? 0 : Math.max(-60, -60 + pullDistance),
          opacity: isRefreshing ? 1 : refreshProgress
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : refreshProgress * 180 }}
          transition={{
            rotate: { duration: isRefreshing ? 1 : 0.2, repeat: isRefreshing ? Infinity : 0 }
          }}
          className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full"
        />
        <span className="ml-3 text-sm text-border-light">
          {isRefreshing ? 'Actualisation...' : 'Tirer pour actualiser'}
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={{ y: isRefreshing ? 60 : pullDistance }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
};