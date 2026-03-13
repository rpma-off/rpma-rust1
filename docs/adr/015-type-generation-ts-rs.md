# ADR-015: Type Generation via ts-rs

## Status

Accepted

## Date

2026-03-13

## Summary

TypeScript types are auto-generated from Rust types using the `ts-rs` crate. The `frontend/src/types/` directory is generated code and must never be manually edited.

## Context

- Need type safety across Rust backend and TypeScript frontend
- Manual type definition leads to drift and bugs
- IPC communication requires matching types on both sides
- Keeping types synchronized is error-prone
- API contracts must be consistent

## Decision

### The Rule

**Never edit files in `frontend/src/types/`. They are auto-generated from Rust. Edit the Rust source instead.**

### Type Generation Flow

```
Rust struct with #[derive(TS)]
         ↓
npm run types:sync (invokes Rust binary)
         ↓
TypeScript files in frontend/src/types/
         ↓
Frontend imports from generated types
```

### Rust Type Definition

```rust
// src-tauri/src/domains/tasks/domain/models/task.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use crate::shared::contracts::auth::UserRole;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub client_id: String,
    pub assigned_to: Option<String>,
    #[ts(type = "number")]  // Unix milliseconds
    pub created_at: i64,
    #[ts(type = "number")]
    pub updated_at: i64,
    #[ts(type = "number")]
    pub due_date: Option<i64>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum TaskStatus {
    Pending,
    Assigned,
    InProgress,
    OnHold,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum TaskPriority {
    Low,
    Medium,
    High,
    Urgent,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub priority: TaskPriority,
    pub client_id: String,
    #[ts(type = "number")]
    pub due_date: Option<i64>,
    pub assigned_to: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TaskQuery {
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub assigned_to: Option<String>,
    pub client_id: Option<String>,
    #[ts(type = "number")]
    pub due_before: Option<i64>,
    pub search: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<SortOrder>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum SortOrder {
    Asc,
    Desc,
}
```

### Generated TypeScript

```typescript
// frontend/src/types/Task.ts (GENERATED - DO NOT EDIT)
// This file is auto-generated. Do not edit manually.

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  client_id: string;
  assigned_to: string | null;
  created_at: number;  // Unix milliseconds
  updated_at: number;
  due_date: number | null;
  created_by: string;
}

export enum TaskStatus {
  Pending = "Pending',
  Assigned = "Assigned',
  InProgress = "InProgress',
  OnHold = "OnHold',
  Completed = "Completed',
  Cancelled = "Cancelled',
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent',
}

export interface CreateTaskRequest {
  title: string;
  description: string | null;
  priority: TaskPriority;
  client_id: string;
  due_date: number | null;
  assigned_to: string | null;
}

export interface TaskQuery {
  status: TaskStatus | null;
  priority: TaskPriority | null;
  assigned_to: string | null;
  client_id: string | null;
  due_before: number | null;
  search: string | null;
  page: number | null;
  page_size: number | null;
  sort_by: string | null;
  sort_order: SortOrder | null;
}

export enum SortOrder {
  Asc = 'Asc',
  Desc = 'Desc',
}
```

### Type Export Binary

```rust
// src-tauri/src/bin/export-types.rs
use ts_rs::TS;

fn main() {
    // Export all types with #[ts(export)]
    Task::export_all_to("./frontend/src/types/").unwrap();
    TaskStatus::export_all_to("./frontend/src/types/").unwrap();
    // ... all other types
    
    println!("Types exported successfully");
}
```

### npm Scripts

```json
// package.json
{
  "scripts": {
    "types:sync": "cd src-tauri && cargo run --bin export-types && cd ..",
    "types:watch": "nodemon --watch src-tauri/src --exec 'npm run types:sync'",
    "types:validate": "tsc --noEmit",
    "types:drift-check": "node scripts/check-type-drift.js"
  }
}
```

### Frontend Usage

```typescript
// frontend/src/domains/tasks/api/index.ts
import type { Task, TaskStatus, CreateTaskRequest } from '@/types';// Generated types

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => taskIpc.get(id) as Promise<Task>,
  });
}

export function useCreateTask() {
  return useMutation({
    mutationFn: (request: CreateTaskRequest) => taskIpc.create(request),
  });
}
```

### Type Attributes

```rust
// ts-rs attributes for customization

#[derive(TS)]
#[ts(export)]                    // Export to TypeScript
#[ts(export_to = "tasks/")]      // Export to subdirectory
pub struct Task { ... }

#[derive(TS)]
#[ts(export)]
pub struct Task {
    #[ts(type = "number")]       // Force type annotation
    pub created_at: i64,        // Generated as number, not string
    
    #[ts(skip)]                 // Don't include in TypeScript
    pub internal_field: String,
    
    #[ts(rename = "createdAt")] // Rename in TypeScript
    pub created_at: i64,
    
    #[ts(optional)]              // Generate as optional
    pub description: Option<String>,
}
```

### Handling Enums

```rust
// Complex enum handling
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum TaskEvent {
    Created { task_id: String, timestamp: i64 },
    StatusChanged { task_id: String, from: TaskStatus, to: TaskStatus },
    Assigned { task_id: String, user_id: String },
}

// Generated as TypeScript union type:
export type TaskEvent =
  | { Created: { task_id: string; timestamp: number } }
  | { StatusChanged: { task_id: string; from: TaskStatus; to: TaskStatus } }
  | { Assigned: { task_id: string; user_id: string } };
```

## Consequences

### Positive

- Types always match between frontend and backend
- No manual type synchronization
- Type errors caught at compile time
- IntelliSense works correctly
- Breaking changes propagate automatically

### Negative

- Need to run `types:sync` after Rust type changes
- Generated files should not be manually edited
- Some TypeScript features may not map from Rust

## Development Workflow

```bash
# After modifying Rust types:
npm run types:sync

# Validate types match:
npm run types:validate

# Watch mode during development:
npm run types:watch

# CI check for drift:
npm run types:drift-check
```

## Handling Type Drift

```javascript
// scripts/check-type-drift.js
// Validates that generated types match Rust source

const { execSync } = require('child_process');
const fs = require('fs');

// Get current hash of generated types
const currentHash = hashDirectory('./frontend/src/types');

// Re-export types
execSync('npm run types:sync');

// Get new hash
const newHash = hashDirectory('./frontend/src/types');

if (currentHash !== newHash) {
  console.error('Type drift detected! Generated types have changed.');
  console.error('Run `npm run types:sync` and commit the changes.');
  process.exit(1);
}
```

## Related Files

- `src-tauri/src/domains/*/domain/models/` — Rust types
- `src-tauri/src/bin/export-types.rs` — Type export binary
- `frontend/src/types/` — Generated TypeScript (DO NOT EDIT)
- `scripts/check-type-drift.js` — Drift detection
- `package.json` — Type sync scripts

## When to Read This ADR

- Adding new Rust structs for IPC
- Modifying existing types
- Debugging type mismatches
- Setting up CI type validation
- Understanding generated type files

## References

- AGENTS.md "Never edit frontend/src/types/"
- ts-rs crate documentation
- TypeScript code generation workflow