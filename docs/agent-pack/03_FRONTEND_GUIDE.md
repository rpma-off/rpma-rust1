# 03 - Frontend Guide

## Frontend entrypoints and route map

Core app shell:
- `frontend/src/app/layout.tsx`
- `frontend/src/app/RootClientLayout.tsx`
- `frontend/src/app/providers.tsx`

Primary routes (App Router):
- Auth/public: `/login`, `/signup`, `/bootstrap-admin`, `/unauthorized`
- Core: `/dashboard`, `/tasks`, `/tasks/new`, `/tasks/[id]`, `/clients`, `/clients/[id]`, `/interventions`, `/schedule`, `/inventory`, `/quotes`, `/reports`, `/settings`, `/users`, `/analytics`, `/admin`, `/audit`, `/messages`
- Root: `/` renders `CalendarDashboard` and redirects unauthenticated users to `/login`

Route files are in `frontend/src/app/**/page.tsx`.

## Domain structure pattern

Each domain generally follows:
- `frontend/src/domains/<domain>/api`
- `frontend/src/domains/<domain>/ipc`
- `frontend/src/domains/<domain>/services`
- `frontend/src/domains/<domain>/hooks`
- `frontend/src/domains/<domain>/components`

IPC domain wrappers commonly call `safeInvoke` and map request/response contracts.

## State and data fetching

- Global providers: React Query + Auth context + toast (`frontend/src/app/providers.tsx`)
- Auth state and token refresh: `frontend/src/domains/auth/api/AuthProvider.tsx`
- Local UI state: Zustand stores in domain/store folders (example: `frontend/src/domains/calendar/stores/calendarStore.ts`)

## Validation approach

- Form/runtime schemas primarily in `frontend/src/lib/validation/*` and domain-level validation utils.
- Backend data guards in `frontend/src/lib/validation/backend-type-guards.ts`.
- IPC errors normalized in `frontend/src/lib/ipc/utils.ts`.

## How IPC is called (pattern)

1. UI/hook calls domain IPC wrapper (example: `frontend/src/domains/tasks/ipc/task.ipc.ts`).
2. Wrapper uses `safeInvoke` (`frontend/src/lib/ipc/utils.ts`).
3. `safeInvoke` adds correlation ID, timeout, error normalization, and metrics.
4. Command string constants are centralized in `frontend/src/lib/ipc/commands.ts`.

## Common pitfalls

- **Type drift**: do not manually edit `frontend/src/lib/backend.ts`; run `npm run types:sync`.
- **IPC argument naming**: backend expects command-specific keys (`session_token`, `correlation_id`, payload variants); match wrapper conventions.
- **Large payloads**: avoid moving large binary blobs through IPC when possible; document/photo APIs exist under `documents` domain.
- **Auth gating**: app shell redirects on missing user (`RootClientLayout.tsx`), so test flow with/without stored session.

## UI system guardrails

- Theme/tokens: `frontend/src/app/globals.css` (HSL tokens + light/dark variables)
- Shared primitives: `frontend/src/components/ui/*` (Radix/shadcn-style components)
- Utility class merger: `frontend/src/lib/utils.ts` (`cn`)
