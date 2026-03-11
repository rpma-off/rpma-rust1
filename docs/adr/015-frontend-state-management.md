# ADR-015: Frontend State Management Strategy

## Status
Accepted

## Context
Inconsistent state management leads to cache invalidation bugs and stale data. A unified strategy is required to categorize state and assign it to the appropriate tool.

## Decision

### 1. Server State (TanStack Query)
- All backend data fetched via IPC is managed by React Query.
- Read operations use `useQuery` with keys from `frontend/src/lib/query-keys.ts`.
- Write operations use `useMutation` and must trigger cache invalidation for affected keys on success.
- Server state must not be duplicated in Zustand or React Context.

### 2. Global UI State (Zustand)
- Client-only UI state that survives component unmounts (e.g., sidebar visibility, theme, calendar view filters) belongs in a Zustand store.
- Zustand stores are located in `frontend/src/domains/<domain>/hooks/` or `frontend/src/lib/stores/`.
- Stores must not import from `frontend/src/lib/ipc/` and must not hold server-fetched data.

### 3. Authentication State (React Context)
- Session tokens, user profiles, and login/logout lifecycle methods are owned exclusively by `AuthProvider` (`frontend/src/domains/auth/api/AuthProvider.tsx`).
- Components consume this state via the `useAuth` hook.

### 4. Form State (React Hook Form)
- Interactive forms use React Hook Form with Zod validation.
- Field values and validation errors live within the form context and are not mirrored to external stores.
- The shared `<DesktopForm>` or `<MobileForm>` wrappers must be used to ensure consistent behavior.

## Consequences
- Clear separation of concerns between remote data and local UI state.
- Optimal rendering performance by avoiding unnecessary Context updates for frequently changing UI flags.
- Simplified testing by isolating form logic from global state.
