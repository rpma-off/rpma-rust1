# Frontend Bounded Contexts + Internal Public API Migration Plan

**Document Status**: 🔴 **BASELINE - NOT YET IMPLEMENTED**  
**Created**: 2026-02-17  
**Project**: RPMA v2 Frontend Architecture Refactoring  
**Version**: 1.0.0

---

## 📋 Executive Summary

This document establishes the **guardrails baseline** for migrating the RPMA v2 frontend from its current feature-based hybrid organization to a **bounded contexts architecture** with clearly defined **internal public APIs**. 

### Current State
- **260+ components** with mixed responsibilities
- **67 custom hooks** with inconsistent abstraction levels
- **19 IPC domain modules** as thin wrappers
- **Multiple state management patterns** (Contexts, Services, Hooks)
- **Unclear boundaries** between features leading to tight coupling

### Target State
- **Domain-driven bounded contexts** with clear boundaries
- **Internal public APIs** that enforce encapsulation
- **Consistent patterns** for state management and data fetching
- **Independent testability** and deployment of contexts
- **Type-safe contracts** between contexts

### Migration Approach
**Incremental migration** - no big-bang rewrites. Apply patterns to new code immediately, migrate existing code gradually starting with high-impact areas.

---

## 🎯 Goals & Non-Goals

### Goals ✅
1. **Establish clear domain boundaries** that match business capabilities
2. **Create internal public APIs** for each bounded context
3. **Reduce coupling** between features and domains
4. **Improve testability** through clear contracts
5. **Enable parallel development** by domain teams
6. **Document migration patterns** for the team to follow
7. **Implement guardrails** to prevent regression

### Non-Goals ❌
1. ❌ Complete rewrite of the frontend
2. ❌ Changes to backend architecture (already following bounded contexts)
3. ❌ Performance optimization (separate initiative)
4. ❌ UI/UX redesign
5. ❌ Migration of working features "just because"
6. ❌ Breaking existing functionality during migration

---

## 🔍 Current State Assessment

### 1. Codebase Inventory

#### Component Distribution
```
frontend/src/
├── components/          260 files (32,851 LOC)
│   ├── tasks/          ~15% (task management)
│   ├── dashboard/      ~10% (dashboard widgets)
│   ├── inventory/      ~12% (inventory management)
│   ├── calendar/       ~8% (scheduling)
│   ├── workflow/       ~15% (workflow execution)
│   ├── users/          ~8% (user management)
│   ├── auth/           ~5% (authentication)
│   ├── ui/             ~25% (shadcn/ui components)
│   └── layout/         ~2% (page layouts)
├── hooks/              67 files (custom hooks)
├── lib/
│   ├── ipc/domains/    19 modules (IPC wrappers)
│   ├── services/       ~800 LOC/service
│   ├── contexts/       4 React Contexts
│   └── stores/         Zustand stores
└── app/                Next.js App Router pages
```

#### IPC Domain Modules (Frontend ↔ Backend Communication)
```typescript
lib/ipc/domains/
├── auth.ts              // Authentication & session
├── tasks.ts             // Task CRUD + stats
├── interventions.ts     // Intervention management
├── inventory.ts         // Materials, stock, transactions
├── clients.ts           // Client management
├── users.ts             // User management
├── calendar.ts          // Scheduling
├── dashboard.ts         // Dashboard aggregation
├── reports.ts           // Reporting
├── photos.ts            // Photo management
├── settings.ts          // Application settings
├── security.ts          // Security & audit
├── sync.ts              // Data synchronization
├── notifications.ts     // Notifications
├── performance.ts       // Performance monitoring
├── ui.ts                // UI state
├── system.ts            // System info
└── bootstrap.ts         // App initialization
```

### 2. Architectural Pain Points

#### 🔴 Critical Issues

1. **Triple State Management Pattern**
   - **Problem**: Task data exists in 3 places simultaneously
     - `TaskContext` provides global state
     - `TaskService` provides singleton methods
     - `useTasks` hook composes both + adds sync logic
   - **Impact**: State synchronization bugs, complex testing, unclear ownership
   - **Example**: Task updates require 3 different update paths
   
2. **Workflow Context Confusion**
   - **Problem**: Two parallel workflow contexts with unclear routing
     - `WorkflowContext` (generic)
     - `PPFWorkflowContext` (PPF-specific)
   - **Impact**: Components don't know which context to use
   - **Example**: `ActionsCard.tsx` imports `InterventionWorkflowService` directly instead of context

3. **ActionsCard Mega-Component**
   - **Problem**: Single component handles 5+ domains (200+ LOC)
     - Task status updates
     - Workflow transitions
     - Message sending (SMS/email)
     - Issue reporting
     - Photo management
   - **Impact**: High change risk, difficult testing, unclear responsibilities

4. **Inconsistent Service Patterns**
   - **Problem**: Mixed singleton patterns
     - Some: `TaskService.getInstance()` (class-based singleton)
     - Some: `export const dashboardApiService = {...}` (module-level object)
   - **Impact**: Unclear initialization order, hard to test, no DI

5. **Type System Fragmentation**
   - **Problem**: Same concept, multiple incompatible types
     - `Task` from `@/lib/backend` (Rust-generated)
     - `TaskWithDetails` from `task.service.ts`
     - `DashboardTask` from `dashboard/types`
   - **Impact**: Type guards needed everywhere, transforms scattered across codebase

#### ⚠️ Medium Priority Issues

6. **Deep Import Chains**
   - Components importing from `../../../../lib/services/...`
   - No barrel exports for feature modules
   
7. **Circular Dependencies**
   - `TaskContext` ↔ `useTasks` ↔ `TaskService`
   - `AuthContext` required by almost every hook (25+ files)

8. **Inconsistent IPC Abstraction**
   - Some hooks use `ipcClient.tasks.read()` directly
   - Some hooks use `taskService.getTaskById()`
   - Some hooks use `taskOperations.read()` from domain module
   - **Impact**: No clear pattern to follow for new code

9. **Dashboard Data Fetching Duplication**
   - Both `useDashboardData()` and `useDashboardDataQuery()` exist
   - Components use different hooks for same data
   - `DashboardApiService` adds caching layer not used consistently

10. **Missing Domain Boundaries**
    - Inventory components spread across multiple directories
    - No clear "inventory feature package"
    - Shared utilities mixed with domain logic

### 3. Dependency Analysis

#### Cross-Domain Dependencies (High Coupling Areas)

```
Component/Hook          → Dependencies                      → Coupling Score
─────────────────────────────────────────────────────────────────────────────
ActionsCard.tsx         → 6 domains (tasks, workflow,       → 🔴 CRITICAL
                          interventions, photos, 
                          messages, issues)

useDashboardData        → 4 domains (dashboard, tasks,      → 🔴 HIGH
                          auth, inventory)

TaskDetails.tsx         → 5 domains (tasks, workflow,       → 🔴 HIGH
                          auth, interventions, photos)

useInterventionWorkflow → 4 domains (interventions,         → 🟡 MEDIUM
                          workflow, tasks, photos)

InventoryManager.tsx    → 3 domains (inventory, auth,       → 🟡 MEDIUM
                          settings)
```

#### Auth Context Usage Pattern
- **25+ hooks** depend on `useAuth()` for session token
- **15+ services** require auth token for IPC calls
- **Pattern**: Auth is a **cross-cutting concern**, not a bounded context

---

## 🏛️ Target Architecture

### 1. Bounded Contexts Definition

Following Domain-Driven Design principles, we define bounded contexts that **align with business capabilities** and the existing backend domain structure.

#### Core Bounded Contexts

```typescript
frontend/src/
├── domains/                          // 🆕 New bounded contexts root
│   ├── auth/                         // Authentication & Session Management
│   │   ├── api/                      // Public API (export boundary)
│   │   │   ├── index.ts              // 📘 Public API surface
│   │   │   ├── AuthProvider.tsx      // React Context provider
│   │   │   ├── useAuth.ts            // Primary hook
│   │   │   └── types.ts              // Public types
│   │   ├── components/               // Internal UI components
│   │   │   ├── LoginForm.tsx
│   │   │   └── SessionExpiredDialog.tsx
│   │   ├── hooks/                    // Internal hooks
│   │   │   ├── useSession.ts
│   │   │   └── use2FA.ts
│   │   ├── services/                 // Internal services
│   │   │   ├── auth.service.ts
│   │   │   └── session.service.ts
│   │   ├── ipc/                      // IPC client wrapper
│   │   │   └── auth.ipc.ts
│   │   └── __tests__/                // Domain tests
│   │
│   ├── tasks/                        // Task Management
│   │   ├── api/
│   │   │   ├── index.ts              // 📘 Public exports
│   │   │   ├── TaskProvider.tsx
│   │   │   ├── useTasks.ts
│   │   │   ├── useTaskActions.ts
│   │   │   └── types.ts
│   │   ├── components/
│   │   │   ├── TaskList/
│   │   │   ├── TaskDetails/
│   │   │   ├── TaskForm/
│   │   │   └── TaskActions/
│   │   ├── hooks/                    // Internal hooks
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   ├── interventions/                // Intervention Management
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   ├── inventory/                    // Inventory & Materials
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   ├── workflow/                     // Workflow Execution
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   ├── clients/                      // Client Management
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   ├── calendar/                     // Scheduling & Calendar
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   ├── users/                        // User Management
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   ├── dashboard/                    // Dashboard & Analytics
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ipc/
│   │   └── __tests__/
│   │
│   └── reporting/                    // Reports & Exports
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── ipc/
│       └── __tests__/
│
├── shared/                           // Cross-cutting concerns
│   ├── ui/                           // shadcn/ui components
│   ├── layouts/                      // Page layouts
│   ├── utils/                        // Pure utilities
│   ├── hooks/                        // Generic hooks (useDebounce, etc)
│   └── types/                        // Shared types
│
└── app/                              // Next.js pages (composition layer)
    ├── tasks/
    ├── interventions/
    ├── inventory/
    └── dashboard/
```

#### Context Boundaries & Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     🌐 Shared Layer                          │
│  (UI Components, Utils, Generic Hooks, Types)               │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ Uses (no circular deps)
                           │
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   🔒 Auth     │←────│   📋 Tasks    │←────│ ⚙️ Workflow   │
│   Context     │      │   Context     │      │   Context     │
└──────────────┘      └──────────────┘      └──────────────┘
      ↑                      ↑                      ↑
      │                      │                      │
      │                      └──────────┬───────────┘
      │                                 │
┌──────────────┐      ┌──────────────┐ │  ┌──────────────┐
│ 👥 Clients    │      │ 📦 Inventory  │ │  │ 🏥 Interven. │
│   Context     │      │   Context     │ │  │   Context     │
└──────────────┘      └──────────────┘ │  └──────────────┘
                                        │
                      ┌─────────────────┘
                      │
            ┌──────────────┐      ┌──────────────┐
            │ 📊 Dashboard │      │ 📅 Calendar   │
            │   Context     │      │   Context     │
            └──────────────┘      └──────────────┘

Legend:
→  "Uses" dependency (one-way only)
↑  Depends on shared layer
```

### 2. Internal Public API Pattern

Each bounded context **MUST** expose a single public API through its `api/index.ts` file.

#### Public API Template

```typescript
// domains/{context}/api/index.ts
// 📘 Public API - This is the ONLY file that should be imported from outside

// 1. React Context & Provider
export { TaskProvider } from './TaskProvider';
export type { TaskProviderProps } from './TaskProvider';

// 2. Primary Hooks (Consumer API)
export { useTasks } from './useTasks';
export { useTaskActions } from './useTaskActions';
export { useTaskById } from './useTaskById';

// 3. Public Types
export type {
  Task,
  TaskWithDetails,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskStats,
} from './types';

// 4. Constants (if needed)
export { TASK_STATUSES, TASK_PRIORITIES } from './constants';

// 5. Components (only if designed for external use)
export { TaskBadge } from '../components/TaskBadge';

// ❌ DO NOT EXPORT:
// - Internal services
// - IPC client wrappers
// - Internal hooks
// - Repository patterns
// - Implementation details
```

#### Usage Example

```typescript
// ✅ CORRECT: Import from public API
import { useTasks, TaskProvider, Task } from '@/domains/tasks/api';

// ❌ WRONG: Import from internal modules
import { useTasks } from '@/domains/tasks/hooks/useTasks';
import { TaskService } from '@/domains/tasks/services/task.service';
import { taskIpcClient } from '@/domains/tasks/ipc/task.ipc';
```

### 3. TypeScript Path Aliases

Update `tsconfig.json` to enforce public API imports:

```json
{
  "compilerOptions": {
    "paths": {
      // Public APIs (encouraged)
      "@/domains/auth": ["./src/domains/auth/api"],
      "@/domains/tasks": ["./src/domains/tasks/api"],
      "@/domains/interventions": ["./src/domains/interventions/api"],
      "@/domains/inventory": ["./src/domains/inventory/api"],
      "@/domains/workflow": ["./src/domains/workflow/api"],
      "@/domains/clients": ["./src/domains/clients/api"],
      "@/domains/calendar": ["./src/domains/calendar/api"],
      "@/domains/users": ["./src/domains/users/api"],
      "@/domains/dashboard": ["./src/domains/dashboard/api"],
      "@/domains/reporting": ["./src/domains/reporting/api"],
      
      // Shared utilities (allowed)
      "@/shared/*": ["./src/shared/*"],
      "@/ui": ["./src/shared/ui"],
      
      // Legacy paths (to be deprecated)
      "@/lib/*": ["./src/lib/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
    }
  }
}
```

### 4. Dependency Rules

#### ✅ Allowed Dependencies

```typescript
// App pages can depend on:
app/tasks/page.tsx → @/domains/tasks, @/domains/auth, @/shared/*

// Domains can depend on:
domains/tasks → @/domains/auth, @/shared/*

// Shared can depend on:
shared/ui → (nothing, pure components)
shared/utils → (nothing, pure functions)
```

#### ❌ Forbidden Dependencies

```typescript
// ❌ Circular dependencies
domains/tasks → domains/interventions → domains/tasks

// ❌ Shared depending on domains
shared/ui → domains/tasks

// ❌ Direct internal imports
app/tasks → domains/tasks/services/task.service

// ❌ Bypassing public API
domains/tasks → domains/interventions/services/intervention.service
```

---

## 🛡️ Guardrails & Validation

### 1. ESLint Rules

Create `.eslintrc.domains.js`:

```javascript
module.exports = {
  overrides: [
    {
      // Enforce public API imports
      files: ['src/app/**/*', 'src/domains/**/components/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/services/**', '**/ipc/**', '**/hooks/**'],
                message: 'Import from domain public API (@/domains/{name}) instead',
              },
            ],
          },
        ],
      },
    },
    {
      // Prevent shared layer depending on domains
      files: ['src/shared/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/domains/**', '../../domains/**'],
                message: 'Shared layer cannot depend on domains',
              },
            ],
          },
        ],
      },
    },
    {
      // Prevent circular dependencies between domains
      files: ['src/domains/**/*'],
      rules: {
        'import/no-cycle': ['error', { maxDepth: 2 }],
      },
    },
  ],
};
```

### 2. Architecture Validation Script

Create `scripts/validate-bounded-contexts.js`:

```javascript
#!/usr/bin/env node

/**
 * Validates bounded context architecture rules:
 * 1. Each domain has an api/index.ts public API
 * 2. No cross-domain internal imports
 * 3. No circular dependencies
 * 4. Shared layer doesn't depend on domains
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const DOMAINS_DIR = path.join(__dirname, '../frontend/src/domains');
const SHARED_DIR = path.join(__dirname, '../frontend/src/shared');

const errors = [];

// Rule 1: Check public API exists
function validatePublicAPIs() {
  const domains = fs.readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  domains.forEach(domain => {
    const apiFile = path.join(DOMAINS_DIR, domain, 'api', 'index.ts');
    if (!fs.existsSync(apiFile)) {
      errors.push(`❌ Domain '${domain}' missing public API: api/index.ts`);
    }
  });
}

// Rule 2: Check no cross-domain internal imports
function validateNoInternalImports() {
  const files = glob.sync(`${DOMAINS_DIR}/**/!(api)/**/*.{ts,tsx}`);
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const importPattern = /from ['"]@\/domains\/(\w+)\/(services|ipc|hooks)/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      errors.push(
        `❌ ${path.relative(process.cwd(), file)}:\n` +
        `   Importing internal module: @/domains/${match[1]}/${match[2]}\n` +
        `   Use public API instead: @/domains/${match[1]}`
      );
    }
  });
}

// Rule 3: Check shared doesn't depend on domains
function validateSharedIndependence() {
  const files = glob.sync(`${SHARED_DIR}/**/*.{ts,tsx}`);
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('@/domains/')) {
      errors.push(
        `❌ ${path.relative(process.cwd(), file)}:\n` +
        `   Shared layer cannot depend on domains`
      );
    }
  });
}

// Run validations
console.log('🔍 Validating bounded context architecture...\n');

validatePublicAPIs();
validateNoInternalImports();
validateSharedIndependence();

if (errors.length > 0) {
  console.error('❌ Architecture validation failed:\n');
  errors.forEach(err => console.error(err + '\n'));
  process.exit(1);
}

console.log('✅ All architecture rules passed!');
```

### 3. Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate bounded context architecture
node scripts/validate-bounded-contexts.js || exit 1

# Run existing validations
npm run frontend:lint
npm run frontend:type-check
```

### 4. CI/CD Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Validate Architecture
  run: node scripts/validate-bounded-contexts.js

- name: Check Public API Exports
  run: npm run validate:public-apis
```

---

## 📝 Migration Strategy

### Phase 1: Foundation (Week 1-2)

#### Goals
- Set up bounded contexts structure
- Create first public API example
- Establish patterns and documentation

#### Tasks
- [ ] Create `frontend/src/domains/` directory structure
- [ ] Set up TypeScript path aliases
- [ ] Create ESLint rules for architecture validation
- [ ] Write architecture validation script
- [ ] Create migration guide for developers
- [ ] Migrate Auth context (simplest, most dependencies)

#### Success Criteria
- Auth domain has complete public API
- All existing auth imports still work
- Architecture validation script passes
- Team trained on new patterns

### Phase 2: Core Domains (Week 3-6)

#### Priority Order (by impact & dependencies)

1. **Tasks Domain** (Week 3)
   - High impact: used by many features
   - Consolidate TaskContext + TaskService + useTasks
   - Create clean public API
   - Migrate ~20 dependent components

2. **Workflow Domain** (Week 4)
   - Consolidate WorkflowContext + PPFWorkflowContext
   - Clear separation: generic vs. PPF-specific
   - Create workflow router/factory pattern
   - Update ~15 dependent components

3. **Inventory Domain** (Week 5)
   - Consolidate scattered inventory components
   - Clean up useInventory + useInventoryStats
   - Migrate ~12 dependent components

4. **Interventions Domain** (Week 6)
   - Similar structure to tasks
   - Integrate with workflow domain
   - Migrate ~10 dependent components

### Phase 3: Supporting Domains (Week 7-10)

5. **Clients Domain** (Week 7)
6. **Calendar Domain** (Week 8)
7. **Users Domain** (Week 9)
8. **Dashboard Domain** (Week 10)

### Phase 4: Specialized Domains (Week 11-12)

9. **Reporting Domain** (Week 11)
10. **Remaining domains** (Week 12)

### Phase 5: Cleanup (Week 13-14)

- [ ] Remove old `components/` directory structure
- [ ] Remove old `hooks/` directory structure
- [ ] Remove old `lib/services/` structure
- [ ] Update all documentation
- [ ] Final architecture validation
- [ ] Performance audit

---

## 🔧 Implementation Patterns

### Pattern 1: State Management in Bounded Contexts

#### Before (Current - Problematic)

```typescript
// contexts/TaskContext.tsx
const TaskContext = createContext<TaskContextType | null>(null);

// hooks/useTasks.ts
export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  // ... complex logic
}

// services/entities/task.service.ts
export class TaskService {
  static instance: TaskService;
  async getTasks() { /* ... */ }
}

// Components use all three inconsistently
```

#### After (Target - Clean)

```typescript
// domains/tasks/api/TaskProvider.tsx
export function TaskProvider({ children }: TaskProviderProps) {
  const { user } = useAuth();
  
  // Internal state management
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => taskIpcClient.list({ userId: user!.id }),
  });
  
  const value = {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
  };
  
  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

// domains/tasks/api/useTasks.ts
export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within TaskProvider');
  }
  return context;
}

// domains/tasks/api/useTaskActions.ts
export function useTaskActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const createTask = useMutation({
    mutationFn: (input: CreateTaskInput) =>
      taskIpcClient.create(input, user!.token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  
  return {
    createTask: createTask.mutate,
    isCreating: createTask.isPending,
  };
}

// domains/tasks/api/index.ts
export { TaskProvider } from './TaskProvider';
export { useTasks } from './useTasks';
export { useTaskActions } from './useTaskActions';
```

#### Usage in App

```typescript
// app/tasks/page.tsx
import { TaskProvider, useTasks, useTaskActions } from '@/domains/tasks';

export default function TasksPage() {
  return (
    <TaskProvider>
      <TaskList />
    </TaskProvider>
  );
}

function TaskList() {
  const { tasks, isLoading } = useTasks();
  const { createTask } = useTaskActions();
  
  // Component logic...
}
```

### Pattern 2: IPC Client Encapsulation

#### Before (Current - Exposed)

```typescript
// hooks/useTasks.ts
import { safeInvoke } from '@/lib/ipc/client';

export function useTasks() {
  const fetchTasks = async () => {
    const result = await safeInvoke('task_list', { filters });
    // ...
  };
}
```

#### After (Target - Encapsulated)

```typescript
// domains/tasks/ipc/task.ipc.ts (INTERNAL - not exported)
import { safeInvoke } from '@/shared/ipc';
import type { Task, TaskFilters, CreateTaskInput } from '../api/types';

export const taskIpcClient = {
  async list(filters: TaskFilters): Promise<Task[]> {
    const result = await safeInvoke('task_list', { filters });
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  },
  
  async create(input: CreateTaskInput, token: string): Promise<Task> {
    const result = await safeInvoke('task_create', { 
      session_token: token,
      ...input 
    });
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  },
  
  // ... other IPC methods
};

// domains/tasks/api/useTasks.ts (USES internal IPC client)
import { taskIpcClient } from '../ipc/task.ipc';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskIpcClient.list({}),
  });
}
```

### Pattern 3: Type Management

#### Type Definition Strategy

```typescript
// domains/tasks/api/types.ts (PUBLIC)

// Base entity (from Rust backend)
import type { Task as RustTask } from '@/lib/backend';

// Public domain type (re-export or extend)
export type Task = RustTask;

// Domain-specific enriched types
export type TaskWithDetails = Task & {
  client?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  stats?: {
    completionPercentage: number;
    timeSpent: number;
  };
};

// Input types
export type CreateTaskInput = {
  title: string;
  description?: string;
  priority: TaskPriority;
  clientId: string;
  assigneeId?: string;
  dueDate?: Date;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  id: string;
};

// Query types
export type TaskFilters = {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  clientId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
};

// Enum types
export type TaskStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Constants
export const TASK_STATUSES: TaskStatus[] = ['draft', 'pending', 'in_progress', 'completed', 'cancelled'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
```

### Pattern 4: Component Decomposition

#### Before: Mega-Component (ActionsCard.tsx - 200+ LOC)

```typescript
// components/tasks/ActionsCard.tsx
export function ActionsCard({ taskId }: Props) {
  // Handles 5 different responsibilities
  const handleStatusUpdate = () => { /* ... */ };
  const handleWorkflowStart = () => { /* ... */ };
  const handleSendMessage = () => { /* ... */ };
  const handleReportIssue = () => { /* ... */ };
  const handlePhotoCapture = () => { /* ... */ };
  
  return (
    <Card>
      <StatusUpdateSection />
      <WorkflowSection />
      <MessagingSection />
      <IssueReportingSection />
      <PhotoSection />
    </Card>
  );
}
```

#### After: Decomposed by Domain

```typescript
// domains/tasks/components/TaskActionPanel.tsx (PUBLIC)
export function TaskActionPanel({ taskId }: Props) {
  return (
    <div className="space-y-4">
      <TaskStatusActions taskId={taskId} />      {/* tasks domain */}
      <WorkflowActions taskId={taskId} />        {/* workflow domain */}
      <CommunicationActions taskId={taskId} />   {/* messaging domain */}
      <IssueActions taskId={taskId} />           {/* issues domain */}
      <PhotoActions taskId={taskId} />           {/* photos domain */}
    </div>
  );
}

// domains/tasks/components/TaskStatusActions.tsx (INTERNAL)
function TaskStatusActions({ taskId }: Props) {
  const { updateTaskStatus } = useTaskActions();
  // Only task-related status actions
}

// domains/workflow/components/WorkflowActions.tsx (INTERNAL)
function WorkflowActions({ taskId }: Props) {
  const { startWorkflow } = useWorkflowActions();
  // Only workflow-related actions
}

// ... similarly for other actions
```

### Pattern 5: Cross-Domain Communication

#### Event-Based Communication (Preferred)

```typescript
// domains/tasks/services/task.service.ts (INTERNAL)
import { eventBus } from '@/shared/events';

export async function completeTask(taskId: string) {
  // Update task status
  await taskIpcClient.update({ id: taskId, status: 'completed' });
  
  // Publish domain event
  eventBus.publish('task.completed', {
    taskId,
    completedAt: new Date(),
  });
}

// domains/workflow/services/workflow.service.ts (INTERNAL)
import { eventBus } from '@/shared/events';

// Subscribe to events from other domains
eventBus.subscribe('task.completed', async (event) => {
  const { taskId } = event;
  // Maybe start a workflow automatically
  await autoStartWorkflowIfNeeded(taskId);
});
```

#### Direct API Call (When Necessary)

```typescript
// domains/dashboard/hooks/useDashboardStats.ts
import { useTasks } from '@/domains/tasks';
import { useInventory } from '@/domains/inventory';
import { useInterventions } from '@/domains/interventions';

export function useDashboardStats() {
  // Aggregate data from multiple domains via their public APIs
  const { tasks } = useTasks();
  const { items } = useInventory();
  const { interventions } = useInterventions();
  
  return useMemo(() => ({
    totalTasks: tasks.length,
    totalInventoryValue: calculateTotal(items),
    activeInterventions: interventions.filter(i => i.status === 'active').length,
  }), [tasks, items, interventions]);
}
```

---

## 📊 Migration Metrics & Success Criteria

### Quantitative Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Cross-domain imports | ~50 | 0 | ESLint violations |
| Circular dependencies | ~8 | 0 | import/no-cycle |
| Public API coverage | 0% | 100% | % domains with api/index.ts |
| Test isolation | Low | High | % tests not requiring full app setup |
| Component coupling | High | Low | Avg dependencies per component < 3 |
| Type consistency | Low | High | No duplicate type definitions |

### Qualitative Metrics

- [ ] **Developer Onboarding**: New developers can find and understand domain boundaries in < 30 minutes
- [ ] **Feature Development**: New features can be added to a single domain without touching other domains 80% of the time
- [ ] **Testing**: Domain tests can run in isolation without mocking 5+ dependencies
- [ ] **Documentation**: Each domain has clear README with public API documentation
- [ ] **Code Review**: PRs touching multiple domains are rare (< 20% of PRs)

### Success Criteria for Each Domain Migration

Before considering a domain "migrated", it must meet ALL criteria:

#### ✅ Structure
- [ ] Has `/api` directory with public `index.ts`
- [ ] Has `/components`, `/hooks`, `/services`, `/ipc` internal structure
- [ ] Has `/__tests__` directory with tests

#### ✅ API Design
- [ ] Public API exports Provider component
- [ ] Public API exports primary hooks (use{Domain}, use{Domain}Actions)
- [ ] Public API exports all public types
- [ ] No internal services or IPC clients exported

#### ✅ Dependencies
- [ ] Only imports from `@/shared/*` and `@/domains/auth`
- [ ] No circular dependencies
- [ ] No cross-domain internal imports
- [ ] All imports use TypeScript path aliases

#### ✅ Testing
- [ ] Unit tests for services (isolated)
- [ ] Component tests for public components
- [ ] Integration tests for provider + hooks
- [ ] Coverage > 80%

#### ✅ Documentation
- [ ] README.md in domain root
- [ ] Public API documented
- [ ] Usage examples provided
- [ ] Migration guide for consumers

#### ✅ Validation
- [ ] ESLint rules pass
- [ ] Architecture validation script passes
- [ ] All existing consumers updated
- [ ] No regressions in functionality

---

## 🚀 Quick Start for Developers

### Adding a New Feature to an Existing Domain

```typescript
// 1. Work inside the domain directory
// domains/tasks/components/NewTaskFeature.tsx

// 2. Import from public APIs only
import { useTasks, useTaskActions } from '@/domains/tasks';  // Own domain
import { useAuth } from '@/domains/auth';                    // Other domain
import { Button, Card } from '@/shared/ui';                  // Shared UI

// 3. Implement feature
export function NewTaskFeature() {
  const { tasks } = useTasks();
  const { createTask } = useTaskActions();
  const { user } = useAuth();
  
  // Feature logic...
}

// 4. If feature is reusable, export from public API
// domains/tasks/api/index.ts
export { NewTaskFeature } from '../components/NewTaskFeature';
```

### Creating a New Bounded Context

```bash
# 1. Create domain structure
mkdir -p domains/my-domain/{api,components,hooks,services,ipc,__tests__}

# 2. Create public API
touch domains/my-domain/api/index.ts
touch domains/my-domain/api/MyDomainProvider.tsx
touch domains/my-domain/api/useMyDomain.ts
touch domains/my-domain/api/types.ts

# 3. Add TypeScript path alias
# Edit tsconfig.json: "@/domains/my-domain": ["./src/domains/my-domain/api"]

# 4. Implement domain logic (services, IPC, etc.)

# 5. Export from public API
# Edit domains/my-domain/api/index.ts

# 6. Validate architecture
npm run validate:architecture
```

### Common Migration Patterns

#### Migrating a Component

```typescript
// Before
import { useTasks } from '@/hooks/useTasks';
import { TaskService } from '@/lib/services/entities/task.service';

// After
import { useTasks, useTaskActions } from '@/domains/tasks';
```

#### Migrating a Hook

```typescript
// Before: hooks/useTaskStats.ts
export function useTaskStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState();
  
  useEffect(() => {
    TaskService.getInstance().getStats().then(setStats);
  }, []);
  
  return stats;
}

// After: domains/tasks/hooks/useTaskStats.ts (INTERNAL)
import { taskIpcClient } from '../ipc/task.ipc';

export function useTaskStats() {
  return useQuery({
    queryKey: ['task-stats'],
    queryFn: () => taskIpcClient.getStats(),
  });
}

// domains/tasks/api/index.ts (PUBLIC)
export { useTaskStats } from '../hooks/useTaskStats';
```

---

## 📚 Reference Documentation

### Related Documents
- [ADR-001: Module Boundaries](./adr/001-module-boundaries.md)
- [ADR-005: IPC Mapping](./adr/005-ipc-mapping.md)
- [Architecture Overview](./agent-pack/02_ARCHITECTURE_AND_DATAFLOWS.md)
- [Frontend Guide](./agent-pack/03_FRONTEND_GUIDE.md)

### External Resources
- [Domain-Driven Design](https://martinfowler.com/bliki/BoundedContext.html)
- [React Query Best Practices](https://tkdodo.eu/blog/react-query-best-practices)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)

### Team Contacts
- Architecture Questions: **Architecture Team**
- Migration Support: **Frontend Lead**
- Code Reviews: **Domain Owners**

---

## 🔄 Living Document

This is a **living document** that will evolve as we learn and adapt during the migration.

### Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-17 | 1.0.0 | Initial baseline document | GitHub Copilot |

### Review Schedule
- **Weekly**: Migration progress review
- **Bi-weekly**: Pattern refinement based on learnings
- **Monthly**: Metrics review and target adjustments

---

## ❓ FAQ

### Q: Do we need to migrate everything at once?
**A**: No! This is an incremental migration. Start with new features, then gradually migrate existing code. Legacy code can coexist with new patterns.

### Q: What if a component needs to access multiple domains?
**A**: That's fine! Import from multiple public APIs. If you find yourself importing from 5+ domains, consider if the component should be split.

### Q: Can domains communicate directly?
**A**: Yes, through public APIs. For loose coupling, prefer event-based communication. Direct API calls are acceptable when needed.

### Q: How do we handle shared types between domains?
**A**: Shared types go in `@/shared/types`. Domain-specific types stay in each domain's `api/types.ts`.

### Q: What about UI components like buttons and cards?
**A**: Generic UI components stay in `@/shared/ui`. Domain-specific components (like TaskCard) belong in the domain.

### Q: How do we test cross-domain interactions?
**A**: Test the public APIs in isolation, then write integration tests at the app/page level.

### Q: What if we need to refactor a public API?
**A**: Version the API or use feature flags. Deprecate old exports gradually. Document breaking changes clearly.

---

## 🎯 Conclusion

This migration plan establishes **clear boundaries, enforces encapsulation, and provides patterns** for building maintainable, scalable features in the RPMA v2 frontend.

By following this plan:
- ✅ Developers know exactly where code belongs
- ✅ Features can be developed independently
- ✅ Testing becomes simpler and more reliable
- ✅ Onboarding new team members is faster
- ✅ Technical debt is reduced systematically

**Start date**: TBD  
**Expected completion**: 14 weeks  
**Status**: 🔴 Planning - awaiting approval

---

**Next Steps**:
1. Review this plan with the team
2. Get approval from technical lead
3. Schedule kickoff meeting
4. Start Phase 1: Foundation
