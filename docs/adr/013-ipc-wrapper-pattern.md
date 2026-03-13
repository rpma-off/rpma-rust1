# ADR-013: IPC Wrapper Pattern for Frontend

## Status

Accepted

## Date

2026-03-13

## Summary

The frontend never calls Tauri's `invoke` directly. All IPC communication goes through typed domain wrapper functions in `frontend/src/domains/*/ipc/`.

## Context

- Need type-safe communication between frontend and backend
- Direct `invoke` calls are error-prone (typos, wrong types)
- Session token must be passed to every IPC call
- Centralized error handling for IPC errors
- Need to invalidate React Query cache after mutations

## Decision

### The Rule

**Never call `invoke` directly. Use domain IPC wrappers.**

### Pattern Flow

```
Component
    ↓
useQuery / useMutation (React Query)
    ↓
API function (domains/*/api/)
    ↓
IPC Wrapper (domains/*/ipc/)
    ↓
Tauri invoke (with session token)
    ↓
Backend Handler
```

### Directory Structure

```
frontend/src/domains/<name>/
├── api/            # React Query public API (hooks, queries)
│   └── index.ts    # Public exports for components
├── components/     # Domain UI components
├── hooks/          # Domain custom hooks
├── ipc/            # IPC client wrappers
│   └── index.ts    # Typed invoke wrappers
├── services/       # Frontend business logic
└── stores/         # Zustand stores (when needed)
```

### IPC Wrapper Implementation

```typescript
// frontend/src/domains/users/ipc/index.ts
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types/user';

// Typed IPC client for users domain
export const userIpc = {
  async list(limit: number, offset: number): Promise<{ data: User[]; total: number }> {
    const sessionToken = await requireSessionToken();
    return invoke('get_users', { sessionToken, limit, offset });
  },

  async get(id: string): Promise<User | null> {
    const sessionToken = await requireSessionToken();
    return invoke('user_crud', { 
      operation: 'get', 
      sessionToken, 
      payload: { id } 
    });
  },

  async create(request: CreateUserRequest): Promise<User> {
    const sessionToken = await requireSessionToken();
    const result = await invoke('create_user', { sessionToken, ...request });
    // Invalidate cache after mutation
    await queryClient.invalidateQueries({ queryKey: ['users'] });
    return result;
  },

  async update(id: string, request: UpdateUserRequest): Promise<User> {
    const sessionToken = await requireSessionToken();
    const result = await invoke('update_user', { sessionToken, id, ...request });
    await queryClient.invalidateQueries({ queryKey: ['users'] });
    await queryClient.invalidateQueries({ queryKey: ['user', id] });
    return result;
  },

  async delete(id: string): Promise<void> {
    const sessionToken = await requireSessionToken();
    await invoke('delete_user', { sessionToken, id });
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  },
};
```

### Session Token Handling

```typescript
// frontend/src/shared/contracts/session.ts
let sessionToken: string | null = null;

export function setSessionToken(token: string): void {
  sessionToken = token;
}

export function clearSessionToken(): void {
  sessionToken = null;
}

export async function requireSessionToken(): Promise<string> {
  if (!sessionToken) {
    // Try to restore from storage
    const stored = localStorage.getItem('session_token');
    if (stored) {
      sessionToken = stored;
      return stored;
    }
    throw new Error('Session token required. Please log in.');
  }
  return sessionToken;
}
```

### API Layer with React Query

```typescript
// frontend/src/domains/users/api/index.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userIpc } from '../ipc';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Queries
export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => userIpc.list(filters.limit, filters.offset),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userIpc.get(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateUserRequest) => userIpc.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateUserRequest }) =>
      userIpc.update(id, request),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => userIpc.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
```

### Component Usage

```typescript
// ✅ CORRECT: Use API hooks
function UserList() {
  const { data: users, isLoading } = useUsers({ limit: 50, offset: 0 });
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();

  const handleCreate = (userData: CreateUserRequest) => {
    createMutation.mutate(userData);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // ... render
}

// ❌ WRONG: Call invoke directly
function UserList() {
  const handleCreate = async (userData: CreateUserRequest) => {
    // Don't do this!
    await invoke('create_user', { sessionToken, ...userData });
  };
}
```

### Error Handling

```typescript
// frontend/src/lib/utils/errorHandling.ts
export function handleIpcError(error: unknown): AppError {
  if (error instanceof Error) {
    // Tauri IPC errors have specific format
    const message = error.message;
    
    // Parse backend error types
    if (message.includes('Authentication:')) {
      return { type: 'auth', message: 'Please log in again.' };
    }
    if (message.includes('Authorization:')) {
      return { type: 'forbidden', message: 'You do not have permission.' };
    }
    if (message.includes('Validation:')) {
      return { type: 'validation', message };
    }
    
    return { type: 'unknown', message };
  }
  
  return { type: 'unknown', message: 'An unexpected error occurred.' };
}
```

### IPC Client Organization

```typescript
// frontend/src/lib/ipc.ts
import { userIpc } from '@/domains/users/ipc';
import { taskIpc } from '@/domains/tasks/ipc';
import { clientIpc } from '@/domains/clients/ipc';
// ... other domains

export const ipcClient = {
  users: userIpc,
  tasks: taskIpc,
  clients: clientIpc,
  // ... other domains
};
```

## Query Keys Convention

```typescript
// Standard query key hierarchy
const keys = {
  all: ['domain'] as const,                    // Invalidate all domain data
  lists: () => [...keys.all, 'list'] as const, // All lists
  list: (filters) => [...keys.lists(), filters] as const, // Specific list
  details: () => [...keys.all, 'detail'] as const, // All details
  detail: (id) => [...keys.details(), id] as const, // Specific item
};
```

## Consequences

### Positive

- Type-safe IPC communication
- Centralized session token handling
- Automatic cache invalidation
- Consistent error handling
- Easy to mock for testing
- Query keys standardized across domains

### Negative

- Additional abstraction layer
- More boilerplate for simple operations
- Need to maintain IPC wrappers and API layers separately

## Related Files

- `frontend/src/domains/*/ipc/` — IPC wrappers per domain
- `frontend/src/domains/*/api/` — React Query hooks
- `frontend/src/lib/ipc.ts` — Centralized IPC client
- `frontend/src/shared/contracts/session.ts` — Session token handling

## When to Read This ADR

- Creating new IPC commands
- Adding new domain features
- Writing components that fetch data
- Understanding data flow from UI to backend
- Debugging IPC communication issues

## References

- AGENTS.md "Never call invoke directly" rule
- TanStack Query documentation
- Tauri IPC documentation