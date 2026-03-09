﻿You are working on **RPMA v2**, an offline-first Tauri desktop app (Next.js 14 App Router frontend + Rust/SQLite backend).
E2E tests run via Playwright (Chromium) against the frontend only — the Tauri IPC layer must be **mocked** because `window.__TAURI__` is not injected in the Playwright browser context.

---

### Failing tests to fix

1. `tests/e2e/inventory-smoke.spec.ts:9`   – loads inventory dashboard and default tabs
2. `tests/e2e/inventory-smoke.spec.ts:18`  – switches to suppliers tab
3. `tests/e2e/inventory-smoke.spec.ts:26`  – creates a material and shows it in the list
4. `tests/e2e/ppf-workflow-smoke.spec.ts:13` – draft + validate unlocks next step
5. `tests/e2e/tasks-creation.spec.ts:18`   – opens task creation flow and enables next after vehicle inputs
6. `tests/e2e/tasks-creation.spec.ts:23`   – keeps next disabled until required vehicle fields are completed
7. `tests/e2e/user-authentication.spec.ts:14` – shows error for invalid credentials

---

### What to do

**Step 1 — Read all 4 spec files** (full content), plus:
- `playwright.config.ts` (baseURL, global setup, any mock setup)
- `frontend/src/app/inventory/page.tsx`
- `frontend/src/app/tasks/page.tsx` and the task-creation flow component
- `frontend/src/app/login/page.tsx`
- `frontend/src/domains/inventory/` (api hooks, ipc, store)
- `frontend/src/domains/tasks/` (api hooks, ipc, store)
- `frontend/src/domains/auth/` (store, ipc)
- `frontend/src/lib/ipc/utils.ts` (`safeInvoke`) and any existing IPC mock setup in tests

**Step 2 — Diagnose each failure category:**

- **IPC / Tauri mock missing or broken**: `safeInvoke` calls will throw if `window.__TAURI__` is absent. Verify a global Playwright mock intercepts all `invoke` calls and returns well-formed `ApiResponse<T>` envelopes. Commands likely needed:
  - `inventory_crud` (list materials, list suppliers)
  - `material_create`
  - `task_crud` (create, list)
  - `auth_login` (success + invalid-credentials error path)
  - PPF workflow step commands (`intervention_advance_step`, etc.)

- **Selector drift**: Check that selectors in the spec (roles, `data-testid`, text, tab labels) still match the current UI components in shadcn/ui (Button, Tabs, Input, Dialog).

- **Auth gate**: Pages under `/inventory` and `/tasks` redirect unauthenticated users (see `RootClientLayout.tsx`). Tests must either seed an auth session in `localStorage`/Zustand store **before** navigation, or mock the auth check.

- **Task vehicle required fields**: The "Next" button in task creation is disabled until `vehiclePlate`, `vehicleModel`, `vehicleYear`, `vehicleMake` are filled (see domain model). Confirm the test fills exactly the required fields and that the enable/disable logic in the component matches.

- **PPF workflow draft→validate**: The step unlock depends on an `InterventionStatus` transition. Confirm the mock returns a response that triggers the correct UI state change (e.g. `status: "InProgress"` after validation).

**Step 3 — Fix strategy (prefer fixing tests over fixing source, unless the bug is clearly in the app):**

1. Add / repair a centralized Playwright IPC mock (e.g. `tests/e2e/mocks/tauri.ts`) that stubs `window.__TAURI__.tauri.invoke` and returns typed fixtures.
2. Inject auth state before navigating to protected routes using `page.evaluate(() => localStorage.setItem(...))` or a Playwright `storageState`.
3. Update broken selectors to match current component markup — use `data-testid` attributes; if missing, add them to the components.
4. Ensure error path for invalid credentials returns `{ success: false, error: { code: "INVALID_CREDENTIALS", message: "..." } }` from the IPC mock so the login page renders the error message the test asserts.

---

### Constraints

- Do **not** use raw `invoke`; all IPC goes through `safeInvoke` from `frontend/src/lib/ipc/utils.ts`.
- Keep tests isolated — no shared mutable state between tests.
- Mock responses must match the `ApiResponse<T>` envelope (`{ success: true, data: T }` or `{ success: false, error: AppError }`).
- Follow the existing Playwright conventions already present in the 4 passing tests for patterns to reuse.
- After fixing, all 11 tests (7 fixed + 4 already passing) must be green.
