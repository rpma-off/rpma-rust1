/**
 * usePagination — canonical pagination state hook.
 *
 * DEBT-08 / REF-08: Every list view previously managed page + pageSize
 * inline in its own filter state.  This hook centralises that state so
 * changing pagination behaviour (add cursor, add sort_by) requires editing
 * ONE hook — not 8+ filter objects.
 *
 * Usage:
 *   const pagination = usePagination();
 *   // pass to any list hook:
 *   const { clients } = useClients({ pagination });
 */
import { useState, useCallback } from 'react';
import { PAGINATION } from '@/lib/constants';

export interface PaginationState {
  /** 1-based current page. */
  page: number;
  /** Number of items per page. */
  page_size: number;
  /** Optional sort column (domain-specific default applies if omitted). */
  sort_by?: string;
  /** "asc" | "desc" */
  sort_order?: 'asc' | 'desc';
}

export interface UsePaginationReturn extends PaginationState {
  /** Navigate to an arbitrary page (clamped to ≥ 1). */
  goToPage: (page: number) => void;
  /** Advance by one page. */
  nextPage: () => void;
  /** Go back by one page (clamped to ≥ 1). */
  prevPage: () => void;
  /** Reset to page 1 (call after filter changes). */
  resetPage: () => void;
  /** Change page size and reset to page 1. */
  setPageSize: (size: number) => void;
  /** Change sort column and reset to page 1. */
  setSortBy: (column: string) => void;
  /** Change sort direction and reset to page 1. */
  setSortOrder: (order: 'asc' | 'desc') => void;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

/**
 * Manages page, pageSize, sortBy, and sortOrder as a single unit.
 * Pass the returned object directly to any list hook's `pagination` option.
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    initialSortBy,
    initialSortOrder = 'desc',
  } = options;

  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    page_size: initialPageSize,
    sort_by: initialSortBy,
    sort_order: initialSortOrder,
  });

  const goToPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const nextPage = useCallback(() => {
    setState(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setState(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const resetPage = useCallback(() => {
    setState(prev => ({ ...prev, page: 1 }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, page: 1, page_size: size }));
  }, []);

  const setSortBy = useCallback((column: string) => {
    setState(prev => ({ ...prev, page: 1, sort_by: column }));
  }, []);

  const setSortOrder = useCallback((order: 'asc' | 'desc') => {
    setState(prev => ({ ...prev, page: 1, sort_order: order }));
  }, []);

  return {
    ...state,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    setPageSize,
    setSortBy,
    setSortOrder,
  };
}
