﻿You are a senior Rust architect working on a Tauri backend.(continu the migration)

The codebase already migrated to `RequestContext` and `AppContext`.

Your goal is to eliminate `session_token` from all IPC commands and implement an automatic session resolution system.

The backend must internally store the active authenticated session.

---

# TARGET ARCHITECTURE

Frontend
↓
invoke(command)
↓
Auth Guard
↓
RequestContext
↓
Application Service
↓
Repository

---

# STEP 1 — CREATE SESSION STORE

Create:

src-tauri/src/infrastructure/auth/session_store.rs

```rust id="ccltio"
pub struct SessionStore {
    session: RwLock<Option<Session>>,
}

impl SessionStore {
    pub fn set(&self, session: Session) {
        *self.session.write().unwrap() = Some(session);
    }

    pub fn get(&self) -> Result<Session, AppError> {
        self.session
            .read()
            .unwrap()
            .clone()
            .ok_or(AppError::Authorization)
    }
}
```

---

# STEP 2 — STORE SESSION AFTER LOGIN

When login succeeds:

```rust id="yvhwyc"
app.session_store.set(session);
```

---

# STEP 3 — REMOVE session_token FROM IPC COMMANDS

Before:

```rust id="idv3n1"
#[tauri::command]
async fn create_client(
    session_token: String,
    input: CreateClientInput
)
```

After:

```rust id="56o4ns"
#[tauri::command]
async fn create_client(
    app: State<AppContext>,
    input: CreateClientInput
)
```

---

# STEP 4 — RESOLVE CONTEXT AUTOMATICALLY

Create helper:

```rust id="12cs0d"
pub fn resolve_context(app: &AppContext) -> Result<RequestContext, AppError> {
    let session = app.session_store.get()?;

    Ok(RequestContext {
        auth: AuthContext {
            user_id: session.user_id,
            role: session.role,
            session_id: session.id,
        },
        correlation_id: CorrelationId::new(),
    })
}
```

---

# STEP 5 — UPDATE COMMANDS

Example:

```rust id="slsmms"
let ctx = resolve_context(&app)?;
client_service::create_client(&app, &ctx, input).await
```

---

# RULES

* `session_token` must no longer exist in IPC commands
* Session validation must happen once
* Services use RequestContext
* Repositories remain unaware of authentication
