# Bounded Contexts Architecture - Visual Guide

**Visual representation of the target architecture for RPMA v2 frontend**

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP LAYER (Composition)                  │
│                    app/tasks, app/inventory, etc.                │
│                                                                   │
│  Composes multiple domains via public APIs                       │
│  No business logic, only UI composition                          │
└─────────────────────────────────────────────────────────────────┘
                              │ imports from
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER (Business Logic)               │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Auth   │  │  Tasks   │  │Inventory │  │ Workflow │        │
│  │  Domain  │  │  Domain  │  │  Domain  │  │  Domain  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       ↑             ↑              ↑             ↑               │
│       │             │              │             │               │
│       │         Public APIs Only  │             │               │
│       │         (api/index.ts)    │             │               │
│       │             │              │             │               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Clients  │  │ Calendar │  │  Users   │  │Dashboard │        │
│  │  Domain  │  │  Domain  │  │  Domain  │  │  Domain  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
│  Each domain: Self-contained with Provider, Hooks, Components    │
└─────────────────────────────────────────────────────────────────┘
                              │ uses
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     SHARED LAYER (Infrastructure)                │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │    UI    │  │  Utils   │  │  Hooks   │  │  Types   │        │
│  │Components│  │Functions │  │ Generic  │  │ Shared   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
│  No domain dependencies - pure infrastructure                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    Backend (Tauri IPC)
```

---

## 🏗️ Domain Internal Structure

Each domain follows the same structure:

```
domains/{domain}/
│
├── api/                          📘 PUBLIC API (Export Boundary)
│   ├── index.ts                  ← ONLY file imported from outside
│   ├── {Domain}Provider.tsx      ← React Context Provider
│   ├── use{Domain}.ts            ← Main state hook
│   ├── use{Domain}Actions.ts     ← Mutation hook
│   └── types.ts                  ← Public type definitions
│
├── components/                   🔒 INTERNAL (Not exported)
│   ├── {Entity}List.tsx
│   ├── {Entity}Form.tsx
│   ├── {Entity}Details.tsx
│   └── {Entity}Card.tsx
│
├── hooks/                        🔒 INTERNAL (Not exported)
│   ├── use{Entity}ById.ts
│   ├── use{Entity}Stats.ts
│   └── useInternal{Feature}.ts
│
├── services/                     🔒 INTERNAL (Not exported)
│   └── {domain}.service.ts       ← Business logic (if needed)
│
├── ipc/                          🔒 INTERNAL (Not exported)
│   └── {domain}.ipc.ts           ← IPC client wrapper
│
├── __tests__/                    🧪 Tests
│   ├── {Domain}Provider.test.tsx
│   ├── use{Domain}.test.ts
│   └── integration.test.tsx
│
└── README.md                     📄 Documentation
```

---

## 🔄 Data Flow Example: Creating a Task

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                                   │
│    User clicks "Create Task" button in TasksPage                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. APP LAYER                                                     │
│    app/tasks/page.tsx                                            │
│                                                                   │
│    import { useTaskActions } from '@/domains/tasks';             │
│    const { createTask } = useTaskActions();                     │
│    await createTask({ title, description, ... });               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. DOMAIN PUBLIC API                                             │
│    domains/tasks/api/useTaskActions.ts                           │
│                                                                   │
│    export function useTaskActions() {                            │
│      const { user } = useAuth();  // Cross-domain via public API│
│      const createMutation = useMutation({                        │
│        mutationFn: (input) =>                                    │
│          taskIpcClient.create(input, user.token)                 │
│      });                                                         │
│      return { createTask: createMutation.mutate };               │
│    }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. DOMAIN INTERNAL (IPC Client)                                  │
│    domains/tasks/ipc/task.ipc.ts                                 │
│                                                                   │
│    export const taskIpcClient = {                                │
│      async create(input, token) {                                │
│        return safeInvoke('task_create', {                        │
│          session_token: token,                                   │
│          ...input                                                │
│        });                                                       │
│      }                                                           │
│    };                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. BACKEND (Tauri IPC)                                           │
│    src-tauri/src/commands/task/create.rs                         │
│                                                                   │
│    Task created in SQLite                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Dependency Graph

```
                          App Layer
                              │
                              │ imports from
                              ↓
        ┌─────────────────────────────────────────┐
        │                                         │
        ↓                                         ↓
    ┌────────┐                              ┌──────────┐
    │  Auth  │←─────────────────────────────│  Tasks   │
    │ Domain │                              │  Domain  │
    └────────┘                              └──────────┘
        ↑                                         │
        │                                         │
        │                                         ↓
    ┌────────┐                              ┌──────────┐
    │ Shared │←─────────────────────────────│Inventory │
    │ Layer  │                              │  Domain  │
    └────────┘                              └──────────┘
        ↑
        │
    (All domains depend on Shared)

Rules:
✅ App → Any Domain (via public API)
✅ Domain → Auth Domain (via public API)
✅ Domain → Shared Layer
✅ Domain → Same Domain (internal)
❌ Domain → Other Domain (internal)
❌ Shared → Any Domain
❌ Circular dependencies
```

---

## 📦 Import Patterns

### ✅ CORRECT Import Patterns

```typescript
// App layer importing from domains
import { TaskProvider, useTasks } from '@/domains/tasks';
import { useAuth } from '@/domains/auth';

// Domain importing from another domain's PUBLIC API
// (in domains/dashboard/components/Stats.tsx)
import { useTasks } from '@/domains/tasks';
import { useInventory } from '@/domains/inventory';

// Domain importing from shared layer
import { Button } from '@/shared/ui';
import { formatDate } from '@/shared/utils';

// Domain importing from auth domain (cross-cutting concern)
import { useAuth } from '@/domains/auth';
```

### ❌ INCORRECT Import Patterns

```typescript
// ❌ Importing internal modules from other domain
import { TaskService } from '@/domains/tasks/services/task.service';
import { taskIpcClient } from '@/domains/tasks/ipc/task.ipc';

// ❌ Shared layer depending on domain
// In shared/ui/TaskBadge.tsx
import { Task } from '@/domains/tasks';  // ❌ FORBIDDEN

// ❌ Deep relative imports
import { useTasks } from '../../../domains/tasks/hooks/useTasks';

// ❌ Circular dependency
// domains/tasks imports from domains/interventions
// domains/interventions imports from domains/tasks
```

---

## 🎭 Context Provider Hierarchy

```typescript
// Root layout wrapping entire app
<QueryClientProvider>
  <AuthProvider>           {/* Auth is foundational */}
    <Toaster />            {/* Shared UI */}
    
    {/* Page-specific providers */}
    <TaskProvider>
      <WorkflowProvider>
        <TasksPage />      {/* Can use both contexts */}
      </WorkflowProvider>
    </TaskProvider>
  </AuthProvider>
</QueryClientProvider>
```

**Rules**:
- Auth provider at root (needed by all domains)
- Domain providers wrap only pages that need them
- Multiple domain providers can nest when needed
- Shared UI components (like Toaster) at root

---

## 🧪 Testing Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│ Unit Tests (Isolated)                                            │
│                                                                   │
│  Test single hook/service in isolation:                          │
│  ✅ Mock: Auth context, IPC client                               │
│  ✅ Test: Business logic only                                    │
│  ✅ Fast: No real backend needed                                 │
│                                                                   │
│  Example:                                                        │
│    jest.mock('@/domains/auth')                                   │
│    jest.mock('../ipc/task.ipc')                                  │
│    test('useTaskActions creates task', ...)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Integration Tests (Domain Level)                                 │
│                                                                   │
│  Test Provider + Hooks + Components together:                    │
│  ✅ Mock: Only IPC backend                                       │
│  ✅ Test: Domain behavior end-to-end                             │
│  ✅ Medium speed: Real React Query, Context                      │
│                                                                   │
│  Example:                                                        │
│    render(                                                       │
│      <TaskProvider>                                              │
│        <TaskListComponent />                                     │
│      </TaskProvider>                                             │
│    )                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ E2E Tests (App Level)                                            │
│                                                                   │
│  Test complete user flows:                                       │
│  ✅ Mock: Nothing (or only external APIs)                        │
│  ✅ Test: Real user workflows                                    │
│  ✅ Slow: Full stack running                                     │
│                                                                   │
│  Example:                                                        │
│    test('user can create and complete task', async () => {       │
│      await page.goto('/tasks')                                   │
│      await page.click('Create Task')                             │
│      await page.fill('input[name=title]', 'New Task')            │
│      await page.click('Submit')                                  │
│      await expect(page).toContainText('New Task')                │
│    })                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Cross-Domain Communication Patterns

### Pattern 1: Event Bus (Loosely Coupled)

```typescript
// Domain A publishes event
// domains/tasks/services/task.service.ts
eventBus.publish('task.completed', {
  taskId: 'task-123',
  completedAt: new Date(),
});

// Domain B subscribes to event
// domains/workflow/services/workflow.service.ts
eventBus.subscribe('task.completed', async (event) => {
  await autoStartWorkflowIfNeeded(event.taskId);
});
```

**When to use**: Loose coupling, async operations, audit trails

### Pattern 2: Public API Call (Tightly Coupled)

```typescript
// Domain importing from another domain's public API
// domains/dashboard/hooks/useDashboardStats.ts
import { useTasks } from '@/domains/tasks';
import { useInventory } from '@/domains/inventory';

export function useDashboardStats() {
  const { tasks } = useTasks();
  const { items } = useInventory();
  
  return {
    totalTasks: tasks.length,
    inventoryValue: calculateTotal(items),
  };
}
```

**When to use**: Direct dependencies, read-only access, dashboard aggregations

### Pattern 3: Shared State (Via Props)

```typescript
// App layer passes data between domains
// app/tasks/[id]/page.tsx
function TaskDetailPage({ taskId }) {
  const { task } = useTaskById(taskId);
  
  return (
    <>
      <TaskDetails task={task} />
      <WorkflowActions taskId={taskId} />  {/* Different domain */}
    </>
  );
}
```

**When to use**: Parent-child relationships, explicit data passing

---

## 📏 Sizing Guidelines

### When to Split a Domain

Consider splitting if:
- ✅ Domain has > 20 components
- ✅ Multiple unrelated features in same domain
- ✅ Team members work independently on different parts
- ✅ Different deployment/release cycles needed

**Example**: Split "Dashboard" into:
- `domains/dashboard` - Dashboard layout and navigation
- `domains/analytics` - Analytics widgets and charts
- `domains/reports` - Report generation and exports

### When to Keep Domains Together

Keep together if:
- ✅ Features are tightly coupled
- ✅ Shared business rules
- ✅ Same team owns both
- ✅ Always deployed together

**Example**: Keep "Tasks" unified:
- Task CRUD
- Task status management
- Task assignments
(All part of core task management)

---

## 🎯 Migration Priority Matrix

```
                High Business Value
                        │
        3 (Do Later)    │    1 (Do First)
                        │
  Low ──────────────────┼──────────────── High
  Complexity            │            Complexity
                        │
        4 (Skip?)       │    2 (Do Second)
                        │
                Low Business Value
```

**Quadrant 1** (High value, High complexity):
- Tasks domain (most used, complex state)
- Workflow domain (complex orchestration)

**Quadrant 2** (High value, Low complexity):
- Auth domain (foundational, simple)
- Inventory domain (high usage, straightforward)

**Quadrant 3** (Low value, Low complexity):
- Settings domain (simple, low usage)
- Notifications domain (straightforward)

**Quadrant 4** (Low value, High complexity):
- Consider deferring or simplifying first

---

## 🎓 Learning Path

### For New Team Members

1. **Day 1**: Read Executive Summary + Index
2. **Day 2**: Review Migration Plan (architecture sections)
3. **Day 3**: Try Implementation Guide templates
4. **Day 4**: Migrate a simple component to Auth domain
5. **Day 5**: Code review and Q&A

### For Existing Team

1. **Week 1**: Team training session (2 hours)
2. **Week 2**: Pilot Auth domain migration
3. **Week 3**: Review learnings, adjust patterns
4. **Week 4+**: Begin main migrations

---

**Document**: Architecture Visual Guide  
**Created**: 2026-02-17  
**Maintained**: Living document, update as architecture evolves  
**See Also**: 
- [Migration Plan](./BOUNDED_CONTEXTS_MIGRATION_PLAN.md)
- [Implementation Guide](./BOUNDED_CONTEXTS_IMPLEMENTATION_GUIDE.md)
- [Documentation Index](./BOUNDED_CONTEXTS_INDEX.md)
