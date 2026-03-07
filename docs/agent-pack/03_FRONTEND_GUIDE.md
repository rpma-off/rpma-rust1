# Frontend Guide

The frontend is a robust Next.js 14 (App Router) application built with React 18, Tailwind CSS, and shadcn/ui.

## Directory Structure (`frontend/src/`)
- **`app/`**: Next.js App Router pages (e.g., `app/tasks/page.tsx`, `app/login/page.tsx`).
- **`components/`**: Shared, non-domain specific UI primitive components (often shadcn).
- **`domains/`**: Domain-specific hubs mimicking the backend bounded contexts (e.g., `domains/tasks/`, `domains/inventory/`).
  - `domains/[domain]/api/`: Public interfaces exposed to other frontend domains.
  - `domains/[domain]/components/`: Feature-specific UI.
  - `domains/[domain]/hooks/`: Zustand/React Query state bindings.
  - `domains/[domain]/ipc/`: Strongly-typed wrappers around Tauri `invoke`.
- **`lib/`**: General utilities and the root IPC abstraction layer.
- **`types/`**: **AUTO-GENERATED FROM RUST. DO NOT EDIT.** Use `npm run types:sync` to rebuild.

## Calling the Backend
Never use standard `fetch`. Use the IPC wrappers located in `domains/*/ipc/` which leverage Tauri's `invoke`.
```typescript
// Example location: frontend/src/domains/tasks/ipc/index.ts
import { invoke } from '@tauri-apps/api/core';
import type { Task, CreateTaskCmd } from '@/types';

export async function createTask(payload: CreateTaskCmd): Promise<Task> {
    // correlation_id and session_token might be handled automatically by a wrapper
    return invoke('create_task', { payload });
}
```

## Adding New UI Features safely
1. **Define Types**: If you need new data shapes, define them as Rust structs with `#[derive(TS)]` inside `src-tauri` first. Run `npm run types:sync`.
2. **IPC Integration**: Create or update the IPC wrapper in `frontend/src/domains/[domain]/ipc/`.
3. **State Management**: Create a hook in `frontend/src/domains/[domain]/hooks/` using React Query to cache the IPC response.
4. **UI Components**: Use existing Tailwind classes and shadcn primitives. Avoid custom CSS where possible.

## Common Pitfalls
- **Type Drift**: Modifying Rust models without running `npm run types:sync` causes TS errors.
- **Large Payloads**: For bulk photo uploads or large reports, ensure the IPC layer supports chunking or streaming (TODO: check `src-tauri/src/commands/compression.rs` or `streaming.rs` patterns).
- **Direct Domain Imports**: Never import components from `domains/A/components` into `domains/B/components`. Communicate via domain `api/` hooks.
