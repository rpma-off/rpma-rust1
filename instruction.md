﻿You are a senior frontend engineer and software architect working on this repo (Next.js 14 App Router + TypeScript) for a Tauri v2 offline-first desktop app.

GOAL
Refactor the FRONTEND ONLY to eliminate spaghetti code and enforce strict DDD + Clean Architecture:
- UI is presentation-only
- All business logic moved out of components
- IPC access centralized behind domain services
- Domain boundaries enforced (no cross-domain imports)
- Reduce complexity, duplication, and bundle weight
- Zero functional regression and no route breakage

CONSTRAINTS (CRITICAL)
- Output ONLY unified diff patches (git apply compatible). No explanations.
- ZERO functional regression.
- Do NOT break Next.js App Router (`frontend/src/app/**` routes must keep behavior).
- Do NOT change public IPC command names or payload contracts.
- Do NOT modify auto-generated files.
- No heavy new dependencies.
- Keep TypeScript compiling after EACH patch.
- Preserve Windows compatibility for scripts if touched.

SCOPE
- Only modify `frontend/` (and minimal root scripts if needed to support frontend checks).
- Do NOT touch `src-tauri/` except if absolutely required to keep contracts consistent (prefer not to).

TARGET FRONTEND STRUCTURE (DDD)
frontend/src/
  app/                         # Next routes: composition only (pages/layouts)
  domains/
    <domain>/
      api/                     # IPC gateway (invoker wrappers) OR client adapter per domain
      services/                # use-cases: orchestrate domain actions
      hooks/                   # React hooks calling services (UI-friendly)
      components/              # presentational components only
      state/                   # lightweight state (stores) scoped to domain
      types/                   # domain types (DTO + view models)
      validators/              # zod schemas / form validation
      index.ts                 # barrel exports
  shared/
    components/                # UI primitives composition (shadcn wrappers)
    hooks/
    lib/                       # utilities (cn, formatters, dates)
    config/
  lib/
    ipc/                       # IPC adapter interface + command registry (thin)
    logger/
    error/
    telemetry/

DDD RULES (NON-NEGOTIABLE)
1) NO direct IPC calls in React components.
   - Components must not call invoke()/safeInvoke() directly.
   - Only domain services can call IPC through a shared IPC adapter.
2) App Router files (`app/**`) are composition only:
   - fetch data via hooks/services
   - render domain components
   - no complex logic in page files
3) No cross-domain imports:
   - `domains/tasks/*` cannot import from `domains/quotes/*` etc.
   - shared reusable code must live in `shared/` or `lib/`
4) Business rules live in domain services; hooks adapt services to UI.
5) Reduce `use client`:
   - Only components needing state/effects should be client components.
   - Prefer server components for static/composition when possible (but do not break Tauri constraints; keep behavior identical).
6) No duplicate types:
   - domain DTOs and view models live in domain/types
   - shared types only if truly cross-domain
7) No god-files:
   - split any file > 500 lines
   - split huge components into presentational subcomponents + hooks

PHASE 0 — INVENTORY & GUARDRAILS (NO BEHAVIOR CHANGE)
TASKS
1) Add a lightweight architecture check script (no heavy deps) under `frontend/scripts/` or repo `scripts/`:
   - Fail if any file under `domains/**/components/**` imports invoke()/safeInvoke or `@tauri-apps/api` directly
   - Fail if any file under `app/**` imports from another domain’s internal folders (allow only `domains/<domain>/index.ts`)
   - Fail if domains import other domains (simple regex)
   - Fail if any file > 800 lines (warn at 500)
2) Wire it into a frontend gate script if present:
   - `frontend:gate` runs: lint, type-check, tests (if configured), architecture-check

PHASE 1 — CREATE IPC ADAPTER (ONE ENTRY POINT)
TASKS
1) Introduce `frontend/src/lib/ipc/adapter.ts`:
   - define an interface `IpcAdapter` with `invoke<T>(command, args, opts)`
2) Implement:
   - `tauriAdapter` that uses current invoke/safeInvoke implementation
   - `mockAdapter` for tests (only if tests exist; keep minimal)
3) Centralize command registry in `frontend/src/lib/ipc/commands.ts` (or keep existing and normalize)
4) Ensure existing behavior unchanged (just routing calls through adapter).

PHASE 2 — DOMAIN SERVICES (REMOVE SPAGHETTI FROM COMPONENTS)
For each major feature domain (auth, tasks, quotes, clients, photos/documents, calendar if present):

TASKS
1) Create `domains/<domain>/services/*` use-cases:
   - e.g. `createTask`, `listTasks`, `getTaskById`, `updateTask`, etc.
   - these call IPC adapter and map DTO -> view model
2) Create `domains/<domain>/hooks/*`:
   - e.g. `useTasksList`, `useTaskDetails`, `useTaskMutations`
   - hooks manage loading/error state, call services
3) Refactor pages/components:
   - Components only render props + callbacks
   - Move data fetching/mutations into hooks
4) Remove duplicated fetching logic across pages.

PHASE 3 — SPLIT FAT COMPONENTS + STANDARDIZE UI PATTERNS
TASKS
1) Identify huge components and split:
   - Container (client): uses hooks, passes props to presentational components
   - Presentational: no data fetching, no IPC, no side effects (except local UI state)
2) Standardize loading/error/empty states:
   - Create shared components in `shared/components/` (e.g., `PageState`, `InlineError`, `SkeletonBlock`)
3) Standardize forms:
   - Zod schemas in `domains/<domain>/validators/`
   - Form components in `domains/<domain>/components/forms/`
   - Keep the same UX, just reorganize.

PHASE 4 — TYPES, DTOs, AND VALIDATION CLEANUP
TASKS
1) Move all domain-specific types into `domains/<domain>/types/`.
2) Remove global type dumping grounds; keep shared only if used by 2+ domains.
3) Ensure request/response DTOs match backend contracts exactly.
4) Centralize error codes and mapping into `lib/error/`:
   - map ApiResponse errors to UI messages consistently
   - keep correlation_id available for debug UI (if exists).

PHASE 5 — PERFORMANCE & BUNDLE WEIGHT (OFFLINE-FIRST)
TASKS
1) Reduce unnecessary `use client`:
   - Convert pure layout/composition components to server components where safe
   - Keep client components only where needed (state/effects)
2) Remove unused imports and dead code.
3) Remove duplicated utility functions (date/formatting) → `shared/lib/`
4) Avoid heavy re-renders:
   - memoize expensive presentational components
   - move derived computations into `useMemo`
   - avoid prop drilling by using domain hooks where appropriate
5) Ensure no new heavy dependencies; prefer existing utilities.

PHASE 6 — TESTABILITY (OPTIONAL IF TESTS EXIST)
TASKS
1) Add a test IPC mock via adapter to run UI tests without Tauri backend.
2) Add 3-5 golden-flow tests:
   - auth login (success + error)
   - list tasks + open task detail
   - create quote validation error path
Keep tests deterministic.

PHASE 7 — CLEANUP & FINAL POLISH
TASKS
1) Delete unused components/files (prove unused via imports/refs).
2) Replace magic strings with constants:
   - routes, command names (use registry), statuses, roles
3) Ensure lint/type-check pass.
4) Ensure architecture check passes.

DELIVERABLES
- Refactor incrementally in small safe patches.
- After each patch: `frontend` builds and type-check passes.
- Do NOT break Next.js routes or IPC contracts.

OUTPUT FORMAT
Unified diff patches only. No prose. No markdown explanations.