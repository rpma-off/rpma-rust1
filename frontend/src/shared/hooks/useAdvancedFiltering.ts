import { useState, useCallback, useRef } from 'react';

interface FilterField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'range' | 'multi';
  label: string;
  options?: Array<{ value: string; label: string; count?: number }>;
  min?: number;
  max?: number;
  placeholder?: string;
  searchable?: boolean;
}

interface FilterValue {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'between' | 'exists' | 'regex';
  value: string | number | boolean | null | undefined;
  secondaryValue?: string | number | boolean | null | undefined; // For range queries
}

interface SortField {
  field: string;
  direction: 'asc' | 'desc';
}

interface SearchQuery {
  text?: string;
  filters: FilterValue[];
  sort: SortField[];
  page: number;
  pageSize: number;
  facets?: string[];
}

interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: Record<string, Array<{ value: string; label: string; count: number }>>;
  query: SearchQuery;
  executionTime: number;
}

interface FilterConfig {
  fields: FilterField[];
  defaultSort: SortField[];
  defaultPageSize: number;
  enableFacets: boolean;
  enableHighlighting: boolean;
  fuzzySearch: boolean;
  maxResults: number;
}

import { Task } from '@/lib/backend';
import { UnknownRecord } from '@/types/utility.types';

export const useAdvancedFiltering = <T extends UnknownRecord>(
  data: T[],
  config: FilterConfig
) => {
  const [query, setQuery] = useState<SearchQuery>({
    text: '',
    filters: [],
    sort: config.defaultSort,
    page: 1,
    pageSize: config.defaultPageSize,
    facets: config.enableFacets ? config.fields.map(f => f.name) : []
  });

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Execute search
  const executeSearch = useCallback(async (searchQuery: SearchQuery): Promise<SearchResult<T>> => {
    const startTime = performance.now();
    setIsSearching(true);

    try {
      // Simulate Elasticsearch-like search on local data
      let filteredData = [...data];

      // Apply text search
      if (searchQuery.text && searchQuery.text.trim()) {
        const searchText = searchQuery.text.toLowerCase();
        filteredData = filteredData.filter(item => {
          return config.fields
            .filter(f => f.type === 'text')
            .some(field => {
              const value = item[field.name];
              if (typeof value === 'string') {
                return value.toLowerCase().includes(searchText);
              }
              return false;
            });
        });
      }

      // Apply filters
      searchQuery.filters.forEach(filterValue => {
        filteredData = filteredData.filter(item => {
          const fieldValue = item[filterValue.field];

          switch (filterValue.operator) {
            case 'eq':
              return fieldValue === filterValue.value;
            case 'ne':
              return fieldValue !== filterValue.value;
            case 'gt':
              return filterValue.value != null && fieldValue != null && typeof fieldValue === 'number' && typeof filterValue.value === 'number' && fieldValue > filterValue.value;
            case 'gte':
              return filterValue.value != null && fieldValue != null && typeof fieldValue === 'number' && typeof filterValue.value === 'number' && fieldValue >= filterValue.value;
            case 'lt':
              return filterValue.value != null && fieldValue != null && typeof fieldValue === 'number' && typeof filterValue.value === 'number' && fieldValue < filterValue.value;
            case 'lte':
               return filterValue.value != null && fieldValue != null && typeof fieldValue === 'number' && typeof filterValue.value === 'number' && fieldValue <= (typeof filterValue.secondaryValue === 'number' ? filterValue.secondaryValue : filterValue.value);
            case 'in':
              return Array.isArray(filterValue.value) && fieldValue != null ? filterValue.value.includes(fieldValue) : false;
            case 'nin':
              return Array.isArray(filterValue.value) && fieldValue != null ? !filterValue.value.includes(fieldValue) : true;
            case 'contains':
              return filterValue.value != null && fieldValue != null && String(fieldValue).includes(String(filterValue.value));
            case 'startsWith':
              return filterValue.value != null && fieldValue != null && String(fieldValue).startsWith(String(filterValue.value));
            case 'endsWith':
              return filterValue.value != null && fieldValue != null && String(fieldValue).endsWith(String(filterValue.value));
            case 'between':
              return filterValue.value != null && fieldValue != null && typeof fieldValue === 'number' &&
                    typeof filterValue.value === 'number' &&
                    fieldValue >= filterValue.value && fieldValue <= (typeof filterValue.secondaryValue === 'number' ? filterValue.secondaryValue : filterValue.value);
            case 'exists':
              return fieldValue !== undefined && fieldValue !== null;
            default:
              return true;
          }
        });
      });

      // Apply sorting
      if (searchQuery.sort.length > 0) {
        filteredData.sort((a, b) => {
          for (const sortField of searchQuery.sort) {
            const aValue = a[sortField.field];
            const bValue = b[sortField.field];

            // Handle null/undefined values
            if (aValue == null && bValue == null) continue;
            if (aValue == null) return sortField.direction === 'asc' ? -1 : 1;
            if (bValue == null) return sortField.direction === 'asc' ? 1 : -1;

            if (aValue < bValue) return sortField.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortField.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      // Calculate pagination
      const total = filteredData.length;
      const totalPages = Math.ceil(total / searchQuery.pageSize);
      const startIndex = (searchQuery.page - 1) * searchQuery.pageSize;
      const endIndex = startIndex + searchQuery.pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      // Calculate facets
      const facets: Record<string, Array<{ value: string; label: string; count: number }>> = {};
      if (config.enableFacets && searchQuery.facets) {
        searchQuery.facets.forEach(fieldName => {
          const field = config.fields.find(f => f.name === fieldName);
          if (field && field.options) {
            const facetCounts = new Map<string, number>();
            
            filteredData.forEach(item => {
              const value = item[fieldName];
              if (value !== undefined && value !== null) {
                const key = String(value);
                facetCounts.set(key, (facetCounts.get(key) || 0) + 1);
              }
            });

            facets[fieldName] = field.options
              .map(option => ({
                value: option.value,
                label: option.label,
                count: facetCounts.get(option.value) || 0
              }))
              .filter(facet => facet.count > 0)
              .sort((a, b) => b.count - a.count);
          }
        });
      }

      const executionTime = performance.now() - startTime;

      return {
        data: paginatedData,
        total,
        page: searchQuery.page,
        pageSize: searchQuery.pageSize,
        totalPages,
        facets,
        query: searchQuery,
        executionTime
      };

    } finally {
      setIsSearching(false);
    }
   }, [data, config]);

  // Search with debouncing
  const search = useCallback(async (searchQuery: SearchQuery): Promise<SearchResult<T>> => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    return new Promise<SearchResult<T>>((resolve) => {
      searchTimeoutRef.current = setTimeout(async () => {
        const result = await executeSearch(searchQuery);
        resolve(result);
      }, 300); // 300ms debounce
    });
  }, [executeSearch]);

  // Update query and search
  const updateQuery = useCallback(async (updates: Partial<SearchQuery>): Promise<SearchResult<T>> => {
    const newQuery = { ...query, ...updates, page: 1 }; // Reset to first page
    setQuery(newQuery);
    return await search(newQuery);
  }, [query, search]);

  // Add filter
  const addFilter = useCallback(async (filter: FilterValue): Promise<SearchResult<T>> => {
    const newFilters = [...query.filters, filter];
    return await updateQuery({ filters: newFilters });
  }, [query.filters, updateQuery]);

  // Remove filter
  const removeFilter = useCallback(async (fieldName: string, operator?: string, value?: string | number | boolean | null | undefined): Promise<SearchResult<T>> => {
    const newFilters = query.filters.filter(f => 
      !(f.field === fieldName && 
        (!operator || f.operator === operator) && 
        (!value || f.value === value))
    );
    return await updateQuery({ filters: newFilters });
  }, [query.filters, updateQuery]);

  // Clear all filters
  const clearFilters = useCallback(async (): Promise<SearchResult<T>> => {
    return await updateQuery({ filters: [] });
  }, [updateQuery]);

  // Update sort
  const updateSort = useCallback(async (sort: SortField[]): Promise<SearchResult<T>> => {
    return await updateQuery({ sort });
  }, [updateQuery]);

  // Update page
  const updatePage = useCallback(async (page: number): Promise<SearchResult<T>> => {
    return await updateQuery({ page });
  }, [updateQuery]);

  // Update page size
  const updatePageSize = useCallback(async (pageSize: number): Promise<SearchResult<T>> => {
    return await updateQuery({ pageSize, page: 1 });
  }, [updateQuery]);

  // Text search
  const textSearch = useCallback(async (text: string): Promise<SearchResult<T>> => {
    return await updateQuery({ text });
  }, [updateQuery]);

  // Get filter field by name
  const getFilterField = useCallback((fieldName: string): FilterField | undefined => {
    return config.fields.find(f => f.name === fieldName);
  }, [config.fields]);

  // Get available operators for a field
  const getAvailableOperators = useCallback((fieldName: string): string[] => {
    const field = getFilterField(fieldName);
    if (!field) return [];

    switch (field.type) {
      case 'text':
        return ['eq', 'ne', 'contains', 'startsWith', 'endsWith', 'regex'];
      case 'number':
        return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between'];
      case 'date':
        return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between'];
      case 'select':
        return ['eq', 'ne', 'in', 'nin'];
      case 'boolean':
        return ['eq', 'exists'];
      case 'range':
        return ['between'];
      case 'multi':
        return ['in', 'nin'];
      default:
        return ['eq'];
    }
  }, [getFilterField]);

  // Build filter options for a field
  const getFilterOptions = useCallback((fieldName: string): Array<{ value: string; label: string; count: number }> => {
    const field = getFilterField(fieldName);
    if (!field || !field.options) return [];

    // Get unique values and counts from data
    const valueCounts = new Map<string, number>();
    data.forEach(item => {
      const value = item[fieldName];
      if (value !== undefined && value !== null) {
        const key = String(value);
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
      }
    });

    return field.options.map(option => ({
      ...option,
      count: valueCounts.get(option.value) || 0
    }));
  }, [getFilterField, data]);

  // Export current query
  const exportQuery = useCallback((): { query: SearchQuery; config: FilterConfig; exportDate: string } => {
    return {
      query: query,
      config: config,
      exportDate: new Date().toISOString()
    };
  }, [query, config]);

  // Import query
  const importQuery = useCallback(async (importedQuery: { query?: SearchQuery }): Promise<SearchResult<T> | null> => {
    if (importedQuery.query) {
      return await updateQuery(importedQuery.query);
    }
    return null;
  }, [updateQuery]);

  return {
    // State
    query,
    isSearching,
    
    // Search operations
    search,
    executeSearch,
    
    // Query management
    updateQuery,
    addFilter,
    removeFilter,
    clearFilters,
    updateSort,
    updatePage,
    updatePageSize,
    textSearch,
    
    // Field information
    getFilterField,
    getAvailableOperators,
    getFilterOptions,
    
    // Import/Export
    exportQuery,
    importQuery,
    
    // Configuration
    config
  };
};

// Specialized hook for task filtering
export const useTaskFiltering = (tasks: Task[]): ReturnType<typeof useAdvancedFiltering> => {
  const taskFilterConfig: FilterConfig = {
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Titre',
        searchable: true,
        placeholder: 'Rechercher dans le titre...'
      },
      {
        name: 'status',
        type: 'select',
        label: 'Statut',
        options: [
          { value: 'en_attente', label: 'En attente' },
          { value: 'en_cours', label: 'En cours' },
          { value: 'termine', label: 'Terminé' }
        ]
      },
      {
        name: 'priority',
        type: 'select',
        label: 'Priorité',
        options: [
          { value: 'high', label: 'Haute' },
          { value: 'medium', label: 'Moyenne' },
          { value: 'low', label: 'Basse' },
          { value: 'normale', label: 'Normale' }
        ]
      },
      {
        name: 'technician',
        type: 'text',
        label: 'Technicien',
        searchable: true
      },
      {
        name: 'vehicle',
        type: 'text',
        label: 'Véhicule',
        searchable: true
      },
      {
        name: 'progress',
        type: 'number',
        label: 'Progression',
        min: 0,
        max: 100
      },
       {
         name: 'created_at',
         type: 'date',
         label: 'Date de création'
       },
       {
         name: 'scheduled_date',
         type: 'date',
         label: 'Date planifiée'
       }
    ],
    defaultSort: [{ field: 'created_at', direction: 'desc' }],
    defaultPageSize: 20,
    enableFacets: true,
    enableHighlighting: true,
    fuzzySearch: true,
    maxResults: 1000
  };

  return useAdvancedFiltering(tasks as unknown as UnknownRecord[], taskFilterConfig);
};

// Specialized hook for SOP template filtering
export const useSOPFiltering = (sopTemplates: Record<string, unknown>[]): ReturnType<typeof useAdvancedFiltering> => {
  const sopFilterConfig: FilterConfig = {
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Nom',
        searchable: true
      },
      {
        name: 'category',
        type: 'select',
        label: 'Catégorie',
        options: [
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'repair', label: 'Réparation' },
          { value: 'inspection', label: 'Inspection' },
          { value: 'installation', label: 'Installation' }
        ]
      },
      {
        name: 'complexity',
        type: 'select',
        label: 'Complexité',
        options: [
          { value: 'low', label: 'Faible' },
          { value: 'medium', label: 'Moyenne' },
          { value: 'high', label: 'Élevée' }
        ]
      },
      {
        name: 'estimatedTime',
        type: 'number',
        label: 'Temps estimé (minutes)',
        min: 0
      },
      {
        name: 'steps',
        type: 'number',
        label: 'Nombre d\'étapes',
        min: 1
      }
    ],
    defaultSort: [{ field: 'name', direction: 'asc' }],
    defaultPageSize: 15,
    enableFacets: true,
    enableHighlighting: false,
    fuzzySearch: true,
    maxResults: 500
  };

  return useAdvancedFiltering(sopTemplates, sopFilterConfig);
};
