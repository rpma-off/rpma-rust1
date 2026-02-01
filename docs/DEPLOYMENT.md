# Deployment Documentation

## Table of Contents
1. [Overview](#overview)
2. [Build Requirements](#build-requirements)
3. [Environment Variables](#environment-variables)
4. [Build Process](#build-process)
5. [Platform-Specific Builds](#platform-specific-builds)
6. [Installation](#installation)
7. [Configuration](#configuration)
8. [Database Management](#database-management)
9. [Logging & Monitoring](#logging--monitoring)
10. [Troubleshooting](#troubleshooting)

## Overview

RPMA v2 is a **desktop application** built with Tauri, designed to be distributed as standalone native executables for Windows, macOS, and Linux. There is **no server deployment** required - the application runs entirely on the end-user's machine with a local SQLite database.

### Distribution Model
- **Standalone Desktop Application**
- **Offline-First** - No backend server required
- **Self-Contained** - Includes database, backend, frontend
- **Auto-Updater** - Optional update mechanism (configured but not active)

## Build Requirements

### System Requirements

#### Minimum Development Environment
```
OS: Windows 10+, macOS 10.15+, or Linux
Node.js: >= 18.0.0
npm: >= 9.0.0
Rust: >= 1.77 (Edition 2021)
```

#### Required Tools

**Node.js & npm**
```bash
# Verify installation
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

**Rust Toolchain**
```bash
# Install Rust (via rustup)
# Visit: https://rustup.rs/

# Verify installation
rustc --version  # Should be >= 1.77
cargo --version
```

**Platform-Specific Dependencies**

**Windows:**
- Microsoft Visual Studio C++ Build Tools
- WebView2 Runtime (usually pre-installed on Windows 10/11)

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`
- Homebrew (recommended)

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## Environment Variables

### Development Environment (.env)

The project uses a `.env` file in the root directory for configuration:

```bash
# RPMA PPF Intervention Environment Variables
# These should be overridden in production with proper secrets

# JWT Configuration (expected by auth.rs)
JWT_SECRET=dfc3d7f5c295d19b42e9b3d7eaa9602e45f91a9e5e95cbaa3230fc17e631c74b

# Database Encryption (expected by main.rs as RPMA_DB_KEY)
RPMA_DB_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# Application Configuration
NODE_ENV=development
RUST_LOG=debug
```

### Production Environment Variables

**⚠️ CRITICAL: Change these values in production!**

For production deployment, you should:
1. Generate a new, cryptographically secure `JWT_SECRET` (64+ characters)
2. Generate a new `RPMA_DB_KEY` for database encryption
3. Set `NODE_ENV=production`
4. Set `RUST_LOG=info` or higher

**Generating Secure Secrets:**
```bash
# Generate JWT_SECRET (64 bytes hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate RPMA_DB_KEY (32 bytes hex minimum)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Where Environment Variables Are Used

| Variable | Used In | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | `src-tauri/src/services/auth.rs` | JWT token signing/verification |
| `RPMA_DB_KEY` | `src-tauri/src/main.rs` | Optional SQLite encryption key |
| `NODE_ENV` | Frontend build | Production vs development mode |
| `RUST_LOG` | Rust backend | Logging level (trace, debug, info, warn, error) |

## Build Process

### Development Build

#### Initial Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd rpma-rust

# 2. Install root dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Generate TypeScript types from Rust
npm run types:sync
```

#### Run Development Server
```bash
# Option 1: Use root script (recommended)
npm run dev

# Option 2: Use batch file (Windows)
./start_dev.bat

# Option 3: Manual
cd frontend && npm run dev  # Terminal 1
cd src-tauri && cargo tauri dev  # Terminal 2
```

This will:
1. Start Next.js dev server on http://localhost:3000
2. Build Rust backend in debug mode
3. Launch Tauri application window
4. Enable hot-reload for both frontend and backend

### Production Build

```bash
# Full production build
npm run build

# This executes:
# 1. npm run types:sync - Generate TypeScript types
# 2. cd frontend && npm run build - Build Next.js
# 3. cargo tauri build - Build Tauri app with optimizations
```

**Build Output Locations:**

**Windows:**
```
src-tauri/target/release/bundle/msi/
├── rpma-ppf-intervention_0.1.0_x64_en-US.msi
```

**macOS:**
```
src-tauri/target/release/bundle/dmg/
├── RPMA PPF Intervention_0.1.0_x64.dmg

src-tauri/target/release/bundle/macos/
├── RPMA PPF Intervention.app
```

**Linux:**
```
src-tauri/target/release/bundle/appimage/
├── rpma-ppf-intervention_0.1.0_amd64.AppImage

src-tauri/target/release/bundle/deb/
├── rpma-ppf-intervention_0.1.0_amd64.deb
```

### Build Optimizations

The project uses aggressive build optimizations for production:

**Cargo.toml (Release Profile):**
```toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true           # Link-time optimization
opt-level = "z"      # Optimize for size
strip = true         # Strip debug symbols
overflow-checks = false
```

**Expected Build Sizes:**
- Windows .msi: ~40-60 MB
- macOS .dmg: ~50-70 MB
- Linux AppImage: ~60-80 MB

## Platform-Specific Builds

### Windows

**Build Command:**
```bash
npm run build
# or
cd src-tauri && cargo tauri build -- --target x86_64-pc-windows-msvc
```

**Output:** `.msi` installer

**Signing (Optional):**
Configure in `tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

### macOS

**Build Command:**
```bash
npm run build
# or
cd src-tauri && cargo tauri build -- --target x86_64-apple-darwin
# or Apple Silicon:
cd src-tauri && cargo tauri build -- --target aarch64-apple-darwin
```

**Output:** `.dmg` and `.app`

**Code Signing (Required for Distribution):**
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "providerShortName": "RPMATech",
      "entitlements": "path/to/entitlements.plist"
    }
  }
}
```

### Linux

**Build Command:**
```bash
npm run build
```

**Output:** `.AppImage` and `.deb`

**AppImage:**
- Portable, no installation required
- Runs on most Linux distributions
- Self-contained with dependencies

**Debian Package:**
```bash
# Install .deb package
sudo dpkg -i src-tauri/target/release/bundle/deb/rpma-ppf-intervention_0.1.0_amd64.deb

# Install dependencies if needed
sudo apt-get install -f
```

## Installation

### End-User Installation

#### Windows
1. Download `rpma-ppf-intervention_0.1.0_x64_en-US.msi`
2. Double-click to run installer
3. Follow installation wizard
4. Application installs to: `C:\Program Files\RPMA PPF Intervention\`
5. Desktop shortcut created automatically

#### macOS
1. Download `.dmg` file
2. Open DMG
3. Drag `RPMA PPF Intervention.app` to Applications folder
4. First launch: Right-click → Open (to bypass Gatekeeper if unsigned)

#### Linux
**AppImage:**
```bash
chmod +x rpma-ppf-intervention_0.1.0_amd64.AppImage
./rpma-ppf-intervention_0.1.0_amd64.AppImage
```

**Debian/Ubuntu:**
```bash
sudo dpkg -i rpma-ppf-intervention_0.1.0_amd64.deb
# Launch from application menu or:
rpma-ppf-intervention
```

## Configuration

### Tauri Configuration (tauri.conf.json)

**Application Identity:**
```json
{
  "productName": "RPMA PPF Intervention",
  "version": "0.1.0",
  "identifier": "com.rpma.ppf-intervention"
}
```

**Build Configuration:**
```json
{
  "build": {
    "beforeDevCommand": "cd frontend && npm run dev:next",
    "beforeBuildCommand": "cd frontend && npm run build",
    "frontendDist": "../frontend/.next",
    "devUrl": "http://localhost:3000"
  }
}
```

**Bundle Targets:**
```json
{
  "bundle": {
    "active": true,
    "targets": ["app", "dmg", "msi", "appimage"]
  }
}
```

**Security Policy:**
```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:3000 ws://localhost:3000 wss://localhost:3000; img-src 'self' asset: https://asset.localhost http://localhost:3000 data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'"
    }
  }
}
```

### Auto-Updater Configuration

**Currently configured but not active:**
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.yourdomain.com/api/updates/{{target}}/{{current_version}}"
      ],
      "dialog": {},
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**To activate auto-updates:**
1. Set up update server endpoint
2. Generate signing key pair
3. Add public key to `tauri.conf.json`
4. Sign releases with private key

## Database Management

### Database Location

The SQLite database is created in the application data directory:

**Windows:**
```
C:\Users\<username>\AppData\Roaming\com.rpma.ppf-intervention\rpma.db
```

**macOS:**
```
~/Library/Application Support/com.rpma.ppf-intervention/rpma.db
```

**Linux:**
```
~/.local/share/com.rpma.ppf-intervention/rpma.db
```

### Database Initialization

On first launch:
1. Application creates app data directory
2. Initializes SQLite database with `schema.sql` (version 25)
3. Applies any pending migrations (002-027)
4. Sets up WAL mode for performance
5. Creates initial indexes

### Migration System

**Migration Files:** `src-tauri/migrations/*.sql`

Current migrations:
- 002: Rename ppf_zone to ppf_zones
- 003: Add client stats triggers
- 004-027: Various schema enhancements

**Migration Process:**
```rust
// Automatic on startup (main.rs)
let current_version = db_instance.get_version()?;
let latest_version = Database::get_latest_migration_version();
if current_version < latest_version {
    db_instance.migrate(latest_version)?;
}
```

### Database Backup

**Manual Backup:**
```bash
# Copy the rpma.db file from app data directory
# Also copy rpma.db-wal and rpma.db-shm if present
```

**Programmatic Backup (Future Enhancement):**
- Settings → Data Management → Backup Database
- Planned feature, not yet implemented

### Database Encryption (Optional)

To enable SQLCipher encryption:

1. **Modify Cargo.toml:**
```toml
rusqlite = { version = "0.32", features = ["bundled-sqlcipher"] }
```

2. **Set encryption key:**
Ensure `RPMA_DB_KEY` is set in `.env`

3. **Rebuild application:**
```bash
npm run build
```

## Logging & Monitoring

### Logging Configuration

**Backend Logging (Rust):**

Controlled by `RUST_LOG` environment variable:
```bash
RUST_LOG=trace  # Most verbose
RUST_LOG=debug  # Development (default)
RUST_LOG=info   # Production
RUST_LOG=warn   # Warnings only
RUST_LOG=error  # Errors only
```

**Log Output:**
- Development: Console (stdout)
- Production: Console (stdout)
- Future: Log file rotation planned

**Structured Logging:**
```rust
use tracing::{info, warn, error, debug};

info!("Application started");
debug!("Database connection established");
warn!("Cache memory threshold reached");
error!("Failed to sync data: {}", error);
```

### Application Metrics

**Available via Tauri Commands:**
- `system::health_check` - Database health
- `system::get_database_stats` - DB metrics
- `performance::get_performance_stats` - App performance
- `security::get_security_metrics` - Security events

**Future Enhancements:**
- Prometheus exporter
- Metrics dashboard in settings
- Performance profiling UI

## Troubleshooting

### Build Issues

**Problem: Rust compilation fails**
```bash
# Clear build cache
cd src-tauri
cargo clean
cd ..
npm run build
```

**Problem: Node/npm version mismatch**
```bash
# Check versions
node --version
npm --version

# Update to required versions (use nvm)
nvm install 18
nvm use 18
```

**Problem: WebView2 missing (Windows)**
- Download and install WebView2 Runtime:
  https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### Runtime Issues

**Problem: Database locked**
- Close all instances of the application
- Delete `rpma.db-wal` and `rpma.db-shm` files
- Restart application

**Problem: White screen on launch**
- Check if Next.js build completed successfully
- Verify `frontend/.next` directory exists
- Rebuild: `npm run build`

**Problem: "Invalid JWT" errors**
- JWT_SECRET may have changed
- Clear user sessions: Delete `user_sessions` table data
- Re-login required

**Problem: Migration errors**
- Check `schema_version` table in database
- Manually inspect migration files
- Contact support if critical

### Development Issues

**Problem: Hot reload not working**
```bash
# Stop dev server
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

**Problem: Type generation fails**
```bash
# Manually run type export
cd src-tauri
cargo run --bin export-types --features="ts-rs"
```

**Problem: Port 3000 already in use**
```bash
# Change Next.js port
cd frontend
PORT=3001 npm run dev
```

## Scripts Reference

### Root Package Scripts

```json
{
  "dev": "Export types + start Tauri dev",
  "build": "Build production bundle",
  "types:sync": "Generate TypeScript types from Rust",
  "frontend:dev": "Start frontend dev server",
  "frontend:build": "Build frontend",
  "backend:build": "Build Rust backend",
  "backend:build:release": "Build optimized Rust",
  "backend:clippy": "Run Rust linter",
  "backend:fmt": "Format Rust code",
  "types:validate": "Validate type consistency",
  "types:drift-check": "Check for type drift",
  "bundle:analyze": "Analyze bundle size",
  "security:audit": "Security audit",
  "clean": "Clean build artifacts"
}
```

### Helper Scripts

**Windows:**
- `start_dev.bat` - Start development environment
- `stop_dev.bat` - Stop all dev processes

**Validation Scripts (scripts/*):**
- `validate-types.js` - Ensure Rust/TS type consistency
- `check-type-drift.js` - Detect type mismatches
- `security-audit.js` - Security checks
- `migration-health-check.js` - Validate migrations

## Continuous Integration (Future)

**Planned CI/CD Pipeline:**

```yaml
# .github/workflows/build.yml (not yet created)
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
      - name: Setup Rust
      - name: Build
      - name: Upload artifacts

  build-macos:
    runs-on: macos-latest
    # Similar steps

  build-linux:
    runs-on: ubuntu-latest
    # Similar steps
```

## Distribution Checklist

Before releasing a new version:

- [ ] Update version in `package.json`
- [ ] Update version in `src-tauri/Cargo.toml`
- [ ] Update version in `src-tauri/tauri.conf.json`
- [ ] Run `npm run types:validate`
- [ ] Run `npm run security:audit`
- [ ] Test on target platforms
- [ ] Generate new JWT_SECRET and RPMA_DB_KEY for production
- [ ] Update CHANGELOG.md
- [ ] Create git tag
- [ ] Build production bundles
- [ ] Sign binaries (if applicable)
- [ ] Test installation on clean systems
- [ ] Upload to distribution platform
- [ ] Update documentation

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-01  
**Maintained By**: RPMA Team
