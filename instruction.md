﻿You are working inside the RPMA v2 repository (Tauri + Rust backend + Next.js frontend).

Goal:
Fix the sidebar "Employee" placeholder:
1) Display the currently authenticated user's name (first_name + last_name, fallback to email).
2) On click, open a dropdown menu with a "Logout" action.
3) Logout must fully work: backend session invalidation + frontend token clearing + redirect to /login + cache reset.

Hard constraints:
- Follow the existing auth/session patterns described in docs, especially:
  - frontend hooks: useAuth/useSession
  - backend logout flow (validate session -> delete session from DB)
- Do NOT invent new auth architecture.
- Keep UI consistent with existing design system (shadcn/ui + Tailwind).
- No breaking changes to existing routes/pages.

Steps:
A) Frontend:
- Locate the sidebar user section currently showing "Employee".
- Replace it with an Avatar + user display name (fallbacks).
- Use shadcn/ui DropdownMenu (or equivalent already in the codebase).
- Implement handleLogout():
  - call IPC logout(sessionToken)
  - clear session token from storage
  - reset React Query cache + any zustand auth stores
  - navigate to /login
  - show toast success/error

B) Backend:
- Verify there is a Tauri command `logout`.
- Ensure it validates the session token and deletes/invalidates the session in `user_sessions`.
- Ensure DB deletion matches the actual schema/fields used for sessions.
- Return ApiResponse success.

C) Tests / sanity:
- Add a minimal frontend test or e2e test for logout if tests exist.
- Verify: after logout, protected pages redirect to /login and sidebar no longer shows old user.

Deliverables:
- PR-ready changes with clear commit messages.
- Short notes on the files changed and why.
