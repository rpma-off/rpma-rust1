import { useCallback } from 'react';

export function useFilterState<TFilters>(
  onFiltersChange?: (filters: TFilters) => void
) {
  const updateFilters = useCallback((patch: Partial<TFilters>) => {
    onFiltersChange?.(patch as TFilters);
  }, [onFiltersChange]);

  const clearFilters = useCallback((defaults: TFilters) => {
    onFiltersChange?.(defaults);
  }, [onFiltersChange]);

  const hasActiveFilters = useCallback((filters: TFilters, isActive: (filters: TFilters) => boolean) => {
    return isActive(filters);
  }, []);

  return {
    updateFilters,
    clearFilters,
    hasActiveFilters,
  };
}
