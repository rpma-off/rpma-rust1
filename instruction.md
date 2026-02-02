﻿ RPMA Frontend Architecture Audit

**Role:** You are a Senior Frontend Architect and Security Auditor specializing in Next.js, React, Tauri, and TypeScript.

**Context:** You are auditing the **RPMA PPF Intervention v2** application. This is an offline-first desktop application using a Tauri (Rust) backend and a Next.js 14 frontend.

**Objective:** Perform a comprehensive audit of the `frontend/` directory. You must verify that the implementation aligns with the provided documentation (`API.md`, `ARCHITECTURE.md`, `DESIGN.md`, `REQUIREMENTS.md`, etc.) and identify code quality, security, and architectural issues.

**Provided Documentation for Reference:**
1.  `ARCHITECTURE.md` (4-Tier Architecture, Module Structure)
2.  `API.md` (Tauri IPC Endpoints & Data Models)
3.  `DESIGN.md` (Design System, Component Library, Theming)
4.  `DATABASE.md` & `REQUIREMENTS.md` (Data Models & Business Logic)
5.  `USER-FLOWS.md` (Expected User Journeys)
6.  `SCRIPTS_DOCUMENTATION.md` (Type Sync & Validation Scripts)

---

## 🕵️‍♂️ Audit Instructions

Please analyze the `frontend/` source code and execute the following audit phases.

### Phase 1: Architecture & Structure Consistency
**Goal:** Verify the code structure matches the documented 4-tier architecture and Next.js App Router conventions.

1.  **Directory Structure:** Check if `frontend/src/` is organized correctly into `app`, `components`, `hooks`, `lib`, `store`, and `types`.
2.  **Routing Strategy:** Verify that routes in `app/` (e.g., `/tasks/[id]`, `/interventions/[id]`) align with the flows defined in `USER-FLOWS.md`.
3.  **Component Separation:** Are domain components (Task, Intervention, Client) clearly separated from reusable UI primitives (`components/ui`)?
4.  **API Integration:** How are Tauri commands invoked? Check if `lib/api/` or `hooks` properly use `invoke()` from `@tauri-apps/api/core`.

### Phase 2: Type Safety & API Drift Detection
**Goal:** Ensure the frontend types match the Rust backend models.

1.  **Type Generation:** Check the contents of `frontend/src/lib/backend.ts`. Does it contain all interfaces defined in `API.md` (e.g., `User`, `Task`, `Intervention`, `Material`)?
2.  **Drift Analysis:** Compare the types used in `frontend/src/types/` or `hooks/` with the generated `backend.ts`.
    *   Are developers manually defining types that should be imported from `backend.ts`?
    *   Are there obvious type mismatches (e.g., String vs Number for IDs)?
3.  **Zod Schemas:** Check if forms (`components/forms/` or specific pages) use Zod schemas that align with the API Request/Response structures defined in `API.md`.

### Phase 3: UI/UX & Design System Compliance
**Goal:** Verify adherence to the design system defined in `DESIGN.md`.

1.  **Tailwind Usage:** Are utility classes being used consistently, or are there arbitrary pixel values?
2.  **Component Library:** Are components imported from `@/components/ui` (shadcn/ui) instead of native HTML elements where applicable?
3.  **Theming:** Check implementation of `next-themes`. Is the dark mode toggle functioning correctly? Do all components respect CSS variables (`--background`, `--foreground`)?
4.  **Responsive Design:** Are layouts responsive? Check for `md:`, `lg:` classes in page layouts.
5.  **Accessibility (WCAG):**
    *   Are interactive elements accessible via keyboard?
    *   Do forms have associated `<Label>` components?
    *   Are ARIA labels used for icon-only buttons?

### Phase 4: State Management & Data Fetching
**Goal:** Ensure efficient data handling.

1.  **TanStack Query:** Is it used for server state? Check for proper usage of `useQuery` and `useMutation`.
    *   Are cache keys consistent?
    *   Is invalidation handled correctly after mutations?
2.  **Zustand (Client State):** Is it used sparingly and only for UI-specific state (e.g., Sidebar open/close) or complex client-side logic?
3.  **Prop Drilling:** Identify any deep prop drilling that could be replaced by Context or Zustand.

### Phase 5: Security & Offline-First Resilience
**Goal:** Identify security risks and offline handling gaps.

1.  **Environment Variables:** Check for hardcoded secrets in `frontend/`. Ensure sensitive values (JWT_SECRET) are NOT stored here.
2.  **IPC Safety:** Review how `invoke()` is called. Is user input validated before sending to Rust? Are there any commands exposed that shouldn't be?
3.  **Offline Handling:** Does the UI handle connection loss gracefully? Is there an "Offline Mode" indicator as mentioned in `REQUIREMENTS.md`?
4.  **Authentication:**
    *   Check `hooks/useAuth.ts` (or equivalent).
    *   Is the token stored securely (e.g., secure local storage)?
    *   Is the user redirected correctly on 401/403 errors?

### Phase 6: User Flow Validation
**Goal:** Trace critical user journeys.

1.  **Authentication:** Trace the flow from `/login` → `/dashboard`. Does it handle 2FA if enabled? (Refer to `USER-FLOWS.md`).
2.  **Task Creation:** Trace `/tasks/new`. Does the `TaskForm` validate against Zod schemas? Does it handle file uploads or photos correctly?
3.  **Intervention Wizard:** Trace `/interventions/[id]`. Does the multi-step wizard (Inspection → Preparation → Installation → Finalization) match the logic in `API.md` (`intervention_advance_step`)?

### Phase 7: Code Quality & Performance
**Goal:** Identify technical debt.

1.  **Performance:** Look for `useEffect` dependencies that could cause infinite loops. Check for unnecessary re-renders (missing `useMemo`/`useCallback`).
2.  **Error Handling:** Are Error Boundaries implemented? Is the `error.tsx` page customized?
3.  **TODOs & FIXMEs:** List any `TODO` or `FIXME` comments found in the frontend code.

---

## 📋 Expected Output Format

Please generate a structured report in Markdown format with the following sections:

### 1. Executive Summary
*   Overall health score (1-10).
*   Critical blocking issues (if any).

### 2. Critical Findings
*   Security vulnerabilities.
*   Breaking type mismatches between Frontend and Backend.
*   Major architectural violations.

### 3. Architecture & Design System
*   Compliance with `DESIGN.md` (Colors, Typography, Components).
*   Inconsistencies in UI patterns.

### 4. Type Safety & API Integration
*   Status of `backend.ts` generation.
*   List of mismatches between `API.md` definitions and actual implementation.

### 5. Code Quality & Best Practices
*   React patterns (Hooks, Performance).
*   State management issues.
*   Accessibility gaps.

### 6. User Flow Verification
*   Status of key flows (Login, Task Create, Intervention).
*   Any missing steps compared to `USER-FLOWS.md`.

### 7. Recommendations
*   Prioritized list of actions to take (e.g., "Refactor Auth Hook", "Update Type Generation", "Fix CSS Variable").

---

**Begin Audit.**