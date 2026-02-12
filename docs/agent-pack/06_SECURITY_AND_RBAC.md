# 06 - Security and RBAC

## Authentication Flow

### 1. Login Process

```
┌─────────────┐
│  Frontend   │  User enters email + password
└──────┬──────┘
       │ IPC: login { email, password }
       ↓
┌────────────────────────────────┐
│  Command: login                │  1. No session required (public endpoint)
│  (auth.rs)                     │  2. Rate limiting applied
└──────┬─────────────────────────┘
       │ auth_service.login(email, password)
       ↓
┌───────────────────────────────────────┐
│  Service: AuthService::login          │  1. Lookup user by email
│  (services/auth.rs)                   │  2. Verify password (Argon2 hash)
└──────┬────────────────────────────────┘  3. Check is_active flag
       │                                    4. Generate session_token + refresh_token
       │ user_repo.get_by_email(email)     5. Store session in DB
       │ verify_password(password, hash)   6. Update last_login_at
       │ session_repo.create_session(user_id)
       ↓
┌──────────────────────────────────┐
│  Repository: session created     │  INSERT INTO user_sessions (token, user_id, expires_at)
└──────┬───────────────────────────┘
       │ Return { session_token, refresh_token, user }
       ↓
┌─────────────┐
│  Frontend   │  Store session_token in secure storage (localStorage or sessionStorage)
└─────────────┘  Redirect to dashboard
```

**Code Paths**:
- Command: `src-tauri/src/commands/auth.rs::login`
- Service: `src-tauri/src/services/auth.rs::login`
- Repository: `src-tauri/src/repositories/user_repository.rs`, `session_repository.rs`
- Frontend: `frontend/src/lib/ipc/domains/auth.ts::login`

**Security Features**:
- ✅ Password hashing with **Argon2** (recommended for password storage)
- ✅ Session tokens are **UUIDs** (not JWTs in this version)
- ✅ Refresh tokens allow session extension without re-entering password
- ✅ Rate limiting on login endpoint (prevents brute force)
- ✅ Failed login attempts logged for security monitoring

---

### 2. Session Validation

All protected IPC commands validate the session token:

```rust
#[tauri::command]
pub async fn protected_command(
   session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<Data>, AppError> {
    // Macro validates session and extracts user
    let current_user = authenticate!(&session_token, &state);
    
    // current_user contains: user_id, email, role, is_active
    // ...
}
```

**`authenticate!` macro** (defined in `auth_middleware.rs`):
```rust
macro_rules! authenticate {
    ($token:expr, $state:expr) => {{
        let session = $state.auth_service
            .validate_session($token)
            .await
            .map_err(|e| AppError::Authentication(format!("Failed to validate session: {}", e)))?
            .ok_or(AppError::Authentication("Invalid or expired session".into()))?;
        
        if !session.is_active {
            return Err(AppError::Authentication("User account is inactive".into()));
        }
        
        session
    }};
}
```

**Session Expiry**:
- **Default TTL**: 24 hours
- **Refresh token TTL**: 30 days
- **Sliding expiration**: Session can be extended via `refresh_session` command

---

### 3. Logout Process

```
┌─────────────┐
│  Frontend   │  User clicks "Logout"
└──────┬──────┘
       │ IPC: logout { session_token }
       ↓
┌─────────────────────────────────┐
│  Command: logout (auth.rs)      │  1. Validate session token
└──────┬──────────────────────────┘  2. Delete session from DB
       │ session_service.delete_session(token)
       ↓
┌──────────────────────────────────┐
│  Repository: session deleted     │  DELETE FROM user_sessions WHERE session_token = ?
└──────┬───────────────────────────┘
       │
       ↓
┌─────────────┐
│  Frontend   │  Clear session_token from storage
└─────────────┘  Redirect to login page
```

---

### 4. Two-Factor Authentication (2FA) - Optional

**Status**: Partially implemented (TODO: verify full implementation)

**Flow**:
1. User enables 2FA in settings → generates TOTP secret → displays QR code
2. User scans QR code with authenticator app (Google Authenticator, Authy)
3. On future logins:
   - User enters email + password
   - Backend returns `{ requires_2fa: true }`
   - Frontend prompts for 6-digit code
   - User enters code → IPC: `verify_2fa_code { session_token, code }`
   - Backend validates TOTP code → returns full session

**Models**:
- `users.two_factor_enabled`: BOOLEAN
- `users.two_factor_secret`: TEXT (encrypted TOTP secret)

**Code Path**: `src-tauri/src/services/two_factor.rs`

---

## Role-Based Access Control (RBAC)

### User Roles

RPMA v2 defines **4 user roles** with hierarchical permissions:

```rust
pub enum UserRole {
    Admin,       // Full system access
    Supervisor,  // Manage operations, limited system config
    Technician,  // Execute tasks, view assigned data
    Viewer,      // Read-only access
}
```

---

### RBAC Permission Matrix

| Action | Admin | Supervisor | Technician | Viewer |
|--------|-------|------------|------------|--------|
| **Users** | | | | |
| Create user | ✅ | ✅ | ❌ | ❌ |
| Edit user (any) | ✅ | ✅ (non-Admin) | ❌ | ❌ |
| Edit self | ✅ | ✅ | ✅ | ✅ |
| Delete user | ✅ | ❌ | ❌ | ❌ |
| List users | ✅ | ✅ | ❌ | ❌ |
| Change user role | ✅ | ❌ | ❌ | ❌ |
| **Tasks** | | | | |
| Create task | ✅ | ✅ | ❌ | ❌ |
| Edit task (any) | ✅ | ✅ | ❌ | ❌ |
| Edit assigned task (limited) | ✅ | ✅ | ✅ | ❌ |
| Delete task | ✅ | ❌ | ❌ | ❌ |
| View all tasks | ✅ | ✅ | ❌ | ❌ |
| View assigned tasks | ✅ | ✅ | ✅ | ✅ |
| Assign task to technician | ✅ | ✅ | ❌ | ❌ |
| **Clients** | | | | |
| Create client | ✅ | ✅ | ✅ | ❌ |
| Edit client | ✅ | ✅ | ✅ | ❌ |
| Delete client | ✅ | ❌ | ❌ | ❌ |
| View clients | ✅ | ✅ | ✅ | ✅ |
| **Interventions** | | | | |
| Start intervention | ✅ | ✅ | ✅ (assigned) | ❌ |
| Execute steps | ✅ | ✅ | ✅ (assigned) | ❌ |
| Finalize intervention | ✅ | ✅ | ✅ (assigned) | ❌ |
| View all interventions | ✅ | ✅ | ❌ | ❌ |
| View own interventions | ✅ | ✅ | ✅ | ✅ |
| **Materials** | | | | |
| View inventory | ✅ | ✅ | ✅ | ✅ |
| Update stock | ✅ | ✅ | ❌ | ❌ |
| Record consumption | ✅ | ✅ | ✅ (during intervention) | ❌ |
| **Reports** | | | | |
| Generate all reports | ✅ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ (own data) | ✅ (own data) |
| **Settings** | | | | |
| Modify system settings | ✅ | ❌ | ❌ | ❌ |
| View system settings | ✅ | ✅ | ❌ | ❌ |
| **Audit Logs** | | | | |
| View audit logs | ✅ | ✅ (limited) | ❌ | ❌ |

---

### Enforcement in Code

**Pattern 1: Simple Role Check**
```rust
#[tauri::command]
pub async fn create_user(
    params: CreateUserParams,
    state: AppState<'_>,
) -> Result<ApiResponse<User>, AppError> {
    let current_user = authenticate!(&params.session_token, &state);

    // Only Admin and Supervisor can create users
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        return Err(AppError::Authorization(
            "Only admins and supervisors can create users".into()
        ));
    }

    // ... proceed with user creation
}
```

**Pattern 2: Ownership Check (Data Scoping)**
```rust
#[tauri::command]
pub async fn task_update(
    params: UpdateTaskParams,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    let current_user = authenticate!(&params.session_token, &state);

    // Load task to check ownership
    let task = state.task_service.get_task(&params.task_id).await?;

    // Admin and Supervisor can edit any task
    // Technician can only edit if assigned
    if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
        if task.technician_id.as_ref() != Some(&current_user.user_id) {
            return Err(AppError::Authorization(
                "You can only edit tasks assigned to you".into()
            ));
        }
    }

    // ... proceed with update
}
```

**Pattern 3: Field-Level Restrictions**
```rust
// Technicians can update notes but not status
if current_user.role == UserRole::Technician {
    if params.data.status.is_some() {
        return Err(AppError::Authorization(
            "Technicians cannot change task status".into()
        ));
    }
    // Only allow updating notes field
}
```

---

## Data Protection

### 1. Local Database Security

**SQLite Encryption** (optional):
- RPMA v2 supports SQLite encryption via `sqlcipher` (TODO: verify if enabled)
- Encryption key is derived from system-level secrets or user password
- Database file: `<app_data_dir>/rpma.db`

**File Permissions**:
- Database file is stored in user's app data directory
- OS-level file permissions restrict access to current user

---

### 2. Secrets & Environment Variables

**Sensitive Configuration**:
- `JWT_SECRET` (if using JWT tokens): Set via environment variable
- `ENCRYPTION_KEY`: For database encryption
- API keys (future): For external integrations

**How to Set** (in development):
```bash
set JWT_SECRET=your-secret-key-here
npm run dev
```

**Production Deployment**:
- Use OS-level environment variables
- Store secrets in secure vault (e.g., Windows Credential Manager, macOS Keychain)
- Never commit secrets to Git

---

### 3. IPC Authorization Audit

**Script**: `scripts/ipc-authorization-audit.js`

**Purpose**: Scans all IPC commands to ensure they validate `session_token`.

**Usage**:
```bash
node scripts/ipc-authorization-audit.js
```

**Output**:
- Lists all IPC commands
- Flags commands missing session token validation
- Highlights public endpoints (intentionally unprotected)

**Example Output**:
```
✅ task_create - Protected (requires session_token)
✅ task_update - Protected
❌ get_app_info - Public (no auth required) ← Expected for public endpoints
⚠️  task_export - Missing session validation! ← Security issue
```

---

### 4. Audit Logging

**Table**: `audit_logs`

**Fields**:
- `id`: UUID
- `user_id`: Who performed the action
- `action`: Action type (e.g., "user_created", "task_deleted", "login_failed")
- `entity_type`: Entity affected (e.g., "user", "task")
- `entity_id`: ID of affected entity
- `changes`: JSON object with before/after state
- `ip_address`: Client IP (if available)
- `user_agent`: Client browser/app info
- `created_at`: Timestamp

**What Gets Logged**:
- ✅ User creation, deletion, role changes
- ✅ Task creation, deletion, status changes
- ✅ Login attempts (success and failure)
- ✅ Sensitive data access (e.g., viewing audit logs)
- ✅ System settings changes

**Code Path**: `src-tauri/src/services/audit_service.rs`

**Usage**:
```rust
audit_service.log_action(
    user_id,
    "task_deleted",
    "task",
    &task_id,
    Some(serde_json::json!({ "task_number": task.task_number })),
).await?;
```

---

## Security Best Practices

### ✅ Do

1. **Always validate session tokens** in protected commands
2. **Use Argon2 for password hashing** (never MD5, SHA1, or plain text)
3. **Implement rate limiting** on authentication endpoints
4. **Log security-relevant actions** (login failures, privilege escalations)
5. **Use RBAC checks** for all sensitive operations
6. **Encrypt sensitive data** at rest (database, local files)
7. **Validate and sanitize all inputs** (prevent SQL injection, XSS)
8. **Run security audits** regularly (`npm run security:audit`)

### ❌ Don't

1. ❌ Store passwords in plain text
2. ❌ Log sensitive data (passwords, tokens) in application logs
3. ❌ Trust client-side validation alone (always validate on backend)
4. ❌ Expose internal error details to frontend (use generic error messages)
5. ❌ Allow privilege escalation (users changing own role)
6. ❌ Skip authorization checks in "internal" commands
7. ❌ Commit secrets to version control

---

## Session Security Validation Script

**Script**: `scripts/validate-session-security.js`

**Purpose**: Verifies all protected IPC commands require `session_token`.

**Usage**:
```bash
node scripts/validate-session-security.js
```

---

## Common Security Vulnerabilities to Avoid

### 1. Privilege Escalation

**Vulnerability**:
```rust
// ❌ BAD: User can change their own role
pub async fn update_user(user_id: &str, new_role: Option<UserRole>) -> Result<User> {
    user_repo.update(user_id, new_role)?;
}
```

**Fix**:
```rust
// ✅ GOOD: Prevent self role change
if current_user.user_id == user_id && new_role.is_some() {
    return Err(AppError::Validation("Cannot change your own role".into()));
}
```

---

### 2. Insecure Direct Object Reference (IDOR)

**Vulnerability**:
```rust
// ❌ BAD: No ownership check
pub async fn get_task(task_id: &str) -> Result<Task> {
    task_repo.get_by_id(task_id)
}
```

**Fix**:
```rust
// ✅ GOOD: Check user can access this task
pub async fn get_task(task_id: &str, user_id: &str, user_role: &UserRole) -> Result<Task> {
    let task = task_repo.get_by_id(task_id)?;
    
    // Admin/Supervisor can see all
    if matches!(user_role, UserRole::Admin | UserRole::Supervisor) {
        return Ok(task);
    }
    
    // Technician can only see assigned tasks
    if task.technician_id.as_ref() != Some(user_id) {
        return Err(AppError::Authorization("Access denied".into()));
    }
    
    Ok(task)
}
```

---

### 3. SQL Injection

**Vulnerability**:
```rust
// ❌ BAD: Direct string interpolation
let query = format!("SELECT * FROM tasks WHERE title = '{}'", user_input);
conn.execute(&query, [])?;
```

**Fix**:
```rust
// ✅ GOOD: Use parameterized queries
conn.execute(
    "SELECT * FROM tasks WHERE title = ?",
    params![user_input],
)?;
```

---

## Next Steps

- **Database & migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
- **Dev workflows**: [08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)
- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
