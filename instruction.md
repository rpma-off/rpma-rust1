﻿You are operating inside the RPMA v2 monorepo (Tauri + Rust backend + Next.js frontend).

⚠️ PATCH MODE ENABLED
You are NOT allowed to:
- Rewrite large modules unnecessarily
- Change architecture
- Introduce new patterns
- Modify database schema
- Modify IPC contracts unless strictly required
- Manually edit auto-generated types
- Silence errors with `any`, `@ts-ignore`, or unsafe casting

Your mission:
Fix ALL ESLint and TypeScript errors progressively and safely.

====================================================
STEP 1 — GLOBAL DIAGNOSTIC
====================================================

1. Run:
   npm run frontend:lint
   npm run frontend:type-check

2. Classify errors into categories:

   A) Type errors (TS2322, TS2345, etc.)
   B) Missing types / implicit any
   C) Unused variables
   D) Import errors
   E) Null/undefined safety issues
   F) React hook dependency issues
   G) ESLint stylistic errors
   H) IPC contract mismatches

Generate a categorized report BEFORE patching.

====================================================
STEP 2 — FIX STRATEGY (ORDER MATTERS)
====================================================

Fix in this order:

1️⃣ Type generation issues
   - Run npm run types:sync
   - Validate with npm run types:validate
   - Ensure NO manual edits to frontend/src/lib/backend.ts

2️⃣ IPC contract mismatches
   - Compare IPC calls with backend commands
   - Ensure session_token is passed where required
   - Ensure ApiResponse<T> handling matches contract
   - Do NOT change backend without strict necessity

3️⃣ Implicit any & unknown types
   - Replace any with real types
   - Use domain types from backend.ts
   - If missing type, create a strict interface in frontend/types/
   - Never fallback to any

4️⃣ Null / undefined safety
   - Use optional chaining safely
   - Use explicit guards
   - Avoid non-null assertions (!) unless proven safe

5️⃣ React Hook dependency issues
   - Fix missing dependencies
   - Ensure no infinite loops
   - Respect React Query patterns

6️⃣ Unused variables
   - Remove safely
   - Or prefix with `_` only if truly required

7️⃣ ESLint formatting
   - Apply auto-fixes
   - Respect existing project style

====================================================
STEP 3 — ARCHITECTURE ENFORCEMENT
====================================================

While patching, enforce:

✔ Frontend must not contain business logic (see Architecture doc)
✔ No direct DB logic in frontend
✔ IPC calls must use ipcClient
✔ Respect layered backend architecture
✔ No layer skipping
✔ No bypassing RBAC

====================================================
STEP 4 — STRICT RULES
====================================================

❌ NEVER:
- Add `any`
- Add `as any`
- Add `@ts-ignore`
- Disable ESLint rules globally
- Change tsconfig to relax strict mode
- Modify auto-generated backend.ts

✔ ALWAYS:
- Create proper type definitions
- Use discriminated unions when needed
- Use type narrowing
- Use safeInvoke wrapper
- Keep ApiResponse<T> intact

====================================================
STEP 5 — PATCHING METHOD
====================================================

Patch incrementally:

- Fix errors file-by-file
- After each batch:
    npm run frontend:type-check
    npm run frontend:lint

- Ensure error count decreases progressively
- Never introduce new errors

====================================================
STEP 6 — VALIDATION
====================================================

When done:

Run:
   npm run quality:check

Success criteria:
✔ 0 TypeScript errors
✔ 0 ESLint errors
✔ No rule disabled
✔ No architectural violations
✔ No usage of any
✔ No type drift

====================================================
OUTPUT FORMAT
====================================================

For each modified file, explain:

- What error category it belonged to
- Why it was occurring
- How it was fixed
- Why the fix respects architecture

Do NOT provide explanations longer than necessary.
Be precise and surgical.

BEGIN PATCH PROCESS.
