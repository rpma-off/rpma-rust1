import { useState, useCallback, useRef } from 'react';
import {
  executeFilterSearch,
  getAvailableOperatorsForField,
  getFilterFieldOptions,
} from '@/shared/utils/filter-engine';
import type {
  FilterField,
  FilterValue,
  SortField,
  SearchQuery,
  SearchResult,
  FilterConfig,
} from '@/shared/utils/filter-engine';

import { Task } from '@/lib/backend';
import { UnknownRecord } from '@/types/utility.types';

export type { FilterField, FilterValue, SortField, SearchQuery, SearchResult, FilterConfig };

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
    setIsSearching(true);
    try {
      return executeFilterSearch(data, searchQuery, config);
    } finally {
      setIsSearching(false);
    }
   }, [data, config]);

  // Search with debouncing
  const search = useCallback(async (searchQuery: SearchQuery): Promise<SearchResult<T>> => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    return new Promise<SearchResult<T>>((resolve) => {
      searchTimeoutRef.current = setTimeout(async () => {
        const result = await executeSearch(searchQuery);
        resolve(result);
      }, 300);
    });
  }, [executeSearch]);

  // Update query and search
  const updateQuery = useCallback(async (updates: Partial<SearchQuery>): Promise<SearchResult<T>> => {
    const newQuery = { ...query, ...updates, page: 1 };
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
    return getAvailableOperatorsForField(field);
  }, [getFilterField]);

  // Build filter options for a field
  const getFilterOptions = useCallback((fieldName: string): Array<{ value: string; label: string; count: number }> => {
    const field = getFilterField(fieldName);
    if (!field) return [];
    return getFilterFieldOptions(data, field);
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
