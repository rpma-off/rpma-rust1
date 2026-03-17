---
title: "Frontend Guide"
summary: "Architecture, patterns, and standards for the Next.js frontend."
read_when:
  - "Adding new frontend features"
  - "Modifying UI components"
  - "Working with TanStack Query or Zustand"
---

# 03. FRONTEND GUIDE

The frontend is a **Next.js 14** application in `frontend/` using the App Router and strict TypeScript.

## Directory Structure (`frontend/src/`)

| Directory | Purpose |
|-----------|---------|
| `app/` | Routing, layouts, pages (Next.js App Router) |
| `domains/` | Feature modules mirrored from backend |
| `components/` | Shared UI components (shadcn/ui) |
| `lib/` | IPC client, utilities, core logic |
| `hooks/` | Shared custom React hooks |
| `types/` | **AUTO-GENERATED** from Rust via `ts-rs` (**ADR-015**) — DO NOT EDIT |

### Domain Structure (`domains/[domain]/`)

| Subfolder | Purpose | Present In |
|-----------|---------|------------|
| `api/` | TanStack Query hooks and query keys | All domains |
| `components/` | Domain-specific UI components | All domains |
| `hooks/` | Domain-specific React hooks | Most domains (not performance) |
| `ipc/` | Typed wrappers for Tauri `invoke` | All domains |
| `services/` | Frontend business logic | Most domains |
| `stores/` | Zustand stores | `notifications`, `calendar` |
| `server/` | Server-side logic | tasks, clients, auth, admin, interventions, inventory, notifications, users, bootstrap |
| `utils/` | Utility functions | tasks, clients, dashboard, interventions, quotes, users |
| `__tests__/` | Test files | Most domains |

## State Management

### 1. Server State — TanStack Query (v5)
**Mandatory for all backend data.**

```typescript
// Query Keys (frontend/src/lib/query-keys.ts)
export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  byId: (taskId: string) => [...taskKeys.all, taskId],
};

// Mutation Counter Pattern for Cache Invalidation
const taskMutations = useMutationCounter('tasks');

const tasksQuery = useQuery({
  queryKey: [...taskKeys.list(), filters, taskMutations],
  queryFn: async () => taskIpc.list(filters),
  enabled: !!user?.token,
});

// Manual Invalidation
queryClient.invalidateQueries({ queryKey: taskKeys.all });
invalidatePattern('task:');  // Pattern-based invalidation
```

### 2. UI State — Zustand
**For complex/global UI state only.**

Domains with Zustand stores: `notifications`, `calendar`.

### 3. Local State — `useState`
**For simple, component-local toggles.**

## IPC Communication

### Command Registry

All IPC command strings are centralized in `frontend/src/lib/ipc/commands.ts`:

```typescript
export const IPC_COMMANDS = {
  AUTH_LOGIN: 'auth_login',
  TASK_CRUD: 'task_crud',
  MATERIAL_CREATE: 'material_create',
  QUOTE_CREATE: 'quote_create',
  // ...
} as const;
```

### IPC Client Pattern (**ADR-013**)

**Never call `invoke` directly.** Use domain wrappers:

```typescript
// ✅ Correct
import { taskIpc } from '@/domains/tasks/ipc';
const result = await taskIpc.create(data);

// ❌ Incorrect
import { invoke } from '@tauri-apps/api/tauri';
const result = await invoke('task_crud', { ... });
```

### Core IPC Utilities (`frontend/src/lib/ipc/`)

| File | Purpose |
|------|---------|
| `client.ts` | `ipcClient` object aggregating all domain IPC modules |
| `utils.ts` | `safeInvoke<T>()` with session injection, timeout, error mapping |
| `core/` | `safeInvoke`, `cachedInvoke`, `invalidatePattern`, `extractAndValidate` |
| `commands.ts` | `IPC_COMMANDS` constant |

## Styling & UI

- **Tailwind CSS** for all styling.
- **shadcn/ui** for accessible, consistent components.
- Follow theme tokens in `tailwind.config.ts`.

## Routes (`frontend/src/app/`)

| Route | Purpose |
|-------|---------|
| `/` | Calendar Dashboard (home) |
| `/admin/` | Admin section |
| `/bootstrap-admin/` | Admin bootstrap |
| `/clients/`, `/clients/[id]/`, `/clients/new/` | Client management |
| `/dashboard/` | Dashboard |
| `/interventions/` | Interventions |
| `/inventory/` | Inventory |
| `/login/` | Login |
| `/onboarding/` | Onboarding |
| `/quotes/` | Quotes |
| `/schedule/` | Schedule |
| `/settings/` | Settings |
| `/tasks/`, `/tasks/[id]/`, `/tasks/edit/`, `/tasks/new/` | Tasks |
| `/trash/` | Trash (soft-deleted items) |
| `/users/` | User management |

## Development Workflow

| When | Command |
|------|---------|
| Rust type change | `npm run types:sync` |
| New feature | Create folder in `domains/`, export via `index.ts` |
| Form validation | Use **Zod** schemas |
| Testing | Playwright E2E in `frontend/tests/e2e/` |
| Pre-commit | `npm run frontend:guard` (lint + type-check + tests) |

## Constraints

- `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json`.
- Components must receive data as **props** (no fetching inside components).
- `useEffect` is for external sync only, not business logic.
- Generated types in `frontend/src/lib/backend.ts` — **never edit manually**.