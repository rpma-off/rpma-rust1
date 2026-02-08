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

## Container Deployment

### Docker Configuration

#### Multi-stage Dockerfile

```dockerfile
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM rust:1.77-slim AS backend-builder

WORKDIR /app/src-tauri
COPY src-tauri/ .
COPY Cargo.toml Cargo.lock ./
RUN cargo build --release

# Stage 3: Final image
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-0 \
    libssl3 \
    libgtk-3-0 \
    libayatana-appindicator3-1 \
    librsvg2-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy application
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=backend-builder /app/src-tauri/target/release/rpma .

# Create app user
RUN useradd -m -u 1000 rpma

USER rpma

EXPOSE 8000

CMD ["./rpma"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  rpma-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - rpma_data:/home/rpma/.local/share/rpma
      - rpma_config:/home/rpma/.config/rpma
    environment:
      - NODE_ENV=production
      - RUST_LOG=info
    restart: unless-stopped

  rpma-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: rpma
      POSTGRES_USER: rpma
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  rpma_data:
  rpma_config:
  postgres_data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rpma-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rpma-app
  template:
    metadata:
      labels:
        app: rpma-app
    spec:
      containers:
      - name: rpma
        image: rpma:latest
        ports:
        - containerPort: 8000
        env:
          - name: NODE_ENV
            value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Performance Monitoring

### Application Performance Monitoring (APM)

#### OpenTelemetry Configuration

```rust
// src-tauri/src/monitoring/telemetry.rs
use opentelemetry::trace::{Tracer, TracerProvider};
use opentelemetry::sdk::trace::TracerProvider;
use opentelemetry::sdk::trace as sdktrace;

pub fn init_telemetry() -> Tracer {
    let tracer = opentelemetry_jaeger::new_pipeline_pipeline()
        .with_service_name("rpma")
        .with_trace_config(sdktrace::config().with_resource(Resource::new(vec![
            KeyValue::new("service.name", "rpma"),
            KeyValue::new("service.version", env!("CARGO_PKG_VERSION")),
        ])))
        .install_simple();

    tracer
}
```

#### Metrics Collection

```typescript
// frontend/src/lib/monitoring/metrics.ts
export const performanceMetrics = {
  // Track page load time
  trackPageLoad: (pageName: string) => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    
    // Send to monitoring service
    sendMetric('page_load_time', loadTime, {
      page: pageName,
      browser: navigator.userAgent,
      timestamp: Date.now()
    });
  },
  
  // Track API response time
  trackApiResponse: (endpoint: string, duration: number, status: number) => {
    sendMetric('api_response_time', duration, {
      endpoint,
      status,
      method: 'POST'
    });
  },
  
  // Track user interactions
  trackUserAction: (action: string, context: any) => {
    sendMetric('user_action', 1, {
      action,
      context,
      timestamp: Date.now()
    });
  }
};
```

### Health Check Endpoints

```typescript
// Health check routes
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      filesystem: await checkFilesystem(),
      memory: checkMemoryUsage(),
      cpu: checkCpuUsage()
    }
  };
  
  res.status(200).json(health);
});

app.get('/health/ready', async (req, res) => {
  // Check if all dependencies are ready
  const isReady = await Promise.all([
    checkDatabase(),
    checkExternalServices(),
    checkConfiguration()
  ]);
  
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks: isReady
  });
});
```

## Security Hardening

### Runtime Security

#### Content Security Policy

```rust
// src-tauri/src/security/csp.rs
pub fn get_csp_header() -> String {
    format!(
        "default-src 'self'; \
        script-src 'self' 'unsafe-inline' 'unsafe-eval'; \
        style-src 'self' 'unsafe-inline'; \
        img-src 'self' data: blob:; \
        connect-src 'self' ws: wss:; \
        font-src 'self'; \
        object-src 'none'; \
        media-src 'self'; \
        frame-src 'none';"
    )
}
```

#### Secure Headers

```rust
// src-tauri/src/security/headers.rs
use hyper::{Header, Response};

pub fn add_security_headers(mut response: Response) -> Response {
    // Prevent clickjacking
    response.headers_mut().insert(
        Header::from_static("x-frame-options"),
        "DENY".parse().unwrap()
    );
    
    // Prevent MIME type sniffing
    response.headers_mut().insert(
        Header::from_static("x-content-type-options"),
        "nosniff".parse().unwrap()
    );
    
    // XSS Protection
    response.headers_mut().insert(
        Header::from_static("x-xss-protection"),
        "1; mode=block".parse().unwrap()
    );
    
    // Referrer Policy
    response.headers_mut().insert(
        Header::from_static("referrer-policy"),
        "strict-origin-when-cross-origin".parse().unwrap()
    );
    
    response
}
```

### Dependency Scanning

#### GitHub Actions Security Scan

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Cargo Audit
        run: cargo audit
        
      - name: Run Cargo Deny
        run: cargo deny check
        
      - name: Run Security Audit
        run: cargo install cargo-audit && cargo audit
        
      - name: Upload Security Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-report.json
```

### Security Testing

```bash
# Frontend security test
npm audit --audit-level high

# Backend security audit
cargo audit

# Dependency vulnerability check
cargo deny check

# OWASP ZAP Baseline Scan
docker run -t owasp/zap2.10-stable \
  zap-baseline.py \
  -t http://localhost:8000 \
  -J security-report.json
```

## Backup Strategies

### Automated Backups

#### Database Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/rpma"
DB_PATH="$HOME/.local/share/rpma/rpma.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="rpma_backup_${TIMESTAMP}.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform database vacuum before backup
sqlite3 "$DB_PATH" "VACUUM;"

# Create compressed backup
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

#### Application Data Backup

```rust
// src-tauri/src/backup/service.rs
use std::fs;
use std::path::Path;

pub struct BackupService;

impl BackupService {
    pub async fn create_backup(&self) -> Result<BackupInfo> {
        let backup_dir = Path::new("/backups");
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let backup_name = format!("rpma_backup_{}", timestamp);
        let backup_path = backup_dir.join(&backup_name);
        
        // Create backup directory
        fs::create_dir_all(&backup_path)?;
        
        // Backup database
        self.backup_database(&backup_path).await?;
        
        // Backup user settings
        self.backup_settings(&backup_path).await?;
        
        // Backup photos
        self.backup_photos(&backup_path).await?;
        
        // Create backup manifest
        let manifest = BackupManifest {
            version: env!("CARGO_PKG_VERSION"),
            created_at: chrono::Utc::now(),
            items: self.get_backup_items(&backup_path)?,
            checksum: self.calculate_checksum(&backup_path)?
        };
        
        let manifest_path = backup_path.join("manifest.json");
        let manifest_json = serde_json::to_string_pretty(&manifest)?;
        fs::write(&manifest_path, manifest_json)?;
        
        // Compress backup
        self.compress_backup(&backup_path).await?;
        
        Ok(BackupInfo {
            path: backup_path.with_extension("tar.gz"),
            size: self.get_backup_size(&backup_path)?,
            checksum: manifest.checksum
        })
    }
}
```

#### Scheduled Backups

```typescript
// frontend/src/hooks/useScheduledBackup.ts
import { useEffect } from 'react';

export const useScheduledBackup = () => {
  useEffect(() => {
    // Schedule daily backup at 2 AM
    const scheduleBackup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);
      
      const msUntilBackup = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        // Trigger backup
        invoke('create_system_backup');
        
        // Schedule next backup
        scheduleBackup();
      }, msUntilBackup);
    };
    
    scheduleBackup();
  }, []);
};
```

## CI/CD Pipeline Enhancements

### Multi-Environment Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_run:
    inputs:
      environment:
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v3
        
      - name: Configure Environment
        run: |
          if [ "${{ github.event.inputs.environment }}" = "production" ]; then
            echo "NODE_ENV=production" >> .env
            echo "API_URL=https://api.rpma.com" >> .env
          else
            echo "NODE_ENV=staging" >> .env
            echo "API_URL=https://staging-api.rpma.com" >> .env
          fi
        
      - name: Build Application
        run: npm run build
        
      - name: Deploy to Production
        if: github.event.inputs.environment == 'production'
        run: |
          # Production deployment steps
          npm run deploy:prod
          
      - name: Deploy to Staging
        if: github.event.inputs.environment == 'staging'
        run: |
          # Staging deployment steps
          npm run deploy:staging
          
      - name: Run Smoke Tests
        run: |
          # Run automated smoke tests
          npm run test:smoke
          
      - name: Notify Team
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
          message: 'Successfully deployed to ${{ github.event.inputs.environment }}'
```

---

**Document Version**: 2.0
**Last Updated**: Based on comprehensive codebase analysis
