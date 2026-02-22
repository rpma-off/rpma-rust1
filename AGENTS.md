# AGENTS.md

## RPMA v2 Working Agreements (Patch Mode)

1. **Respect bounded contexts**
   - Keep code inside its domain (`users`, `tasks`, `inventory`, `quotes`, `documents`, `interventions`).
   - No cross-domain imports/calls except through explicit contracts (public API surface) or the event bus.

2. **Keep architecture boundaries intact**
   - Do not move business logic into IPC handlers.
   - Do not write SQL outside repository/infrastructure layers.

3. **Do not rename IPC commands**
   - Existing IPC command names are compatibility contracts for frontend/backend integration.

4. **Offline-first product rules**
   - Changes must preserve offline-first behavior.
   - Do not add online payment flows/integrations.

5. **Logging and error contracts**
   - Log operational context without secrets/PII.
   - Return structured, stable error contracts; avoid ad-hoc error shapes and silent failures.

6. **Required verification before finishing**
   - Run: `npm run quality:check`
   - Run: `cargo test`
