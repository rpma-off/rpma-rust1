# Security & RBAC

RPMA v2 handles sensitive client data and crucial business operations. Security is paramount.

## Authentication Flow
1. **Login**: User submits credentials via the frontend (`/login` route).
2. **Validation**: Rust backend compares Argon2 hashes.
3. **Session Token**: On success, a cryptographically secure `session_token` string is generated, stored in SQLite (`user_sessions` or similar), and returned to the UI.
4. **Transport**: The frontend stores the token in memory/Zustand (or secure local storage) and attaches it to subsequent IPC calls.
5. **2FA**: (TODO: check `domains/auth/` for exact multi-factor implementations if active).

## Role-Based Access Control (RBAC)
Authorizations are enforced inside the **Application Service** layer in Rust, NEVER blindly in IPC endpoints.

Typical Roles:
- **Admin**: Full system configuration, user management.
- **Supervisor**: Can create tasks, assign work, manage quotes and inventory.
- **Technician**: Can view assigned tasks, start/stop interventions, upload photos, consume inventory.
- **Viewer/Client**: Read-only summaries (if exposed).

### Enforcement in Code
```rust
// In domains/tasks/application/service.rs
pub fn complete_task(&self, token: &str, task_id: Uuid) -> Result<(), AppError> {
    let user = self.auth_service.validate_token_and_get_user(token)?;
    if !user.has_permission(Permission::CompleteTasks) {
        return Err(AppError::Unauthorized);
    }
    // Proceed...
}
```

## Data Protection & Audit
- **Local DB**: As an offline-first desktop app, data lives locally.
- **Audit Logging**: Changes to `users`, `tasks`, and `sessions` trigger automatic audit records (`025_audit_logging.sql`).
- **Secrets**: Use `.env.local` for development environments.
- **Audit Script**: Run `node scripts/ipc-authorization-audit.js` to automatically verify that all `#\[tauri::command\]` endpoints correctly invoke a token validation step.
