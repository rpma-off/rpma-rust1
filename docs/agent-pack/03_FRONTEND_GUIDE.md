# Frontend Guide

The frontend is a Next.js 14 (App Router) application built with React 18, TypeScript, Tailwind CSS, and shadcn/ui.

## Directory Structure (`frontend/src/`)

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages (~38 routes) |
| `components/` | Shared, non-domain UI primitives (shadcn/ui base) |
| `components/ui/` | shadcn/ui component library (Button, Dialog, Input, etc.) |
| `domains/` | Domain-specific hubs mirroring backend bounded contexts |
| `hooks/` | Shared custom hooks |
| `lib/` | Utilities, IPC client, query keys, logging |
| `types/` | **AUTO-GENERATED TYPES — DO NOT EDIT** (from Rust via ts-rs) |
| `shared/` | Shared utilities, contracts |

### Domain Structure (`frontend/src/domains/[domain]/`)

Each domain contains:
- `api/` — React Query hooks (public API surface)
- `components/` — Domain-specific React components
- `hooks/` — Domain-specific custom hooks
- `ipc/` — IPC wrapper functions for Tauri calls
- `services/` — Frontend business logic
- `stores/` — Zustand stores (where needed)

**Frontend Feature Domains** (18 total):
- **Core Entities**: `auth`, `users`, `tasks`, `interventions`, `clients`, `inventory`, `quotes`, `calendar`, `reports`, `sync`, `documents`, `settings`, `notifications`
- **High-Level Features**: `admin`, `bootstrap`, `dashboard`, `performance`, `audit`, `organizations`

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
| `/tasks/[id]` | `app/tasks/[id]/page.tsx` | Task detail |
| `/tasks/new` | `app/tasks/new/page.tsx` | Create task |
| `/tasks/[id]/workflow/ppf` | `app/tasks/[id]/workflow/ppf/page.tsx` | PPF workflow |
| `/clients` | `app/clients/page.tsx` | Client list |
| `/clients/[id]` | `app/clients/[id]/page.tsx` | Client detail |
| `/interventions` | `app/interventions/page.tsx` | Interventions list |
| `/inventory` | `app/inventory/page.tsx` | Inventory management |
| `/quotes` | `app/quotes/page.tsx` | Quotes list |
| `/schedule` | `app/schedule/page.tsx` | Calendar view |
| `/settings` | `app/settings/page.tsx` | User preferences |
| `/settings/profile` | `app/settings/profile/page.tsx` | Profile settings |
| `/settings/security` | `app/settings/security/page.tsx` | Security settings |
| `/admin` | `app/admin/page.tsx` | Admin panel |
| `/audit` | `app/audit/page.tsx` | Audit logs |
| `/users` | `app/users/page.tsx` | User management |
| `/messages` | `app/messages/page.tsx` | Messaging |
| `/configuration` | `app/configuration/page.tsx` | System configuration |

---

## Calling the Backend (IPC)

**Never use raw `invoke()`**. Use the IPC wrapper layer.

### Two-Layer IPC Architecture

#### 1. Core IPC Layer (`frontend/src/lib/ipc/`)

| File | Purpose |
|------|---------|
| `client.ts` | `ipcClient` with namespaced operations |
| `utils.ts` | `safeInvoke()` wrapper with auto session token injection, error handling, correlation ID, timeout |
| `commands.ts` | Command name constants |

**Usage**:
```typescript
import { safeInvoke } from '@/lib/ipc/utils';

// Protected command (auto-injects session token)
const result = await safeInvoke('task_crud', { action: 'list' });
```

**Public Commands** (no auth required):
- `auth_login`, `auth_create_account`, `auth_validate_session`, `auth_logout`
- `has_admins`, `bootstrap_first_admin`
- `ui_window_*`, `navigation_*`
- `get_app_info`

**Timeout**: Default 120 seconds (configurable)

#### 2. Domain IPC Layer (`frontend/src/domains/[domain]/ipc/*.ipc.ts`)

Example: `frontend/src/domains/tasks/ipc/task.ipc.ts`
```typescript
export const taskIpc = {
  create: async (data: CreateTaskPayload) => {
    return safeInvoke(IPC_COMMANDS.TASK_CRUD, {
      action: 'create',
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

**Query Keys**: Centralized in `frontend/src/lib/query-keys.ts` or per-domain.

**Domain API Hooks**: `frontend/src/domains/[domain]/api/*.ts`
```typescript
// Example: frontend/src/domains/tasks/api/useTasks.ts
export function useTasks() {
  return useQuery({
    queryKey: ['tasks', 'list'],
    queryFn: () => taskIpc.list()
  });
}
```

---

## Adding New UI Features

1. **Define Rust Types First**: Add structs with `#[derive(TS)]` in `src-tauri/src/domains/[domain]/domain/models/`
2. **Sync Types**: Run `npm run types:sync` → outputs to `frontend/src/types/`
3. **Create IPC Wrapper**: Add to `frontend/src/domains/[domain]/ipc/*.ipc.ts`
4. **Create API Hook**: Add React Query hook in `frontend/src/domains/[domain]/api/`
5. **Build UI Components**: Use existing shadcn primitives in `components/ui/`

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Type Drift** | Always run `npm run types:sync` after Rust model changes |
| **Direct Domain Imports** | Never import `domains/A/components` into `domains/B`. Use `api/` hooks |
| **Large Payloads** | Use streaming or chunking for bulk uploads |
| **Raw Invoke** | Always use `safeInvoke` wrapper for consistent error handling |
| **Generated Types Location** | Types are in `types/` NOT `lib/backend/` (old location) |

---

## Design System

**shadcn/ui Components**: `frontend/src/components/ui/`
- Button, Dialog, Input, Select, Table, Card, Badge
- Accordion, Alert, AlertDialog, Avatar
- Checkbox, Collapsible, Command, ConfirmDialog
- DropdownMenu, EmptyState, ErrorBoundary, Form
- Label, Loading, Popover, Progress, RadioGroup
- ScrollArea, Select, Separator, Sheet, Skeleton
- Slider, Switch, Table, Tabs, Textarea, Toast, Tooltip

**Forms**: Use `react-hook-form` + Zod validation.

**Loading States**: React Query loading + skeleton components (`<PageSkeleton />`, `loading.tsx`).

**Error Handling**: ErrorBoundary components with fallback UI.
