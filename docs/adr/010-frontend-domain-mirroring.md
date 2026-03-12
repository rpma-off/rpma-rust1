---
title: "Frontend Domain Mirroring Backend Structure"
summary: "Organize frontend code into domain folders that mirror backend bounded contexts, maintaining clear ownership and reducing cross-domain coupling."
domain: frontend
status: accepted
created: 2026-03-12
---

## Context

The backend uses Domain-Driven Design with 12 bounded contexts (tasks, clients, inventory, etc.). Without a corresponding frontend structure:

- Code becomes scattered across generic folders
- Developers struggle to find related components
- Changes require touching multiple locations
- Domain knowledge is not co-located

## Decision

**Mirror backend domain structure in frontend with consistent sub-folders per domain.**

### Backend Domains

```
src-tauri/src/domains/
├── auth/
├── calendar/
├── clients/
├── documents/
├── interventions/
├── inventory/
├── notifications/
├── quotes/
├── reports/
├── settings/
├── tasks/
└── users/
```

### Frontend Domains

```
frontend/src/domains/
├── admin/
├── audit/
├── auth/
├── bootstrap/
├── calendar/
├── clients/
├── dashboard/
├── interventions/
├── inventory/
├── notifications/
├── performance/
├── quotes/
├── reports/
├── settings/
├── sync/
├── tasks/
└── users/
```

### Domain Internal Structure

Each domain follows a consistent pattern:

```
frontend/src/domains/tasks/
├── api/              # Public API surface (exports)
│   ├── index.ts      # Re-exports useTasks, TaskProvider, etc.
│   ├── TaskProvider.tsx
│   ├── useTasks.ts
│   ├── useTaskActions.ts
│   └── types.ts
├── components/       # Domain-specific UI
│   ├── TaskDetails.tsx
│   ├── TaskListTable.tsx
│   ├── TaskForm/
│   └── __tests__/
├── hooks/            # Domain-specific hooks
│   ├── useTaskFilters.ts
│   └── useTaskStatus.ts
├── ipc/              # IPC wrappers
│   ├── index.ts
│   └── task.ipc.ts
├── services/         # Frontend business logic
│   └── task-csv.service.ts
└── utils/            # Domain utilities
    └── display.ts
```

### Public API Pattern

Each domain exports its public API from `api/index.ts`:

```typescript
// frontend/src/domains/tasks/api/index.ts
export { TaskProvider } from './TaskProvider';
export { useTasks } from './useTasks';
export { useTaskActions } from './useTaskActions';
export { taskIpc } from '../ipc';
export { TaskDetails, TaskListTable } from '../components';
export type { Task, TaskQuery, CreateTaskRequest } from './types';
```

### Import Rules

```typescript
// ✅ Good: Import from domain's public API
import { useTasks, TaskDetails } from '@/domains/tasks/api';

// ❌ Bad: Import from domain internals
import { TaskDetails } from '@/domains/tasks/components/TaskDetails';
```

## Consequences

### Positive

- **Discoverability**: Related code is co-located
- **Ownership**: Clear domain boundaries
- **Maintainability**: Changes localized to domain folders
- **Onboarding**: Structure matches backend mental model
- **Encapsulation**: Public API controls what's exposed

### Negative

- **Verbosity**: Deeper folder hierarchy
- **Discipline Required**: Must use public API imports
- **Duplication Risk**: Similar patterns across domains
- **Shared Code**: Cross-domain UI requires shared folder

## Related Files

- `frontend/src/domains/tasks/` — Example domain structure
- `frontend/src/domains/inventory/` — Another domain example
- `frontend/src/domains/auth/` — Authentication domain
- `frontend/src/shared/` — Shared UI and utilities
- `AGENTS.md` — Frontend guidance section

## Read When

- Adding new frontend features
- Deciding where to place new components
- Understanding domain boundaries on frontend
- Refactoring component locations
- Adding new domains
- Setting up domain exports
