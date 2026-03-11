# ADR-018: Comprehensive Audit Logging and Security Monitoring

## Status
Accepted

## Context
The application must track sensitive operations and security-related events to provide a reliable audit trail for compliance and forensic analysis in a multi-user desktop environment.

## Decision

### Audit Bounded Context
- A dedicated `audit` domain (`src-tauri/src/domains/audit/`) manages the collection, storage, and retrieval of audit logs.
- The `audit_events` table is the authoritative store for all system and business events.

### Event Classification
Events are categorized via `AuditEventType`:
- **Security Events**: `AuthenticationSuccess`, `AuthenticationFailure`, `AuthorizationDenied`, `SessionExpired`, `SecurityViolation`.
- **Data Events**: `DataCreated`, `DataUpdated`, `DataDeleted`, `DataExported`.
- **Domain Events**: `TaskCompleted`, `InterventionStarted`, `ClientCreated`.

### Logging Mechanism
- **Automated Interception**: High-level security events are captured via the `AuthMiddleware` and `AuthGuard`.
- **Manual Instrumenting**: Domain-specific events are logged from **Application Services** using the `AuditFacade`.
- **Correlation**: Every audit entry includes the `correlation_id` and `session_id` to link the event to a specific user request.

### Data Retention and Integrity
- Audit logs include `previous_state` and `new_state` as JSON blobs for data-modifying actions.
- Access to audit logs via IPC is restricted to the `Admin` role.
- Logs are strictly append-only; deletion is only permitted via the `delete_before_date` cleanup utility (restricted to system maintenance).

## Consequences
- Every sensitive user action is traceable and verifiable.
- Compliance requirements for data access tracking are fulfilled.
- Security anomalies (e.g., brute force attempts or privilege escalation) can be detected through audit analysis.
