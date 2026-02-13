import React, { useState, useRef, useEffect, forwardRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  sizes?: string;
  fill?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

/**
 * Optimized image component with lazy loading and performance improvements
 */
export const OptimizedImage = forwardRef<HTMLDivElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      className,
      priority = false,
      placeholder = 'blur',
      sizes,
      fill = false,
      quality = 75,
      onLoad,
      onError,
      style,
      ...props
    },
    ref
  ) => {
    const [isInView, setIsInView] = useState(priority); // Start as true for priority images
    const [hasLoaded, setHasLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);

    // Set up intersection observer for lazy loading
    useEffect(() => {
      if (priority || hasLoaded || hasError) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          root: null,
          rootMargin: '50px', // Start loading 50px before it comes into view
          threshold: 0.1
        }
      );

      if (imageRef.current) {
        observer.observe(imageRef.current);
      }

      return () => observer.disconnect();
    }, [priority, hasLoaded, hasError]);

    // Generate blur placeholder data URL
    const blurDataURL = React.useMemo(() => {
      if (placeholder !== 'blur' || !width || !height) return undefined;
      
      // Create a simple blurred placeholder
      const canvas = document.createElement('canvas');
      canvas.width = width!;
      canvas.height = height!;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Fill with a light gray color
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width!, height!);
        
        // Add a subtle gradient
        const gradient = ctx.createLinearGradient(0, 0, width!, height!);
        gradient.addColorStop(0, '#f3f4f6');
        gradient.addColorStop(1, '#e5e7eb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width!, height!);
      }
      
      return canvas.toDataURL();
    }, [placeholder, width, height]);

    const handleError = () => {
      setHasError(true);
      onError?.();
    };

    const handleLoad = () => {
      setHasLoaded(true);
      onLoad?.();
    };

    // Show placeholder if not in view or loading
    if (!isInView) {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-gray-100 dark:bg-gray-800 animate-pulse',
            className
          )}
          style={{
            width: width || '100%',
            height: height || 'auto',
            aspectRatio: width && height ? `${width}/${height}` : undefined,
            ...style
          }}
        />
      );
    }

    // Show error state
     if (hasError) {
       return (
         <div
           ref={ref}
           className={cn(
             'flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400',
             className
           )}
           style={{
             width: width || '100%',
             height: height || '200px',
             aspectRatio: width && height ? `${width}/${height}` : undefined,
             ...style
           }}
         >
           <svg
             className="w-8 h-8"
             fill="none"
             stroke="currentColor"
             viewBox="0 0 24 24"
           >
             <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={2}
               d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586 1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
             />
           </svg>
           <span className="ml-2 text-sm">Échec du chargement de l'image</span>
         </div>
       );
     }

    return (
      <div
        ref={imageRef}
        className={cn(
          'relative overflow-hidden',
          !hasLoaded && 'bg-gray-100 dark:bg-gray-800',
          className
        )}
        style={{
          width: width || '100%',
          height: height || 'auto',
          aspectRatio: width && height ? `${width}/${height}` : undefined,
          ...style
        }}
        {...props}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          sizes={sizes}
          quality={quality}
          priority={priority}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL}
          className={cn(
            'transition-opacity duration-300',
            hasLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
        
        {/* Loading indicator */}
        {!hasLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';