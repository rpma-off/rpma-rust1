# AGENTS.md 

## Project Structure

### Root Directory Layout
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

## Type System

**Critical**: Types are synchronized between Rust backend and TypeScript frontend.

### Type Flow
```
Rust Models → ts-rs → TypeScript Types → Frontend
```


### Type Location
All backend types: `frontend/src/lib/backend.ts`


## Documentation References

For comprehensive project understanding, refer to these documentation files in the `docs` 


## Key Principles

1. **Simplicity First**: The simplest solution that works is the best
2. **Don't Break Things**: Preserve existing functionality
3. **Pragmatic Fixes**: Practical improvements over theoretical perfection
4. **Measurable Impact**: Focus on changes that make a real difference
5. **Maintainability**: Code should be easier to understand after your changes

