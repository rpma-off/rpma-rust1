/**
 * Accessibility utilities for the RPMA application
 */

export { SkipLink } from './accessibility.tsx';

/**
 * Generate a unique ID for accessibility attributes
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Announce a message to screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove the announcement after it's been read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Check if an element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['a', 'button', 'input', 'textarea', 'select', 'details'];
  
  if (focusableTags.includes(tagName)) {
    return true;
  }

  if (element.getAttribute('tabindex') !== null) {
    return true;
  }

  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), details, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    )
  );

  return focusableElements.filter(isFocusable);
};

/**
 * Trap focus within a container (for modals, dropdowns, etc.)
 */
export const trapFocus = (container: HTMLElement): (() => void) => {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) {
    return () => {};
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus the first element
  firstElement.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Check if high contrast mode is enabled
 */
export const isHighContrastMode = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }

  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Check if reduced motion is preferred
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get the preferred color scheme
 */
export const getPreferredColorScheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Form accessibility utilities
 */
export const FormAccessibility = {
  /**
   * Get ARIA properties for form fields
   */
  getFieldAriaProps: (props: {
    id: string;
    label?: string;
    error?: string;
    description?: string;
    required?: boolean;
  }) => {
    const { id, label, error, description, required } = props;

    return {
      'aria-labelledby': label ? `${id}-label` : undefined,
      'aria-describedby': [
        description ? `${id}-description` : undefined,
        error ? `${id}-error` : undefined,
      ].filter(Boolean).join(' ') || undefined,
      'aria-required': required,
      'aria-invalid': !!error,
    };
  },

  /**
   * Get ARIA properties for form field labels
   */
  getLabelAriaProps: (id: string) => ({
    id: `${id}-label`,
    htmlFor: id,
  }),

  /**
   * Get ARIA properties for form field descriptions
   */
  getDescriptionAriaProps: (id: string) => ({
    id: `${id}-description`,
  }),

  /**
   * Get ARIA properties for form field errors
   */
  getErrorAriaProps: (id: string) => ({
    id: `${id}-error`,
    role: 'alert',
    'aria-live': 'polite',
  }),
};

/**
 * Keyboard navigation utilities
 */
export const KeyboardNavigation = {
  /**
   * Check if a key is an activation key (Enter, Space)
   */
  isActivationKey: (key: string): boolean => {
    return key === 'Enter' || key === ' ';
  },
};



/**
 * Add keyboard navigation support to a custom component
 */
export const addKeyboardNavigation = (
  container: HTMLElement,
  options: {
    orientation?: 'horizontal' | 'vertical';
    loop?: boolean;
    onEnter?: (element: HTMLElement) => void;
    onSpace?: (element: HTMLElement) => void;
    onEscape?: () => void;
  } = {}
): (() => void) => {
  const {
    orientation = 'vertical',
    loop = true,
    onEnter,
    onSpace,
    onEscape
  } = options;

  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) {
    return () => {};
  }

  let currentIndex = 0;

  const handleKeyDown = (event: KeyboardEvent) => {
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (event.key) {
      case nextKey:
        event.preventDefault();
        currentIndex = loop 
          ? (currentIndex + 1) % focusableElements.length
          : Math.min(currentIndex + 1, focusableElements.length - 1);
        focusableElements[currentIndex].focus();
        break;

      case prevKey:
        event.preventDefault();
        currentIndex = loop 
          ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
          : Math.max(currentIndex - 1, 0);
        focusableElements[currentIndex].focus();
        break;

      case 'Home':
        event.preventDefault();
        currentIndex = 0;
        focusableElements[currentIndex].focus();
        break;

      case 'End':
        event.preventDefault();
        currentIndex = focusableElements.length - 1;
        focusableElements[currentIndex].focus();
        break;

      case 'Enter':
        if (onEnter && document.activeElement && focusableElements.includes(document.activeElement as HTMLElement)) {
          event.preventDefault();
          onEnter(document.activeElement as HTMLElement);
        }
        break;

      case ' ':
        if (onSpace && document.activeElement && focusableElements.includes(document.activeElement as HTMLElement)) {
          event.preventDefault();
          onSpace(document.activeElement as HTMLElement);
        }
        break;

      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};
