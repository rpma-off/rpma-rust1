# RPMA v2 Frontend Guide

## Frontend Structure Overview

The RPMA v2 frontend is built with Next.js 14 using the App Router, TypeScript, and Tailwind CSS. The UI is constructed with shadcn/ui components built on Radix UI primitives.

```
frontend/src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root server component layout
│   ├── RootClientLayout.tsx # Client wrapper with auth
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── (dashboard)/       # Route group with shared layout
│   │   ├── dashboard/     # Dashboard home
│   │   ├── tasks/         # Task management
│   │   ├── interventions/ # Intervention workflows
│   │   ├── clients/       # Client management
│   │   ├── inventory/     # Material inventory
│   │   ├── reports/       # Reports and analytics
│   │   ├── settings/      # Application settings
│   │   └── admin/         # Admin functions
│   ├── auth/              # Authentication pages
│   └── api/               # API routes (if any)
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui base components
│   │   ├── button.tsx    # Button variants and styles
│   │   ├── input.tsx     # Input field with validation
│   │   ├── dialog.tsx    # Modal dialog component
│   │   └── ...           # Other UI primitives
│   ├── forms/            # Form components with validation
│   ├── layout/           # Layout-specific components
│   └── [domain]/         # Domain-specific components
│       ├── tasks/         # Task-related components
│       ├── interventions/ # Intervention components
│       └── clients/       # Client components
├── lib/                  # Utilities and clients
│   ├── ipc/              # IPC client implementation
│   │   ├── client.ts     # Main IPC client
│   │   ├── domains/      # Domain-specific wrappers
│   │   │   ├── auth.ts   # Authentication methods
│   │   │   ├── tasks.ts  # Task operations
│   │   │   ├── clients.ts # Client operations
│   │   │   └── ...       # Other domains
│   │   └── utils.ts      # IPC utilities
│   ├── backend.ts        # Generated types from Rust
│   ├── utils/            # General utility functions
│   └── validations/      # Zod schemas for validation
├── types/                # TypeScript type definitions
│   ├── api.ts            # API response types
│   └── domain.ts         # Domain-specific types
└── hooks/                # Custom React hooks
    ├── useAuth.ts        # Authentication state
    ├── useLocalStorage.ts # Local storage utilities
    └── [domain]/         # Domain-specific hooks
```

## IPC Client Usage

### Basic IPC Client Structure
The IPC client is the primary way the frontend communicates with the Rust backend.

```typescript
// frontend/src/lib/ipc/client.ts
import { invoke } from '@tauri-apps/api/core';

class IpcClient {
  // Authentication wrapper
  private async invokeWithAuth<T>(command: string, payload: any): Promise<T> {
    const sessionToken = await getSessionToken();
    return await invoke<T>(command, { ...payload, sessionToken });
  }

  // Cached invoke for frequently accessed data
  private async cachedInvoke<T>(key: string, command: string, payload: any): Promise<T> {
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const result = await this.invokeWithAuth<T>(command, payload);
    localStorage.setItem(key, JSON.stringify(result));
    return result;
  }
}

export const ipcClient = new IpcClient();
```

### Domain-Specific Wrappers
Each domain has its own IPC wrapper for organized access:

```typescript
// frontend/src/lib/ipc/domains/tasks.ts
import { ipcClient } from '../client';

export const tasksApi = {
  // Get a task by ID
  async get(taskId: string): Promise<Task> {
    return ipcClient.invoke('get_task', { taskId });
  },

  // List tasks with filters
  async list(filters: TaskFilters = {}): Promise<Task[]> {
    return ipcClient.invoke('list_tasks', { filters });
  },

  // Create a new task
  async create(taskData: CreateTaskRequest): Promise<Task> {
    const result = await ipcClient.invoke('create_task', taskData);
    // Invalidate cache
    ipcClient.invalidateCache('tasks_list');
    return result;
  },

  // Update a task
  async update(taskId: string, updates: UpdateTaskRequest): Promise<Task> {
    const result = await ipcClient.invoke('update_task', { taskId, ...updates });
    // Invalidate relevant caches
    ipcClient.invalidateCache(`task_${taskId}`);
    ipcClient.invalidateCache('tasks_list');
    return result;
  },
};
```

### Using the IPC Client in Components
```typescript
// Example component using the tasks API
'use client';

import { useState, useEffect } from 'react';
import { tasksApi } from '@/lib/ipc/domains/tasks';
import { Task, TaskFilters } from '@/lib/backend';

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});

  useEffect(() => {
    async function loadTasks() {
      try {
        const taskList = await tasksApi.list(filters);
        setTasks(taskList);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    }

    loadTasks();
  }, [filters]);

  return (
    // Render tasks
  );
}
```

## State Management Patterns

### Authentication State
```typescript
// hooks/useAuth.ts
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/ipc/domains/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    setUser(response.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Data Fetching with TanStack Query
```typescript
// hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/ipc/domains/tasks';
import { Task, TaskFilters } from '@/lib/backend';

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      // Invalidate and refetch tasks list
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

## Component Patterns

### Form Handling with Validation
```typescript
// components/forms/TaskForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { taskCreateSchema } from '@/lib/validations/task';
import { useCreateTask } from '@/hooks/useTasks';

type TaskCreateData = z.infer<typeof taskCreateSchema>;

export function TaskForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<TaskCreateData>({
    resolver: zodResolver(taskCreateSchema),
  });

  const createTask = useCreateTask();

  const onSubmit = async (data: TaskCreateData) => {
    await createTask.mutateAsync(data);
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter task title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More form fields */}
        <Button type="submit" disabled={createTask.isPending}>
          {createTask.isPending ? 'Creating...' : 'Create Task'}
        </Button>
      </form>
    </Form>
  );
}
```

### Using shadcn/ui Components
```typescript
// Example of using shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
            {task.priority}
          </Badge>
        </div>
        <CardDescription>{task.vehicle_make} {task.vehicle_model}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            task.status === 'completed' ? "bg-green-100 text-green-800" :
            task.status === 'in_progress' ? "bg-blue-100 text-blue-800" :
            "bg-gray-100 text-gray-800"
          )}>
            {task.status}
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">View Details</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{task.title}</DialogTitle>
                <DialogDescription>
                  Task details and actions
                </DialogDescription>
              </DialogHeader>
              {/* Task details content */}
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Adding New UI Features

### 1. Creating a New Page
```typescript
// app/(dashboard)/features/new-feature/page.tsx
import { Suspense } from 'react';
import { NewFeatureView } from '@/components/features/new-feature/NewFeatureView';

export default function NewFeaturePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewFeatureView />
    </Suspense>
  );
}
```

### 2. Adding a New IPC Method
```typescript
// lib/ipc/domains/new-feature.ts
import { ipcClient } from '../client';

export const newFeatureApi = {
  async list(filters: NewFeatureFilters = {}): Promise<NewFeature[]> {
    return ipcClient.invoke('list_new_features', { filters });
  },

  async create(data: CreateNewFeatureRequest): Promise<NewFeature> {
    const result = await ipcClient.invoke('create_new_feature', data);
    ipcClient.invalidateCache('new_features_list');
    return result;
  },
};
```

### 3. Creating Validation Schema
```typescript
// lib/validations/new-feature.ts
import { z } from 'zod';

export const newFeatureCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
});

export type NewFeatureCreateData = z.infer<typeof newFeatureCreateSchema>;
```

## Common Pitfalls and Solutions

### 1. Types Drift
**Problem**: Frontend types become out of sync with backend types.
**Solution**: Always run `npm run types:sync` after modifying Rust models.

```bash
# After changing any Rust model
npm run types:sync
npm run types:validate
npm run types:drift-check
```

### 2. IPC Naming Mismatches
**Problem**: Frontend calls backend command with different naming convention.
**Solution**: Keep IPC command names consistent between frontend and backend.

```rust
// Backend
#[tauri::command]
async fn get_task_details(task_id: String) -> Result<Task, AppError> {
    // Implementation
}
```

```typescript
// Frontend
async getTaskDetails(taskId: string): Promise<Task> {
  return ipcClient.invoke('get_task_details', { taskId });
}
```

### 3. Large Payload Handling
**Problem**: Sending large amounts of data over IPC causes performance issues.
**Solution**: Use pagination and streaming for large datasets.

```typescript
// Instead of loading all tasks at once
async list(filters: TaskFilters = {}): Promise<Task[]> {
  return ipcClient.invoke('list_tasks', { filters });
}

// Use pagination
async listPaginated(page: number, limit: number, filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
  return ipcClient.invoke('list_tasks_paginated', { page, limit, filters });
}
```

### 4. Component Performance
**Problem**: UI becomes sluggish with many re-renders.
**Solution**: Use React.memo and useMemo for expensive computations.

```typescript
const TaskCard = React.memo(({ task }: { task: Task }) => {
  const formattedDate = useMemo(() => {
    return new Date(task.created_at).toLocaleDateString();
  }, [task.created_at]);

  return (
    // Component JSX
  );
});
```

## Responsive Design Guidelines

### Mobile-First Approach
```typescript
// Use Tailwind responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Card components */}
</div>

// Hide elements on mobile
<div className="hidden md:block">
  {/* Desktop-only content */}
</div>
```

### Touch-Friendly Interactions
```typescript
// Use larger touch targets on mobile
<Button size="lg" className="md:size-default">
  {/* Button content */}
</Button>

// Use proper spacing for touch
<div className="space-y-6 md:space-y-4">
  {/* Form fields */}
</div>
```

## Accessibility Considerations

### Semantic HTML
```typescript
// Use proper semantic elements
<main role="main" aria-label="Task Management">
  <section aria-labelledby="task-list-heading">
    <h2 id="task-list-heading" className="sr-only">Task List</h2>
    {/* Task list */}
  </section>
</main>
```

### Focus Management
```typescript
// Manage focus in dialogs
<Dialog>
  <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```