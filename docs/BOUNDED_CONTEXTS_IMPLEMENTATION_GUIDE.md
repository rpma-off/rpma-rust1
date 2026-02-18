# Bounded Contexts Implementation Guide

**Companion to**: [BOUNDED_CONTEXTS_MIGRATION_PLAN.md](./BOUNDED_CONTEXTS_MIGRATION_PLAN.md)  
**For**: Developers implementing bounded contexts  
**Last Updated**: 2026-02-18

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Server Facade Pattern](#server-facade-pattern)
3. [Legacy Import Burn-down Workflow](#legacy-import-burn-down-workflow)
4. [Deprecation and Removal Policy](#deprecation-and-removal-policy)
5. [Domain Structure Templates](#domain-structure-templates)
6. [Code Examples by Pattern](#code-examples-by-pattern)
7. [Testing Patterns](#testing-patterns)
8. [Common Pitfalls](#common-pitfalls)
9. [Troubleshooting](#troubleshooting)

---

## Quick Reference

### File Structure Checklist

When creating a new bounded context, create these files:

```
domains/{context}/
├── api/
│   ├── index.ts              ✅ Required - Public API exports
│   ├── {Context}Provider.tsx ✅ Required - React Context Provider
│   ├── use{Context}.ts       ✅ Required - Main hook
│   ├── use{Context}Actions.ts ✅ Required - Action hook
│   └── types.ts              ✅ Required - Public types
├── components/
│   └── README.md             ✅ Document component patterns
├── hooks/
│   └── README.md             ✅ Document internal hooks
├── services/
│   └── {context}.service.ts  ⚠️ Optional - Business logic
├── ipc/
│   └── {context}.ipc.ts      ✅ Required - IPC client wrapper
├── __tests__/
│   ├── {Context}Provider.test.tsx
│   ├── use{Context}.test.ts
│   └── integration.test.tsx
└── README.md                 ✅ Required - Domain documentation
```

### Import Path Checklist

```typescript
// ✅ ALLOWED
import { useAuth } from '@/domains/auth';
import { useTasks } from '@/domains/tasks';
import { Button } from '@/shared/ui';
import { formatDate } from '@/shared/utils';

// ❌ FORBIDDEN
import { TaskService } from '@/domains/tasks/services/task.service';
import { taskIpcClient } from '@/domains/tasks/ipc/task.ipc';
import { useInternalHook } from '@/domains/tasks/hooks/useInternalHook';
```

---

## Server Facade Pattern

Use `domains/<domain>/server/index.ts` as the **only** route-layer entry point for domain logic.

### When to Use

- `src/app/api/**` route handlers
- Server-only orchestration adapters
- Temporary migration shims for legacy `@/lib/services/**` and `@/lib/ipc/domains/**`

### Route Import Rule

```typescript
// ✅ Correct (route layer)
import { settingsService } from '@/domains/settings/server';
import { taskService } from '@/domains/tasks/server';

// ❌ Wrong (route layer)
import { settingsService } from '@/lib/services/entities/settings.service';
import { taskService } from '@/lib/services';
import { interventionWorkflowService } from '@/domains/interventions';
```

### Minimal Server Facade Template

```typescript
// domains/{context}/server/index.ts
export { {serviceName} } from '@/lib/services/{legacy-path}';
export type { {ServiceType} } from '@/lib/services/{legacy-path}';
```

### Separation Rule

- `api/index.ts`: UI/public API for pages/components/hooks
- `server/index.ts`: route/server API
- `src/app/**` (non-API): import `@/domains/<domain>` only, never `@/domains/<domain>/server`
- Do not import `server/` from generic shared utilities

---

## Legacy Import Burn-down Workflow

Use this workflow for deterministic migration and regression prevention.

### 1) Measure Baseline

```bash
npm run boundary:report
```

### 2) Enforce Non-Regression

```bash
npm run boundary:enforce
```

Enforcement rules:
- New violations fail CI
- Existing violations must be explicitly allowlisted (temporary only)
- Stale allowlist entries should be removed immediately

### 3) Migrate by Segment

Recommended order:
1. `src/app/api/**` routes to `@/domains/*/server`
2. `src/hooks/**`, `src/components/**`, `src/shared/**` off legacy imports
3. Domain internal cleanup and shim retirement

### 4) Re-validate

```bash
npm run frontend:lint
npm run frontend:type-check
npm run boundary:enforce
npm run validate:bounded-contexts
npm run architecture:check
```

---

## Deprecation and Removal Policy

Use a two-stage policy to avoid breakage.

### Stage A: Deprecate

- Keep transitional exports temporarily (for active consumers)
- Add `@deprecated` comments with replacement import path
- Migrate all callsites in the same PR batch whenever possible

### Stage B: Remove

- Delete deprecated exports from `api/index.ts`
- Keep only consumer-facing UI API in `api/`
- Keep route-layer contracts in `server/`

### Mandatory Final State

- No direct imports of `@/lib/services/**` or `@/lib/ipc/domains/**` outside `domains/*/server`
- `src/app/api/**` imports domains only via `@/domains/<domain>/server`
- `boundary:enforce` passes with zero allowlist entries

---

## Domain Structure Templates

### Template 1: Public API (api/index.ts)

```typescript
/**
 * {Context} Domain - Public API
 * 
 * This is the ONLY file that should be imported from outside this domain.
 * 
 * Usage:
 *   import { {Context}Provider, use{Context} } from '@/domains/{context}';
 * 
 * @module domains/{context}
 */

// ============================================================================
// PROVIDERS
// ============================================================================
export { {Context}Provider } from './{Context}Provider';
export type { {Context}ProviderProps } from './{Context}Provider';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Primary hook for accessing {context} state
 * @example
 *   const { items, isLoading, error } = use{Context}();
 */
export { use{Context} } from './use{Context}';

/**
 * Hook for {context} actions (mutations)
 * @example
 *   const { create, update, delete } = use{Context}Actions();
 */
export { use{Context}Actions } from './use{Context}Actions';

/**
 * Hook for specific {context} entity by ID
 * @example
 *   const { item, isLoading } = use{Context}ById(id);
 */
export { use{Context}ById } from './use{Context}ById';

// ============================================================================
// TYPES
// ============================================================================
export type {
  // Core entity type
  {Entity},
  {Entity}WithDetails,
  
  // Input types
  Create{Entity}Input,
  Update{Entity}Input,
  
  // Query types
  {Entity}Filters,
  {Entity}SortBy,
  
  // Status/enum types
  {Entity}Status,
  {Entity}Priority,
  
  // Stats/summary types
  {Entity}Stats,
  {Entity}Summary,
} from './types';

// ============================================================================
// CONSTANTS (if needed for external use)
// ============================================================================
export { {CONSTANT}_STATUSES, {CONSTANT}_PRIORITIES } from './types';

// ============================================================================
// COMPONENTS (only if designed for external use)
// ============================================================================

/**
 * Badge component for displaying {context} status
 * @example
 *   <{Entity}Badge status="active" />
 */
export { {Entity}Badge } from '../components/{Entity}Badge';

/**
 * Card component for displaying {context} summary
 * @example
 *   <{Entity}Card {entity}={data} />
 */
export { {Entity}Card } from '../components/{Entity}Card';

// ============================================================================
// UTILITIES (only if safe for external use)
// ============================================================================

/**
 * Format {entity} for display
 */
export { format{Entity} } from '../utils/format';

/**
 * Validate {entity} input
 */
export { validate{Entity}Input } from '../utils/validation';
```

### Template 2: React Provider ({Context}Provider.tsx)

```typescript
'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/domains/auth';
import { {context}IpcClient } from '../ipc/{context}.ipc';
import type { {Entity}, {Entity}Filters } from './types';

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface {Context}ContextValue {
  // State
  items: {Entity}[];
  isLoading: boolean;
  error: Error | null;
  
  // Filters
  filters: {Entity}Filters;
  setFilters: (filters: {Entity}Filters) => void;
  
  // Utilities
  refetch: () => void;
}

const {Context}Context = createContext<{Context}ContextValue | null>(null);

// ============================================================================
// PROVIDER PROPS
// ============================================================================

export interface {Context}ProviderProps {
  children: ReactNode;
  
  /**
   * Optional initial filters
   */
  initialFilters?: {Entity}Filters;
  
  /**
   * Whether to fetch data immediately (default: true)
   */
  enabled?: boolean;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function {Context}Provider({ 
  children, 
  initialFilters = {},
  enabled = true 
}: {Context}ProviderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState<{Entity}Filters>(initialFilters);
  
  // Fetch {context} data
  const query = useQuery({
    queryKey: ['{context}', user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      return {context}IpcClient.list(filters, user.token);
    },
    enabled: enabled && !!user,
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
  
  const value: {Context}ContextValue = {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    filters,
    setFilters,
    refetch: query.refetch,
  };
  
  return (
    <{Context}Context.Provider value={value}>
      {children}
    </{Context}Context.Provider>
  );
}

// ============================================================================
// CONTEXT HOOK (internal - exported via api/index.ts)
// ============================================================================

export function use{Context}Context() {
  const context = useContext({Context}Context);
  if (!context) {
    throw new Error('use{Context} must be used within {Context}Provider');
  }
  return context;
}
```

### Template 3: Main Hook (use{Context}.ts)

```typescript
'use client';

import { use{Context}Context } from './{Context}Provider';
import type { {Entity}, {Entity}Filters } from './types';

/**
 * Hook for accessing {context} state
 * 
 * Must be used within {Context}Provider
 * 
 * @returns {Context} state including items, loading state, and filters
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { items, isLoading, setFilters } = use{Context}();
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   return (
 *     <div>
 *       {items.map(item => (
 *         <ItemCard key={item.id} item={item} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function use{Context}() {
  return use{Context}Context();
}

/**
 * Helper hook for accessing only the items (no filters/actions)
 * Useful for read-only components
 */
export function use{Context}Items(): {Entity}[] {
  const { items } = use{Context}Context();
  return items;
}

/**
 * Helper hook for checking if any {context} are loading
 */
export function use{Context}Loading(): boolean {
  const { isLoading } = use{Context}Context();
  return isLoading;
}

/**
 * Helper hook for accessing {context} filters
 */
export function use{Context}Filters() {
  const { filters, setFilters } = use{Context}Context();
  return { filters, setFilters };
}
```

### Template 4: Actions Hook (use{Context}Actions.ts)

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/domains/auth';
import { {context}IpcClient } from '../ipc/{context}.ipc';
import type { Create{Entity}Input, Update{Entity}Input, {Entity} } from './types';

/**
 * Hook for {context} actions (mutations)
 * 
 * Provides functions for creating, updating, and deleting {context}
 * 
 * @returns Actions for managing {context}
 * 
 * @example
 * ```tsx
 * function CreateButton() {
 *   const { create{Entity}, isCreating } = use{Context}Actions();
 *   
 *   const handleCreate = async () => {
 *     const result = await create{Entity}({
 *       // ... input data
 *     });
 *     
 *     if (result.success) {
 *       toast.success('{Entity} created!');
 *     }
 *   };
 *   
 *   return (
 *     <Button onClick={handleCreate} disabled={isCreating}>
 *       Create {Entity}
 *     </Button>
 *   );
 * }
 * ```
 */
export function use{Context}Actions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  if (!user) {
    throw new Error('use{Context}Actions requires authenticated user');
  }
  
  // ============================================================================
  // CREATE
  // ============================================================================
  
  const createMutation = useMutation({
    mutationFn: async (input: Create{Entity}Input) => {
      return {context}IpcClient.create(input, user.token);
    },
    onSuccess: (new{Entity}: {Entity}) => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['{context}'] });
      
      // Optionally, optimistically update cache
      queryClient.setQueryData(
        ['{context}', user.id],
        (old: {Entity}[] | undefined) => {
          return old ? [...old, new{Entity}] : [new{Entity}];
        }
      );
    },
    onError: (error: Error) => {
      console.error('Failed to create {entity}:', error);
    },
  });
  
  // ============================================================================
  // UPDATE
  // ============================================================================
  
  const updateMutation = useMutation({
    mutationFn: async (input: Update{Entity}Input) => {
      return {context}IpcClient.update(input, user.token);
    },
    onSuccess: (updated{Entity}: {Entity}) => {
      queryClient.invalidateQueries({ queryKey: ['{context}'] });
      
      // Update specific item in cache
      queryClient.setQueryData(
        ['{context}', 'item', updated{Entity}.id],
        updated{Entity}
      );
    },
    onError: (error: Error) => {
      console.error('Failed to update {entity}:', error);
    },
  });
  
  // ============================================================================
  // DELETE
  // ============================================================================
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return {context}IpcClient.delete(id, user.token);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['{context}'] });
      
      // Remove from cache
      queryClient.setQueryData(
        ['{context}', user.id],
        (old: {Entity}[] | undefined) => {
          return old ? old.filter(item => item.id !== deletedId) : [];
        }
      );
    },
    onError: (error: Error) => {
      console.error('Failed to delete {entity}:', error);
    },
  });
  
  // ============================================================================
  // RETURN API
  // ============================================================================
  
  return {
    // Create
    create{Entity}: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    
    // Update
    update{Entity}: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    
    // Delete
    delete{Entity}: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
```

### Template 5: IPC Client Wrapper (ipc/{context}.ipc.ts)

```typescript
/**
 * IPC Client for {Context} Domain
 * 
 * INTERNAL MODULE - Do not import directly from outside the domain
 * Use public hooks instead: use{Context}, use{Context}Actions
 * 
 * @internal
 */

import { safeInvoke } from '@/shared/ipc';
import type {
  {Entity},
  {Entity}Filters,
  Create{Entity}Input,
  Update{Entity}Input,
  {Entity}Stats,
} from '../api/types';

/**
 * IPC client for {context} operations
 */
export const {context}IpcClient = {
  /**
   * List {context} with optional filters
   */
  async list(
    filters: {Entity}Filters = {},
    token: string
  ): Promise<{Entity}[]> {
    const result = await safeInvoke('{context}_list', {
      session_token: token,
      filters,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch {context}');
    }
    
    return result.data;
  },
  
  /**
   * Get single {entity} by ID
   */
  async getById(id: string, token: string): Promise<{Entity}> {
    const result = await safeInvoke('{context}_get_by_id', {
      session_token: token,
      id,
    });
    
    if (!result.success) {
      throw new Error(result.error || `Failed to fetch {entity} ${id}`);
    }
    
    return result.data;
  },
  
  /**
   * Create new {entity}
   */
  async create(
    input: Create{Entity}Input,
    token: string
  ): Promise<{Entity}> {
    const result = await safeInvoke('{context}_create', {
      session_token: token,
      ...input,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create {entity}');
    }
    
    return result.data;
  },
  
  /**
   * Update existing {entity}
   */
  async update(
    input: Update{Entity}Input,
    token: string
  ): Promise<{Entity}> {
    const result = await safeInvoke('{context}_update', {
      session_token: token,
      ...input,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update {entity}');
    }
    
    return result.data;
  },
  
  /**
   * Delete {entity}
   */
  async delete(id: string, token: string): Promise<void> {
    const result = await safeInvoke('{context}_delete', {
      session_token: token,
      id,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete {entity}');
    }
  },
  
  /**
   * Get {context} statistics
   */
  async getStats(token: string): Promise<{Entity}Stats> {
    const result = await safeInvoke('{context}_get_stats', {
      session_token: token,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch {context} stats');
    }
    
    return result.data;
  },
};
```

### Template 6: Types Definition (api/types.ts)

```typescript
/**
 * {Context} Domain - Type Definitions
 * 
 * These types are part of the public API
 * 
 * @module domains/{context}/types
 */

// Import base types from Rust-generated types
import type { {Entity} as Rust{Entity} } from '@/lib/backend';

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

/**
 * Core {Entity} type (from backend)
 */
export type {Entity} = Rust{Entity};

/**
 * {Entity} with additional details (joined data)
 */
export type {Entity}WithDetails = {Entity} & {
  // Related entities
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  
  // Computed fields
  stats?: {
    totalCount: number;
    averageValue: number;
  };
  
  // Enriched data
  metadata?: Record<string, unknown>;
};

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input for creating a new {entity}
 */
export type Create{Entity}Input = {
  name: string;
  description?: string;
  status: {Entity}Status;
  priority: {Entity}Priority;
  // ... other required fields
};

/**
 * Input for updating an existing {entity}
 */
export type Update{Entity}Input = Partial<Create{Entity}Input> & {
  id: string;
  // Fields that cannot be updated can be explicitly excluded
};

/**
 * Input for bulk operations
 */
export type Bulk{Entity}Input = {
  ids: string[];
  action: 'archive' | 'delete' | 'activate';
  reason?: string;
};

// ============================================================================
// QUERY/FILTER TYPES
// ============================================================================

/**
 * Filters for querying {context}
 */
export type {Entity}Filters = {
  // Status filters
  status?: {Entity}Status[];
  priority?: {Entity}Priority[];
  
  // Search
  search?: string;
  
  // Date range
  createdAfter?: Date;
  createdBefore?: Date;
  
  // Related entities
  createdById?: string;
  assignedToId?: string;
  
  // Pagination
  page?: number;
  pageSize?: number;
  
  // Sorting
  sortBy?: {Entity}SortBy;
  sortOrder?: 'asc' | 'desc';
};

/**
 * Sort options for {context}
 */
export type {Entity}SortBy = 
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'priority'
  | 'status';

// ============================================================================
// ENUM TYPES
// ============================================================================

/**
 * Possible statuses for {entity}
 */
export type {Entity}Status = 
  | 'draft'
  | 'pending'
  | 'active'
  | 'completed'
  | 'archived'
  | 'cancelled';

/**
 * Priority levels for {entity}
 */
export type {Entity}Priority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

// ============================================================================
// STATISTICS & SUMMARY TYPES
// ============================================================================

/**
 * Statistics for {context}
 */
export type {Entity}Stats = {
  total: number;
  byStatus: Record<{Entity}Status, number>;
  byPriority: Record<{Entity}Priority, number>;
  averageCompletionTime?: number;
  completionRate?: number;
};

/**
 * Summary view of {entity}
 */
export type {Entity}Summary = Pick<{Entity}, 'id' | 'name' | 'status' | 'priority'> & {
  itemCount: number;
  lastUpdated: Date;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * All possible {entity} statuses
 */
export const {CONSTANT}_STATUSES: {Entity}Status[] = [
  'draft',
  'pending',
  'active',
  'completed',
  'archived',
  'cancelled',
];

/**
 * All possible {entity} priorities
 */
export const {CONSTANT}_PRIORITIES: {Entity}Priority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];

/**
 * Display labels for statuses
 */
export const {CONSTANT}_STATUS_LABELS: Record<{Entity}Status, string> = {
  draft: 'Draft',
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
  cancelled: 'Cancelled',
};

/**
 * Color mapping for statuses (Tailwind classes)
 */
export const {CONSTANT}_STATUS_COLORS: Record<{Entity}Status, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
};
```

### Template 7: Domain README

```markdown
# {Context} Domain

> **Bounded Context**: Manages {description of business capability}

## Overview

The {Context} domain handles all functionality related to {detailed description}. It provides a clean API for components to interact with {context} data without needing to know about the underlying IPC layer or state management.

## Public API

### Provider

```typescript
import { {Context}Provider } from '@/domains/{context}';

function App() {
  return (
    <{Context}Provider initialFilters={{ status: ['active'] }}>
      <YourComponents />
    </{Context}Provider>
  );
}
```

### Hooks

#### `use{Context}()`

Access {context} state including items, loading state, and filters.

```typescript
const { items, isLoading, error, filters, setFilters } = use{Context}();
```

#### `use{Context}Actions()`

Perform actions on {context} (create, update, delete).

```typescript
const { create{Entity}, update{Entity}, delete{Entity} } = use{Context}Actions();

await create{Entity}({ name: 'New {Entity}', ... });
```

#### `use{Context}ById(id)`

Get a specific {entity} by ID.

```typescript
const { item, isLoading } = use{Context}ById(id);
```

## Types

See [`api/types.ts`](./api/types.ts) for all exported types.

Key types:
- `{Entity}` - Core entity type
- `{Entity}WithDetails` - Entity with joined data
- `Create{Entity}Input` - Input for creating
- `Update{Entity}Input` - Input for updating
- `{Entity}Filters` - Query filters
- `{Entity}Stats` - Statistics

## Components

### Internal Components

Located in `components/` - these are NOT exported from the public API:

- `{Entity}List` - Renders list of {context}
- `{Entity}Form` - Form for creating/editing
- `{Entity}Details` - Detailed view of single {entity}

### Public Components

Exported from public API for use in other domains:

- `{Entity}Badge` - Display {entity} status badge
- `{Entity}Card` - Summary card view

## Dependencies

- `@/domains/auth` - For authentication
- `@/shared/ui` - For UI components
- `@/shared/utils` - For utility functions

## Testing

Run domain tests:

```bash
npm test -- domains/{context}
```

Run specific test:

```bash
npm test -- domains/{context}/{Context}Provider.test
```

## Architecture

```
api/                    # Public API (ONLY import from here)
├── index.ts           # Exports
├── {Context}Provider  # React Context
├── use{Context}       # Main hook
└── types.ts           # Public types

components/            # Internal components
hooks/                 # Internal hooks
services/              # Business logic (if needed)
ipc/                   # IPC client wrapper
__tests__/             # Tests
```

## Development

### Adding a New Feature

1. Implement in `components/`, `hooks/`, or `services/`
2. If feature needs external access, export from `api/index.ts`
3. Update this README
4. Add tests
5. Update type definitions if needed

### Modifying the Public API

1. Consider backward compatibility
2. Deprecate old exports before removing
3. Update all consumers
4. Update documentation

## Examples

### Basic Usage

```typescript
import { {Context}Provider, use{Context}, use{Context}Actions } from '@/domains/{context}';

function {Entity}Page() {
  return (
    <{Context}Provider>
      <{Entity}List />
      <Create{Entity}Form />
    </{Context}Provider>
  );
}

function {Entity}List() {
  const { items, isLoading } = use{Context}();
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {items.map(item => (
        <{Entity}Item key={item.id} item={item} />
      ))}
    </div>
  );
}

function Create{Entity}Form() {
  const { create{Entity}, isCreating } = use{Context}Actions();
  
  const handleSubmit = async (data) => {
    await create{Entity}(data);
    toast.success('{Entity} created!');
  };
  
  return <Form onSubmit={handleSubmit} />;
}
```

### Advanced Filtering

```typescript
function FilteredList() {
  const { items, filters, setFilters } = use{Context}();
  
  return (
    <>
      <FilterBar
        filters={filters}
        onChange={setFilters}
      />
      <List items={items} />
    </>
  );
}
```

## Troubleshooting

### Common Issues

**Import errors**: Make sure you're importing from `@/domains/{context}`, not internal paths.

```typescript
// ✅ Correct
import { use{Context} } from '@/domains/{context}';

// ❌ Wrong
import { use{Context} } from '@/domains/{context}/hooks/use{Context}';
```

**Provider not found**: Make sure component is wrapped in `{Context}Provider`.

```typescript
// ✅ Correct
<{Context}Provider>
  <MyComponent />
</{Context}Provider>

// ❌ Wrong - no provider
<MyComponent /> // will throw error
```

## Maintainers

- Primary: [Team Name]
- Reviewer: [Lead Name]

## Related Domains

- `@/domains/auth` - Authentication
- `@/domains/...` - Related domain
```

---

## Testing Patterns

### Template: Provider Test

```typescript
// __tests__/{Context}Provider.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { {Context}Provider, use{Context} } from '../api';

// Mock auth
jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', token: 'test-token' },
  }),
}));

// Mock IPC
jest.mock('../ipc/{context}.ipc', () => ({
  {context}IpcClient: {
    list: jest.fn().mockResolvedValue([
      { id: '1', name: 'Test Item 1' },
      { id: '2', name: 'Test Item 2' },
    ]),
  },
}));

function TestComponent() {
  const { items, isLoading } = use{Context}();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}

describe('{Context}Provider', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });
  
  it('provides {context} data to children', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <{Context}Provider>
          <TestComponent />
        </{Context}Provider>
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    });
  });
  
  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );
    }).toThrow('use{Context} must be used within {Context}Provider');
    
    spy.mockRestore();
  });
});
```

### Template: Actions Test

```typescript
// __tests__/use{Context}Actions.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { use{Context}Actions } from '../api';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', token: 'test-token' },
  }),
}));

const mockCreate = jest.fn();
jest.mock('../ipc/{context}.ipc', () => ({
  {context}IpcClient: {
    create: mockCreate,
  },
}));

describe('use{Context}Actions', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient();
    mockCreate.mockClear();
  });
  
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('creates {entity} successfully', async () => {
    const new{Entity} = { id: '1', name: 'New Item' };
    mockCreate.mockResolvedValue(new{Entity});
    
    const { result } = renderHook(() => use{Context}Actions(), { wrapper });
    
    await result.current.create{Entity}({ name: 'New Item' });
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        { name: 'New Item' },
        'test-token'
      );
    });
  });
  
  it('handles create error', async () => {
    mockCreate.mockRejectedValue(new Error('Create failed'));
    
    const { result } = renderHook(() => use{Context}Actions(), { wrapper });
    
    await expect(
      result.current.create{Entity}({ name: 'New Item' })
    ).rejects.toThrow('Create failed');
  });
});
```

---

## Common Pitfalls

### ❌ Pitfall 1: Importing from Internal Modules

```typescript
// ❌ WRONG - importing internal service
import { TaskService } from '@/domains/tasks/services/task.service';

// ✅ CORRECT - importing from public API
import { useTaskActions } from '@/domains/tasks';
const { updateTask } = useTaskActions();
```

### ❌ Pitfall 2: Circular Dependencies

```typescript
// ❌ WRONG - circular dependency
// domains/tasks/api/index.ts
import { InterventionService } from '@/domains/interventions/services/...';

// domains/interventions/api/index.ts
import { TaskService } from '@/domains/tasks/services/...';

// ✅ CORRECT - use event bus or public APIs only
// domains/tasks/services/task.service.ts
import { eventBus } from '@/shared/events';
eventBus.publish('task.completed', { taskId });

// domains/interventions/services/intervention.service.ts
eventBus.subscribe('task.completed', handleTaskCompleted);
```

### ❌ Pitfall 3: Shared State in Services

```typescript
// ❌ WRONG - shared mutable state
export class TaskService {
  private cache: Task[] = []; // Shared across all instances
  
  async getTasks() {
    if (this.cache.length > 0) return this.cache;
    // ...
  }
}

// ✅ CORRECT - use React Query for caching
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskIpcClient.list(),
    staleTime: 60000, // Cache for 1 minute
  });
}
```

### ❌ Pitfall 4: Exposing Too Much in Public API

```typescript
// ❌ WRONG - exposing internal implementation
// api/index.ts
export { TaskService } from '../services/task.service';
export { taskIpcClient } from '../ipc/task.ipc';
export { useInternalTaskState } from '../hooks/useInternalTaskState';

// ✅ CORRECT - only expose consumer-facing API
// api/index.ts
export { TaskProvider } from './TaskProvider';
export { useTasks } from './useTasks';
export { useTaskActions } from './useTaskActions';
export type { Task, CreateTaskInput } from './types';
```

### ❌ Pitfall 5: Not Using TypeScript Path Aliases

```typescript
// ❌ WRONG - relative imports
import { useTasks } from '../../domains/tasks/api';
import { Button } from '../../../shared/ui/button';

// ✅ CORRECT - path aliases
import { useTasks } from '@/domains/tasks';
import { Button } from '@/shared/ui';
```

---

## Troubleshooting

### Issue: "Cannot find module '@/domains/...'"

**Cause**: TypeScript path alias not configured

**Solution**:
1. Check `tsconfig.json` has path alias:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/domains/tasks": ["./src/domains/tasks/api"]
       }
     }
   }
   ```

2. Restart TypeScript server in your IDE

### Issue: "Hook must be used within Provider"

**Cause**: Component using hook is not wrapped in provider

**Solution**:
```typescript
// Wrap your component tree
<TaskProvider>
  <YourComponent />
</TaskProvider>
```

### Issue: ESLint error "no-restricted-imports"

**Cause**: Importing from internal module instead of public API

**Solution**: Change import to use public API:
```typescript
// ❌ Before
import { TaskService } from '@/domains/tasks/services/task.service';

// ✅ After
import { useTaskActions } from '@/domains/tasks';
```

### Issue: Circular dependency detected

**Cause**: Two domains importing from each other

**Solution**: Use event bus or refactor to remove direct dependency:
```typescript
// Instead of direct import
import { taskService } from '@/domains/tasks/services/...';

// Use event bus
import { eventBus } from '@/shared/events';
eventBus.publish('task.updated', { taskId });
```

### Issue: Type errors after updating domain

**Cause**: Public API types changed but consumers not updated

**Solution**:
1. Search for all imports: `grep -r "from '@/domains/tasks'" frontend/src/`
2. Update each consumer to use new types
3. Consider deprecation period for breaking changes

---

## Additional Resources

- [Main Migration Plan](./BOUNDED_CONTEXTS_MIGRATION_PLAN.md)
- [ADR-001: Module Boundaries](./adr/001-module-boundaries.md)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Domain-Driven Design](https://martinfowler.com/bliki/BoundedContext.html)
