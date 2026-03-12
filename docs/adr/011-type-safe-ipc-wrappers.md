---
title: "Type-Safe IPC Wrapper Abstraction"
summary: "Abstract Tauri invoke calls behind typed domain IPC wrappers with validation, caching, and error handling, preventing direct invoke from components."
domain: ipc
status: accepted
created: 2026-03-12
---

## Context

Direct Tauri `invoke` calls from React components create several problems:

- No type safety for request/response shapes
- Duplicated error handling across components
- No caching layer for repeated calls
- Difficult to mock in tests
- Scattered command strings throughout codebase

## Decision

**Wrap all Tauri invoke calls in typed domain-specific IPC modules.**

### Core IPC Utilities

Defined in `frontend/src/lib/ipc/core/index.ts`:

```typescript
export function safeInvoke<T>(command: string, args: object): Promise<T>;
export function cachedInvoke<T>(key: string, command: string, args: object, validator: (data: unknown) => T): Promise<T>;
export function invalidatePattern(pattern: string): void;
export function extractAndValidate<T>(data: unknown, validator: (data: unknown) => T, options?: { handleNotFound?: boolean }): T;
```

### Domain IPC Wrapper Pattern

Each domain has an `ipc/` folder with typed wrappers:

```typescript
// frontend/src/domains/tasks/ipc/task.ipc.ts
import { safeInvoke, extractAndValidate, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { validateTask } from '@/lib/validation/backend-type-guards';
import type { Task, CreateTaskRequest, UpdateTaskRequest, TaskQuery, TaskListResponse } from '@/lib/backend';

export const taskIpc = {
  create: async (data: CreateTaskRequest): Promise<Task> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: { action: { action: 'Create', data } }
    });
    invalidatePattern('task:');
    signalMutation('tasks');
    return extractAndValidate(result, validateTask) as Task;
  },

  get: async (id: string): Promise<Task | null> => {
    return cachedInvoke(`task:${id}`, IPC_COMMANDS.TASK_CRUD, {
      request: { action: { action: 'Get', id } }
    }, (data) => extractAndValidate(data, validateTask, { handleNotFound: true }) as Task | null);
  },

  list: async (filters: Partial<TaskQuery>): Promise<TaskListResponse> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.TASK_CRUD, {
      request: { action: { action: 'List', filters: { /* defaults */ } } }
    });
    if (!validateTaskListResponse(result)) {
      throw new Error('Invalid response format for task list');
    }
    return result;
  },
};
```

### Type Guards

Response validation using type guards:

```typescript
// frontend/src/lib/validation/backend-type-guards.ts
export function validateTask(data: unknown): data is Task {
  if (typeof data !== 'object' || data === null) return false;
  const task = data as Record<string, unknown>;
  return typeof task.id === 'string' && 
         typeof task.title === 'string' &&
         isValidTaskStatus(task.status);
}
```

### Command Constants

Centralized command definitions:

```typescript
// frontend/src/lib/ipc/commands.ts
export const IPC_COMMANDS = {
  TASK_CRUD: 'task_crud',
  CHECK_TASK_ASSIGNMENT: 'check_task_assignment',
  EDIT_TASK: 'edit_task',
  // ...
};
```

### Import Rules

```typescript
// ✅ Good: Import from domain IPC
import { taskIpc } from '@/domains/tasks/ipc';

// ❌ Bad: Direct invoke
import { invoke } from '@tauri-apps/api/tauri';
const result = await invoke('task_crud', { ... });
```

## Consequences

### Positive

- **Type Safety**: TypeScript enforces request/response shapes
- **Validation**: Runtime type guards catch malformed responses
- **Caching**: `cachedInvoke` provides automatic caching
- **Testability**: IPC wrappers can be mocked
- **Error Handling**: Centralized error extraction
- **Cache Invalidation**: Pattern-based invalidation

### Negative

- **Boilerplate**: Each command requires wrapper function
- **Indirection**: One more layer between component and backend
- **Maintenance**: Wrappers must be kept in sync with backend

## Related Files

- `frontend/src/lib/ipc/core/index.ts` — Core IPC utilities
- `frontend/src/lib/ipc/utils.ts` — `safeInvoke` implementation
- `frontend/src/lib/ipc/cache.ts` — `cachedInvoke` implementation
- `frontend/src/lib/ipc/commands.ts` — Command constants
- `frontend/src/domains/tasks/ipc/task.ipc.ts` — Example wrapper
- `frontend/src/lib/validation/backend-type-guards.ts` — Type guards
- `AGENTS.md` — IPC calling convention section

## Read When

- Adding new IPC commands
- Debugging IPC communication issues
- Setting up test mocks
- Adding caching to IPC calls
- Implementing cache invalidation
- Understanding type guard usage
