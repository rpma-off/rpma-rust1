# RPMA PPF Intervention Management System

## Project Overview

**RPMA v2** is a comprehensive desktop application for managing Paint Protection Film (PPF) interventions. Built with a modern tech stack combining Rust and Next.js through Tauri, it provides a robust, offline-first solution for automotive detailing businesses to manage their PPF installation workflows, client relationships, inventory, and reporting.

The application is designed for technicians and administrators to efficiently track vehicle interventions from initial client contact through job completion, with full support for offline operation and data synchronization.

## Technical Stack

### Backend (Rust)
- **Framework**: Tauri 2.1 - Cross-platform desktop application framework
- **Language**: Rust 2021 Edition (minimum version 1.77)
- **Database**: SQLite with rusqlite 0.32 (bundled)
- **Connection Pooling**: r2d2 + r2d2_sqlite
- **Async Runtime**: Tokio 1.42 (multi-threaded)
- **Serialization**: Serde + serde_json + rmp-serde (MessagePack for IPC)
- **Authentication**: Argon2 password hashing + JWT (jsonwebtoken 9.3)
- **Security**: HMAC, SHA-2, Base64 encoding
- **Logging**: Tracing + tracing-subscriber
- **PDF Generation**: genpdf 0.2 + printpdf 0.7
- **Image Processing**: image crate (JPEG, PNG support)
- **Geospatial**: geo 0.28 for location-based features
- **Two-Factor Auth**: totp-rs 5.5
- **WebSocket**: tokio-tungstenite 0.21
- **HTTP Client**: reqwest 0.12 (with rustls-tls)
- **Caching**: Redis 0.25 + LRU cache
- **Type Generation**: ts-rs 10.1 + specta 2.0 for TypeScript bindings

### Frontend (Next.js)
- **Framework**: Next.js 14.2 (React 18.3)
- **Language**: TypeScript 5.3
- **Styling**: TailwindCSS 3.4
- **UI Components**: Radix UI (comprehensive component library)
- **State Management**: Zustand 5.0
- **Data Fetching**: TanStack Query 5.90
- **Forms**: React Hook Form 7.64 + Zod 4.1 validation
- **Calendar**: react-big-calendar 1.19
- **Maps**: Leaflet 1.9 + react-leaflet 4.2
- **Charts**: Recharts 3.3
- **Animations**: Framer Motion 12.23
- **Drag & Drop**: @hello-pangea/dnd 18.0
- **Notifications**: Sonner 2.0 + react-hot-toast 2.6
- **Testing**: Jest 30.2 + Playwright 1.40 + Testing Library

### Development Tools
- **Package Manager**: npm (>=9.0.0), Node.js (>=18.0.0)
- **Linting**: ESLint 8.57
- **Git Hooks**: Husky 9.1
- **Commit Linting**: Commitlint (conventional commits)
- **Code Quality**: jscpd (duplicate detection), depcheck

## Architecture

### Application Type
**Hybrid Desktop Application** (Tauri-based)
- **Pattern**: Monolithic with modular service architecture
- **Communication**: IPC (Inter-Process Communication) between Rust backend and Next.js frontend
- **Data Flow**: Offline-first with background synchronization capabilities

### Key Architectural Features
1. **Offline-First**: Full functionality without internet connection
2. **Real-time Updates**: WebSocket support for live data synchronization
3. **Performance Optimized**: MessagePack serialization, connection pooling, LRU caching
4. **Security-Focused**: JWT sessions, 2FA support, rate limiting, security monitoring
5. **Scalable**: Worker pool pattern, async operations, batching support

## Setup Instructions

### Prerequisites

1. **Rust** (version 1.77 or higher)
   ```bash
   rustup update
   ```

2. **Node.js** (version 18.0.0 or higher) and **npm** (version 9.0.0 or higher)
   ```bash
   node --version
   npm --version
   ```

3. **System Dependencies** (Windows)
   - WebView2 (usually pre-installed on Windows 10/11)
   - Visual Studio Build Tools (for Rust compilation)

### Installation Steps

1. **Clone repository**
   ```bash
   git clone https://github.com/your-org/rpma-v2
   cd rpma-v2
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   npm run frontend:install
   ```

3. **Configure environment variables**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env and set:
   # - JWT_SECRET (minimum 32 characters)
   # - DATABASE_ENCRYPTION_KEY (optional, for production)
   ```

4. **Build Rust backend** (optional, for testing)
   ```bash
   npm run backend:build
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

   This will:
   - Sync TypeScript types from Rust
   - Set JWT_SECRET environment variable
   - Start Tauri development server
   - Launch Next.js frontend on http://localhost:3000
   - Open desktop application window

### First-Time Setup

On first launch, application will:
1. Create database at `%APPDATA%/com.rpma.ppf-intervention/rpma.db`
2. Initialize schema with all migrations (currently at version 25)
3. Prompt you to create an admin account (bootstrap process)

## Available Scripts

### Development
- `npm run dev` - Start development server (frontend + Tauri)
- `npm run frontend:dev` - Start only Next.js frontend
- `npm run backend:build` - Build Rust backend
- `npm run backend:check` - Check Rust code without building
- `npm run backend:clippy` - Run Rust linter
- `npm run backend:fmt` - Format Rust code

### Building
- `npm run build` - Build production application
- `npm run frontend:build` - Build Next.js frontend only
- `npm run backend:build:release` - Build optimized Rust backend

### Type Safety
- `npm run types:sync` - Generate TypeScript types from Rust
- `npm run types:validate` - Validate type consistency
- `npm run types:drift-check` - Check for type drift
- `npm run types:generate-docs` - Generate type documentation

### Testing
- `npm run frontend:lint` - Lint frontend code
- `npm run frontend:type-check` - TypeScript type checking
- `npm test` - Run Jest tests (frontend)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run e2e` - Run Playwright end-to-end tests
- `npm run e2e:ui` - Run E2E tests with UI

### Performance & Quality
- `npm run bundle:analyze` - Analyze bundle size
- `npm run bundle:check-size` - Check bundle size limits
- `npm run performance:test` - Run performance regression tests
- `npm run security:audit` - Run security audit
- `npm run code-review:check` - Run code review checks

### Maintenance
- `npm run clean` - Clean build artifacts
- `npm run frontend:clean` - Clean frontend build artifacts

## Database

The application uses **SQLite** with following characteristics:
- **Location**: User's application data directory
- **Mode**: WAL (Write-Ahead Logging) for better concurrency
- **Migrations**: Automated migration system (currently at version 25)
- **Encryption**: Optional (configurable via environment variable)

### Build Configuration

### Development Profile
- Optimized for fast compilation
- Debug symbols enabled
- Single codegen unit for better debugging

### Release Profile
- **Panic Strategy**: Abort (smaller binary)
- **LTO**: Enabled (Link-Time Optimization)
- **Optimization Level**: `z` (optimize for size)
- **Strip**: Enabled (remove debug symbols)
- **Codegen Units**: 1 (maximum optimization)

## Platform Support

### Primary Target
- **Windows** (MSI installer)

### Additional Targets (configured)
- **macOS** (DMG, minimum version 10.15)
- **Linux** (AppImage, DEB)

## Application Metadata

- **Product Name**: RPMA PPF Intervention
- **Version**: 0.1.0
- **Identifier**: com.rpma.ppf-intervention
- **Publisher**: RPMA
- **Category**: Business
- **License**: MIT

## Key Features

1. **Task Management**: Create, assign, and track PPF installation tasks
   - Full CRUD operations with 120+ IPC commands
   - Advanced filtering and search capabilities
   - Task lifecycle management with status tracking
   - Assignment optimization and conflict detection

2. **Client Management**: Comprehensive client database with statistics
   - Client profile management
   - Task history and analytics
   - Communication logs
   - Document attachments

3. **Intervention Workflows**: Step-by-step PPF installation process tracking
   - 4-step workflow (Preparation, Installation, Inspection, Finalization)
   - Real-time progress monitoring
   - Photo documentation at each step
   - Quality control and scoring system

4. **Material & Inventory**: Track film stock, consumption, and suppliers
   - Real-time inventory management
   - Automatic low-stock alerts
   - Material usage tracking per intervention
   - Supplier management and performance metrics

5. **Calendar & Scheduling**: Visual calendar with conflict detection
   - Multiple view modes (Month, Week, Day, Agenda)
   - Task scheduling with availability checking
   - Integration with task management
   - Recurring event support

6. **Reporting**: Comprehensive analytics and PDF report generation
   - 9 specialized report types
   - Operational intelligence with predictive analytics
   - Data explorer with custom queries
   - Export in multiple formats (PDF, CSV, Excel)

7. **User Management**: Role-based access control (Admin, Technician, Viewer)
   - Multi-factor authentication (TOTP)
   - Session management with JWT tokens
   - User activity monitoring
   - Security event logging

8. **Security**: Comprehensive security features
   - Argon2 password hashing
   - JWT-based session management
   - Two-factor authentication (TOTP)
   - Rate limiting on authentication endpoints
   - Security event logging and monitoring

9. **Offline Support**: Full offline functionality with sync queue
   - Complete offline operation support
   - Background synchronization when online
   - Conflict resolution mechanisms
   - Data integrity protection

10. **Real-time Updates**: WebSocket-based live updates
    - Live task status updates
    - Real-time collaboration features
    - Push notification support
    - Live dashboard updates

## Security Features

- Argon2 password hashing
- JWT-based session management
- Two-factor authentication (TOTP)
- Rate limiting on authentication endpoints
- Security event logging and monitoring
- Session timeout configuration
- Active session management

## Performance Optimizations

- MessagePack serialization for IPC (faster than JSON)
- Connection pooling (r2d2)
- LRU caching
- Batch operations support
- Worker pool for CPU-intensive tasks
- Streaming for large data transfers
- Compression for IPC data
- WAL mode for SQLite (better concurrency)

## Database Schema

The application uses **SQLite** with 14 main tables:
- **users** - User accounts and authentication
- **user_sessions** - Active session management
- **user_settings** - User preferences and configuration
- **clients** - Client management with full-text search
- **tasks** - General task management
- **interventions** - PPF intervention workflow tracking
- **intervention_steps** - Individual workflow steps
- **photos** - Photo documentation with metadata
- **materials** - Inventory and material catalog
- **material_consumption** - Material usage tracking
- **calendar_events** - Scheduling and calendar management
- **sync_queue** - Offline synchronization management
- **audit_logs** - Audit trail for security

## API Architecture

The application exposes **120+ IPC commands** across 29 command modules:
- **Authentication**: 6 commands (login, logout, 2FA, etc.)
- **User Management**: 8 commands (CRUD operations, admin functions)
- **Task Management**: 12 commands (CRUD, notes, messages, exports)
- **Client Management**: 8 commands (CRUD, statistics)
- **Intervention Management**: 10 commands (workflow operations)
- **Material & Inventory**: 18 commands (stock management, consumption)
- **Calendar & Scheduling**: 5 commands (events, conflict checking)
- **Reporting & Analytics**: 10 commands (reports, exports)
- **System & Utilities**: 8 commands (health check, diagnostics)
- **Performance**: 6 commands (monitoring, optimization)
- **Settings**: 6 commands (configuration, preferences)
- **Security**: 2 commands (logging, event tracking)
- **Sync**: 4 commands (queue management, synchronization)
- **WebSocket**: 3 commands (real-time updates)
- **UI State**: 2 commands (frontend state management)

## UI Components

The application includes **192+ reusable React components**:
- **Base UI Components**: 63 components (forms, layout, data display, etc.)
- **Specialized Components**: 129+ domain-specific components
- **Task Management**: 15 components with comprehensive workflow support
- **Dashboard Components**: 23 components for analytics and monitoring
- **Calendar Components**: 20 components for scheduling
- **Analytics Components**: 9 components for data visualization
- **Inventory Components**: 8 components for material management
- **Mobile Components**: 8 components for touch-optimized interactions

## Contributing

This is a private project for RPMA Team. Please follow conventional commit standards when making changes.

## License

MIT License - Copyright (c) RPMA Team