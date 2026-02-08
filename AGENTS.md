# AGENTS.md 

## Project Structure

```
rpma-rust/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities, API clients
│   │   ├── types/        # TypeScript types
│   │   ├── ui/           # shadcn/ui components
│   │   └── store/        # Zustand state stores
│   ├── public/           # Static assets
│   ├── package.json
│   └── next.config.js
│
├── src-tauri/            # Rust backend application
│   ├── src/
│   │   ├── commands/     # Tauri IPC command handlers
│   │   ├── services/     # Business logic layer
│   │   ├── repositories/ # Data access layer
│   │   ├── models/       # Domain models & DTOs
│   │   ├── db/           # Database management
│   │   ├── logging/      # Logging infrastructure
│   │   ├── sync/         # Sync engine
│   │   ├── menu/         # Application menus
│   │   ├── bin/          # Binary executables
│   │   ├── main.rs       # Application entry point
│   │   └── lib.rs        # Library root
│   ├── migrations/       # Database migrations
│   ├── benches/          # Performance benchmarks
│   ├── tests/            # Integration tests
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
│
├── scripts/              # Build & validation scripts
├── migrations/           # Additional migrations
├── docs/                 # Documentation PRDs
├── .github/              # GitHub workflows
├── package.json          # Root package.json (monorepo)
├── .env                  # Environment variables
└── Cargo.toml            # Workspace configuration
```
## Architecture

```
┌─────────────────┐
│ Next.js (React) │  ← Presentation Layer
├─────────────────┤
│   Tauri IPC     │  ← Communication Layer
├─────────────────┤
│ Rust Services   │  ← Business Logic
├─────────────────┤
│ SQLite Database │  ← Data Layer
└─────────────────┘
```


## Development Commands

### Essential Commands
```bash
# Start development (recommended)
npm run dev

# Frontend only
npm run frontend:dev

# Build for production
npm run build

# Type checking
npm run frontend:type-check

# Linting
npm run frontend:lint

# Type sync (Rust → TypeScript)
npm run types:sync
```

### Backend Commands
```bash
# Rust compilation check
npm run backend:check

# Rust linting
npm run backend:clippy

# Format Rust code
npm run backend:fmt
```

##  🐘 BACKEND RULES (RUST)

###  IPC Commands
*   Location: `src-tauri/src/commands/`
*   Commands must use the `#[tauri::command]` macro.
*   **Authentication**: Most commands require a `session_token: String` argument. Use the `authenticate!` macro or helper function to validate the user and extract `user_id` early.

```rust
use crate::auth::authenticate;

#[tauri::command]
async fn get_task_details(task_id: String, session_token: String, app_state: State<'_, AppState>) -> Result<Task, AppError> {
    // 1. Authenticate
    let user = authenticate(&session_token, &app_state.db)?;

    // 2. Authorize (RBAC)
    if user.role != UserRole::Admin {
        return Err(AppError::Authorization("Not an admin".to_string()));
    }

    // 3. Business Logic
    let task = TaskRepository::get_by_id(&app_state.db, &task_id)?;
    Ok(task)
}
```

###  Error Handling
*   Use the standardized `AppError` enum defined in `src-tauri/src/error.rs`.
*   Map raw errors (SQLite, IO, etc.) to `AppError` variants.
*   Never panic in production code; use `Result<T, AppError>`.

###  Database Interaction
*   Use the `r2d2` connection pool from `app_state`.
*   SQL queries should be parameterized to prevent injection.
*   Prefer Repository pattern (`src-tauri/src/repositories/`) for data access logic.

---

##  ⚛️ FRONTEND RULES (NEXT.JS / REACT)

###  UI Components
*   **Strictly use `shadcn/ui`** for all UI primitives (Buttons, Inputs, Dialogs).
*   Use Tailwind utility classes for layout and styling.
*   **Design Tokens**: Refer to `DESIGN.md`. Do not hardcode colors.
    *   Backgrounds: `bg-background`, `bg-card`
    *   Text: `text-foreground`, `text-muted-foreground`
    *   Borders: `border-border`
    *   Primary Action: `bg-primary text-primary-foreground hover:bg-primary/90`

###  State Management
*   Use React Hooks (`useState`, `useEffect`, `useReducer`) for local component state.
*   For global state (e.g., User Session), use React Context or a library like Zustand (if applicable, though Context is preferred here for simplicity).
*   Use SWR or TanStack Query (React Query) for caching IPC responses if performance requires it, otherwise standard React state is fine.

###  IPC Client
*   Import the wrapper: `import { ipcClient } from '@/lib/ipc/client';`
*   Call functions using the generated client methods. All calls are async.
    ```typescript
    const response = await ipcClient.tasks.get(taskId, sessionToken);
    ```

---

##  💾 DATABASE MIGRATIONS RULES

###  Schema Changes
1.  Create a new SQL file in `src-tauri/migrations/`.
2.  Naming convention: `NNN_description.sql` (e.g., `012_add_user_avatar.sql`).
3.  The system automatically applies unapplied migrations on startup based on the `schema_version` table.

###  Migration Guidelines
*   **DO NOT** create tables using Rust code only. Use SQL.
*   Use `IF NOT EXISTS` or `IF EXISTS` to prevent errors on re-runs.
*   Maintain backwards compatibility where possible.
*   **Validation**:
    *   Run `node scripts/validate-migration-system.js` before committing.
    *   Run `node scripts/migration-health-check.js` to ensure syntax is correct.

---

##  🧪 TESTING & QUALITY GATES

Before any code is considered "Done", the following must pass:

1.  **Type Sync**: `npm run types:sync` completes without error.
2.  **Type Validation**: `npm run types:validate` confirms all types are present.
3.  **Drift Check**: `npm run types:drift-check` finds no discrepancies between Rust and TS.
4.  **Migration Health**: `node scripts/validate-migration-system.js` returns passing score.
5.  **Security Audit**: `npm run security:audit` finds no hardcoded secrets or weak deps.



##  🚀 WORKFLOWS

### Scenario A: Adding a new API Command
1.  **Define the Request/Response types** in a Rust model file (`src-tauri/src/models/`). Add `#[derive(Serialize, Type)]`.
2.  **Implement the Command** in `src-tauri/src/commands/`.
3.  **Register the Command** in `src-tauri/src/main.rs`.
4.  **Generate Types**: Run `npm run types:sync`.
5.  **Create Frontend Hook/Function**: Create a file in `frontend/src/lib/ipc/` (or similar) to wrap the raw IPC call.
    ```typescript
    // frontend/src/lib/ipc/tasks.ts
    export async function getMyTasks(token: string) {
       return await ipcClient.tasks.list({ /* filters */ }, token);
    }
    ```
6.  **Build UI**: Create React components using the data.

### Scenario B: Creating a New Page
1.  Create folder in `frontend/src/app/feature-name/`.
2.  Create `page.tsx`.
3.  Use `AppLayout` (Sidebar/Header) wrapper.
4.  Fetch data using `useEffect` or a custom hook.
5.  Render using `shadcn/ui` components.
6.  Ensure responsive design (Mobile/Desktop).

### Scenario C: Modifying the Database
1.  Write SQL migration file `src-tauri/migrations/NNN_change.sql`.
2.  Update Rust `Model` structs to match new schema.
3.  Run migration health check.
4.  Run `npm run types:sync`.

---

##  ⚠️ COMMON PITFALLS TO AVOID

*   **Editing `frontend/src/lib/backend.ts` manually**: This file is overwritten. Put custom types in a separate file.
*   **Forgetting `#[tauri::command]`**: The command won't be exposed to the frontend.
*   **Assuming Connection**: The app works offline. Always handle `network errors` gracefully; use the Sync Queue.
*   **Hardcoded Styling**: Use Tailwind design tokens from `tailwind.config.ts`, not arbitrary hex codes.
*   **Skipping RBAC**: Always check if the `session_token` user has the right `UserRole` before modifying data.

---

##  📚 REFERENCE MAP

*   **Looking for User Flows?** -> Check `USER-FLOWS.md`.
*   **Looking for DB Schema?** -> Check `DATABASE.md`.
*   **Looking for API Endpoints?** -> Check `API.md`.
*   **Looking for Colors/Fonts?** -> Check `DESIGN.md`.
*   **Need to run a script?** -> Check `SCRIPTS_DOCUMENTATION.md`.
