# 03 - Frontend Guide

## Frontend entrypoints and route map

Core app shell:
- `frontend/src/app/layout.tsx` (server component root)
- `frontend/src/app/RootClientLayout.tsx` (client wrapper with auth redirects)
- `frontend/src/app/providers.tsx` (React Query + Auth + Toast)

Primary routes (App Router):
- Auth/public: `/login`, `/signup`, `/bootstrap-admin`, `/unauthorized`
- Core: `/dashboard`, `/dashboard/interventions`, `/dashboard/operational-intelligence`, `/tasks`, `/tasks/new`, `/tasks/[id]`, `/tasks/edit/[id]`, `/tasks/[id]/completed`, `/tasks/[id]/workflow`, `/tasks/[id]/workflow/steps/[step]`, `/tasks/[id]/workflow/ppf`, `/tasks/[id]/workflow/ppf/steps/preparation`, `/tasks/[id]/workflow/ppf/steps/installation`, `/tasks/[id]/workflow/ppf/steps/inspection`, `/tasks/[id]/workflow/ppf/steps/finalization`
- Clients: `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`
- Schedule: `/schedule`
- Interventions: `/interventions`
- Inventory: `/inventory`
- Quotes: `/quotes`, `/quotes/new`, `/quotes/[id]`
- Reports: `/reports`
- Analytics: `/analytics`
- Admin: `/admin`, `/settings`, `/configuration`
- Users: `/users`
- Audit: `/audit`
- Messages: `/messages`
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
