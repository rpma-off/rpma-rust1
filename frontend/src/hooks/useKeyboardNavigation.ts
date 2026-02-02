import { useState, useEffect, useRef, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  loop?: boolean; // Whether to loop back to beginning/end
  orientation?: 'vertical' | 'horizontal'; // Direction of navigation
  disabled?: boolean; // Whether navigation is disabled
  onEscape?: () => void; // Callback for escape key
}

interface UseKeyboardNavigationReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  focusedRef: React.RefObject<number>;
  keyHandlers: {
    onKeyDown: React.KeyboardEventHandler;
  };
}

/**
 * Hook for implementing keyboard navigation
 */
export function useKeyboardNavigation(
  itemsCount: number,
  options: UseKeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn {
  const {
    loop = true,
    orientation = 'vertical',
    disabled = false,
    onEscape
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusedRef = useRef(focusedIndex);
  const previousItemsCountRef = useRef(itemsCount);

  // Update ref when focused index changes
  useEffect(() => {
    focusedRef.current = focusedIndex;
  }, [focusedIndex]);

  // Reset focus if items count changes
  useEffect(() => {
    if (previousItemsCountRef.current !== itemsCount) {
      setFocusedIndex(0);
      previousItemsCountRef.current = itemsCount;
    }
  }, [itemsCount]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    let newIndex = focusedIndex;
    let handled = false;

    switch (event.key) {
      case orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight':
        event.preventDefault();
        newIndex = focusedIndex + 1;
        handled = true;
        break;

      case orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft':
        event.preventDefault();
        newIndex = focusedIndex - 1;
        handled = true;
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        handled = true;
        break;

      case 'End':
        event.preventDefault();
        newIndex = itemsCount - 1;
        handled = true;
        break;

      case 'PageDown':
        event.preventDefault();
        newIndex = Math.min(focusedIndex + 5, itemsCount - 1);
        handled = true;
        break;

      case 'PageUp':
        event.preventDefault();
        newIndex = Math.max(focusedIndex - 5, 0);
        handled = true;
        break;

      case 'Enter':
      case ' ':
        // Allow default behavior for Enter/Space
        return;

      case 'Escape':
        event.preventDefault();
        onEscape?.();
        return;

      default:
        return;
    }

    if (handled) {
      // Apply loop behavior
      if (loop) {
        if (newIndex >= itemsCount) {
          newIndex = 0;
        } else if (newIndex < 0) {
          newIndex = itemsCount - 1;
        }
      } else {
        // Ensure index is within bounds
        newIndex = Math.max(0, Math.min(newIndex, itemsCount - 1));
      }

      setFocusedIndex(newIndex);
    }
  }, [disabled, focusedIndex, itemsCount, loop, orientation, onEscape]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusedRef,
    keyHandlers: {
      onKeyDown: handleKeyDown,
    },
  };
}

/**
 * Hook for managing focus in a list with keyboard navigation
 */
export function useFocusableList<T>(
  items: T[],
  options: UseKeyboardNavigationOptions = {}
) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const { focusedIndex, setFocusedIndex, keyHandlers } = useKeyboardNavigation(
    items.length,
    options
  );

  // Sync selected index with focused index
  useEffect(() => {
    setSelectedIndex(focusedIndex);
  }, [focusedIndex]);

  // Focus the currently focused item
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < items.length && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, items.length]);

  const getItemProps = useCallback((index: number) => ({
    ref: (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
    tabIndex: selectedIndex === index ? 0 : -1,
    'aria-selected': selectedIndex === index,
    onClick: () => setSelectedIndex(index),
  }), [selectedIndex]);

  const selectNext = useCallback(() => {
    if (selectedIndex < items.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (options.loop) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, items.length, options.loop]);

  const selectPrevious = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (options.loop) {
      setSelectedIndex(items.length - 1);
    }
  }, [selectedIndex, options.loop]);

  const clearSelection = useCallback(() => {
    setSelectedIndex(-1);
  }, []);

  return {
    selectedIndex,
    setSelectedIndex,
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    selectNext,
    selectPrevious,
    clearSelection,
    keyHandlers,
  };
}

/**
 * Hook for implementing roving tabindex for keyboard navigation
 */
export function useRovingTabIndex(
  itemCount: number,
  options: UseKeyboardNavigationOptions = {}
) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = Array(itemCount).fill(null);
  }, [itemCount]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (options.disabled) return;

    let newIndex = activeIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        newIndex = activeIndex < itemCount - 1 ? activeIndex + 1 : (options.loop ? 0 : activeIndex);
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = activeIndex > 0 ? activeIndex - 1 : (options.loop ? itemCount - 1 : activeIndex);
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = itemCount - 1;
        break;

      case 'Escape':
        event.preventDefault();
        options.onEscape?.();
        setActiveIndex(-1);
        containerRef.current?.blur();
        return;

      default:
        return;
    }

    setActiveIndex(newIndex);
  }, [activeIndex, itemCount, options, options.disabled, options.onEscape]);

  // Focus the active item
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < itemCount && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, itemCount]);

  const getItemProps = useCallback((index: number) => ({
    ref: (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
    tabIndex: activeIndex === index ? 0 : -1,
    'aria-selected': activeIndex === index,
    onKeyDown: index === activeIndex ? handleKeyDown : undefined,
  }), [activeIndex, handleKeyDown]);

  return {
    activeIndex,
    setActiveIndex,
    containerRef,
    getItemProps,
  };
}