import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <div className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-foreground text-sm', className)}>
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 rounded"
        aria-label={`Supprimer le filtre ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export interface FilterBarProps {
  activeFilters: Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }>;
  onClearAll?: () => void;
  className?: string;
  showLabel?: boolean;
}

export function FilterBar({ activeFilters, onClearAll, className, showLabel = true }: FilterBarProps) {
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn('px-4 py-2 flex items-center gap-2 border-t border-border/10 flex-wrap', className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground mr-2">
          Filtres actifs ({activeFilters.length})
        </span>
      )}
      {activeFilters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          onRemove={filter.onRemove}
        />
      ))}
      {onClearAll && activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="ml-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors underline focus:outline-none focus:ring-2 focus:ring-accent/50 rounded"
        >
          Effacer tout
        </button>
      )}
    </div>
  );
}
