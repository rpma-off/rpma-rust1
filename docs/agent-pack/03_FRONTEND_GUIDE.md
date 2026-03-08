# Frontend Guide

The frontend is a Next.js 14 (App Router) application built with React 18, TypeScript, Tailwind CSS, and shadcn/ui.

## Directory Structure (`frontend/src/`)

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages (40+ routes) |
| `components/` | Shared, non-domain UI primitives (shadcn/ui base) |
| `components/ui/` | shadcn/ui component library (Button, Dialog, Input, etc.) |
| `domains/` | Domain-specific hubs mirroring backend bounded contexts |
| `hooks/` | Shared custom hooks (60+) |
| `lib/` | Utilities, IPC client, query keys |
| `lib/backend/` | **AUTO-GENERATED TYPES — DO NOT EDIT** |
| `lib/ipc/` | Core IPC layer (client, utils, cache, adapter) |

### Domain Structure (`frontend/src/domains/[domain]/`)

Each domain contains:
- `api/` — React Query hooks (public API surface)
- `components/` — Domain-specific React components
- `hooks/` — Domain-specific custom hooks
- `ipc/` — IPC wrapper functions for Tauri calls
- `stores/` — Zustand stores (where needed)

**Frontend Feature Domains** (18 total):
- **Core Entities**: `auth`, `users`, `tasks`, `interventions`, `clients`, `inventory`, `quotes`, `calendar`, `reports`, `sync`, `documents`, `settings`, `notifications` (direct backend parity)
- **High-Level Features**: `admin`, `bootstrap`, `dashboard`, `performance`, `audit` (aggregate or specialized modules)

---

## Route Structure

**Main Entry**: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`

**Client Layout**: `frontend/src/app/RootClientLayout.tsx` — handles auth redirects

**Key Routes**:
| Route | Page File | Purpose |
|-------|-----------|---------|
| `/` | `app/page.tsx` | Home (Dashboard for authenticated users) |
| `/login` | `app/login/page.tsx` | Authentication |
| `/signup` | `app/signup/page.tsx` | Account creation |
| `/bootstrap-admin` | `app/bootstrap-admin/page.tsx` | First admin setup |
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard |
| `/tasks` | `app/tasks/page.tsx` | Task list |
| `/clients` | `app/clients/page.tsx` | Client list |
| `/interventions` | `app/interventions/page.tsx` | Interventions list |
| `/interventions/[id]` | `app/interventions/[id]/page.tsx` | Intervention detail/workflow |
| `/inventory` | `app/inventory/page.tsx` | Inventory management |
| `/quotes` | `app/quotes/page.tsx` | Quotes list |
| `/schedule` | `app/schedule/page.tsx` | Calendar view |
| `/settings` | `app/settings/page.tsx` | User preferences |
| `/admin` | `app/admin/page.tsx` | Admin panel |
| `/audit` | `app/audit/page.tsx` | Audit logs |

---

## Calling the Backend (IPC)

**Never use raw `invoke()`**. Use the IPC wrapper layer.

### Two-Layer IPC Architecture

#### 1. Core IPC Layer (`frontend/src/lib/ipc/`)

| File | Purpose |
|------|---------|
| `client.ts` | `ipcClient` with namespaced operations |
| `utils.ts` | `safeInvoke()` wrapper with auto session token injection, error handling, correlation ID, timeout (120s) |
| `cache.ts` | Response caching logic |
| `commands.ts` | Command name constants |

**Usage**:
```typescript
import { safeInvoke } from '@/lib/ipc/utils';

// Protected command (auto-injects session token)
const result = await safeInvoke('task_crud', { action: 'list' });
```

#### 2. Domain IPC Layer (`frontend/src/domains/[domain]/ipc/*.ipc.ts`)

Example: `frontend/src/domains/tasks/ipc/task.ipc.ts`
```typescript
export const taskIpc = {
  create: async (data: CreateTaskPayload, sessionToken: string) => {
    return safeInvoke(IPC_COMMANDS.TASK_CRUD, {
      action: 'create',
      token: sessionToken,
      data
    });
  },
  // ... list, get, update, delete
};
```

---

## State Management

**Hybrid approach**:

| Type | Tool | Use Case |
|------|------|----------|
| Server State | React Query (TanStack Query) | Backend data, caching, background refetch |
| Client State | Zustand | Complex UI state, persistence |
| Auth State | React Context | Session, user, login/logout |

### React Query Setup

**Provider**: `frontend/src/app/providers.tsx`

**Query Keys**: Centralized in `frontend/src/lib/query-keys.ts` (if available) or per-domain.

**Domain API Hooks**: `frontend/src/domains/[domain]/api/*.ts`
```typescript
// Example: frontend/src/domains/tasks/api/useTasks.ts
export function useTasks() {
  return useQuery({
    queryKey: ['tasks', 'list'],
    queryFn: () => taskIpc.list(sessionToken)
  });
}
```

---

## Adding New UI Features

1. **Define Rust Types First**: Add structs with `#[derive(TS)]` in `src-tauri/src/domains/[domain]/domain/models/`
2. **Sync Types**: Run `npm run types:sync` → outputs to `frontend/src/lib/backend/`
3. **Create IPC Wrapper**: Add to `frontend/src/domains/[domain]/ipc/*.ipc.ts`
4. **Create API Hook**: Add React Query hook in `frontend/src/domains/[domain]/api/`
5. **Build UI Components**: Use existing shadcn primitives in `components/ui/`

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Type Drift** | Always run `npm run types:sync` after Rust model changes |
| **Direct Domain Imports** | Never import `domains/A/components` into `domains/B`. Use `api/` hooks |
| **Large Payloads** | Use streaming or chunking for bulk uploads (see `ipc_optimization` commands) |
| **Raw Invoke** | Always use `safeInvoke` wrapper for consistent error handling |
| **Generated Types Location** | Types are in `lib/backend/` NOT `types/` (which contains manual types) |

---

## Design System

**shadcn/ui Components**: `frontend/src/components/ui/`
- Button, Dialog, Input, Select, Table, Card, etc.

**Forms**: Use `react-hook-form` + Zod validation.

**Loading States**: React Query loading + skeleton components (`<PageSkeleton />`, `loading.tsx`).
