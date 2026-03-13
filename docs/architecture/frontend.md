---
title: "Frontend Architecture (TypeScript)"
summary: "Overview of the Next.js frontend architecture, domain patterns, and state management."
read_when:
  - "Working on frontend domain code"
  - "Designing UI components"
  - "Managing application state"
---

# Frontend Architecture (TypeScript)

The frontend is a Next.js 14 application using the App Router. It is designed to be a thin client, mirroring the backend domain structure.

## Domain-Driven UI Structure

Each domain in `frontend/src/domains/` is organized into specialized folders:

### 1. IPC Layer (`ipc/`)
- Contains typed wrappers around Tauri's `invoke` (ADR-013).
- Uses `safeInvoke` for robust error handling and `extractAndValidate` to ensure backend responses match expectations.
- *Reference*: `frontend/src/domains/tasks/ipc/task.ipc.ts`

### 2. API Layer (`api/`)
- Public API surface for the domain, primarily using TanStack Query hooks (ADR-014).
- Handles server state, caching, and background synchronization.
- *Reference*: `frontend/src/domains/tasks/api/useTasks.ts`

### 3. Hooks Layer (`hooks/`)
- Domain-specific custom hooks for complex UI logic or orchestration.
- Bridges the gap between raw data (API) and component-ready logic.

### 4. Components Layer (`components/`)
- UI components specific to the domain.
- **Rule**: Components MUST receive data via props. Avoid fetching directly inside components where possible.

### 5. Services Layer (`services/`)
- Frontend-only business logic (e.g., CSV generation, complex UI transformations).

## Shared Architecture

### State Management
- **Server State**: Managed by **TanStack Query** (React Query) for all backend data.
- **UI State**: Managed by **Zustand** for complex UI-only state (e.g., global modals, sidebar state).
- **Simple State**: Standard React `useState` for local component state.

### Auto-Generated Types (ADR-015)
- All shared types between Rust and TypeScript are auto-generated.
- **DO NOT** edit files in `frontend/src/types/` manually.
- Instead, update the Rust source and run `npm run types:sync`.

### Validation
- Zod is used for client-side validation of forms and backend responses.
- Backend response validation ensures the frontend remains stable if the backend schema drifts.

## User Flow Pattern

1.  **Component** calls a `useQuery` or `useMutation` hook from the Domain API.
2.  **Hook** executes the request using the Domain IPC wrapper.
3.  **IPC Wrapper** performs a `safeInvoke`.
4.  **Mutation** logic invalidates related query caches to ensure UI stays fresh (ADR-014).
5.  **Signal Mutation** notifies the system of changes for broad cache invalidation.
