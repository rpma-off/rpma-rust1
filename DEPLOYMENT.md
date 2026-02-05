# RPMA v2 - Deployment Documentation

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Build Configuration](#build-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Build Targets](#build-targets)
- [Deployment Process](#deployment-process)
- [External Services Configuration](#external-services-configuration)
- [Maintenance](#maintenance)

## Introduction

This document provides comprehensive deployment instructions for **RPMA v2**, a Tauri-based desktop application. RPMA v2 uses GitHub Actions for continuous integration and supports multiple build targets for different platforms.

### Deployment Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline                            │
│                  (GitHub Actions)                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Test Job         → 2. Security Job  → 3. Build Job  │
│     - Rust tests        - cargo-audit     - Multi-platform  │
│     - E2E tests        - cargo-deny      - Windows/Linux/  │
│     - Benchmarks       - Dependency check - macOS builds     │
│  4. Release Job                                              │
│     - GitHub Releases                                          │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Distribution                                │
│  - GitHub Releases (binaries)                               │
│  - Auto-updates (Tauri Updater)                             │
│  - Package installers (app, dmg, msi, appimage)             │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Development Environment

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >=18.0.0 | Frontend build and development |
| **npm** | >=9.0.0 | Package manager |
| **Rust** | 1.77+ | Backend compilation |
| **Cargo** | Latest | Rust package manager |
| **Git** | Latest | Version control |
| **Python** | 3.x | Some build scripts (optional) |

### Build Dependencies

#### Windows

```powershell
# Install Rust
winget install Rustlang.Rust.MSVC

# Install Node.js
winget install OpenJS.NodeJS.LTS

# Install WebView2 (for Tauri)
winget install Microsoft.EdgeWebView2Runtime
```

#### macOS

```bash
# Install Rust via Homebrew
brew install rust

# Install Node.js
brew install node

# Install system dependencies
brew install openssl sqlite3
```

#### Linux (Ubuntu/Debian)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build dependencies
sudo apt-get install -y libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## Environment Configuration

### Environment Variables

Environment variables are defined in `.env` file in the root directory.

#### Required Variables

```bash
# Application
NODE_ENV=production
VITE_TAURI_PRIVATE_KEY=your_private_key

# Database
DATABASE_PATH=./rpma.db

# Email (optional)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@rpma.com
SENDGRID_FROM_NAME=RPMA

# SMS (optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Cloud Storage (optional)
GCS_BUCKET_NAME=your_bucket_name
GCS_SERVICE_ACCOUNT_KEY=your_service_account_key

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

#### Optional Variables

```bash
# Performance
CACHE_TTL_SECONDS=300
MAX_CACHE_SIZE_MB=512

# Sync
SYNC_INTERVAL_SECONDS=300
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY_SECONDS=5

# Session
SESSION_TIMEOUT_MINUTES=480

# Rate Limiting
RATE_LIMIT_CLIENT_OPS=100
RATE_LIMIT_CALENDAR_OPS=200
```

### Environment-Specific Configuration

#### Development

```bash
# .env.development
NODE_ENV=development
VITE_TAURI_PRIVATE_KEY=dev_private_key
LOG_LEVEL=debug
CACHE_TTL_SECONDS=60
```

#### Production

```bash
# .env.production
NODE_ENV=production
VITE_TAURI_PRIVATE_KEY=prod_private_key
LOG_LEVEL=info
CACHE_TTL_SECONDS=300
```

#### Testing

```bash
# .env.test
NODE_ENV=test
DATABASE_PATH=:memory:  # Use in-memory database for tests
LOG_LEVEL=error
```

## Build Configuration

### Next.js Configuration

**File**: `frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['storage.googleapis.com'],
  },
  webpack: (config, { isServer }) => {
    // Bundle splitting optimization
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        vendor: {
          name: 'vendor',
          chunks: 'all',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
        },
      },
    };

    return config;
  },
};

module.exports = nextConfig;
```

### Tauri Configuration

**File**: `src-tauri/tauri.conf.json`

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../dist",
    "withGlobalTauri": false
  },
  "package": {
    "productName": "RPMA PPF Intervention",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": true
      }
    },
    "bundle": {
      "active": true,
      "targets": ["app", "dmg", "msi", "appimage"],
      "identifier": "com.rpma.ppf-intervention",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "category": "Productivity",
      "shortDescription": "PPF Intervention Management",
      "longDescription": "Comprehensive PPF installation intervention management application with task tracking, workflow management, and reporting capabilities.",
      "macOS": {
        "frameworks": [],
        "minimumSystemVersion": "10.15",
        "entitlements": null,
        "exceptionDomain": "",
        "signingIdentity": null,
        "providerShortName": null,
        "info": {
          "CFBundleName": "RPMA PPF Intervention",
          "CFBundleDisplayName": "RPMA",
          "CFBundleIdentifier": "com.rpma.ppf-intervention",
          "CFBundleVersion": "0.1.0",
          "CFBundleShortVersionString": "0.1.0"
        }
      },
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": "default-src 'self'; connect-src ipc: http://ipc.localhost https://*.rpma.com; img-src 'self' https://storage.googleapis.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval';"
    },
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.rpma.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    },
    "windows": [
      {
        "title": "RPMA PPF Intervention",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "alwaysOnTop": false,
        "center": true,
        "minWidth": 800,
        "minHeight": 600,
        "visible": true
      }
    ]
  }
}
```

### Cargo Configuration

**File**: `src-tauri/Cargo.toml`

```toml
[package]
name = "rpma-ppf-intervention"
version = "0.1.0"
description = "RPMA PPF Intervention Management Application"
authors = ["RPMA Team"]
license = "MIT"
repository = "https://github.com/your-org/rpma-rust"
edition = "2021"
rust-version = "1.77"

[dependencies]
tauri = { version = "2.1", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.42", features = ["full"] }
rusqlite = { version = "0.32", features = ["bundled"] }
r2d2 = "0.8"
r2d2_sqlite = "0.25"
argon2 = "0.5"
jsonwebtoken = "9.3"
totp-rs = "5.5"
reqwest = { version = "0.12", features = ["json", "gzip"] }
specta = "2.0"
ts-rs = "8.0"
genpdf = "0.2"
printpdf = "0.7"
geo = "0.28"
parking_lot = "0.12"
lru = "0.12"
futures = "0.3"
chrono = { version = "0.4", features = ["serde"] }
thiserror = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[profile.release]
opt-level = "z"  # Optimize for size
lto = true
codegen-units = 1
strip = true
panic = "abort"

[profile.dev]
opt-level = 0
debug = true
```

### Package.json Configuration

**File**: `package.json` (root)

```json
{
  "name": "rpma-rust",
  "version": "0.1.0",
  "description": "RPMA v2 - Paint Protection Film Intervention Management",
  "type": "module",
  "scripts": {
    "dev": "npm run types:sync && tauri dev",
    "frontend:dev": "next dev",
    "build": "npm run frontend:build && npm run backend:build:release",
    "frontend:build": "next build",
    "backend:build": "cargo build --manifest-path=src-tauri/Cargo.toml",
    "backend:build:release": "cargo build --release --manifest-path=src-tauri/Cargo.toml",
    "types:sync": "node scripts/write-types.js",
    "types:validate": "node scripts/validate-types.js",
    "ci:validate": "npm run types:validate && npm run types:drift-check"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.1.0",
    "next": "^14.2.0",
    "react": "^18.3.1",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  release:
    types: [published]

env:
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1

jobs:
  test:
    name: Test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        rust: [stable, beta]
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: actions-rs/toolchain@v1
        with:
          profile: minimal
          toolchain: ${{ matrix.rust }}
          override: true

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
            node_modules
          key: ${{ runner.os }}-cargo-${{ matrix.rust }}-node-${{ hashFiles('**/Cargo.lock', '**/package-lock.json') }}

      - name: Install dependencies
        run: npm install

      - name: Format check
        run: cargo fmt -- --check

      - name: Clippy
        run: cargo clippy -- -D warnings

      - name: Run tests
        run: cargo test --verbose

      - name: Run integration tests
        run: cargo test --test integration --verbose

      - name: Run property-based tests
        run: cargo test --test proptest --verbose

      - name: Check test coverage
        run: |
          cargo install cargo-tarpaulin
          cargo tarpaulin --out Xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  security:
    name: Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          profile: minimal
          toolchain: stable
          override: true

      - name: Run cargo audit
        run: |
          cargo install cargo-audit
          cargo audit

      - name: Run cargo deny
        run: |
          cargo install cargo-deny
          cargo deny check

  build:
    name: Build
    needs: [test, security]
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        target:
          - x86_64
          - aarch64
        include:
          - os: ubuntu-latest
            target: x86_64
          - os: macos-latest
            target: x86_64
          - os: macos-latest
            target: aarch64
          - os: windows-latest
            target: x86_64

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          profile: minimal
          toolchain: stable
          override: true

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Sync types
        run: npm run types:sync

      - name: Build frontend
        run: npm run frontend:build

      - name: Build backend (Release)
        run: npm run backend:build:release

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-${{ matrix.target }}-release
          path: |
            src-tauri/target/release/rpma-ppf-intervention
            src-tauri/target/release/rpma-ppf-intervention.exe
            src-tauri/target/release/bundle/

  release:
    name: Release
    needs: [build]
    if: github.event_name == 'release' && github.event.action == 'published'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download artifacts
        uses: actions/download-artifact@v3

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            **/rpma-ppf-intervention.app
            **/rpma-ppf-intervention.dmg
            **/rpma-ppf-intervention.msi
            **/rpma-ppf-integration_*.AppImage
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pipeline Stages

#### 1. Test Job

**Purpose**: Run all tests across multiple Rust versions and OS.

**Tests**:
- Unit tests (`cargo test`)
- Integration tests (`cargo test --test integration`)
- Property-based tests (`proptest`)
- E2E tests (via Playwright)
- Performance tests (via Criterion)

**Quality Checks**:
- Code formatting (`cargo fmt --check`)
- Linting (`cargo clippy`)
- Test coverage (`cargo tarpaulin`)

#### 2. Security Job

**Purpose**: Scan for security vulnerabilities.

**Scans**:
- `cargo-audit` - Known CVEs in dependencies
- `cargo-deny` - License and advisory checks

#### 3. Build Job

**Purpose**: Build release binaries for multiple platforms.

**Targets**:
- Linux (x86_64)
- macOS (x86_64, ARM64)
- Windows (x86_64)

#### 4. Release Job

**Purpose**: Publish releases to GitHub Releases.

**Artifacts**:
- macOS: `.app`, `.dmg`
- Windows: `.exe`, `.msi`
- Linux: AppImage, Debian package

## Build Targets

### Supported Platforms

| Platform | Architecture | Bundle Type | Status |
|----------|-------------|-------------|--------|
| **Windows** | x86_64 | app, msi | ✅ Supported |
| **macOS** | x86_64 | app, dmg | ✅ Supported |
| **macOS** | ARM64 | app, dmg | ✅ Supported |
| **Linux** | x86_64 | appimage, deb | ✅ Supported |

### Build Commands

#### Development Build

```bash
# Full development build
npm run dev

# Frontend only
npm run frontend:dev

# Backend only (dev)
npm run backend:build
```

#### Production Build

```bash
# Full production build
npm run build

# Frontend only
npm run frontend:build

# Backend only (release)
npm run backend:build:release
```

#### Platform-Specific Build

```bash
# Windows
npm run build -- --target x86_64-pc-windows-msvc

# macOS Intel
npm run build -- --target x86_64-apple-darwin

# macOS Apple Silicon
npm run build -- --target aarch64-apple-darwin

# Linux
npm run build -- --target x86_64-unknown-linux-gnu
```

### Tauri Bundlers

#### App Bundler

Produces a standalone executable for the target platform.

```bash
tauri build --target app
```

**Output**:
- Windows: `rpma-ppf-intervention.exe`
- macOS: `rpma-ppf-intervention.app`
- Linux: `rpma-ppf-integration`

#### DMG Bundler (macOS)

Produces a disk image for macOS distribution.

```bash
tauri build --target dmg
```

**Output**: `rpma-ppf-intervention_0.1.0_x64.dmg`

#### MSI Bundler (Windows)

Produces an MSI installer for Windows.

```bash
tauri build --target msi
```

**Output**: `rpma-ppf-integration_0.1.0_x64_en-US.msi`

#### AppImage Bundler (Linux)

Produces an AppImage package for Linux.

```bash
tauri build --target appimage
```

**Output**: `rpma-ppf-integration_0.1.0_amd64.AppImage`

## Deployment Process

### 1. Development Deployment

**Purpose**: Deploy development environment locally.

**Steps**:
```bash
# Clone repository
git clone https://github.com/your-org/rpma-rust.git
cd rpma-rust

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
# Edit .env with your configuration

# Start development server
npm run dev
```

**Result**: Application opens in development mode with hot-reload enabled.

### 2. Staging Deployment

**Purpose**: Deploy to staging environment for testing.

**Steps**:
```bash
# Create staging branch
git checkout -b staging

# Build for staging
npm run build

# Test staging build
# Run all tests manually

# Merge to develop
git checkout develop
git merge staging
git push origin develop
```

**CI/CD**: Tests run automatically on push to `develop`.

### 3. Production Deployment

**Purpose**: Deploy production build for distribution.

**Steps**:

#### 3.1 Prepare Release

```bash
# Ensure main branch is up to date
git checkout main
git pull origin main

# Run full test suite
npm run test:e2e

# Run type validation
npm run ci:validate

# Build production version
npm run build
```

#### 3.2 Tag Release

```bash
# Create version tag (e.g., v0.1.0)
git tag -a v0.1.0 -m "Release v0.1.0"

# Push tag to trigger CI/CD
git push origin v0.1.0
```

#### 3.3 CI/CD Builds

GitHub Actions automatically:
1. Runs tests
2. Runs security scans
3. Builds for all platforms
4. Creates GitHub Release
5. Uploads build artifacts

#### 3.4 Verify Release

```bash
# Download artifacts from GitHub Release
# Test on each platform:
# - Windows: Test .exe and .msi
# - macOS: Test .app and .dmg
# - Linux: Test AppImage
```

### 4. Auto-Update Deployment

RPMA v2 includes built-in auto-update via Tauri Updater.

**Update Flow**:
```
Application starts
    ↓
Check for updates (configured endpoint)
    ↓
If update available:
    ↓
Download update in background
    ↓
Prompt user to install
    ↓
Install and restart
```

**Configuration** (`tauri.conf.json`):

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.rpma.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**Update Server Setup**:

Configure your release server to serve updates:

```json
{
  "version": "0.2.0",
  "notes": "Bug fixes and performance improvements",
  "pub_date": "2024-01-15T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://releases.rpma.com/v0.2.0/rpma-ppf-integration_0.2.0_x64.msi.sig"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://releases.rpma.com/v0.2.0/rpma-ppf-intervention_0.2.0_x64.dmg.tar.gz.sig"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://releases.rpma.com/v0.2.0/rpma-ppf-integration_0.2.0_amd64.AppImage.tar.gz.sig"
    }
  }
}
```

## External Services Configuration

### Email Configuration

#### SendGrid

**Environment Variables**:
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@rpma.com
SENDGRID_FROM_NAME=RPMA
```

**Usage** (Backend):
```rust
let client = SendGridClient::new(&api_key);
let message = SendGridMessage::new()
    .from(&from_email)
    .to(&to_email)
    .subject(&subject)
    .content(&body);

client.send(&message).await?;
```

#### Mailgun

**Environment Variables**:
```bash
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your_api_key_here
MAILGUN_DOMAIN=mg.rpma.com
MAILGUN_FROM_EMAIL=noreply@rpma.com
```

### SMS Configuration

#### Twilio

**Environment Variables**:
```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACyour_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

#### AWS SNS

**Environment Variables**:
```bash
SMS_PROVIDER=aws_sns
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:topic/MyTopic
```

### Cloud Storage Configuration

#### Google Cloud Storage

**Environment Variables**:
```bash
GCS_BUCKET_NAME=rpma-backups
GCS_SERVICE_ACCOUNT_KEY=your_service_account_key_json
```

**Usage** (Backend):
```rust
use google_cloud_storage::client::Client;

let credentials = ServiceAccountCredentials::from_key(&service_account_key)?;
let client = Client::new(credentials).await?;

let bucket = client.bucket(&bucket_name);
let object = bucket.object(&object_name);
object.upload(&data).await?;
```

## Maintenance

### Database Maintenance

#### Vacuum Database

Optimize database file size:

```bash
npm run vacuum_database
```

Or via Tauri command:

```typescript
await ipcClient.system.vacuumDatabase();
```

#### Check Database Integrity

```bash
npm run check_db
npm run check_db_schema
```

### Log Management

#### Rotate Logs

Set up log rotation to prevent disk space issues:

```bash
# Configure log rotation in .env
LOG_ROTATION_DAYS=30
LOG_MAX_SIZE_MB=100
```

#### Clean Old Logs

```bash
# Delete logs older than 30 days
find ./logs -name "*.log" -mtime +30 -delete
```

### Cache Management

#### Clear Application Cache

```typescript
await ipcClient.system.clearApplicationCache(['query_result', 'image_thumbnail']);
```

#### Check Cache Statistics

```typescript
const stats = await ipcClient.system.getCacheStatistics();
console.log('Cache hit rate:', stats.hit_rate);
console.log('Cache size:', stats.memory_used_bytes);
```

### Security Maintenance

#### Update Dependencies

```bash
# Update npm dependencies
npm update

# Update Rust dependencies
cargo update
```

#### Security Audit

```bash
# Frontend
npm audit

# Backend
cargo install cargo-audit
cargo audit
```

### Performance Monitoring

#### Run Performance Tests

```bash
npm run performance:test
```

#### Update Performance Baseline

```bash
npm run performance:update-baseline
```

---

**Document Version**: 1.0
**Last Updated**: Based on codebase analysis
