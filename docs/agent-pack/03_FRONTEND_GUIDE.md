# 03 - Frontend Guide

## Key Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^14.2 | App framework (App Router) |
| `react` | ^18.3 | UI library |
| `typescript` | ^5.3 | Type system |
| `@tauri-apps/api` | ^2.8 | Tauri IPC bridge |
| `@tanstack/react-query` | ^5.90 | Server state management |
| `zustand` | ^5.0 | Client state management |
| `zod` | ^4.1 | Schema validation (**v4 API**) |
| `react-hook-form` | ^7.64 | Form management |
| `tailwindcss` | ^3.4 | Styling |
| `lucide-react` | ^0.552 | Icons |
| `framer-motion` | ^12.23 | Animations |
| `recharts` | ^3.3 | Charts |
| `date-fns` | ^4.1 | Date utilities |

---

## Frontend Structure

RPMA v2 uses **Next.js 14 App Router** with TypeScript, React, and Tailwind CSS.

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router (40+ page routes)
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── page.tsx              # Home page (/) → Dashboard
│   │   ├── login/                # /login
│   │   ├── signup/               # /signup
│   │   ├── bootstrap-admin/      # /bootstrap-admin (initial setup)
│   │   ├── dashboard/            # /dashboard/* routes
│   │   │   └── operational-intelligence/
│   │   ├── tasks/                # /tasks/* routes
│   │   │   ├── new/              # /tasks/new
│   │   │   ├── [id]/             # /tasks/[id]
│   │   │   │   ├── workflow/ppf/steps/  # PPF workflow steps
│   │   │   │   └── completed/
│   │   │   └── edit/[id]/        # /tasks/edit/[id]
│   │   ├── clients/              # /clients/* routes
│   │   ├── interventions/        # /interventions
│   │   ├── inventory/            # /inventory
│   │   ├── schedule/             # /schedule (calendar)
│   │   ├── reports/              # /reports
│   │   ├── settings/             # /settings
│   │   ├── users/                # /users
│   │   ├── admin/                # /admin (admin panel)
│   │   ├── analytics/            # /analytics
│   │   ├── quotes/               # /quotes (PPF quotations)
│   │   ├── messages/             # /messages
│   │   ├── audit/                # /audit
│   │   ├── configuration/        # /configuration
│   │   ├── data-explorer/        # /data-explorer
│   │   ├── unauthorized/         # /unauthorized (access denied)
│   │   └── api/                  # Next.js API routes
│   │       ├── tasks/            # Task API routes
│   │       ├── workflows/        # Workflow API routes
│   │       └── ...
│   ├── components/               # 245+ Reusable React components
│   │   ├── ui/                   # shadcn/ui primitives (61 files)
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── calendar/             # Calendar/scheduling
│   │   ├── workflow/             # Intervention workflow
│   │   │   └── ppf/              # PPF-specific components
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── auth/                 # Login/signup forms
│   │   ├── users/                # User management
│   │   └── ...
│   ├── hooks/                    # 64 Custom React hooks
│   ├── lib/
│   │   ├── ipc/                  # IPC client (MOST IMPORTANT)
│   │   │   ├── client.ts         # Main ipcClient object
│   │   │   ├── utils.ts          # safeInvoke wrapper
│   │   │   ├── cache.ts          # cachedInvoke
│   │   │   ├── calendar.ts       # Calendar IPC
│   │   │   └── domains/          # 19 domain-specific modules
│   │   │       ├── auth.ts
│   │   │       ├── tasks.ts
│   │   │       ├── clients.ts
│   │   │       ├── interventions.ts
│   │   │       ├── inventory.ts
│   │   │       ├── settings.ts
│   │   │       └── ...
│   │   ├── stores/               # Zustand stores
│   │   │   ├── layoutStore.ts
│   │   │   └── calendarStore.ts
│   │   ├── services/             # Frontend business logic
│   │   ├── backend.ts            # ⚠️ AUTO-GENERATED (do not edit)
│   │   └── validation/           # Zod schemas
│   ├── types/                    # TypeScript types
│   │   ├── index.ts
│   │   ├── auth.types.ts
│   │   ├── task.types.ts
│   │   └── ...
│   └── contexts/                 # React contexts
│       ├── AuthContext.tsx
│       ├── TaskContext.tsx
│       ├── WorkflowContext.tsx
│       └── PPFWorkflowContext.tsx
└── package.json
```

---

## Key Frontend Patterns

### 1. **IPC Client Usage**

All backend communication goes through **typed IPC client**.

**Main Entry Point**: `frontend/src/lib/ipc/client.ts`

```typescript
import { ipcClient } from '@/lib/ipc/client';

// Auth operations
const session = await ipcClient.auth.login(email, password);
await ipcClient.auth.validateSession(token);
await ipcClient.auth.logout(token);

// Task operations (with session token)
const task = await ipcClient.tasks.create(data, sessionToken);
const tasks = await ipcClient.tasks.list(filters, sessionToken);

// Intervention operations
const intervention = await ipcClient.interventions.start(data, sessionToken);
await ipcClient.interventions.advanceStep(stepData, sessionToken);

// Client operations
const clients = await ipcClient.clients.list(filters, sessionToken);

// Reports
const report = await ipcClient.reports.getTaskCompletionReport(dateRange, filters);
```

**IPC Utilities** (`frontend/src/lib/ipc/utils.ts`, `cache.ts`, `retry.ts`):
```typescript
// safeInvoke wraps Tauri's invoke with:
// - Correlation ID tracking
// - Timeout handling (default 120s)
// - Centralized error handling
// - Performance logging
await safeInvoke<T>('command_name', args, validator, timeout);

// cachedInvoke adds response caching with TTL and pattern invalidation
await cachedInvoke<T>(cacheKey, 'command_name', args, validator, ttl);

// invalidatePattern clears cache entries matching pattern
invalidatePattern('tasks:*');
```

---

### 2. **State Management**

RPMA v2 uses **React Query** for server state and **Zustand** for client state.

#### React Query (Server State)

**Provider Setup**: `frontend/src/components/providers.tsx`

```typescript
// frontend/src/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTasks(filters: TaskQuery) {
  const { sessionToken } = useSession();
  
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => ipcClient.tasks.list(filters, sessionToken),
    staleTime: 30000,  // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { sessionToken } = useSession();
  
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => 
      ipcClient.tasks.create(data, sessionToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
  });
}
```

#### Zustand (Client State)

```typescript
// frontend/src/lib/stores/layoutStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ 
        isSidebarCollapsed: !state.isSidebarCollapsed 
      })),
    }),
    { name: 'layout-storage' }
  )
);
```

---

### 3. **Form Validation with Zod**

> **Note**: The project uses **Zod v4** (`^4.1.12`). The core `z.object()`, `z.string()`, `z.enum()` APIs are unchanged from v3, but error-handling internals differ (use `z.ZodError` not `z.ZodIssue` directly).

```typescript
// frontend/src/lib/validation/task.ts
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  vehiclePlate: z.string().min(1, 'Vehicle plate required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

// Usage with React Hook Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function CreateTaskForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(createTaskSchema),
  });
}
```

---

### 4. **Routing & Navigation**

**Route Examples**:
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Home → Dashboard |
| `/login` | `app/login/page.tsx` | Login |
| `/tasks` | `app/tasks/page.tsx` | Task list |
| `/tasks/new` | `app/tasks/new/page.tsx` | Create task |
| `/tasks/[id]` | `app/tasks/[id]/page.tsx` | Task detail |
| `/tasks/[id]/workflow/ppf/steps/preparation` | PPF workflow step | |

**Protected Routes**: Use `AuthContext` to check authentication.

---

### 5. **Component Standards**

**Naming**:
- Pages: `page.tsx` (Next.js convention)
- Components: `PascalCase.tsx`
- Hooks: `use*.ts`
- Contexts: `*Context.tsx`

**shadcn/ui Components** (`frontend/src/components/ui/`):
- Form: `Button`, `Input`, `Select`, `Checkbox`, `Form`
- Layout: `Card`, `Separator`, `Tabs`, `ScrollArea`
- Overlays: `Dialog`, `Sheet`, `Popover`, `Tooltip`
- Data: `Table`, `Badge`, `Avatar`, `Calendar`
- Feedback: `Alert`, `Toast`, `Skeleton`, `Loading`

---

## Where to Add New UI Features

### Scenario 1: Add a New Page

1. **Create route file**: `frontend/src/app/newfeature/page.tsx`
2. **Create IPC function** (if needed): `frontend/src/lib/ipc/domains/newfeature.ts`
3. **Create hook**: `frontend/src/hooks/useNewFeature.ts`
4. **Build UI**: Import hook in page component

### Scenario 2: Add a New Component

1. **Create component**: `frontend/src/components/feature/NewComponent.tsx`
2. **Use shadcn/ui primitives**: Import from `@/components/ui/`
3. **Export and use**: Import in parent component

---

## Common Pitfalls

### ❌ Pitfall 1: Type Drift (Frontend ≠ Backend)

**Problem**: Manually editing `frontend/src/lib/backend.ts` causes type mismatches.

**Solution**: **NEVER** manually edit `frontend/src/lib/backend.ts`. Always run:
```bash
npm run types:sync           # Regenerates from Rust models
npm run types:validate       # Validates consistency
npm run types:drift-check    # Detects mismatches
```

### ❌ Pitfall 2: IPC Naming Mismatch

**Problem**: Using incorrect command names causes IPC failures.

**Solution**: Check `src-tauri/src/main.rs` (lines 69-306) for registered command names in `tauri::generate_handler![]` and use exact same name. All 236 commands are registered in the `invoke_handler`.

### ❌ Pitfall 3: Missing Session Token

**Solution**: Always pass `sessionToken` to protected IPC commands:
```typescript
// ❌ Wrong
await invoke('task_crud', { action });

// ✅ Correct
await ipcClient.tasks.create(data, sessionToken);
```

### ❌ Pitfall 4: Large Payload Handling

**Problem**: Large photos or files can cause IPC timeouts or memory issues.

**Solution**: Use streaming or chunked uploads for large files (photos). Consider `CompressedApiResponse` for payloads >1KB (MessagePack serialization available in backend).

---

## Design System & Styling

### Tailwind CSS

**Configuration**: `frontend/tailwind.config.ts`

**Common Patterns**:
```typescript
// Card
<div className="rounded-lg border bg-card p-6 shadow-sm">

// Button
<Button variant="default" size="lg">Click Me</Button>

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Color Palette
- Primary: Blue
- Success: Green
- Warning: Yellow
- Danger: Red

---

## Key Hooks Reference

| Hook | Purpose | Location |
|------|---------|----------|
| `useAuth()` | Auth state, login/logout | `hooks/useAuth.ts` |
| `useTasks()` | Query tasks | `hooks/useTasks.ts` |
| `useTaskActions()` | Task CRUD | `hooks/useTaskActions.ts` |
| `useClients()` | Query clients | `hooks/useClients.ts` |
| `useInterventionWorkflow()` | Workflow state | `hooks/useInterventionWorkflow.ts` |
| `useInterventionActions()` | Intervention operations | `hooks/useInterventionActions.ts` |
| `useMaterials()` | Query materials | `hooks/useMaterials.ts` |
| `useInventory()` | Inventory management | `hooks/useInventory.ts` |
| `useDashboardData()` | Dashboard data | `hooks/useDashboardData.ts` |
| `useSyncStatus()` | Sync status | `hooks/useSyncStatus.ts` |
| `useOfflineSync()` | Offline queue | `hooks/useOfflineSync.ts` |
| `useConnectionStatus()` | Online/offline | `hooks/useConnectionStatus.ts` |

---

## Testing Frontend Code

```bash
# Run tests
cd frontend && npm test

# Watch mode
cd frontend && npm run test:watch

# Coverage
cd frontend && npm run test:coverage

# E2E tests
cd frontend && npm run test:e2e
```

**Test Locations**: `frontend/src/__tests__/`, `frontend/tests/`

---

## Next Steps

- **Backend guide**: [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
- **IPC API reference**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
