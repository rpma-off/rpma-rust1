# ADR-015: Frontend State Management Strategy

## Status
Accepted

## Context
The frontend uses three different state management libraries — React Query (TanStack Query), Zustand, and React Context — plus React Hook Form for form state. Without a documented policy, the same concern has been addressed inconsistently across domains: server data fetched inside a Zustand store, auth state duplicated in both Context and a Zustand slice, and form values managed in component-level `useState`. This leads to cache invalidation bugs, stale data, and unnecessary re-renders.

A clear, binding rule for each state category is required so every domain module follows the same pattern and code reviews have an objective checklist.

## Decision

### 1. Server State → React Query (TanStack Query)

All data that originates on the backend (fetched via IPC, subject to staleness) must be managed exclusively with TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`).

**Rules:**
- Every IPC read is wrapped in `useQuery` with a key from `frontend/src/lib/query-keys.ts`.
- Every IPC write is wrapped in `useMutation`; on success the mutation must invalidate or update the affected query keys.
- `staleTime` is set centrally in the `QueryClient` configuration (`frontend/src/lib/ipc/client.ts`); individual queries may tighten it, never loosen it without justification.
- Zustand stores and React Context must not own server-fetched data and must not call IPC directly.

**Rationale:** React Query provides automatic background refetching, deduplication of in-flight requests, cache invalidation, and optimistic update helpers. Replicating these concerns in Zustand or Context requires substantial hand-written logic and produces subtler bugs.

### 2. Global UI State → Zustand

Client-only UI state that must survive component unmounts and be accessible across unrelated parts of the component tree belongs in a Zustand store.

**In scope for Zustand:**
- Theme and appearance preferences (if not persisted server-side).
- Sidebar open/closed state.
- Modal and dialog visibility flags.
- Notification panel state and locally-cached notification list.
- Calendar view preferences and filter selections.

**Out of scope for Zustand:**
- Any data fetched from the backend (see Rule 1).
- Authentication or session information (see Rule 3).
- Form field values (see Rule 4).

**Rules:**
- New Zustand stores live under `frontend/src/domains/<domain>/hooks/` or, for truly cross-domain state, under `frontend/src/lib/stores/`.
- Stores must not import from `frontend/src/lib/ipc/` and must not call `safeInvoke`.
- Persist middleware (`zustand/middleware`) is allowed only for pure UI preferences (e.g., selected calendar view) and must not be used for auth tokens or server-fetched payloads.

**Rationale:** Zustand's minimal API and selector-based subscriptions keep UI state isolated from the rendering tree. Using Context for this category causes the entire subtree to re-render on every state change; using React Query for purely client-side flags is semantic overreach.

### 3. Auth State → React Context (AuthProvider)

Authentication and session management is handled exclusively by `AuthProvider` (`frontend/src/domains/auth/api/AuthProvider.tsx`) and consumed via the `useAuth` hook.

**Rules:**
- The session token, current user profile, and auth lifecycle methods (`login`, `logout`, `refreshSession`) are owned by `AuthProvider`. No other component or store may duplicate this state.
- Zustand stores must not store the session token or the current user object.
- Components that need auth data call `useAuth()`; they do not reach into any Zustand store or local state.
- The `safeInvoke` IPC wrapper retrieves the session token from `AuthProvider` internally; callers must not pass tokens manually unless the API explicitly requires it.

**Rationale:** Auth state has a well-defined lifecycle tied to mount/unmount of the application shell. React Context is sufficient and appropriate for a singleton provider whose value changes infrequently. Duplicating auth state in Zustand creates a second source of truth and risks token/profile skew after a session refresh.

### 4. Form State → React Hook Form

All interactive forms use React Hook Form (`useForm`, `Controller`, `FormProvider`). Zod schemas are used for validation via the `zodResolver`.

**Rules:**
- Form field values, validation errors, and submission state live inside React Hook Form; they must not be mirrored into Zustand stores or React Query caches.
- The shared `<DesktopForm>` and `<MobileForm>` wrappers (`frontend/src/shared/ui/form.tsx`) must be used rather than raw `<form>` elements, unless a form is trivially simple (single field, no validation).
- `useState` may be used for ephemeral derived UI state within a form (e.g., a password-visibility toggle), but not for field values.
- After successful submission, the form calls `queryClient.invalidateQueries` for the relevant server data; it must not manually update a Zustand store with the submitted values.

**Rationale:** React Hook Form is uncontrolled by default, which avoids re-renders on every keystroke. Duplicating field values in Zustand or Context defeats this optimization and adds synchronization complexity.

## Summary Table

| State Category        | Library              | Location                                               |
| --------------------- | -------------------- | ------------------------------------------------------ |
| Server / remote data  | TanStack Query       | domain hooks (`useQuery` / `useMutation`)              |
| Global UI preferences | Zustand              | `domains/<domain>/hooks/` or `lib/stores/`             |
| Auth / session        | React Context        | `domains/auth/api/AuthProvider.tsx`                    |
| Form fields           | React Hook Form + Zod | domain form components, shared `DesktopForm` wrapper  |

## Migration Notes

A review of the codebase at the time this ADR was ratified found no material violations of the above rules:

- Auth state is owned solely by `AuthProvider`; no Zustand slice mirrors the session token.
- Server data is fetched exclusively via `useQuery` and `useMutation`; no Zustand store calls IPC.
- The two existing Zustand stores (`NotificationStore`, `CalendarStore`) manage only UI preferences and locally-buffered notification events, not authoritative server data.
- All forms reviewed use React Hook Form with Zod resolver via the shared form wrapper.

Should a future violation be introduced, the remediation path is:

1. **Zustand store holding server data**: migrate the affected slice to `useQuery`; delete the store; update consumers to call the query hook.
2. **Auth state duplicated in Zustand**: delete the Zustand slice; update consumers to call `useAuth`.
3. **Context used for server data**: migrate the provider to a `useQuery` hook exported from the domain's `hooks/` directory; retain the Context wrapper only if prop-drilling avoidance is genuinely necessary, and have it hold the *query result* rather than calling IPC itself.
4. **Form fields in Zustand or Context**: migrate to a `useForm` hook; reset the store slice on unmount.

## Consequences

- Codebase reviewers have an objective, per-category checklist.
- New domains must follow this policy from inception; deviations require an ADR amendment.
- The query key registry (`frontend/src/lib/query-keys.ts`) remains the single source of truth for all server-state cache keys.
- Any future introduction of a new state management library (e.g., Jotai, XState) requires a superseding ADR.

## Related

- ADR-009: TypeScript Type Synchronization Contract
- ADR-010: Session Token Model
- ADR-005: IPC Command Mapping
