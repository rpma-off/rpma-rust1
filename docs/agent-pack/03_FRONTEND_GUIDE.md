# 03 - Frontend Guide

## Frontend entrypoints and route map

Core app shell:
- `frontend/src/app/layout.tsx` (server component root)
- `frontend/src/app/RootClientLayout.tsx` (client wrapper with auth redirects)
- `frontend/src/app/providers.tsx` (React Query + Auth + Toaster)

Primary routes (App Router, `frontend/src/app/**/page.tsx`):
- `/` (CalendarDashboard, redirects unauthenticated users to `/login`)
- `/login`, `/signup`, `/bootstrap-admin`, `/unauthorized`
- `/dashboard`, `/dashboard/interventions`, `/dashboard/operational-intelligence`
- `/tasks`, `/tasks/new`, `/tasks/[id]`, `/tasks/edit/[id]`, `/tasks/[id]/completed`
- `/tasks/[id]/workflow/steps/[step]`
- `/tasks/[id]/workflow/ppf`
- `/tasks/[id]/workflow/ppf/steps/preparation`
- `/tasks/[id]/workflow/ppf/steps/inspection`
- `/tasks/[id]/workflow/ppf/steps/installation`
- `/tasks/[id]/workflow/ppf/steps/finalization`
- `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`
- `/schedule`
- `/interventions`
- `/inventory`
- `/quotes`, `/quotes/new`, `/quotes/[id]`
- `/reports`, `/analytics`
- `/admin`, `/settings`, `/configuration`
- `/users`
- `/audit`
- `/messages`

## Domain structure pattern

Each domain generally follows:
- `frontend/src/domains/<domain>/api`
- `frontend/src/domains/<domain>/ipc`
- `frontend/src/domains/<domain>/services`
- `frontend/src/domains/<domain>/hooks`
- `frontend/src/domains/<domain>/components`

## State and data fetching

- Global providers: React Query + Auth context + toaster (`frontend/src/app/providers.tsx`)
- Auth state: `frontend/src/domains/auth/api/AuthProvider.tsx`
- Local UI state: Zustand stores in `frontend/src/lib/stores/*` and `frontend/src/domains/*/stores/*`

## Validation approach

- Form/runtime schemas: `frontend/src/lib/validation/*`
- IPC request schemas: `frontend/src/lib/validation/ipc-schemas.ts`
- Backend data guards: `frontend/src/lib/validation/backend-type-guards.ts`

## How IPC is called (pattern)

1. UI/hook calls a domain IPC wrapper (example: `frontend/src/domains/tasks/ipc/task.ipc.ts`).
2. Wrapper uses `safeInvoke` (`frontend/src/lib/ipc/utils.ts`).
3. `safeInvoke` adds correlation ID, auto-injects `session_token` for protected commands, normalizes errors, and records metrics.
4. Command string constants live in `frontend/src/lib/ipc/commands.ts`.

Note: a larger typed client also exists in `frontend/src/lib/ipc/client.ts` for direct consumption.

## Common pitfalls

- **Type drift**: generated types live in `frontend/src/lib/backend.ts` and `frontend/src/types/` (auto-generated); do not edit them manually. Run `npm run types:sync` after Rust type changes.
- **IPC argument naming**: backend expects command-specific keys (`session_token`, `correlation_id`, nested `request` objects). Match existing wrapper conventions.
- **Large payloads**: avoid sending large binary blobs via IPC. Use the documents domain (`frontend/src/domains/documents/ipc/documents.ipc.ts`) for photos.
- **Auth gating**: the shell redirects when unauthenticated (`RootClientLayout.tsx` and `frontend/src/app/page.tsx`). Test flows with and without a stored session.

## UI system guardrails

- Theme/tokens: `frontend/src/app/globals.css` (HSL tokens)
- Shared primitives: `frontend/src/shared/ui/*`, `frontend/src/components/ui/*`
- Utility class merger: `frontend/src/lib/utils.ts` (`cn`)
