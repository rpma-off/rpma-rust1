﻿You are working inside the **RPMA v2** repository (Tauri + Rust backend + Next.js frontend).  
Goal: create **10 high-signal Markdown files** that let an AI agent understand the project **fast** and **accurately**, by consolidating what already exists in the project docs: Architecture :contentReference[oaicite:0]{index=0}, API :contentReference[oaicite:1]{index=1}, Requirements , User Flows :contentReference[oaicite:3]{index=3}, Design System :contentReference[oaicite:4]{index=4}, Deployment :contentReference[oaicite:5]{index=5}, Scripts :contentReference[oaicite:6]{index=6}, Migration System :contentReference[oaicite:7]{index=7}.

## Hard constraints
- Output exactly **10 files** under: `docs/agent-pack/`
- Each file is Markdown, concise but complete, with headings, bullets, and diagrams when useful.
- Write facts grounded in the repo: inspect code + existing docs. If something is unknown, mark it as **TODO (verify in code)**.
- Include **paths** and **entrypoints** to help an AI agent jump to the right code quickly.
- Avoid fluff. Optimize for “agent onboarding”.

## Step 0 — Repo scan (do this before writing)
1. Inspect folder structure (`frontend/`, `src-tauri/`, `scripts/`, `docs/`).
2. Identify:
   - Main entrypoints (frontend root layout, IPC client, Rust main.rs, command registration, DB init/migrations).
   - Core domains (tasks, clients, interventions/workflow, inventory, reports, auth, admin/system).
   - IPC command surfaces (Rust `commands/` and frontend `lib/ipc/`).
3. Cross-check with existing documentation and ensure consistency:
   - Architecture patterns & directories :contentReference[oaicite:8]{index=8}
   - IPC / auth / RBAC / error model :contentReference[oaicite:9]{index=9}
   - Functional scope + requirements 
   - User flows :contentReference[oaicite:11]{index=11}
   - Design system (Tailwind + shadcn/ui) :contentReference[oaicite:12]{index=12}
   - Deployment + CI/CD :contentReference[oaicite:13]{index=13}
   - Scripts + migrations 

---

# Output files (create all 10)

## 1) docs/agent-pack/00_PROJECT_OVERVIEW.md
Must include:
- What RPMA v2 is, who uses it, offline-first goals, and “source of truth” boundaries.
- Tech stack summary (Tauri, Rust, SQLite WAL, Next.js/React, Zustand/React Query if present).
- Top-level modules (Tasks, Clients, Interventions/Workflow, Calendar, Inventory, Reports, Admin/System, Auth).
- “Golden paths” to read first (links to the other 9 files).

## 2) docs/agent-pack/01_DOMAIN_MODEL.md
Must include:
- Core entities and relationships (Task, Client, Intervention, InterventionStep, Photo, User, Inventory/Material…).
- For each entity: purpose, key fields, lifecycle/status enums, and relations.
- Map to storage: table names (or where to find them), soft delete, audit/logging if present.
- Highlight any domain rules from requirements .

## 3) docs/agent-pack/02_ARCHITECTURE_AND_DATAFLOWS.md
Must include:
- Layered architecture (Frontend → IPC → Rust services/repos → SQLite) :contentReference[oaicite:16]{index=16}.
- Data flow diagrams for:
  - Task creation
  - Start/advance/complete intervention workflow
  - Calendar scheduling updates
- Offline-first + sync queue + event bus notes if implemented (point to code paths).

## 4) docs/agent-pack/03_FRONTEND_GUIDE.md
Must include:
- Frontend structure: routes/pages, key components, state management, form validation.
- How frontend calls backend (IPC client location + patterns) :contentReference[oaicite:17]{index=17}.
- Where to add new UI features safely (component conventions, hooks, zod schemas if present).
- Common pitfalls (types drift, IPC naming, large payload handling).

## 5) docs/agent-pack/04_BACKEND_GUIDE.md
Must include:
- Backend structure: commands/, services/, repositories/, models/, db/, sync/ :contentReference[oaicite:18]{index=18}.
- How to implement a new command end-to-end:
  - Command handler → service → repo → DB + validation + authorization.
- Error model (AppError), validation patterns, logging/tracing practices :contentReference[oaicite:19]{index=19}.

## 6) docs/agent-pack/05_IPC_API_AND_CONTRACTS.md
Must include:
- IPC contract rules (auth token usage, correlation_id, response envelopes, compression/streaming if present) :contentReference[oaicite:20]{index=20}.
- List the “top 30 most important commands” with:
  - command name
  - purpose
  - parameters
  - permissions
  - where implemented (Rust file path)
  - where consumed (frontend path)
- Type sync approach (Rust → TS types generation) + where it is generated .

## 7) docs/agent-pack/06_SECURITY_AND_RBAC.md
Must include:
- Auth flow (login/refresh/2FA if present) :contentReference[oaicite:22]{index=22}.
- RBAC matrix (Admin/Supervisor/Technician/Viewer) and how enforced in code.
- Data protection notes (local DB, secrets/env vars, IPC authorization audit script references) .

## 8) docs/agent-pack/07_DATABASE_AND_MIGRATIONS.md
Must include:
- SQLite setup (WAL mode, pooling), where DB path is configured.
- Migration mechanism: how migrations are discovered/applied, schema_version table, constraints :contentReference[oaicite:24]{index=24}.
- How to add a migration safely + testing approach (existing scripts) .
- Troubleshooting: common migration failure modes and fixes.

## 9) docs/agent-pack/08_DEV_WORKFLOWS_AND_TOOLING.md
Must include:
- How to run dev, build, test, CI, release basics :contentReference[oaicite:26]{index=26}.
- Scripts: type sync, drift checks, db checks/cleanup, security audit :contentReference[oaicite:27]{index=27}.
- “If you change X, you must run Y” checklist (e.g., Rust models → types:sync).

## 10) docs/agent-pack/09_USER_FLOWS_AND_UX.md
Must include:
- Summarize the main user flows (tasks, execution, workflow, calendar, clients, auth, admin, reporting) :contentReference[oaicite:28]{index=28}.
- For each flow:
  - entry route(s)
  - key UI states
  - backend commands touched
  - main validations/errors
- Design system guardrails (Tailwind/shadcn tokens, component patterns) :contentReference[oaicite:29]{index=29}.

---

# Quality bar / Acceptance criteria
- ✅ A new agent can answer: “Where do I add a new feature?”, “Which command handles X?”, “What tables store Y?”, “What are the business rules?”.
- ✅ Every file includes direct pointers to repo paths and “next places to look”.
- ✅ Consistent naming (Task/Intervention/Step status enums, roles, command naming).
- ✅ No contradictions with existing docs; contradictions must be called out with: **DOC vs CODE mismatch** + a suggested resolution.

# Deliverable
Commit the 10 files into `docs/agent-pack/` with clear headings and internal links.
