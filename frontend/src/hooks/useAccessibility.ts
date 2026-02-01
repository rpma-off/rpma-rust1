import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing accessibility features and user preferences
 */
export function useAccessibility() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderActive, setScreenReaderActive] = useState(false);

  useEffect(() => {
    // Check for user's motion preferences
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    motionQuery.addEventListener('change', handleMotionChange);

    // Check for high contrast preference
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(contrastQuery.matches);

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    contrastQuery.addEventListener('change', handleContrastChange);

    // Detect screen reader usage
    const detectScreenReader = () => {
      // Simple heuristic: check if there are any screen reader specific elements
      const srElements = document.querySelectorAll('.sr-only:not(:empty)');
      setScreenReaderActive(srElements.length > 0);
    };

    detectScreenReader();
    const observer = new MutationObserver(detectScreenReader);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
      observer.disconnect();
    };
  }, []);

  return {
    reduceMotion,
    highContrast,
    screenReaderActive
  };
}

/**
 * Custom hook for keyboard navigation management
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    selector?: string;
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
  } = {}
) {
  const {
    selector = '[role="button"], button, input, select, textarea, a[href]',
    loop = true,
    orientation = 'both'
  } = options;

  const currentIndex = useRef(-1);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll(selector);
    return Array.from(elements).filter((el) => {
      const element = el as HTMLElement;
      return (
        element.offsetWidth > 0 &&
        element.offsetHeight > 0 &&
        !element.hasAttribute('disabled') &&
        element.getAttribute('aria-disabled') !== 'true' &&
        element.tabIndex !== -1
      );
    }) as HTMLElement[];
  }, [containerRef, selector]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let nextIndex = currentIndex.current;

    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex.current + 1;
          if (nextIndex >= elements.length) {
            nextIndex = loop ? 0 : elements.length - 1;
          }
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex.current - 1;
          if (nextIndex < 0) {
            nextIndex = loop ? elements.length - 1 : 0;
          }
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex.current + 1;
          if (nextIndex >= elements.length) {
            nextIndex = loop ? 0 : elements.length - 1;
          }
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex.current - 1;
          if (nextIndex < 0) {
            nextIndex = loop ? elements.length - 1 : 0;
          }
        }
        break;

      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        nextIndex = elements.length - 1;
        break;

      default:
        return;
    }

    if (nextIndex !== currentIndex.current && elements[nextIndex]) {
      currentIndex.current = nextIndex;
      elements[nextIndex].focus();
    }
  }, [getFocusableElements, loop, orientation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track currently focused element
    const handleFocus = (event: FocusEvent) => {
      const elements = getFocusableElements();
      const focusedElement = event.target as HTMLElement;
      const index = elements.indexOf(focusedElement);
      if (index >= 0) {
        currentIndex.current = index;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focusin', handleFocus);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusin', handleFocus);
    };
  }, [handleKeyDown, getFocusableElements, containerRef]);

  return {
    focusFirst: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) {
        currentIndex.current = 0;
        elements[0].focus();
      }
    },
    focusLast: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) {
        currentIndex.current = elements.length - 1;
        elements[elements.length - 1].focus();
      }
    }
  };
}

/**
 * Custom hook for managing focus trapping (useful for modals)
 */
export function useFocusTrap(active: boolean = false) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements within container
    const getFocusableElements = () => {
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const elements = container.querySelectorAll(selector);
      return Array.from(elements).filter((el) => {
        const element = el as HTMLElement;
        return (
          element.offsetWidth > 0 &&
          element.offsetHeight > 0 &&
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-disabled') !== 'true'
        );
      }) as HTMLElement[];
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: move to previous element
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move to next element
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus first element when trap becomes active
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously focused element
      if (previousActiveElement.current && document.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
    };
  }, [active]);

  return containerRef;
}

/**
 * Custom hook for announcing messages to screen readers
 */
export function useScreenReaderAnnouncement() {
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((message: string) => {
    setAnnouncement(message);

    // Clear the announcement after a short delay to allow for re-announcements
    setTimeout(() => {
      setAnnouncement('');
    }, 100);
  }, []);

  return {
    announce,
    announcement
  };
}

/**
 * Custom hook for haptic feedback on mobile devices
 */
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    // Light tap feedback
    tap: () => vibrate(50),
    // Success feedback
    success: () => vibrate([100, 50, 100]),
    // Error feedback
    error: () => vibrate([200, 100, 200, 100, 200]),
    // Warning feedback
    warning: () => vibrate([100, 100, 100]),
    // Selection feedback
    select: () => vibrate([25, 25, 25]),
    // Custom pattern
    custom: vibrate
  };
}

/**
 * Hook for managing touch-friendly interactions
 */
export function useTouchFriendly() {


  useEffect(() => {

  }, []);



  return {
    // Accessibility features
  };
}

// Export accessibility hooks as a named object
const accessibilityHooks = {
  useAccessibility,
  useKeyboardNavigation,
  useFocusTrap,
  useScreenReaderAnnouncement,
  useHapticFeedback,
  useTouchFriendly
};

// Export default as a variable (not anonymous)
export default accessibilityHooks;