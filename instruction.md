﻿You are working inside the **RPMA v2** repository.

Goal: **silently refresh** the existing 10 Markdown onboarding files under `docs/agent-pack` so they accurately match the current codebase and existing docs.

⚠️ CRITICAL MODE: SILENT UPDATE (NO TRACE / NO NOISE)
You MUST:
- Update ONLY the 10 files listed below (no other files touched).
- NOT create new files outside `docs/agent-pack/`.
- NOT rename, move, or delete any files.
- NOT modify formatting/styles across the repo (only within these 10 files).
- NOT output diffs, change summaries, “updated” notes, or any commentary.
- NOT mention that changes were made (no “I updated…”, no “here are changes”, no “commit…”).
- NOT add changelogs, timestamps, “last updated”, or revision history inside the docs.
- NOT add TODOs unless the repo genuinely doesn’t contain the info; then use: **TODO (verify in code)**.
- Preserve existing structure when possible; improve only where it increases accuracy and navigation.

Your output must contain ONLY the final full contents of each of the 10 files, labeled by their exact paths.

---

## Scope (ONLY these 10 files)

1) docs/agent-pack/00_PROJECT_OVERVIEW.md
2) docs/agent-pack/01_DOMAIN_MODEL.md
3) docs/agent-pack/02_ARCHITECTURE_AND_DATAFLOWS.md
4) docs/agent-pack/03_FRONTEND_GUIDE.md
5) docs/agent-pack/04_BACKEND_GUIDE.md
6) docs/agent-pack/05_IPC_API_AND_CONTRACTS.md
7) docs/agent-pack/06_SECURITY_AND_RBAC.md
8) docs/agent-pack/07_DATABASE_AND_MIGRATIONS.md
9) docs/agent-pack/08_DEV_WORKFLOWS_AND_TOOLING.md
10) docs/agent-pack/09_USER_FLOWS_AND_UX.md

---

## Step 0 — Silent verification scan (mandatory, internal only)

Without reporting anything, inspect:
- `frontend/`, `src-tauri/`, `scripts/`, `docs/`
- Frontend entrypoints (root layout/app entry, routes, key providers)
- IPC client code (frontend callers) + Rust command registration/handlers
- Services/repos/models structure in Rust
- DB init + migrations mechanism
- Offline-first/sync queue/event bus (if present)
- Auth + RBAC enforcement points
- Type sync approach (Rust → TS types generation) and scripts

Do not describe this scan. Use it only to update the docs.

---

## Update rules

### Grounding
- Every claim must be grounded in repo code or existing docs.
- If uncertain or not found, write: **TODO (verify in code)** and point to the most likely path(s).

### Paths & entrypoints
- Add/refresh direct pointers to:
  - command handlers (Rust file paths)
  - frontend consumers (TS/React file paths)
  - DB schema/migrations paths
  - scripts (exact filenames)

### Acceptance
A new agent must be able to answer quickly:
- “Where do I add a new feature end-to-end?”
- “Which IPC command handles X and where is it called?”
- “What tables store Y and how do migrations work?”
- “What RBAC roles exist and where are they enforced?”

### Consistency & mismatch handling
- Ensure naming consistency (entities, statuses, roles, command names).
- If docs contradict code, include a short callout:
  **DOC vs CODE mismatch** + suggested resolution (without adding a changelog).

### Brevity
- Prefer bullets, tables, and short diagrams.
- Remove fluff and outdated info.

---

## File-specific requirements (refresh as needed)

### 00_PROJECT_OVERVIEW.md
- What RPMA v2 is, who uses it, offline-first goals, boundaries of source of truth
- Tech stack summary (Tauri, Rust, SQLite WAL, Next.js/React, state mgmt if present)
- Top-level modules
- “Golden paths” + internal links to other 9 files

### 01_DOMAIN_MODEL.md
- Core entities, relationships, statuses, key rules
- Map to storage (tables or locations to find them)
- Domain invariants

### 02_ARCHITECTURE_AND_DATAFLOWS.md
- Layered architecture (Frontend → IPC → Rust → SQLite)
- Dataflow diagrams for:
  - task creation
  - intervention workflow step advance/complete
  - calendar updates
- Offline-first/sync queue/event bus pointers

### 03_FRONTEND_GUIDE.md
- Routes/pages structure
- UI component patterns
- State mgmt and validation approach
- How IPC is called (where, patterns)
- Pitfalls (types drift, IPC naming, payload size)

### 04_BACKEND_GUIDE.md
- Backend module structure (commands/services/repos/models/db/sync)
- How to implement a command end-to-end (with exact paths/examples)
- Error model and logging

### 05_IPC_API_AND_CONTRACTS.md
- IPC contract rules (auth, envelopes, correlation_id, etc.)
- “Top 30 important commands” table:
  - name, purpose, params, permissions, Rust impl path, frontend consumer path
- Type sync mechanism + where generated + how to run

### 06_SECURITY_AND_RBAC.md
- Auth flow (login/refresh/2FA if present)
- RBAC matrix and enforcement points in code
- Local DB protection, secrets/env vars

### 07_DATABASE_AND_MIGRATIONS.md
- SQLite setup + WAL + path configuration
- Migration discovery/apply mechanism
- How to add a migration safely + test approach
- Troubleshooting

### 08_DEV_WORKFLOWS_AND_TOOLING.md
- Run dev/build/test/CI/release basics
- Scripts: type sync, drift checks, db checks, security audit (exact commands if present)
- “If you change X, run Y” checklist

### 09_USER_FLOWS_AND_UX.md
- Main user flows (tasks, execution, workflow, calendar, clients, auth, admin, reporting)
- For each flow:
  - entry routes
  - key UI states
  - backend commands involved
  - validations/errors
- Design system guardrails (Tailwind/shadcn tokens/patterns)

---

## FINAL OUTPUT RULE (MANDATORY)

Output ONLY the complete final contents of the 10 files, each preceded by its exact path on a single line, like:

docs/agent-pack/00_PROJECT_OVERVIEW.md
<full markdown content>

No other text. No explanations. No “done”. No notes.
