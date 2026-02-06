import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VirtualizedList, usePerformanceMonitor } from './virtualization';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  sortable?: boolean;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  className?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  height?: number;
  rowHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  selectable?: boolean;
  selectedRows?: Set<number>;
  onSelectionChange?: (selectedRows: Set<number>) => void;
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  height = 400,
  rowHeight = 48,
  className = '',
  onRowClick,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange
}: VirtualizedTableProps<T>) {
  usePerformanceMonitor('VirtualizedTable');

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc' | null;
  } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        if (current.direction === 'desc') return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleRowSelect = (index: number) => {
    if (!selectable || !onSelectionChange) return;

    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    onSelectionChange(newSelection);
  };

  const handleRowClick = (item: T, index: number) => {
    if (selectable) {
      handleRowSelect(index);
    }
    onRowClick?.(item, index);
  };

  const renderItem = (item: T, index: number) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        'flex items-center border-b border-[hsl(var(--rpma-border))] hover:bg-[#f5f6f7] transition-colors cursor-pointer group',
        selectable && selectedRows.has(index) && 'bg-[hsl(var(--rpma-teal))]/10 border-[hsl(var(--rpma-teal))]/30',
        className
      )}
      onClick={() => handleRowClick(item, index)}
      style={{ height: rowHeight }}
    >
      {selectable && (
        <div className="px-4 flex items-center">
          <input
            type="checkbox"
            checked={selectedRows.has(index)}
            onChange={() => handleRowSelect(index)}
            className="rounded border-border/30 text-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {columns.map((column, colIndex) => {
        const value = column.key === 'index' ? index + 1 : item[column.key as keyof T];
        const content = column.render
          ? column.render(value, item, index)
          : String(value || '');

        return (
          <div
            key={String(column.key)}
            className={cn(
              'px-4 flex items-center truncate',
              column.className
            )}
            style={{ width: column.width, minWidth: column.width }}
          >
            {content}
          </div>
        );
      })}
    </motion.div>
  );

  const totalWidth = columns.reduce((sum, col) => sum + (col.width || 150), selectable ? 60 : 0);

  return (
    <div className={cn('border border-[hsl(var(--rpma-border))] rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="rpma-table-header">
        <div className="flex items-center" style={{ height: rowHeight }}>
          {selectable && (
            <div className="px-4 flex items-center">
              <input
                type="checkbox"
                checked={selectedRows.size === data.length && data.length > 0}
                onChange={() => {
                  if (selectedRows.size === data.length) {
                    onSelectionChange?.(new Set());
                  } else {
                    onSelectionChange?.(new Set(data.map((_, i) => i)));
                  }
                }}
                className="rounded border-border/30 text-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20"
              />
            </div>
          )}

          {columns.map((column) => (
            <div
              key={String(column.key)}
              className={cn(
                'px-4 flex items-center font-semibold text-foreground',
                column.sortable && 'cursor-pointer hover:bg-[hsl(var(--rpma-surface))] transition-colors',
                column.className
              )}
              style={{ width: column.width, minWidth: column.width }}
              onClick={() => column.sortable && handleSort(String(column.key))}
            >
              <span className="truncate">{column.header}</span>
              {column.sortable && (
                <div className="ml-2 flex flex-col">
                  {sortConfig?.key === column.key ? (
                    sortConfig.direction === 'asc' ? (
                      <ChevronUp className="w-3 h-3 text-[hsl(var(--rpma-teal))]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-[hsl(var(--rpma-teal))]" />
                    )
                  ) : (
                    <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Body */}
      <VirtualizedList
        items={sortedData}
        itemHeight={rowHeight}
        containerHeight={height - rowHeight} // Subtract header height
        renderItem={renderItem}
        className="bg-background"
      />

      {/* Footer */}
      <div className="bg-[hsl(var(--rpma-surface))] border-t border-[hsl(var(--rpma-border))] px-4 py-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {selectedRows.size > 0 && `${selectedRows.size} sélectionné(s) â€¢ `}
            {data.length} élément(s) total
          </span>
          {sortConfig && (
            <span className="text-[hsl(var(--rpma-teal))]">
              Trié par {columns.find(col => String(col.key) === sortConfig.key)?.header}
              {sortConfig.direction === 'asc' ? ' â†‘' : ' â†“'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
