import { useEffect, useRef, useState, useCallback } from 'react';

interface IntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

interface UseIntersectionObserverResult {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
  isVisible: boolean;
  entry: IntersectionObserverEntry | null;
}

export const useIntersectionObserver = (
  options: IntersectionObserverOptions = {}
): UseIntersectionObserverResult => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const ref = useRef<HTMLElement>(null);

  const {
    root = null,
    rootMargin = '0px',
    threshold = 0
  } = options;

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    setIsIntersecting(entry.isIntersecting);
    setIsVisible(entry.isIntersecting);
    setEntry(entry);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root,
      rootMargin,
      threshold
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, handleIntersection]);

  return {
    ref,
    isIntersecting,
    isVisible,
    entry
  };
};

// Hook for lazy loading images
export const useLazyImage = (
  src: string,
  placeholder?: string,
  options?: IntersectionObserverOptions
) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const { ref, isVisible } = useIntersectionObserver(options);

  useEffect(() => {
    if (isVisible && src && imageSrc !== src) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
        setHasError(false);
      };
      
      img.onerror = () => {
        setHasError(true);
        setIsLoaded(false);
      };
      
      img.src = src;
    }
  }, [isVisible, src, imageSrc]);

  return {
    ref,
    imageSrc,
    isLoaded,
    hasError,
    isVisible
  };
};

// Hook for lazy loading components
export const useLazyComponent = <T>(
  importFn: () => Promise<{ default: T }>,
  options?: IntersectionObserverOptions
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const { ref, isVisible } = useIntersectionObserver(options);

  useEffect(() => {
    if (isVisible && !Component && !isLoading) {
      setIsLoading(true);
      setHasError(false);
      
      importFn()
        .then((module) => {
          setComponent(module.default);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to load lazy component:', error);
          setHasError(true);
          setIsLoading(false);
        });
    }
  }, [isVisible, Component, isLoading, importFn]);

  return {
    ref,
    Component,
    isLoading,
    hasError,
    isVisible
  };
};

// Hook for infinite scrolling
export const useInfiniteScroll = (
  onLoadMore: () => Promise<void>,
  options?: IntersectionObserverOptions & {
    enabled?: boolean;
    threshold?: number;
  }
) => {
  const { enabled = true, threshold = 0.1, ...observerOptions } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  
  const { ref, isIntersecting } = useIntersectionObserver({
    ...observerOptions,
    threshold
  });

  useEffect(() => {
    if (enabled && isIntersecting && !isLoading) {
      setIsLoading(true);
      onLoadMore().finally(() => setIsLoading(false));
    }
  }, [enabled, isIntersecting, isLoading, onLoadMore]);

  return {
    ref,
    isLoading,
    isIntersecting
  };
};

// Hook for scroll-based animations
export const useScrollAnimation = (
  options?: IntersectionObserverOptions & {
    animationClass?: string;
    threshold?: number;
  }
) => {
  const { animationClass = 'animate-in', threshold = 0.1, ...observerOptions } = options || {};
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const { ref, isIntersecting } = useIntersectionObserver({
    ...observerOptions,
    threshold
  });

  useEffect(() => {
    if (isIntersecting && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isIntersecting, hasAnimated]);

  return {
    ref,
    hasAnimated,
    isIntersecting,
    animationClass: hasAnimated ? animationClass : ''
  };
};
