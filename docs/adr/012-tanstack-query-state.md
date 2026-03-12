---
title: "TanStack Query for Backend State Management"
summary: "Use TanStack Query (React Query) for managing server/backend state with automatic caching, background refetching, and optimistic updates."
domain: state
status: accepted
created: 2026-03-12
---

## Context

Backend state (tasks, clients, inventory) has different requirements than local UI state:

- Data originates from an external source (Tauri backend)
- Multiple components may need the same data
- Background updates should be reflected automatically
- Loading and error states need consistent handling
- Mutations should optimistically update UI

Using plain React state or Context for backend data leads to:

- Duplicated fetch logic across components
- No automatic caching or deduplication
- Manual loading state management
- Stale data displayed to users

## Decision

**Use TanStack Query for all backend state management.**

### Query Client Setup

```typescript
// frontend/src/shared/ui/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Domain Query Hooks

Each domain provides React Query hooks:

```typescript
// frontend/src/domains/tasks/api/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskIpc } from '../ipc';

export function useTasks(filters: TaskQuery) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => taskIpc.list(filters),
    staleTime: 30_000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => taskIpc.get(id),
    enabled: !!id,
  });
}
```

### Mutations with Cache Invalidation

```typescript
// frontend/src/domains/tasks/api/useTaskActions.ts
export function useTaskActions() {
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: (data: CreateTaskRequest) => taskIpc.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) => 
      taskIpc.update(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['task', id] });
      const previousTask = queryClient.getQueryData(['task', id]);
      queryClient.setQueryData(['task', id], (old: Task) => ({ ...old, ...data }));
      return { previousTask };
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['task', id], context.previousTask);
    },
  });

  return { createTask, updateTask };
}
```

### Provider Pattern

Domain providers wrap query hooks:

```typescript
// frontend/src/domains/tasks/api/TaskProvider.tsx
export function TaskProvider({ children }: { children: React.ReactNode }) {
  const tasksQuery = useTasks(defaultFilters);
  const taskActions = useTaskActions();

  return (
    <TaskContext.Provider value={{ tasksQuery, taskActions }}>
      {children}
    </TaskContext.Provider>
  );
}
```

## Consequences

### Positive

- **Automatic Caching**: Queries are cached and deduplicated
- **Background Refetching**: Data stays fresh automatically
- **Loading States**: Built-in isLoading, isFetching, isError
- **Optimistic Updates**: UI updates before server confirms
- **DevTools**: TanStack Query DevTools for debugging

### Negative

- **Bundle Size**: ~13KB minified + gzipped
- **Learning Curve**: Query keys, invalidation patterns
- **Over-fetching Risk**: Aggressive refetching can cause excess IPC
- **Complexity**: Optimistic updates require careful rollback logic

## Related Files

- `frontend/src/shared/ui/providers.tsx` — Query client setup
- `frontend/src/domains/tasks/api/useTasks.ts` — Task query hooks
- `frontend/src/domains/tasks/api/useTaskActions.ts` — Mutation hooks
- `frontend/src/domains/inventory/api/InventoryProvider.tsx` — Inventory provider
- `frontend/src/domains/auth/api/AuthProvider.tsx` — Auth provider
- `frontend/package.json` — @tanstack/react-query dependency

## Read When

- Adding new data fetching hooks
- Implementing optimistic updates
- Debugging stale data issues
- Configuring query caching
- Setting up query invalidation
- Understanding loading state patterns
