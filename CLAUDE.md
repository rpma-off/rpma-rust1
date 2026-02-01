# CLAUDE.md 

## Project Structure

```
rpma-rust/
├── frontend/src/
│   ├── app/                    # Next.js pages (App Router)
│   │   ├── dashboard/         # Main dashboard
│   │   ├── tasks/             # Task management
│   │   ├── clients/           # Client management
│   │   └── admin/             # Admin features
│   ├── components/            # Reusable components
│   │   ├── tasks/             # Task-specific components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── ui/                # Base UI components
│   │   └── workflow/          # Workflow components
│   └── lib/
│       ├── backend.ts         # Backend type definitions
│       └── services/          # API services
│
└── src-tauri/src/
    ├── commands/              # IPC command handlers
    ├── models/                # Data models (Rust)
    ├── services/              # Business logic
    ├── db/                    # Database layer
    └── sync/                  # Sync system
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

## Type System

**Critical**: Types are synchronized between Rust backend and TypeScript frontend.

### Type Flow
```
Rust Models → ts-rs → TypeScript Types → Frontend
```


### Type Location
All backend types: `frontend/src/lib/backend.ts`


## Documentation References

For comprehensive project understanding, refer to these documentation files in the `docs/prd` 


## Key Principles

1. **Simplicity First**: The simplest solution that works is the best
2. **Don't Break Things**: Preserve existing functionality
3. **Pragmatic Fixes**: Practical improvements over theoretical perfection
4. **Measurable Impact**: Focus on changes that make a real difference
5. **Maintainability**: Code should be easier to understand after your changes

## Context-Specific Guidelines

### For Rust Backend
- Follow Rust idioms and best practices
- Use `Result<T, E>` consistently for error handling
- Leverage Rust's type system for safety
- Keep async code clean with proper error propagation
- Use Clippy suggestions where applicable

### For TypeScript Frontend
- Eliminate `any` types progressively
- Use proper React hooks dependencies
- Implement proper TypeScript interfaces
- Follow React best practices (no prop drilling, proper memoization)
- Keep components focused and single-purpose

### For Database Layer
- Optimize queries with appropriate indexes
- Use transactions where needed
- Proper error handling for DB operations
- Connection pool management
- Query preparation and parameter binding


What You Should NOT Do
❌ DO NOT add new features - Work only with existing functionality ❌ DO NOT change the overall architecture - Keep the layered structure ❌ DO NOT introduce new libraries - Use existing dependencies only ❌ DO NOT over-engineer - Keep solutions simple and pragmatic ❌ DO NOT rewrite working code - If it works well, leave it alone ❌ DO NOT change the database schema - Work within current structure ❌ DO NOT modify the migration system - It's already comprehensive ❌ DO NOT add unnecessary abstractions - Keep it straightforward