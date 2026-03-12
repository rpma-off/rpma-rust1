---
title: "Zustand for Local UI State Management"
summary: "Use Zustand for client-side UI state that doesn't belong in backend state (filters, modals, form state), avoiding Redux complexity."
domain: state
status: accepted
created: 2026-03-12
---

## Context

Not all state belongs in TanStack Query. UI-specific state includes:

- Active filters and sort preferences
- Modal open/close state
- Form draft data
- Sidebar collapse state
- Theme preferences

Using React Context for this state leads to:

- Provider nesting hell
- Re-renders from unrelated state changes
- Verbose boilerplate for simple state

Redux adds unnecessary complexity for local state:

- Actions, reducers, selectors boilerplate
- Global store for local concerns
- Middleware setup for simple operations

## Decision

**Use Zustand for local/global UI state that doesn't belong in TanStack Query.**

### Store Pattern

```typescript
// frontend/src/domains/tasks/stores/taskFilterStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TaskFilterState {
  status: TaskStatus | null;
  priority: TaskPriority | null;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  setStatus: (status: TaskStatus | null) => void;
  setPriority: (priority: TaskPriority | null) => void;
  setSearch: (search: string) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  reset: () => void;
}

export const useTaskFilterStore = create<TaskFilterState>()(
  persist(
    (set) => ({
      status: null,
      priority: null,
      search: '',
      sortBy: 'created_at',
      sortOrder: 'desc',
      
      setStatus: (status) => set({ status }),
      setPriority: (priority) => set({ priority }),
      setSearch: (search) => set({ search }),
      setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
      reset: () => set({ status: null, priority: null, search: '' }),
    }),
    { name: 'task-filters' }
  )
);
```

### Usage in Components

```typescript
// frontend/src/domains/tasks/components/TaskListFilters.tsx
export function TaskListFilters() {
  const { status, priority, setStatus, setPriority } = useTaskFilterStore();
  
  return (
    <div>
      <Select value={status} onChange={setStatus}>
        <option value={null}>All Statuses</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
      </Select>
      
      <Select value={priority} onChange={setPriority}>
        <option value={null}>All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
      </Select>
    </div>
  );
}
```

### Selective Subscriptions

```typescript
// Only re-render when search changes
const search = useTaskFilterStore((state) => state.search);

// Only re-render when specific filter changes
const status = useTaskFilterStore((state) => state.status);
```

### Persistence

```typescript
// Persist to localStorage
export const useTaskFilterStore = create<TaskFilterState>()(
  persist(
    (set) => ({ /* state and actions */ }),
    { 
      name: 'task-filters',
      partialize: (state) => ({ status: state.status, priority: state.priority }),
    }
  )
);
```

### When to Use Zustand vs TanStack Query

| State Type | Tool |
|-----------|------|
| Data from backend (tasks, clients) | TanStack Query |
| UI state (filters, modals) | Zustand |
| Form draft state | Zustand |
| User preferences | Zustand (persisted) |
| Session/auth state | TanStack Query + Context |

## Consequences

### Positive

- **Minimal Boilerplate**: Create store with single function call
- **No Providers**: Use stores directly in components
- **Selective Re-renders**: Subscribe to specific state slices
- **Persistence Built-in**: localStorage sync out of the box
- **TypeScript Support**: Full type inference

### Negative

- **Another State Tool**: Developers must learn when to use which
- **No DevTools by Default**: Requires separate setup
- **Potential Duplication**: Similar state in multiple stores
- **No Time-Travel**: Unlike Redux, no built-in state history

## Related Files

- `frontend/src/domains/tasks/stores/` — Task domain stores (if present)
- `frontend/src/domains/settings/stores/` — Settings stores
- `frontend/package.json` — zustand dependency
- `AGENTS.md` — State management guidance

## Read When

- Adding new UI state that needs to persist
- Deciding between Zustand and TanStack Query
- Implementing filter or sort state
- Setting up persisted preferences
- Debugging state-related re-renders
- Creating form draft state stores
