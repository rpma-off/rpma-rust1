# 06 - Security and RBAC

## Authentication Flow

### 1. Login Process

```
┌─────────────┐
│  Frontend   │  User enters email + password
└──────┬──────┘
       │ IPC: auth_login { email, password }
       ↓
┌────────────────────────────────────────┐
│  Command: auth_login                    │  1. No session required (public)
│  (src-tauri/src/commands/auth.rs:31)    │  2. Rate limiting applied
└──────┬─────────────────────────────────┘
       │ auth_service.authenticate(email, password)
       ↓
┌─────────────────────────────────────────────────┐
│  Service: AuthService::authenticate              │  1. Lookup user by email
│  (src-tauri/src/services/auth.rs:449-666)       │  2. Check rate limit/lockout
└──────┬──────────────────────────────────────────┘  3. Verify password (Argon2)
       │                                            4. Generate JWT token
       │ user_repo.get_by_email()                   5. Create session in DB
       │ verify_password(password, hash)            6. Update last_login
       │ session_repo.create()
       ↓
┌──────────────────────────────────────────┐
│  Return UserSession { token, user, ... } │
└──────────────────────────────────────────┘
```

**Security Features**:
- Password hashing: **Argon2** (`services/auth.rs:779-801`)
- JWT access tokens: **2 hours** (`services/token.rs:60`)
- Refresh tokens: **7 days** (`services/token.rs:61`)
- Token storage: **HMAC-SHA256 hash** (`services/token.rs:66-72`)

---

### 2. Session Validation

All protected IPC commands use the `authenticate!` macro:

**Location**: `src-tauri/src/commands/auth_middleware.rs:27-66`

```rust
#[tauri::command]
pub async fn protected_command(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<ApiResponse<Data>, AppError> {
    let session = authenticate!(&session_token, &state);
    // session contains: user_id, email, role, is_active
}
```

**Session Fields** (`models/auth.rs`):
- `token`: JWT string
- `refresh_token`: For session extension
- `expires_at`: Unix timestamp
- `last_activity`: For timeout tracking
- `two_factor_verified`: Boolean

---

### 3. Logout Process

**Command**: `auth_logout` (`commands/auth.rs:153`)

**Flow**:
1. Validate session token
2. Delete session from `user_sessions` table
3. Frontend clears token from storage

---

### 4. Two-Factor Authentication (2FA)

**Status**: **Implemented**

**Service**: `src-tauri/src/services/two_factor.rs`

| Command | Purpose | Backend |
|---------|---------|---------|
| `enable_2fa` | Generate TOTP setup | `auth.rs:216` |
| `verify_2fa_setup` | Verify and enable | `auth.rs:245` |
| `disable_2fa` | Disable 2FA | `auth.rs:278` |
| `verify_2fa_code` | Verify TOTP code | `auth.rs:352` |
| `regenerate_backup_codes` | New backup codes | `auth.rs:323` |

**Configuration**:
- Algorithm: TOTP (SHA-1)
- Code length: 6 digits
- Time window: 30 seconds
- Clock skew tolerance: ±1 window
- Backup codes: 10 codes × 6 digits

**Database Fields** (`users` table):
- `two_factor_enabled`: Boolean
- `two_factor_secret`: Encrypted TOTP secret
- `backup_codes`: JSON array
- `verified_at`: Timestamp

---

## Role-Based Access Control (RBAC)

### User Roles

**Location**: `src-tauri/src/models/auth.rs:31-41`

```rust
pub enum UserRole {
    Admin,       // Full system access
    Supervisor,  // Manage operations, limited config
    Technician,  // Execute tasks, view assigned data
    Viewer,      // Read-only access
}
```

**Hierarchy** (`auth_middleware.rs:76-95`):
```
Admin > Supervisor > Technician > Viewer
```

---

### RBAC Permission Matrix

| Action | Admin | Supervisor | Technician | Viewer |
|--------|-------|------------|------------|--------|
| **Users** | | | | |
| Create user | ✅ | ✅ | ❌ | ❌ |
| Edit user (any) | ✅ | ✅ (non-Admin) | ❌ | ❌ |
| Delete user | ✅ | ❌ | ❌ | ❌ |
| Change role | ✅ | ❌ | ❌ | ❌ |
| **Tasks** | | | | |
| Create task | ✅ | ✅ | ❌ | ❌ |
| Edit task (any) | ✅ | ✅ | ❌ | ❌ |
| Edit assigned task | ✅ | ✅ | ✅ | ❌ |
| Delete task | ✅ | ❌ | ❌ | ❌ |
| View all tasks | ✅ | ✅ | ❌ | ❌ |
| View assigned tasks | ✅ | ✅ | ✅ | ✅ |
| **Interventions** | | | | |
| Start intervention | ✅ | ✅ | ✅ (assigned) | ❌ |
| Execute steps | ✅ | ✅ | ✅ (assigned) | ❌ |
| Finalize | ✅ | ✅ | ✅ (assigned) | ❌ |
| **Reports** | | | | |
| Generate all reports | ✅ | ✅ | ❌ | ❌ |
| View own data | ✅ | ✅ | ✅ | ✅ |

---

### Enforcement in Code

**Location**: `src-tauri/src/commands/auth_middleware.rs`

**Pattern 1: Role Check**
```rust
if !matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
    return Err(AppError::Authorization("Insufficient permissions".into()));
}
```

**Pattern 2: Ownership Check**
```rust
if !matches!(user_role, UserRole::Admin | UserRole::Supervisor) {
    if task.technician_id.as_ref() != Some(&user_id) {
        return Err(AppError::Authorization("Access denied".into()));
    }
}
```

**Pattern 3: Macros**
```rust
authenticate!(&session_token, &state)                    // Basic auth
authenticate!(&session_token, &state, UserRole::Admin)   // With role
check_task_permission!(&user.role, "delete")             // Task operation
```

---

## Rate Limiting

**Service**: `src-tauri/src/services/rate_limiter.rs`

| Setting | Value | Location |
|---------|-------|----------|
| Max failed attempts | 5 | Line 32 |
| Lockout duration | 15 minutes | Line 33 |
| Window duration | 15 minutes | Line 34 |

**Features**:
- Email-based rate limiting
- IP-based rate limiting
- In-memory cache for frequent access
- Database persistence for lockout state

---

## Security Monitoring

**Service**: `src-tauri/src/services/security_monitor.rs`

**Event Types Tracked**:
- Authentication failures
- Authorization failures
- Rate limit exceeded
- Brute force attempts
- SQL injection attempts
- XSS attempts

**Alert Severities**: Low, Medium, High, Critical

**Auto-IP Blocking**: Triggers after 10 failed attempts per hour

---

## Data Protection

### Local Database Security

**SQLite Configuration** (`src-tauri/src/db/connection.rs:96-103`):
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
```

**Database Location**: `<app_data_dir>/rpma.db`

---

### Secrets & Environment Variables

**Required Environment Variables**:
- `JWT_SECRET`: Token signing key

**Development**:
```bash
set JWT_SECRET=your-secret-key
npm run dev
```

---

## Audit Logging

### Tables

| Table | Purpose |
|-------|---------|
| `audit_logs` | General audit trail |
| `audit_events` | Security audit events |
| `settings_audit_log` | Settings changes |

### Audit Service

**Location**: `src-tauri/src/services/audit_service.rs`

**What Gets Logged**:
- User creation, deletion, role changes
- Task creation, deletion, status changes
- Login attempts (success/failure)
- Sensitive data access
- System settings changes

---

## Security Validation Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `security-audit.js` | Comprehensive security scan | `npm run security:audit` |
| `ipc-authorization-audit.js` | Check IPC auth | `node scripts/ipc-authorization-audit.js` |
| `validate-session-security.js` | Session validation | `node scripts/validate-session-security.js` |

---

## Common Security Vulnerabilities to Avoid

### 1. Privilege Escalation
```rust
// ❌ BAD: User can change own role
// ✅ GOOD: Prevent self role change
if current_user.user_id == user_id && new_role.is_some() {
    return Err(AppError::Validation("Cannot change your own role".into()));
}
```

### 2. Insecure Direct Object Reference (IDOR)
```rust
// ❌ BAD: No ownership check
// ✅ GOOD: Check user can access this task
if task.technician_id.as_ref() != Some(user_id) && !is_admin {
    return Err(AppError::Authorization("Access denied".into()));
}
```

### 3. SQL Injection
```rust
// ❌ BAD: Direct interpolation
let query = format!("SELECT * WHERE id = '{}'", user_input);

// ✅ GOOD: Parameterized queries
conn.execute("SELECT * WHERE id = ?", params![user_input])?;
```

---

## Security Best Practices

### ✅ Do
- Always validate session tokens in protected commands
- Use Argon2 for password hashing
- Implement rate limiting on auth endpoints
- Log security-relevant actions
- Use RBAC checks for sensitive operations
- Validate and sanitize all inputs
- Run security audits regularly

### ❌ Don't
- Store passwords in plain text
- Log sensitive data (passwords, tokens)
- Trust client-side validation alone
- Expose internal error details
- Allow privilege escalation
- Commit secrets to version control

---

## Next Steps

- **Database & migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
- **Dev workflows**: [08_DEV_WORKFLOWS_AND_TOOLING.md](./08_DEV_WORKFLOWS_AND_TOOLING.md)
- **User flows**: [09_USER_FLOWS_AND_UX.md](./09_USER_FLOWS_AND_UX.md)
