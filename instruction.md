﻿You are working in the RPMA v2 repo (Tauri + Rust + Next.js). Your task is to eliminate unsafe TypeScript types (`any` and unsafe `unknown`) found in:
- frontend/src/lib/backend.ts (generated types from Rust via ts-rs)
and any related type helpers that cause these `any/unknown` leaks.

CRITICAL CONTEXT
- backend.ts is GENERATED from Rust models using ts-rs. We must NOT “hand-edit” generated types in a way that will be overwritten.
- Prefer fixing the SOURCE OF TRUTH in Rust (models / DTOs) so the next `npm run types:sync` produces correct types.
- Use the existing type-sync workflow:
  - npm run types:sync
  - npm run types:validate
  - npm run types:drift-check
  (see project docs)
- If some fields are inherently dynamic (e.g. JSON blobs), replace `any` with safer patterns (JsonValue, Record<string, JsonValue>, etc.) and constrain them as narrowly as possible.

GOAL
Replace, step by step, all `any` and unsafe `unknown` so that:
1) Types are accurate and stable across regeneration.
2) Frontend compile errors are avoided by introducing proper typed aliases.
3) The changes are validated via type-checking scripts.

WORK PLAN (MUST FOLLOW IN ORDER)
1) Inventory:
   - Search for occurrences of `: any`, `<any>`, `as any`, `unknown`, `details?: any`, `serde_json::Value` mappings, etc.
   - Produce a list grouped by:
     A) Generated types in backend.ts
     B) Custom frontend types / IPC client wrappers
     C) Error envelope / `details` fields
   - For each occurrence, identify usage sites (where it’s consumed).

2) Decide “best fix path” for each occurrence:
   - If the TS any/unknown originates from a Rust type that ts-rs can export better: fix in Rust model/DTO.
   - If it originates from `serde_json::Value` / arbitrary JSON: introduce a safe JsonValue type in TS and map to it consistently.
   - If it’s an error-details blob: define a typed `ErrorDetails` union or `Record<string, JsonValue>` depending on real structure.

3) Implement safe shared JSON types (frontend, NOT generated):
   - Create a file: frontend/src/types/json.ts
     export type JsonPrimitive = string | number | boolean | null;
     export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
     export type JsonObject = { [k: string]: JsonValue };
   - Use these instead of `any` for dynamic JSON shapes.

4) Fix Rust sources (preferred):
   - Locate the Rust structs/enums that generate the problematic TS types (likely in src-tauri/src/models/).
   - Replace dynamic fields:
     - If they are JSON stored as TEXT: prefer `Option<String>` + typed schema, OR `serde_json::Value` only if necessary.
     - If they must remain JSON: consider a dedicated struct/enum for known shapes.
   - Ensure all Rust types remain `#[derive(TS)]` exportable.
   - Re-run `npm run types:sync` to regenerate backend.ts.

5) Fix frontend wrappers if needed:
   - In IPC wrappers / client, ensure invoke generics are typed (`invoke<T>()`) and payloads are typed (avoid `payload: any` where possible).
   - For the IPC response envelope error.details (commonly `any`), replace with `JsonValue | JsonObject` or a specific union.

6) Eliminate remaining `as any` and unsafe `unknown`:
   - Replace `as any` with:
     - proper type guards
     - zod parsing (if the file already uses it in the project)
     - discriminated unions
   - Replace `unknown` with a safe boundary:
     - keep unknown only at the outer boundary (e.g., `catch (e: unknown)`)
     - then narrow with guards before use.

7) Verification gates (must run and report results):
   - npm run types:sync
   - npm run types:validate
   - npm run types:drift-check
   - npm run frontend:type-check (or equivalent)
   - If any step fails, fix and re-run until green.

OUTPUT FORMAT
- Provide a concise summary of what was changed, grouped by:
  - Rust model changes (source of truth)
  - New TS helper types (json.ts)
  - Frontend IPC / error typing changes
- Provide the final diff (or file-by-file patches).
- Confirm that `backend.ts` no longer contains `any` (or explain any justified exception with rationale).

DO NOT
- Do not hand-edit generated backend.ts unless you also change the generator/source so it won’t regress.
- Do not replace `any` with `unknown` blindly; always narrow or define the actual type.
- Do not introduce broad `Record<string, any>` — use JsonValue/JsonObject or specific types.

START NOW:
- Begin with step 1 inventory and show the first list of offenders with file+line references.
