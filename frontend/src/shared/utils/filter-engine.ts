export interface FilterField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'range' | 'multi';
  label: string;
  options?: Array<{ value: string; label: string; count?: number }>;
  min?: number;
  max?: number;
  placeholder?: string;
  searchable?: boolean;
}

export interface FilterValue {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'between' | 'exists' | 'regex';
  value: string | number | boolean | null | undefined;
  secondaryValue?: string | number | boolean | null | undefined;
}

export interface SortField {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchQuery {
  text?: string;
  filters: FilterValue[];
  sort: SortField[];
  page: number;
  pageSize: number;
  facets?: string[];
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: Record<string, Array<{ value: string; label: string; count: number }>>;
  query: SearchQuery;
  executionTime: number;
}

export interface FilterConfig {
  fields: FilterField[];
  defaultSort: SortField[];
  defaultPageSize: number;
  enableFacets: boolean;
  enableHighlighting: boolean;
  fuzzySearch: boolean;
  maxResults: number;
}

import type { UnknownRecord } from '@/types/utility.types';

function applyFilter<T extends UnknownRecord>(item: T, filterValue: FilterValue): boolean {
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
}

function applySort<T extends UnknownRecord>(data: T[], sortFields: SortField[]): T[] {
  if (sortFields.length === 0) return data;

  return [...data].sort((a, b) => {
    for (const sortField of sortFields) {
      const aValue = a[sortField.field];
      const bValue = b[sortField.field];

      if (aValue == null && bValue == null) continue;
      if (aValue == null) return sortField.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortField.direction === 'asc' ? 1 : -1;

      if (aValue < bValue) return sortField.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortField.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

function computeFacets<T extends UnknownRecord>(
  data: T[],
  facetFields: string[],
  config: FilterConfig,
): Record<string, Array<{ value: string; label: string; count: number }>> {
  const facets: Record<string, Array<{ value: string; label: string; count: number }>> = {};

  facetFields.forEach(fieldName => {
    const field = config.fields.find(f => f.name === fieldName);
    if (field && field.options) {
      const facetCounts = new Map<string, number>();

      data.forEach(item => {
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
          count: facetCounts.get(option.value) || 0,
        }))
        .filter(facet => facet.count > 0)
        .sort((a, b) => b.count - a.count);
    }
  });

  return facets;
}

export function executeFilterSearch<T extends UnknownRecord>(
  data: T[],
  searchQuery: SearchQuery,
  config: FilterConfig,
): SearchResult<T> {
  const startTime = performance.now();

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
    filteredData = filteredData.filter(item => applyFilter(item, filterValue));
  });

  // Apply sorting
  filteredData = applySort(filteredData, searchQuery.sort);

  // Calculate pagination
  const total = filteredData.length;
  const totalPages = Math.ceil(total / searchQuery.pageSize);
  const startIndex = (searchQuery.page - 1) * searchQuery.pageSize;
  const endIndex = startIndex + searchQuery.pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Calculate facets
  const facets = config.enableFacets && searchQuery.facets
    ? computeFacets(filteredData, searchQuery.facets, config)
    : {};

  const executionTime = performance.now() - startTime;

  return {
    data: paginatedData,
    total,
    page: searchQuery.page,
    pageSize: searchQuery.pageSize,
    totalPages,
    facets,
    query: searchQuery,
    executionTime,
  };
}

export function getAvailableOperatorsForField(field: FilterField): string[] {
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
}

export function getFilterFieldOptions<T extends UnknownRecord>(
  data: T[],
  field: FilterField,
): Array<{ value: string; label: string; count: number }> {
  if (!field.options) return [];

  const valueCounts = new Map<string, number>();
  data.forEach(item => {
    const value = item[field.name];
    if (value !== undefined && value !== null) {
      const key = String(value);
      valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    }
  });

  return field.options.map(option => ({
    ...option,
    count: valueCounts.get(option.value) || 0,
  }));
}
