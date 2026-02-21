import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface VirtualScrollingOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollingResult<T> {
  virtualItems: T[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const useVirtualScrolling = <T>(
  items: T[],
  options: VirtualScrollingOptions
): VirtualScrollingResult<T> => {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate virtual scrolling values
  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return items.slice(startIndex, endIndex + 1);
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Handle scroll events
  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Auto-scroll to top when items change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollTop,
    onScroll,
    containerRef
  };
};

// Specialized hook for task lists
export const useTaskVirtualScrolling = (
  tasks: Record<string, unknown>[],
  containerHeight: number,
  itemHeight: number = 120
) => {
  return useVirtualScrolling(tasks, {
    itemHeight,
    containerHeight,
    overscan: 5
  });
};

// Specialized hook for SOP template lists
export const useSOPVirtualScrolling = (
  sopTemplates: Record<string, unknown>[],
  containerHeight: number,
  itemHeight: number = 100
) => {
  return useVirtualScrolling(sopTemplates, {
    itemHeight,
    containerHeight,
    overscan: 3
  });
};

// Specialized hook for user management lists
export const useUserVirtualScrolling = (
  users: Record<string, unknown>[],
  containerHeight: number,
  itemHeight: number = 80
) => {
  return useVirtualScrolling(users, {
    itemHeight,
    containerHeight,
    overscan: 4
  });
};
