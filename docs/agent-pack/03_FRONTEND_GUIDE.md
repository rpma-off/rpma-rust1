# 03 - Frontend Guide

## Frontend Structure

RPMA v2 uses **Next.js 14 App Router** with TypeScript, React, and Tailwind CSS.

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router (40+ page routes)
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page (/)
│   │   ├── dashboard/            # /dashboard routes
│   │   ├── tasks/                # /tasks/* routes
│   │   ├── clients/              # /clients/* routes
│   │   ├── interventions/        # /interventions/* routes
│   │   ├── inventory/            # /inventory (materials)
│   │   ├── schedule/             # /schedule (calendar)
│   │   ├── reports/              # /reports/* routes
│   │   ├── settings/             # /settings
│   │   ├── users/                # /users routes
│   │   ├── technicians/          # /technicians routes
│   │   ├── team/                 # /team routes
│   │   ├── messages/             # /messages routes
│   │   ├── audit/                # /audit routes
│   │   ├── analytics/            # /analytics routes
│   │   ├── configuration/        # /configuration routes
│   │   ├── data-explorer/        # /data-explorer routes
│   │   ├── admin/                # /admin routes
│   │   ├── login/                # /login
│   │   └── unauthorized/         # /unauthorized (access denied)
│   ├── components/               # 180+ Reusable React components
│   │   ├── tasks/                # Task-specific components
│   │   ├── clients/              # Client components
│   │   ├── workflow/             # Intervention workflow components
│   │   ├── calendar/             # Calendar/scheduling components
│   │   ├── analytics/            # Analytics dashboard components
│   │   ├── inventory/            # Inventory/material components
│   │   ├── auth/                 # Authentication components
│   │   ├── settings/             # Settings page components
│   │   ├── messages/             # Messaging components
│   │   ├── users/                # User management components
│   │   ├── sync/                 # Sync status components
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── layout/               # Layout components (nav, header)
│   │   ├── forms/                # Form components
│   │   └── ui/                   # shadcn/ui primitives
│   ├── hooks/                    # 65+ Custom React hooks
│   │   ├── useAuth.ts            # Authentication hook
│   │   ├── useSession.ts         # Session management
│   │   ├── useDashboardStats.ts  # Dashboard statistics
│   │   ├── useTasks.ts           # Task queries/mutations
│   │   ├── useClients.ts         # Client queries/mutations
│   │   ├── useInterventions.ts   # Intervention queries
│   │   ├── useMaterials.ts       # Material queries
│   │   ├── useSyncStatus.ts      # Sync status tracking
│   │   ├── useOfflineSync.ts     # Offline sync management
│   │   └── ...
│   ├── lib/
│   │   ├── ipc/                  # IPC client modules (MOST IMPORTANT)
│   │   │   ├── client.ts         # Low-level IPC invoker
│   │   │   ├── domains/          # 19 domain-specific IPC wrappers
│   │   │   │   ├── auth.ts       # Auth IPC functions
│   │   │   │   ├── tasks.ts      # Task IPC functions
│   │   │   │   ├── clients.ts    # Client IPC functions
│   │   │   │   ├── interventions.ts
│   │   │   │   ├── inventory.ts
│   │   │   │   ├── settings.ts
│   │   │   │   ├── security.ts
│   │   │   │   ├── system.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── photos.ts
│   │   │   │   ├── calendar.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── performance.ts
│   │   │   │   ├── sync.ts
│   │   │   │   ├── ui.ts
│   │   │   │   ├── bootstrap.ts
│   │   │   │   ├── material.ts
│   │   │   │   └── ...
│   │   │   └── types/            # IPC request/response types
│   │   ├── services/             # Frontend business logic
│   │   ├── utils/                # Utility functions
│   │   └── validation/           # Zod schemas for forms
│   ├── types/                    # 20+ AUTO-GENERATED TypeScript types
│   │   ├── database.types.ts     # ⚠️  DO NOT EDIT MANUALLY
│   │   ├── unified.ts            # ⚠️  DO NOT EDIT MANUALLY
│   │   └── ...
│   └── contexts/                 # 4 React contexts
│       ├── AuthContext.tsx       # Auth state provider
│       ├── TaskContext.tsx       # Task state provider
│       ├── WorkflowContext.tsx   # Workflow state provider
│       ├── PPFWorkflowContext.tsx # PPF-specific workflow
│       └── ...
└── package.json
```

---

##  Key Frontend Patterns

### 1. **IPC Client Usage**

All backend communication goes through **typed IPC client functions**.

**Example: Creating a Task**

```typescript
// frontend/src/lib/ipc/domains/task.ts

import { invoke } from '@tauri-apps/api/core';
import type { ApiResponse, Task, CreateTaskRequest } from '@/types';

export async function createTask(
  sessionToken: string,
  data: CreateTaskRequest
): Promise<ApiResponse<Task>> {
  return await invoke('task_create', {
    sessionToken,
    data,
  });
}
```

**Usage in Component**:
```typescript
// frontend/src/components/tasks/CreateTaskForm.tsx

import { createTask } from '@/lib/ipc/domains/task';
import { useSession } from '@/hooks/useSession';

function CreateTaskForm() {
  const { sessionToken } = useSession();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateTaskRequest) => {
    setLoading(true);
    try {
      const response = await createTask(sessionToken, data);
      if (response.success) {
        toast.success('Task created!');
        router.push(`/tasks/${response.data.id}`);
      } else {
        toast.error(response.error?.message || 'Failed to create task');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

**IPC Client Locations**:
- **Base client**: `frontend/src/lib/ipc/client.ts`
- **Domain wrappers**: `frontend/src/lib/ipc/domains/*.ts` (19 files)
  - `auth.ts`, `tasks.ts`, `clients.ts`, `interventions.ts`, `inventory.ts`
  - `settings.ts`, `security.ts`, `system.ts`, `dashboard.ts`, `users.ts`
  - `reports.ts`, `photos.ts`, `calendar.ts`, `notifications.ts`, `performance.ts`
  - `sync.ts`, `ui.ts`, `bootstrap.ts`, `material.ts`
- **Secure client** (with retry logic): `frontend/src/lib/ipc/secure-client.ts`

---

### 2. **State Management**

RPMA v2 uses **React Query** for server state and **Zustand** for client state.

#### React Query (Server State)

```typescript
// frontend/src/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaskList, createTask, updateTask } from '@/lib/ipc/domains/task';

export function useTasks(filters: TaskQuery) {
  const { sessionToken } = useSession();

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTaskList(sessionToken, filters),
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { sessionToken } = useSession();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => createTask(sessionToken, data),
    onSuccess: () => {
      // Invalidate tasks query to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

**Usage**:
```typescript
function TaskListPage() {
  const { data: tasks, isLoading } = useTasks({ status: 'assigned' });
  const createTaskMutation = useCreateTask();

  if (isLoading) return <Spinner />;

  return (
    <>
      {tasks?.data?.map(task => <TaskCard key={task.id} task={task} />)}
      <button onClick={() => createTaskMutation.mutate(newTaskData)}>
        Create Task
      </button>
    </>
  );
}
```

#### Zustand (Client State)

```typescript
// frontend/src/lib/stores/uiStore.ts

import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

---

### 3. **Form Validation with Zod**

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

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
```

**Usage with React Hook Form**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function CreateTaskForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
    </form>
  );
}
```

---

### 4. **Routing & Navigation**

RPMA uses **Next.js App Router** with file-based routing.

**Route Examples**:
- `/tasks` → `frontend/src/app/tasks/page.tsx`
- `/tasks/new` → `frontend/src/app/tasks/new/page.tsx`
- `/tasks/[id]` → `frontend/src/app/tasks/[id]/page.tsx`
- `/clients` → `frontend/src/app/clients/page.tsx`

**Protected Routes**:
```typescript
// frontend/src/app/tasks/layout.tsx

import { redirect } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect('/login');
  }

  return <div>{children}</div>;
}
```

---

### 5. **Component Standards** (180+ Components)

**Component Naming**:
- **Pages**: `page.tsx` (Next.js convention, 40+ routes)
- **Components**: `PascalCase.tsx` (e.g., `TaskCard.tsx`, `ClientForm.tsx`)
- **Hooks**: `use*.ts` (e.g., `useTasks.ts`, `useAuth.ts`, 65+ hooks)
- **Contexts**: `*Context.tsx` (e.g., `AuthContext.tsx`, 4 contexts)

**Component Structure**:
```typescript
// frontend/src/components/tasks/TaskCard.tsx

import React from 'react';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onSelect?: (taskId: string) => void;
}

export function TaskCard({ task, onSelect }: TaskCardProps) {
  return (
    <div className="task-card" onClick={() => onSelect?.(task.id)}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <span className="badge">{task.status}</span>
    </div>
  );
}
```

**Best Practices**:
- ✅ Use named exports for components (not default)
- ✅ Define Props interface explicitly
- ✅ Use `className` for Tailwind styles
- ✅ Extract complex logic to custom hooks
- ❌ Avoid inline styles (use Tailwind)
- ❌ Don't fetch data in components (use React Query hooks)

---

##  Where to Add New UI Features

### Scenario 1: Add a New Page

**Goal**: Create a "Material Management" page at `/inventory`.

1. **Create route file**: `frontend/src/app/inventory/page.tsx`
   ```typescript
   export default function InventoryPage() {
     return <div>Inventory</div>;
   }
   ```

2. **Create IPC function**: `frontend/src/lib/ipc/domains/material.ts`
   ```typescript
   export async function getMaterialList(sessionToken: string) {
     return await invoke('material_list', { sessionToken });
   }
   ```

3. **Create hook**: `frontend/src/hooks/useMaterials.ts`
   ```typescript
   export function useMaterials() {
     const { sessionToken } = useSession();
     return useQuery({
       queryKey: ['materials'],
       queryFn: () => getMaterialList(sessionToken),
     });
   }
   ```

4. **Build UI**: Import hook in page component

---

### Scenario 2: Add a New Component

**Goal**: Create a "TaskPriorityBadge" component.

1. **Create component**: `frontend/src/components/tasks/TaskPriorityBadge.tsx`
   ```typescript
   import { Badge } from '@/components/ui/badge';

   interface TaskPriorityBadgeProps {
     priority: 'low' | 'medium' | 'high' | 'urgent';
   }

   export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
     const colors = {
       low: 'bg-gray-500',
       medium: 'bg-blue-500',
       high: 'bg-yellow-500',
       urgent: 'bg-red-500',
     };
     return <Badge className={colors[priority]}>{priority}</Badge>;
   }
   ```

2. **Use in parent component**:
   ```typescript
   import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';

   <TaskPriorityBadge priority={task.priority} />
   ```

---

##  Common Pitfalls

### ❌ Pitfall 1: Type Drift (Frontend ≠ Backend)

**Problem**: Manually editing `frontend/src/types/*.ts` causes types to diverge from backend.

**Solution**: **NEVER** manually edit generated types. Always run:
```bash
npm run types:sync
```

After modifying Rust models, this regenerates TypeScript types.

---

### ❌ Pitfall 2: IPC Naming Mismatch

**Problem**: Frontend calls `task_create` but backend command is `create_task`.

**Solution**: 
- Check `src-tauri/src/main.rs` for registered command names:
  ```rust
  .invoke_handler(tauri::generate_handler![
      task_create,  // ← This is the exact IPC command name
      task_update,
      // ...
  ])
  ```
- Use the **exact same name** in frontend:
  ```typescript
  invoke('task_create', { ... })  // ✅
  invoke('create_task', { ... })  // ❌ Wrong!
  ```

---

### ❌ Pitfall 3: Large Payload Handling

**Problem**: Sending 10MB photo as base64 in IPC call causes performance issues.

**Solution**: Use **streaming** or **chunked uploads**:
- Backend command: `intervention_upload_photo_chunk`
- Split large files into 64KB chunks
- Send chunks sequentially
- Backend assembles chunks

**Reference**: `frontend/src/lib/ipc/utils/upload.ts` (TODO: verify implementation)

---

### ❌ Pitfall 4: Missing Session Token

**Problem**: Protected IPC command fails with "Unauthorized" error.

**Solution**: Always pass `session_token` parameter:
```typescript
// ❌ Wrong
await invoke('task_create', { data });

// ✅ Correct
const { sessionToken } = useSession();
await invoke('task_create', { sessionToken, data });
```

---

##  Design System & Styling

### Tailwind CSS

RPMA uses **Tailwind CSS** for all styling.

**Configuration**: `frontend/tailwind.config.ts`

**Common Patterns**:
```typescript
// Card layout
<div className="rounded-lg border bg-card p-6 shadow-sm">

// Button (primary)
<button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">

// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### shadcn/ui Components

**Location**: `frontend/src/components/ui/`

**Available Components**:
- `Button`, `Input`, `Select`, `Checkbox`, `Radio`
- `Dialog`, `Sheet`, `Popover`, `Tooltip`
- `Table`, `Card`, `Badge`, `Avatar`
- `Form` (with React Hook Form integration)

**Usage**:
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

<Button variant="default" size="lg">Click Me</Button>
<Input type="text" placeholder="Enter task title" />
```

**Design Tokens**: `frontend/src/lib/design-tokens.ts`

---

##  Key Hooks Reference

| Hook | Purpose | Location |
|------|---------|----------|
| `useAuth()` | Get current user, login/logout | `hooks/useAuth.ts` |
| `useSession()` | Get session token | `hooks/useSession.ts` |
| `useDashboardStats()` | Dashboard statistics | `hooks/useDashboardStats.ts` |
| `useDashboardData()` | Dashboard data aggregation | `hooks/useDashboardData.ts` |
| `useAdvancedAnalytics()` | Advanced analytics metrics | `hooks/useAdvancedAnalytics.ts` |
| `useTasks()` | Query tasks | `hooks/useTasks.ts` |
| `useClients()` | Query clients | `hooks/useClients.ts` |
| `useInterventions()` | Query interventions | `hooks/useInterventions.ts` |
| `useInterventionWorkflow()` | Intervention workflow state | `hooks/useInterventionWorkflow.ts` |
| `useInterventionActions()` | Intervention actions | `hooks/useInterventionActions.ts` |
| `useInterventionData()` | Intervention data fetching | `hooks/useInterventionData.ts` |
| `useMaterials()` | Query materials | `hooks/useMaterials.ts` |
| `useInventory()` | Inventory management | `hooks/useInventory.ts` |
| `useInventoryStats()` | Inventory statistics | `hooks/useInventoryStats.ts` |
| `useMaterialForm()` | Material form handling | `hooks/useMaterialForm.ts` |
| `useSyncStatus()` | Sync status tracking | `hooks/useSyncStatus.ts` |
| `useOfflineSync()` | Offline sync management | `hooks/useOfflineSync.ts` |
| `useOfflineQueue()` | Offline queue operations | `hooks/useOfflineQueue.ts` |
| `usePerformanceMonitor()` | Performance monitoring | `hooks/usePerformanceMonitor.ts` |
| `useVirtualScrolling()` | Virtual scrolling for lists | `hooks/useVirtualScrolling.ts` |

---

##  Testing Frontend Code

**Test Location**: `frontend/src/__tests__/`

**Example Unit Test**:
```typescript
// frontend/src/__tests__/components/TaskCard.test.tsx

import { render, screen } from '@testing-library/react';
import { TaskCard } from '@/components/tasks/TaskCard';

test('renders task title and status', () => {
  const task = { id: '1', title: 'Test Task', status: 'assigned' };
  render(<TaskCard task={task} />);

  expect(screen.getByText('Test Task')).toBeInTheDocument();
  expect(screen.getByText('assigned')).toBeInTheDocument();
});
```

**Run Tests**:
```bash
npm run test:frontend
```

---

##  Next Steps

- **Backend guide**: [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
- **IPC API reference**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
