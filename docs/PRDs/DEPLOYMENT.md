# DEPLOYMENT.md

## RPMA v2 - Deployment Documentation

---

## 1. Build Targets

### 1.1 Supported Platforms

| Platform | Architecture | Output | Status |
|----------|-------------|--------|--------|
| **Windows** | x86_64-pc-windows-msvc | `.exe` installer, `.msi` | ✅ Supported |
| **macOS** | x86_64-apple-darwin | `.dmg` | ✅ Supported |
| **macOS** | aarch64-apple-darwin | `.dmg` (Apple Silicon) | ✅ Supported |
| **Linux** | x86_64-unknown-linux-gnu | `.AppImage`, `.deb` | ✅ Supported |

### 1.2 Tauri Configuration

From `tauri.conf.json`:

```json
{
  "productName": "RPMA PPF Intervention",
  "version": "0.1.0",
  "identifier": "com.rpma.ppf-intervention",
  "bundle": {
    "targets": ["app", "dmg", "msi", "appimage"],
    "category": "Business",
    "windows": {
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    }
  }
}
```

---

## 2. Environment Variables

### 2.1 Required Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT token signing | - | Yes |
| `RPMA_DB_KEY` | Encryption key for database | - | Yes |
| `NODE_ENV` | Environment: `development` or `production` | `development` | Yes |
| `RUST_LOG` | Logging level: `error`, `warn`, `info`, `debug`, `trace` | `debug` | No |

### 2.2 Example `.env` File

```bash
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here

# Database Encryption
RPMA_DB_KEY=your-32-character-database-key

# Application
NODE_ENV=development
RUST_LOG=debug
```

### 2.3 Security Notes

- **Never commit secrets** to version control
- Use `.env.local` (gitignored) for local development
- In production, set environment variables via secure means

---

## 3. Build Process

### 3.1 Development Build

```bash
# Install dependencies
npm install

# Sync TypeScript types from Rust
npm run types:sync

# Start development server
npm run dev
```

This launches:
- Frontend dev server on `http://localhost:3000`
- Tauri backend in development mode

### 3.2 Production Build

```bash
# Full production build (frontend + Tauri)
npm run build

# Frontend only
npm run frontend:build

# Backend only
npm run backend:build:release
```

### 3.3 Output Artifacts

After build, artifacts are located in:

```
src-tauri/target/release/bundle/
├── windows/          # .exe, .msi
├── macos/            # .dmg
├── linux/            # .AppImage, .deb
└── icons/            # Application icons
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

The project uses GitHub Actions for continuous integration and deployment.

**Workflow File:** `.github/workflows/ci.yml`

#### Jobs Overview

| Job | Trigger | Description |
|-----|---------|-------------|
| **check** | Every push/PR | Lint, type-check, tests, security audit |
| **build** | After check passes | Multi-platform builds |
| **release** | On version tag (`v*`) | Create GitHub release with artifacts |

#### Check Job Steps

1. **Frontend Checks**
   - ESLint linting
   - TypeScript type checking
   - Jest unit tests
   - Production build

2. **Backend Checks**
   - Rust formatting (`cargo fmt`)
   - Clippy linting
   - Unit/integration tests
   - Migration tests

3. **Security Audits**
   - `cargo-audit` (vulnerability scanning)
   - `cargo-deny` (dependency license checking)

#### Build Job Matrix

```yaml
strategy:
  matrix:
    include:
      - os: ubuntu-latest
        target: x86_64-unknown-linux-gnu
      - os: windows-latest
        target: x86_64-pc-windows-msvc
      - os: macos-13
        target: x86_64-apple-darwin
      - os: macos-14
        target: aarch64-apple-darwin
```

### 4.2 Release Process

1. Create version tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. CI automatically:
   - Runs all checks
   - Builds for all platforms
   - Creates GitHub Release with artifacts

---

## 5. Installation

### 5.1 Windows

#### Option 1: MSI Installer
1. Download `RPMA-PPF-Intervention_0.1.0_x64_en-US.msi`
2. Run installer
3. Follow installation wizard

#### Option 2: Portable EXE
1. Download `RPMA-PPF-Intervention_0.1.0_x64.exe`
2. Run directly (no installation required)

### 5.2 macOS

1. Download `.dmg` file
2. Open disk image
3. Drag application to Applications folder
4. Open application (may need to allow in System Preferences > Security)

### 5.3 Linux

#### AppImage (Recommended)
```bash
chmod +x RPMA-PPF-Intervention_0.1.0_amd64.AppImage
./RPMA-PPF-Intervention_0.1.0_amd64.AppImage
```

#### Debian Package
```bash
sudo dpkg -i RPMA-PPF-Intervention_0.1.0_amd64.deb
sudo apt-get install -f  # Install dependencies
```

---

## 6. Database Setup

### 6.1 Initial Setup

On first launch:
1. Application creates SQLite database
2. Runs migrations automatically (001-047)
3. Creates default admin user (via bootstrap)

### 6.2 Database Location

| Platform | Default Location |
|----------|------------------|
| Windows | `%APPDATA%\com.rpma.ppf-intervention\` |
| macOS | `~/Library/Application Support/com.rpma.ppf-intervention/` |
| Linux | `~/.local/share/com.rpma.ppf-intervention/` |

### 6.3 Database Configuration

SQLite WAL mode is enabled by default:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
```

---

## 7. Offline Operation

### 7.1 Offline-First Architecture

RPMA v2 is designed to work **100% offline**:
- All data stored locally in SQLite
- No internet connection required
- Sync queue prepared for future cloud integration

### 7.2 Data Synchronization (Future)

The sync infrastructure is in place:
- `sync_enqueue` - Add operations to queue
- `sync_dequeue_batch` - Process queued operations
- Sync status monitoring commands

---

## 8. Security Configuration

### 8.1 Content Security Policy

From `tauri.conf.json`:

```
default-src 'self'; 
connect-src 'self' ipc: http://ipc.localhost tauri: http://localhost:3000 
ws://localhost:3000 wss://localhost:3000; 
img-src 'self' asset: https://asset.localhost http://localhost:3000 data: blob:; 
style-src 'self' 'unsafe-inline'; 
script-src 'self' 'unsafe-inline'; 
font-src 'self' data:
```

### 8.2 Authentication

- Passwords hashed with **Argon2id**
- Sessions use **UUID tokens**
- Session timeout configurable

### 8.3 Audit Logging

All security-relevant actions logged to `audit_events` table:
- Login/logout events
- Data modifications
- Permission changes
- Failed access attempts

---

## 9. Troubleshooting

### 9.1 Common Issues

| Issue | Solution |
|-------|----------|
| Build fails on Windows | Install Visual Studio Build Tools |
| WebView2 not found | Install Edge WebView2 Runtime |
| Database locked | Close other instances, check file permissions |
| Type drift errors | Run `npm run types:sync` |

### 9.2 Logs

| Platform | Log Location |
|----------|-------------|
| Windows | `%LOCALAPPDATA%\com.rpma.ppf-intervention\logs\` |
| macOS | `~/Library/Logs/com.rpma.ppf-intervention/` |
| Linux | `~/.local/share/com.rpma.ppf-intervention/logs/` |

### 9.3 Health Check

Use system commands to diagnose:
```bash
# Database diagnostics
invoke("diagnose_database")

# Get database stats
invoke("get_database_stats")

# Health check
invoke("health_check")
```

---

## 10. Version Information

| Component | Version |
|-----------|---------|
| Application | 0.1.0 |
| Tauri | 2.x |
| Next.js | 14.2 |
| React | 18.3 |
| Rust | 1.85 (MSRV) |
| SQLite | WAL mode |
| Node.js | 18+ (20 recommended) |

---

## 11. Future Deployment Considerations

### 11.1 Cloud Sync (Planned)

Infrastructure ready for future cloud sync:
- Sync queue tables
- Conflict resolution patterns
- Offline operation first

### 11.2 Multi-Tenant (Future)

Current architecture supports single-tenant. Future considerations:
- Database per tenant
- Tenant isolation at application layer

### 11.3 Mobile Companion

Possible future additions:
- Web-based mobile app
- PWA capabilities
- Field technician mode
