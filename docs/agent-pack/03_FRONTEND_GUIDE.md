---
title: "Frontend Guide"
summary: "Architecture, patterns, and standards for the Next.js frontend."
read_when:
  - "Adding new frontend features"
  - "Modifying UI components"
  - "Working with TanStack Query or Zustand"
---

# 03. FRONTEND GUIDE

The frontend is a **Next.js 14** application in `frontend/` using the App Router and strict TypeScript.

## Directory Structure (`frontend/src/`)

- `app/`: Routing, layouts, and page components.
- `domains/`: Mirrored backend domains (**ADR-002**).
  - `[domain]/api/`: TanStack Query hooks and keys (**ADR-014**).
  - `[domain]/components/`: Domain-specific UI.
  - `[domain]/hooks/`: Domain-specific React hooks.
  - `[domain]/ipc/`: Typed wrappers for Tauri `invoke` (**ADR-013**).
  - `[domain]/services/`: Frontend business logic/orchestration.
- `components/`: Shared UI components (shadcn/ui).
- `lib/`: IPC client, global constants, and core utilities.
- `types/`: **AUTO-GENERATED** from Rust via `ts-rs` (**ADR-015**). **Do not edit.**

## State Management

1. **Server State**: **TanStack Query** (v5) is mandatory for all backend data.
   - Cache invalidation uses patterns: `invalidatePattern('tasks:')`.
2. **UI State**: **Zustand** for complex/global UI state (e.g., active task sidebar).
3. **Local State**: `useState` for simple, component-local toggles.

## Communication (IPC)

**Never call `invoke` directly.** Use the domain wrappers.
```typescript
// ✅ Correct
import { taskIpc } from '@/domains/tasks/ipc';
const result = await taskIpc.create(data);

// ❌ Incorrect
import { invoke } from '@tauri-apps/api/tauri';
const result = await invoke('task_crud', { ... });
```

## Styling & UI

- **Tailwind CSS** for all styling.
- **shadcn/ui** for accessible, consistent components.
- Follow the theme tokens in `tailwind.config.ts`.

## Development Workflow

1. **Rust change?** Run `npm run types:sync`.
2. **New feature?** Create a new folder in `domains/` and export via `index.ts`.
3. **Validation?** Use **Zod** for form schemas.
4. **Testing?** Add Playwright E2E tests in `frontend/tests/e2e/`.

## Constraints
- `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json`.
- Components must receive data as **props** (no fetching inside components).
- `useEffect` is for external sync only, not business logic.
