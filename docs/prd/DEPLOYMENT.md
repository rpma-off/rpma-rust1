# Deployment Documentation - RPMA v2

## Overview

RPMA v2 is a desktop application built with **Tauri** that packages a Rust backend and Next.js frontend into a standalone executable. This document covers deployment configuration, build processes, CI/CD pipelines, and deployment procedures.

**Application Type:** Desktop Application
**Target Platforms:** Windows, macOS, Linux
**Bundle Formats:** .exe (Windows), .app (macOS), .AppImage/DEB (Linux)

---

## Tauri Configuration

### Application Metadata

**Location:** `src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "RPMA PPF Intervention",
  "version": "0.1.0",
  "identifier": "com.rpma.ppf-intervention"
}
```

### Window Configuration

```json
{
  "app": {
    "windows": [
      {
        "title": "RPMA - Gestion Interventions PPF",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "center": true,
        "visible": true,
        "transparent": false
      }
    ]
  }
}
```

### Build Configuration

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

### Bundle Targets

```json
{
  "bundle": {
    "active": true,
    "targets": ["app", "dmg", "msi", "appimage"]
  }
}
```

**Target Details:**

| Platform | Format | Description |
|----------|---------|-------------|
| Windows | .exe, .msi | Executable and installer |
| macOS | .app, .dmg | Application bundle and disk image |
| Linux | .AppImage, .deb | AppImage and Debian package |

---

## Platform-Specific Configuration

### Windows

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com",
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    }
  }
}
```

**Code Signing:**
- **Certificate:** Needs Windows Code Signing Certificate
- **Thumbprint:** Configure in `certificateThumbprint`
- **Timestamp:** DigiCert timestamp URL configured
- **Note:** `null` = unsigned (for development)

### macOS

```json
{
  "bundle": {
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "providerShortName": "RPMATech",
      "entitlements": null,
      "signingIdentity": null
    }
  }
}
```

**Code Signing:**
- **Identity:** Developer ID Application
- **Entitlements:** Configure if needed
- **Notarization:** Requires Apple Developer account
- **Note:** `null` = unsigned (for development)

### Linux

```json
{
  "bundle": {
    "linux": {
      "deb": {
        "depends": []
      },
      "appimage": {
        "bundleMediaFramework": false
      }
    }
  }
}
```

**Dependencies:** Configure package dependencies for DEB/RPM

---

## CI/CD Pipeline

### Workflow Overview

**Location:** `.github/workflows/ci.yml`

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Push / PR: main, develop                                 │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────────────────────────────────────────┐         │
│  │            Job 1: Check (Quality Gate)      │         │
│  ├─────────────────────────────────────────────────┤         │
│  │ • Frontend Lint                                 │         │
│  │ • Frontend Type-Check                           │         │
│  │ • Frontend Tests                                 │         │
│  │ • Frontend Build                                 │         │
│  │ • Backend Check                                   │         │
│  │ • Backend Clippy                                 │         │
│  │ • Backend Tests                                   │         │
│  │ • Backend Coverage                                │         │
│  │ • Security Audit (cargo-deny, npm audit)          │         │
│  │ • Architecture Checks                             │         │
│  │ • Type Synchronization Check                       │         │
│  └─────────────────────────────────────────────────┘         │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────────────────────────────────────────┐         │
│  │         Job 2: Build (Multi-Platform)        │         │
│  ├─────────────────────────────────────────────────┤         │
│  │ • Ubuntu (x86_64-unknown-linux-gnu)          │         │
│  │ • Windows (x86_64-pc-windows-msvc)          │         │
│  │ • macOS Intel (x86_64-apple-darwin)          │         │
│  │ • macOS ARM (aarch64-apple-darwin)            │         │
│  └─────────────────────────────────────────────────┘         │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────────────────────────────────────────┐         │
│  │         Job 3: Release (Tag v*)             │         │
│  ├─────────────────────────────────────────────────┤         │
│  │ • Download build artifacts                    │         │
│  │ • Create GitHub Release                       │         │
│  │ • Auto-generate release notes                │         │
│  │ • Detect pre-releases (alpha/beta)          │         │
│  └─────────────────────────────────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Quality Gate (Check Job)

**Matrix:**
```yaml
matrix:
  rust: [stable, '1.85.0']  # MSRV
  node: [20]
```

**Steps:**

1. **Frontend Quality:**
   ```bash
   npm run frontend:lint
   npm run frontend:type-check
   npm test --coverage
   npm run frontend:build
   ```

2. **Backend Quality:**
   ```bash
   cargo check
   cargo clippy -- -D warnings
   cargo test
   cargo tarpaulin --out Xml
   ```

3. **Security:**
   ```bash
   cargo deny check
   npm audit
   ```

4. **Architecture:**
   ```bash
   npm run architecture:check
   npm run validate:bounded-contexts
   ```

5. **Type Sync:**
   ```bash
   npm run types:sync
   npm run types:drift-check
   ```

### Build Job

**Platform Matrix:**
```yaml
matrix:
  include:
    - platform: 'ubuntu-latest'
      target: 'x86_64-unknown-linux-gnu'
    - platform: 'windows-latest'
      target: 'x86_64-pc-windows-msvc'
    - platform: 'macos-latest'
      target: 'x86_64-apple-darwin'
    - platform: 'macos-latest'
      target: 'aarch64-apple-darwin'
```

**Steps:**
```bash
# Install dependencies
rustup target add ${{ matrix.target }}
npm run install

# Build
npm run backend:build:release

# Package
npm run tauri build

# Upload artifacts
Upload bundles/*.dmg
Upload bundles/*.msi
Upload bundles/*.appimage
```

**Artifact Retention:** 30 days

### Release Job

**Triggers:** Version tags (e.g., `v1.0.0`)

**Steps:**
```bash
# Download artifacts from build job
Download all artifacts

# Create GitHub release
gh release create ${{ github.ref_name }} \
  --title "RPMA v${{ github.ref_name }}" \
  --notes-file release-notes.md

# Upload assets to release
Upload bundles/*.dmg
Upload bundles/*.msi
Upload bundles/*.appimage
```

**Pre-release Detection:**
- Tags containing `alpha`, `beta`, `rc` → Pre-release
- Other tags → Full release

---

## Environment Variables

### Required Variables

Create a `.env` file at the root level (gitignored):

```env
# Authentication
JWT_SECRET=your-32-character-secret-here

# Database Encryption
RPMA_DB_KEY=your-database-encryption-key

# Environment
NODE_ENV=development|production

# Logging
RUST_LOG=debug|info|warn|error
```

### Variable Descriptions

| Variable | Purpose | Requirements |
|-----------|---------|---------------|
| `JWT_SECRET` | JWT token signing | Minimum 32 characters |
| `RPMA_DB_KEY` | Database encryption | Secure random string |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `RUST_LOG` | Logging level | `debug`, `info`, `warn`, or `error` |

### Security Validation

The security audit script validates:
- JWT_SECRET is 32+ characters
- No hardcoded secrets in code
- RPMA_DB_KEY is configured (optional)
- .env is not committed to git

```bash
npm run security:audit
```

---

## Build Scripts

### Root package.json Scripts

```json
{
  "scripts": {
    "dev": "npm run tauri dev",
    "build": "npm run types:sync && npm run tauri build",
    "tauri": "tauri",
    "types:sync": "cd src-tauri && cargo run --bin export-types | node ../scripts/write-types.js",
    "frontend:build": "cd frontend && npm run build",
    "backend:build:release": "cd src-tauri && cargo build --release",
    "quality:check": "npm run frontend:lint && npm run frontend:type-check && npm run backend:clippy && npm run architecture:check",
    "security:audit": "node scripts/security-audit.js"
  }
}
```

### Frontend package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Development Build

### Start Development Server

```bash
npm run dev
```

**What it does:**
1. Syncs types from Rust to TypeScript
2. Starts frontend dev server (localhost:3000)
3. Starts Tauri dev mode with hot reload

### Frontend Only

```bash
npm run frontend:dev
```

**Access:** http://localhost:3000

---

## Production Build

### Full Production Build

```bash
npm run build
```

**What it does:**
1. Syncs types from Rust to TypeScript
2. Builds Next.js frontend (production)
3. Builds Rust backend (release)
4. Packages into platform-specific bundles

### Frontend Only

```bash
npm run frontend:build
```

**Output:** `frontend/.next/`

### Backend Only

```bash
npm run backend:build:release
```

**Output:** `src-tauri/target/release/`

---

## Code Signing

### Windows Code Signing

**Requirements:**
- Windows Code Signing Certificate (.pfx)
- Certificate thumbprint
- Signtool (comes with Windows SDK)

**Configuration:**

1. **Update `tauri.conf.json`:**
   ```json
   {
     "bundle": {
       "windows": {
         "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT"
       }
     }
   }
   ```

2. **Install Certificate:**
   ```bash
   # Double-click .pfx file and install to certificate store
   # Or import via command line
   certutil -importpfx your-certificate.pfx
   ```

3. **Build Signed Release:**
   ```bash
   npm run build
   ```

**Verification:**
```bash
signtool verify /pa /v RPMA-Setup-x.x.x.msi
```

### macOS Code Signing

**Requirements:**
- Apple Developer Account
- Developer ID Application Certificate
- Xcode Command Line Tools

**Configuration:**

1. **Update `tauri.conf.json`:**
   ```json
   {
     "bundle": {
       "macOS": {
         "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
       }
     }
   }
   ```

2. **Build Signed Release:**
   ```bash
   npm run build
   ```

**Verification:**
```bash
codesign --verify --deep --verbose RPMA.app
```

### Notarization (macOS)

**Requirements:**
- Apple Developer Account
- App-Specific Password
- xcrun (comes with Xcode)

**Steps:**

1. **Upload for Notarization:**
   ```bash
   xcrun notarytool submit RPMA.dmg \
     --apple-id "your@email.com" \
     --password "app-specific-password" \
     --team-id "TEAM_ID" \
     --wait
   ```

2. **Staple Notarization:**
   ```bash
   xcrun stapler staple RPMA.dmg
   ```

**Verification:**
```bash
xcrun stapler validate RPMA.dmg
```

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests pass (frontend + backend)
- [ ] Linting passes (`npm run frontend:lint`)
- [ ] Type-checking passes (`npm run frontend:type-check`)
- [ ] Clippy passes (`npm run backend:clippy`)
- [ ] Coverage threshold met (70%)

### Security

- [ ] Security audit passes (`npm run security:audit`)
- [ ] No hardcoded secrets in code
- [ ] JWT_SECRET is 32+ characters
- [ ] RPMA_DB_KEY is configured (if needed)
- [ ] Dependencies are up-to-date
- [ ] Vulnerability scan passes

### Architecture

- [ ] Architecture validation passes (`npm run architecture:check`)
- [ ] Bounded context validation passes (`npm run validate:bounded-contexts`)
- [ ] Type synchronization successful (`npm run types:sync`)
- [ ] No type drift (`npm run types:drift-check`)

### Build

- [ ] Frontend builds successfully (`npm run frontend:build`)
- [ ] Backend builds successfully (`npm run backend:build:release`)
- [ ] Full production build succeeds (`npm run build`)
- [ ] All bundles generated correctly

### Release

- [ ] Version number updated in `tauri.conf.json`
- [ ] Version tag created (e.g., `v1.0.0`)
- [ ] Release notes prepared
- [ ] Code signing configured (if needed)
- [ ] CI/CD pipeline passes
- [ ] Release artifacts uploaded

---

## Deployment Process

### Automated Deployment (CI/CD)

**For Version Tags:**

1. Create and push version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. CI/CD automatically:
   - Runs quality gate
   - Builds for all platforms
   - Creates GitHub release
   - Uploads bundles as artifacts

3. Download releases from GitHub Releases page

### Manual Deployment

**Development Builds:**

```bash
# Clone repository
git clone <repository-url>
cd rpma-rust

# Install dependencies
npm run install

# Build
npm run build

# Find bundles in src-tauri/target/release/bundle/
```

**Build Locations:**
- **Windows:** `src-tauri/target/release/bundle/msi/`
- **macOS:** `src-tauri/target/release/bundle/dmg/`
- **Linux:** `src-tauri/target/release/bundle/appimage/` or `deb/`

---

## Distribution

### Direct Distribution

1. **Download from GitHub Releases**
   - Navigate to repository Releases page
   - Select version
   - Download appropriate bundle for your platform

2. **Install:**
   - **Windows:** Run `.msi` installer
   - **macOS:** Open `.dmg` and drag to Applications
   - **Linux:** Make `.AppImage` executable and run, or install `.deb`

### Auto-Update (Future Enhancement)

**Not Currently Implemented:**

RPMA v2 does not have auto-update functionality. This can be added in the future using:
- **Windows:** electron-updater equivalent
- **macOS:** Sparkle framework
- **Linux:** AppImageUpdate

---

## Docker Deployment

### Status: Not Applicable

RPMA v2 is a desktop application and does not support Docker deployment. Docker is typically used for:
- Web applications
- Microservices
- Server-side applications

Since RPMA runs entirely on the user's machine with a local SQLite database, containerization is not applicable.

---

## Troubleshooting

### Build Failures

**Issue:** "Type synchronization failed"
```bash
# Solution: Manually sync types
npm run types:sync
```

**Issue:** "Frontend build failed"
```bash
# Solution: Clear Next.js cache and rebuild
cd frontend
rm -rf .next
npm run build
```

**Issue:** "Backend build failed"
```bash
# Solution: Clean and rebuild
cd src-tauri
cargo clean
cargo build --release
```

### Code Signing Issues

**Issue:** "Certificate not found"
```bash
# Solution: Install certificate to store
certutil -importpfx your-certificate.pfx
```

**Issue:** "Notarization failed"
```bash
# Solution: Check notarization logs
xcrun notarytool log \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID"
```

### Runtime Issues

**Issue:** "Application won't start"
```bash
# Windows: Check Windows Event Viewer
# macOS: Check Console.app
# Linux: Run from terminal to see errors
./RPMA.AppImage
```

**Issue:** "Database errors"
```bash
# Solution: Check database file permissions and integrity
sqlite3 rpma.db "PRAGMA integrity_check;"
```

---

## Performance Optimization

### Build Optimization

**Frontend:**
- Code splitting enabled (Next.js default)
- Tree shaking enabled
- Minification enabled
- Image optimization enabled

**Backend:**
- LTO (Link-Time Optimization) enabled
- Debug symbols stripped
- Size optimization enabled (`opt-level = "z"`)

### Runtime Optimization

**Frontend:**
- React Query caching
- Virtual scrolling for large lists
- Lazy loading images
- Code splitting by route

**Backend:**
- Connection pooling
- Query result caching
- Prepared statements
- WAL mode for SQLite

---

## Monitoring & Logging

### Logging Configuration

**Environment Variable:** `RUST_LOG`

**Levels:**
- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages only

**Example:**
```bash
RUST_LOG=debug npm run dev
```

### Log Output

- **Development:** Console output
- **Production:** File-based logging (configurable)
- **Audit Logs:** Stored in `audit_events` table

### Performance Metrics

- IPC call durations (tracked in `performance_metrics` table)
- Query performance (slow query logging >100ms)
- Cache hit/miss ratios (tracked in `cache_statistics` table)

---

## Rollback Procedure

### Rollback to Previous Version

1. **Uninstall current version**
2. **Download previous version from GitHub Releases**
3. **Install previous version**

### Database Rollback

**Important:** Database migrations are forward-only. To rollback:

1. **Restore database backup** (if available)
2. **Or manually revert schema changes** (not recommended)

**Backup Strategy:**
```bash
# Before upgrades, backup database
cp rpma.db rpma.db.backup-$(date +%Y%m%d-%H%M%S)
```

---

## Support

For deployment issues:
- Check GitHub Issues
- Review build logs in CI/CD
- Consult AGENT_PACK documentation
- Contact development team

---

## Appendix

### File Locations

**Development:**
- Config: `.env`
- Database: `rpma.db` (in working directory)
- Logs: Console output

**Production:**
- Config: Embedded in application
- Database: App data directory
  - **Windows:** `%APPDATA%\RPMA\`
  - **macOS:** `~/Library/Application Support/RPMA/`
  - **Linux:** `~/.config/RPMA/`

### Versioning Scheme

**Semantic Versioning:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes (backwards compatible)

**Example:** `0.1.0` → Initial release

---

*Document Version: 1.0*
*Last Updated: Based on codebase analysis*
