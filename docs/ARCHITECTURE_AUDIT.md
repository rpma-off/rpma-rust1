# Architecture Audit - RPMA v2

Date: 2026-02-11  
Scope: Event-driven design, IPC boundary clarity, offline-first guarantees, scalability limits, security boundaries.

## Sources Reviewed
- `docs/ARCHITECTURE.md`
- `docs/Doc-AI-AGENT/02_ARCHITECTURE_AND_DATAFLOWS.md`
- `docs/Doc-AI-AGENT/05_IPC_API_AND_CONTRACTS.md`
- `docs/Doc-AI-AGENT/06_SECURITY_AND_RBAC.md`
- `frontend/src/lib/ipc/README.md`

## Architecture Strengths

### Event-Driven Design
- Services publish typed domain events (`TaskCreatedEvent`, etc.) through a dedicated event bus interface.
- Event flow is explicitly modeled in documentation, making side effects (UI refresh, sync queue updates, audit logging) predictable.

### IPC Boundary Clarity
- Tauri IPC commands follow a consistent authentication pattern with `session_token` and response envelopes.
- Correlation IDs and shared Rust→TypeScript types improve traceability and contract integrity across the boundary.

### Offline-First Guarantees
- Local SQLite is the source of truth, with WAL pragmas and connection pooling for low-latency writes.
- Sync queue design supports optimistic local execution, retries, and conflict resolution strategies.

### Scalability & Performance
- IPC compression for larger payloads and explicit database tuning show awareness of performance hotspots.
- Clear layering (commands → services → repositories) supports future horizontal modularization.

### Security Boundaries
- RBAC is enforced in query construction, backed by Argon2 password hashing and 2FA flows.
- Database encryption at rest and parameterized queries reduce exposure to local compromise and injection.

## Architecture Risks

### Event-Driven Design
- The current event bus is in-memory; without durable persistence, events can be lost on crash or abrupt shutdown.
- Event delivery is decoupled from transactional writes, which can lead to missing side effects if publish fails.

### IPC Boundary Clarity
- The IPC surface area is large; any command missing authentication or envelope validation can bypass security assumptions.
- Contract drift is possible if Rust↔TypeScript type generation fails or falls out of sync.

### Offline-First Guarantees
- Conflict resolution policies are documented but rely on consistent client behavior and clear user workflows.
- Large binary payloads (photos, reports) can stress local storage and sync retry logic if not chunked.

### Scalability Limits
- SQLite remains single-writer; intensive parallel writes or large sync bursts can cause contention.
- In-memory event handlers and sync queues can become bottlenecks as task volume grows.

### Security Boundaries
- Session tokens live on the client; if not stored in OS-backed secure storage, local compromise remains a risk.
- Audit logging is event-driven; without tamper-evident persistence, forensic integrity is limited.

## 6–12 Month Evolution Recommendations

1. **Persist critical events (Outbox pattern)**  
   Store event records in SQLite within the same transaction as domain writes, then dispatch asynchronously.

2. **Formalize IPC contract validation**  
   Expand contract tests and add build-time checks that fail when generated types drift.

3. **Harden offline sync UX**  
   Add explicit sync state dashboards, conflict resolution screens, and queue retry visibility for operators.

4. **Scale large payload handling**  
   Introduce chunked uploads and background file processing to reduce IPC payload size and retry cost.

5. **Strengthen security boundaries**  
   Centralize auth middleware for all commands, require RBAC checks in services, and store tokens in OS keychain.

6. **Operational observability**  
   Expand event/IPC tracing with correlation IDs into a structured audit log table and surface metrics in UI.
