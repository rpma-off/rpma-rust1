import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { TableColumn } from '@/types';

export interface Column<T> extends TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: unknown, item: T) => React.ReactNode;
}

interface DesktopTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  onRowClick?: (item: T) => void;
  onRowSelect?: (item: T) => void;
  selectedRows?: T[];
  className?: string;
  emptyMessage?: string;
}

export function DesktopTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchable = true,
  onRowClick,
  onRowSelect,
  selectedRows = [],
  className = '',
  emptyMessage = 'Aucune donnée disponible'
}: DesktopTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item =>
      searchTerm === '' ||
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(item =>
          String(item[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn as keyof T];
        const bValue = b[sortColumn as keyof T];

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, filters, sortColumn, sortDirection]);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const handleFilterChange = useCallback((column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  }, []);

  const handleRowClick = useCallback((item: T, index: number) => {
    setFocusedRowIndex(index);
    onRowClick?.(item);
  }, [onRowClick]);

  const handleRowSelect = useCallback((item: T) => {
    onRowSelect?.(item);
  }, [onRowSelect]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (filteredAndSortedData.length === 0) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        setFocusedRowIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedRowIndex(prev => Math.min(filteredAndSortedData.length - 1, prev + 1));
        break;
      case 'Enter':
        if (focusedRowIndex >= 0 && focusedRowIndex < filteredAndSortedData.length) {
          event.preventDefault();
          handleRowClick(filteredAndSortedData[focusedRowIndex], focusedRowIndex);
        }
        break;
      case ' ':
        if (focusedRowIndex >= 0 && focusedRowIndex < filteredAndSortedData.length && onRowSelect) {
          event.preventDefault();
          handleRowSelect(filteredAndSortedData[focusedRowIndex]);
        }
        break;
    }
  }, [filteredAndSortedData, focusedRowIndex, handleRowClick, handleRowSelect, onRowSelect]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRowIndex >= 0 && tableRef.current) {
      const focusedRow = tableRef.current.querySelector(`[data-row-index="${focusedRowIndex}"]`);
      if (focusedRow) {
        focusedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedRowIndex]);

  const isRowSelected = useCallback((item: T) => {
    return selectedRows.some(selected => JSON.stringify(selected) === JSON.stringify(item));
  }, [selectedRows]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and filters */}
      <div className="flex gap-4">
        {searchable && (
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table
          ref={tableRef}
          className="min-w-full divide-y divide-gray-200"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="table"
          aria-label="Data table"
        >
          <thead className="bg-gray-50">
            <tr>
              {onRowSelect && (
                <th className="px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider">
                  <span className="sr-only">Sélection</span>
                </th>
              )}
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-border uppercase tracking-wider ${
                    column.width ? `w-${column.width}` : ''
                  }`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>

                    {column.sortable && (
                      <button
                        onClick={() => handleSort(String(column.key))}
                        className="flex flex-col hover:text-border-light"
                        aria-label={`Trier par ${column.label}`}
                      >
                        <ChevronUp
                          size={12}
                           className={sortColumn === String(column.key) && sortDirection === 'asc' ? 'text-blue-500' : 'text-gray-300'}
                        />
                        <ChevronDown
                          size={12}
                           className={sortColumn === String(column.key) && sortDirection === 'desc' ? 'text-blue-500' : 'text-gray-300'}
                        />
                      </button>
                    )}

                    {column.filterable && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filtrer..."
                          value={filters[String(column.key)] || ''}
                          onChange={(e) => handleFilterChange(String(column.key), e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-muted/50 divide-y divide-border/20">
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onRowSelect ? 1 : 0)}
                  className="px-6 py-12 text-center text-border"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((item, index) => (
                <tr
                  key={index}
                  data-row-index={index}
                  onClick={() => handleRowClick(item, index)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${
                    focusedRowIndex === index ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''
                  } ${
                    isRowSelected(item) ? 'bg-blue-100' : ''
                  } transition-colors`}
                  role="row"
                  tabIndex={-1}
                >
                  {onRowSelect && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isRowSelected(item)}
                        onChange={() => handleRowSelect(item)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {column.render
                        ? column.render(item[column.key as keyof T], item)
                        : String(item[column.key as keyof T] || '')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count and keyboard hints */}
      <div className="flex justify-between items-center text-sm text-border">
        <div>
          {filteredAndSortedData.length} résultat{filteredAndSortedData.length !== 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
        </div>
        {filteredAndSortedData.length > 0 && (
          <div className="text-xs space-x-4">
            <span>↑↓ pour naviguer</span>
            <span>Enter pour sélectionner</span>
            {onRowSelect && <span>Espace pour cocher</span>}
          </div>
        )}
      </div>
    </div>
  );
}