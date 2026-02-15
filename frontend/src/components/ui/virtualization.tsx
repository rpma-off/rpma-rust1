import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const visibleRangeStart = Math.floor(scrollTop / itemHeight);
  const visibleRangeEnd = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );

  const startIndex = Math.max(0, visibleRangeStart - overscan);
  const endIndex = Math.min(items.length - 1, visibleRangeEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy loading image component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  errorPlaceholder?: string;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder,
  errorPlaceholder,
  className = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setHasError(true);
      if (errorPlaceholder) {
        setImageSrc(errorPlaceholder);
      }
    };
    img.src = src;
  }, [src, errorPlaceholder]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={imageSrc}
      alt={props.alt || ''}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-50',
        hasError && 'opacity-75',
        className
      )}
      {...props}
    />
  );
};

// Lazy loading component wrapper
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback = <div className="animate-pulse bg-border/20 rounded h-32" />,
  rootMargin = '50px',
  threshold = 0.1,
  className = ''
}) => {
  const [_isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref} className={className}>
      {hasLoaded ? children : fallback}
    </div>
  );
};

// Infinite scroll hook
export function useInfiniteScroll<T>(
  fetchMore: () => Promise<T[]>,
  hasMore: boolean,
  loading: boolean
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const newData = await fetchMore();
      setData(prev => [...prev, ...newData]);
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMore, hasMore, loading, isLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading]);

  return {
    data,
    setData,
    isLoading,
    loadingRef,
    loadMore
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  renderCount.current += 1;

  useEffect(() => {
    const now = Date.now();
    const renderTime = now - lastRenderTime.current;

    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`${componentName} took ${renderTime}ms to render (frame drop)`);
    }

    lastRenderTime.current = now;
  });

  // Log performance metrics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    }
  }, [componentName]);
}