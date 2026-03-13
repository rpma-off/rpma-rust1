# ADR-014: TanStack Query for Server State

## Status

Accepted

## Date

2026-03-13

## Summary

All backend state is managed with TanStack Query (React Query). Zustand is used only for UI-only state. Never use `useState + useEffect` for server data.

## Context

- Need efficient caching of server data
- Background refetching and stale-while-revalidate
- Automatic cache invalidation on mutations
- Loading and error states for async operations
- Avoid duplicate requests for same data

## Decision

### The Rule

**TanStack Query for server state. Zustand for UI-only state. Never `useState + useEffect` for server data.**

### State Classification

| State Type | Tool | Examples |
|-----------|------|----------|
| Server State |TanStack Query | Users, tasks, clients, quotes |
| UI-Only State | Zustand | Sidebar open, selected tab, form dirty |
| Local Form State | useState/react-hook-form | Unsubmitted form values |

### TanStack Query Setup

```typescript
// frontend/src/app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Query Keys Pattern

```typescript
// frontend/src/domains/tasks/api/keys.ts
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  status: () => [...taskKeys.all, 'status'] as const,
  history: (id: string) => [...taskKeys.detail(id), 'history'] as const,
};
```

### Query Hooks

```typescript
// frontend/src/domains/tasks/api/index.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskIpc } from '../ipc';
import { taskKeys } from './keys';

// List with filters
export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => taskIpc.list(filters),
  });
}

// Individual item
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskIpc.get(id),
    enabled: !!id, // Don't fetch ifid is empty
  });
}

// Dependent query
export function useTaskHistory(taskId: string) {
  return useQuery({
    queryKey: taskKeys.history(taskId),
    queryFn: () => taskIpc.getHistory(taskId),
    enabled: !!taskId,
  });
}
```

### Mutation with Cache Invalidation

```typescript
// frontend/src/domains/tasks/api/index.ts
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTaskRequest) => taskIpc.create(request),
    onSuccess: (newTask) => {
      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      
      // Signal mutation event
      signalMutation('tasks');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateTaskRequest }) =>
      taskIpc.update(id, request),
    onSuccess: (_, { id }) => {
      // Invalidate specific task
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskIpc.delete(id),
    onSuccess: () => {
      // Remove from cache immediately
      queryClient.removeQueries({ queryKey: taskKeys.all });
      // Refetch lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

### Optimistic Updates

```typescript
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      taskIpc.updateStatus(id, status),
    
    // Optimistic update
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      
      // Snapshot previous value
      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id));
      
      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData<Task>(taskKeys.detail(id), {
          ...previousTask,
          status,
        });
      }
      
      return { previousTask };
    },
    
    // Rollback on error
    onError: (err, { id }, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
    },
    
    // Always refetch after success or error
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}
```

### Zustand for UI State

```typescript
// frontend/src/domains/app/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeTab: string;
  selectedTaskId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedTaskId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTab: 'tasks',
  selectedTaskId: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
}));
```

### Invalidating Across Domains

```typescript
// frontend/src/lib/query-client.ts
import { queryClient } from './query-client';

// Invalidate all queries for a domain
export function invalidateDomain(domain: string) {
  queryClient.invalidateQueries({ queryKey: [domain] });
}

// Signal mutation for cross-domain invalidation
export function signalMutation(domain: string) {
  // Emit event for any listeners
  window.dispatchEvent(new CustomEvent('domain-mutation', { detail: { domain } }));
}

// APattern for reactive invalidation
export function useMutationSignal() {
  useEffect(() => {
    const handleMutation = (event: CustomEvent) => {
      const { domain } = event.detail;
      invalidateDomain(domain);
    };
    
    window.addEventListener('domain-mutation', handleMutation as EventListener);
    return () => window.removeEventListener('domain-mutation', handleMutation as EventListener);
  }, []);
}
```

## Consequences

### Positive

- Automatic caching and background refetching
- Stale-while-revalidate pattern
- Optimistic updates possible
- Loading/error states included
- Deduplication of requests
- No manual state sync with server

### Negative

- Learning curve for TanStack Query
- Query key management needed
- Cache invalidation complexity for cross-domain updates

## Anti-Patterns to Avoid

```typescript
// ❌ WRONG: useState + useEffect for server data
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);
  
  // ...
}

// ✅ CORRECT: Use TanStack Query
function UserList() {
  const { data: users, isLoading } = useUsers();
  // ...
}

// ❌ WRONG: Zustand for server data
const useUserStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const users = await fetchUsers();
    set({ users });
  },
}));

// ✅ CORRECT: Zustand for UI state only
const useUIStore = create((set) => ({
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
}));
```

## Related Files

- `frontend/src/app/providers.tsx` — Query client setup
- `frontend/src/domains/*/api/` — Query hooks
- `frontend/src/domains/*/ipc/` — IPC wrappers
- `frontend/src/lib/query-client.ts` — Query utilities
- `frontend/src/domains/app/stores/` — Zustand stores

## When to Read This ADR

- Fetching data from backend
- Creating mutation hooks
- Understanding cache invalidation
- Deciding between useState, Zustand, and React Query
- Debugging stale data issues

## References

- AGENTS.md "TanStack Query for all backend state"
- TanStack Query documentation
- Zustand documentation