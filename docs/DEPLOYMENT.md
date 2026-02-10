# Déploiement - RPMA v2

Ce document décrit le processus de déploiement complet de l'application RPMA v2, incluant la configuration, le build, la distribution, et la maintenance.

## 📋 Vue d'Ensemble

RPMA v2 est une application desktop multi-plateforme basée sur Tauri qui combine un backend Rust avec un frontend Next.js. L'application est conçue pour être déployée via des packages natifs sur Windows, macOS et Linux.

## 🏗️ Configuration de Build

### 1. Configuration Tauri

#### Fichier de Configuration Principal
```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "RPMA PPF Intervention",
  "version": "0.1.0",
  "identifier": "com.rpma.ppf-intervention",
  "build": {
    "beforeDevCommand": "cd frontend && npm run dev:next",
    "beforeBuildCommand": "cd frontend && npm run build",
    "frontendDist": "../frontend/.next",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [{
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
    }],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:3000 ws://localhost:3000 wss://localhost:3000; img-src 'self' asset: https://asset.localhost http://localhost:3000 data: blob:; style-src 'self'; script-src 'self'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg", "msi", "appimage"],
    "resources": [],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "publisher": "RPMA",
    "category": "Business",
    "shortDescription": "Gestion d'interventions PPF offline-first",
    "longDescription": "Application desktop pour gestion complète des interventions Paint Protection Film avec support 100% offline",
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com",
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "providerShortName": "RPMATech",
      "entitlements": null,
      "signingIdentity": null
    },
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

### 2. Configuration Rust

#### Optimisation Build Cargo
```toml
# src-tauri/Cargo.toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "z"
strip = true
overflow-checks = false

[profile.dev]
panic = "abort"
codegen-units = 16
opt-level = 0
debug = true
incremental = true
overflow-checks = false
```

### 3. Configuration Frontend

#### Build Next.js Optimisé
```json
// frontend/package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "export": "next export",
    "start": "next start"
  }
}
```

#### Configuration Next.js pour Tauri
```javascript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.target = 'electron-renderer';
      config.externals.push('electron', 'electron/renderer');
    }
    return config;
  }
};

module.exports = nextConfig;
```

## 🔧 Environnement de Build

### 1. Prérequis Système

#### Développement
```bash
# Node.js
node --version  # >= 18.0.0
npm --version     # >= 9.0.0

# Rust
rustc --version   # >= 1.77
cargo --version

# Platformes supportées
# Windows 10+ (x64)
# macOS 10.15+ (x64, arm64)
# Linux (Ubuntu 20.04+, CentOS 8+)
```

#### Build Production
```bash
# Windows
# Visual Studio Build Tools 2019+
# Windows 10 SDK

# macOS
# Xcode 12+
# macOS Command Line Tools

# Linux
# build-essential
# libwebkit2gtk-4.0-dev
# libssl-dev
# libgtk-3-dev
# libayatana-appindicator3-dev
# librsvg2-dev
```

### 2. Configuration des Variables d'Environnement

#### Variables de Build
```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=0.1.0
NEXT_PUBLIC_BUILD_DATE=$(date +%Y-%m-%d)
RUST_LOG=info
RPMA_DB_KEY=votre_cle_chiffrement_optionnelle
JWT_SECRET=dfc3d7f5c295d19b42e9b3d7eaa9602e45f91a9e5e95cbaa3230fc17e631c74b
```

#### Variables Système
```bash
# Configuration path
export RPMA_CONFIG_PATH="$HOME/.rpma"
export RPMA_DATA_PATH="$HOME/.rpma/data"
export RPMA_LOGS_PATH="$HOME/.rpma/logs"
export RPMA_BACKUP_PATH="$HOME/.rpma/backups"

# Performance
export RUST_BACKTRACE=1
export RUST_LOG_STYLE=always
```

## 🏭 Processus de Build

### 1. Build Développement

```bash
# Clone du projet
git clone <repository-url> rpma-rust
cd rpma-rust

# Installation dépendances
npm run install

# Démarrage développement
npm run dev
# Lance automatiquement:
# - Frontend Next.js (localhost:3000)
# - Backend Tauri (application desktop)
# - Synchronisation des types Rust ↔ TypeScript
```

### 2. Build Production

```bash
# Build frontend
npm run frontend:build

# Build application complète
npm run build

# Build release optimisé (Rust)
cd src-tauri
cargo build --release

# Création des packages
npm run tauri build
```

### 3. Structure des Artéfacts de Build

```
dist/
├── src-tauri/
│   ├── target/
│   │   ├── release/
│   │   │   ├── rpma-ppf-intervention.exe    # Windows
│   │   │   ├── rpma-ppf-intervention.app    # macOS
│   │   │   └── rpma-ppf-intervention.AppImage # Linux
│   │   └── bundle/
│   │       ├── msi/                     # Windows Installer
│   │       ├── dmg/                     # macOS Disk Image
│   │       ├── deb/                     # Linux Debian Package
│   │       └── appimage/                # Linux AppImage
│   └── icons/
├── frontend/.next/                    # Frontend build output
└── bundle/                           # Final application bundles
```

## 📦 Distribution Multi-Plateforme

### 1. Windows Distribution

#### Package MSI
```xml
<!-- installer.wxs -->
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" 
           Name="RPMA PPF Intervention" 
           Language="1033" 
           Version="0.1.0.0" 
           Manufacturer="RPMA" 
           UpgradeCode="GUID-UPGRADE-CODE">
    
    <Package InstallerVersion="200" 
             Compressed="yes" 
             InstallScope="perMachine" />
    
    <MediaTemplate EmbedCab="yes" />
    
    <Feature Id="ProductFeature" 
             Title="RPMA PPF Intervention" 
             Level="1">
      <ComponentRef Id="MainExecutable" />
      <ComponentRef Id="ApplicationShortcut" />
    </Feature>
    
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Component Id="MainExecutable" Guid="*">
        <File Id="RPMAExe" 
              Source="$(var.SourceDir)rpma-ppf-intervention.exe" 
              KeyPath="yes" />
      </Component>
    </Directory>
  </Product>
</Wix>
```

#### Configuration Windows
```json
{
  "publisher": "RPMA",
  "certificateThumbprint": null,
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com",
  "webviewInstallMode": {
    "type": "embedBootstrapper"
  }
}
```

#### Script d'Installation PowerShell
```powershell
# install.ps1
param($InstallPath = "$env:PROGRAMFILES\RPMA")

# Vérification des prérequis
if (-not (Test-Path $env:PROGRAMFILES\RPMA\rpma-ppf-intervention.exe)) {
    Write-Host "Installation de RPMA PPF Intervention..."
    
    # Création du répertoire
    New-Item -ItemType Directory -Force -Path $InstallPath
    
    # Copie des fichiers
    Copy-Item -Path ".\*" -Destination $InstallPath -Recurse -Force
    
    # Création du raccourci bureau
    $WshShell = New-Object -comObject WScript.Shell
    $WshShell.CreateShortcut("$env:PUBLIC\Desktop\RPMA.lnk", 
                              "$InstallPath\rpma-ppf-intervention.exe")
    
    # Configuration du registre
    New-Item -Path "HKLM:\SOFTWARE\RPMA" -Force
    New-ItemProperty -Path "HKLM:\SOFTWARE\RPMA" -Name "InstallPath" -Value $InstallPath -PropertyType String -Force
    
    Write-Host "Installation terminée avec succès!"
} else {
    Write-Host "RPMA PPF Intervention est déjà installé."
}
```

### 2. macOS Distribution

#### Configuration macOS
```json
{
  "frameworks": [],
  "minimumSystemVersion": "10.15",
  "providerShortName": "RPMATech",
  "entitlements": null,
  "signingIdentity": null
}
```

#### Script d'Installation macOS
```bash
#!/bin/bash
# install.sh

RPMA_APP="/Applications/RPMA PPF Intervention.app"

if [ ! -d "$RPMA_APP" ]; then
    echo "Installation de RPMA PPF Intervention..."
    
    # Extraction du DMG
    hdiutil attach "./RPMA-PPF-Intervention.dmg"
    APP_PATH=$(ls /Volumes/RPMA*/ | grep .app)
    
    # Copie vers Applications
    cp -R "/Volumes/RPMA*/$APP_PATH" "/Applications/"
    
    # Détachement
    hdiutil detach "/Volumes/RPMA*"
    
    # Permissions
    chmod -R 755 "/Applications/$APP_PATH"
    
    echo "Installation terminée! L'application est disponible dans le dossier Applications."
else
    echo "RPMA PPF Intervention est déjà installé."
fi
```

#### Configuration Notarisation
```bash
# notarize.sh
APP_NAME="RPMA PPF Intervention"
APP_PATH="./dist/macos/RPMA PPF Intervention.app"

# Upload pour notarisation
xcrun altool --notarize-app \
    --primary-bundle-id "com.rpma.ppf-intervention" \
    --username "developer@rpma.com" \
    --password "@keychain:AC_PASSWORD" \
    --file "$APP_PATH" \
    --output-format json

# Staple du ticket
xcrun stapler staple \
    "RPMA-PPF-Intervention.dmg" \
    "$APP_PATH"
```

### 3. Linux Distribution

#### Package Debian (.deb)
```bash
# debian/control
Package: rpma-ppf-intervention
Version: 0.1.0
Section: graphics
Priority: optional
Architecture: amd64
Depends: libwebkit2gtk-4.0-37 (>= 2.34.0), libssl1.1 (>= 1.1.1), libgtk-3-0 (>= 3.24.0)
Maintainer: RPMA <support@rpma.com>
Description: Application desktop pour la gestion d'interventions PPF
Homepage: https://rpma.com
```

#### Script Post-Installation
```bash
#!/bin/bash
# postinst
set -e

# Création raccourci bureau
update-desktop-database

# Configuration permissions
chmod +x /opt/rpma-ppf-intervention/rpma-ppf-intervention

# Message d'installation
echo "RPMA PPF Intervention a été installé avec succès!"
```

#### AppImage Configuration
```bash
# AppRun script
#!/bin/bash
HERE="$(dirname "$(readlink -f "${0}")"

export APPIMAGE="${APPIMAGE:-$HERE}"
export ARGV="$@"
export TMPDIR=$([ -z "${XDG_CACHE_HOME}" ] && echo "/tmp/${USER:-root}" || echo "${XDG_CACHE_HOME}/tmp")

exec "${APPIMAGE}/usr/bin/rpma-ppf-intervention" "$@"
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Type check
        run: npm run types:validate
        
      - name: Rust lint
        run: cd src-tauri && cargo clippy -- -D warnings
        
      - name: Rust format check
        run: cd src-tauri && cargo fmt -- --check

  build:
    needs: test
    strategy:
      matrix:
        platform: [ubuntu-latest, macos-latest, windows-latest]
    
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build frontend
        run: npm run frontend:build
        
      - name: Build Tauri app
        run: npm run tauri build
        env:
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
          
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.platform }}-build
          path: |
            src-tauri/target/release/bundle/
            src-tauri/target/release/rpma-ppf-intervention*
```

### 2. Release Automation

```yaml
# .github/workflows/release.yml
name: Create Release

on:
  push:
    tags: ['v*']

jobs:
  create-release:
    runs-on: ubuntu-latest
    needs: build
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          path: release-assets
          
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: RPMA v${{ github.ref_name }}
          draft: false
          prerelease: false
          files: |
            release-assets/msi/rpma-ppf-intervention.msi
            release-assets/dmg/rpma-ppf-intervention.dmg
            release-assets/appimage/rpma-ppf-intervention.AppImage
```

## 🔧 Monitoring et Maintenance

### 1. Configuration Monitoring

#### Application Monitoring
```rust
// src-tauri/src/monitoring.rs
use serde_json::json;
use tauri::Manager;

pub struct AppMonitor {
    app: tauri::AppHandle,
}

impl AppMonitor {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
    
    pub fn track_crash(&self, error: &str) {
        let crash_data = json!({
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "error": error,
            "user_id": self.get_user_id()
        });
        
        // Envoyer au service de monitoring
        self.send_to_monitoring_service("crash", crash_data);
    }
    
    pub fn track_performance(&self, metric: &str, value: f64) {
        let perf_data = json!({
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "metric": metric,
            "value": value,
            "session_id": self.get_session_id()
        });
        
        self.send_to_monitoring_service("performance", perf_data);
    }
}
```

#### Health Checks Automatisés
```rust
// src-tauri/src/health.rs
pub struct HealthChecker {
    pub async fn run_comprehensive_check(&self) -> HealthReport {
        let mut report = HealthReport::new();
        
        // Check base de données
        report.database = self.check_database_health().await;
        
        // Check performance
        report.performance = self.check_performance_metrics().await;
        
        // Check synchronisation
        report.sync = self.check_sync_status().await;
        
        // Check sécurité
        report.security = self.check_security_status().await;
        
        report
    }
}
```

### 2. Mise à Jour Automatique

#### Update Service Configuration
```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://updates.rpma.com/api/updates/{{target}}/{{current_version}}"
    ],
    "dialog": {},
    "pubkey": "YOUR_PUBLIC_KEY_HERE"
  }
}
```

#### Update Manager
```rust
// src-tauri/src/updater.rs
pub struct UpdateManager {
    pub async fn check_for_updates(&self) -> Result<UpdateInfo, AppError> {
        let current_version = env!("CARGO_PKG_VERSION");
        let update_info = self.fetch_update_info(&current_version).await?;
        
        if update_info.is_update_available {
            self.notify_user_of_update(&update_info).await?;
        }
        
        Ok(update_info)
    }
    
    pub async fn install_update(&self) -> Result<(), AppError> {
        let update_url = self.get_update_url().await?;
        
        // Téléchargement et installation silencieuse
        self.download_and_install(&update_url).await
    }
}
```

## 🚀 Déploiement en Production

### 1. Processus de Release

#### Versioning Strategy
```
Major.Minor.Patch
Ex: 0.1.0

- Major: Changements majeurs (nouvelles fonctionnalités importantes)
- Minor: Nouvelles fonctionnalités (retrocompatibles)
- Patch: Corrections de bugs (rétrocompatibles)
```

#### Release Checklist
```
[ ] Tests manuels complets sur toutes plateformes
[ ] Validation de performance et sécurité
[ ] Vérification de l'installation propre
[ ] Test de mise à jour depuis version précédente
[ ] Validation du fonctionnement offline
[ ] Test de synchronisation des données
[ ] Vérification de la documentation
[ ] Backup des serveurs de mise à jour
[ ] Communication aux utilisateurs
```

### 2. Distribution Channels

#### Canal Stable
```bash
# Distribution principale pour tous utilisateurs
npm run tauri build
# Upload vers serveur principal
# Notification aux utilisateurs
```

#### Canal Beta
```bash
# Distribution pour tests avancés
npm run tauri build -- --features beta
# Upload vers serveur beta
# Limited beta tester group
```

#### Canal Nightly
```bash
# Builds quotidiens pour développement
npm run tauri build -- --features nightly
# Upload vers serveur de dev
# Équipe de développement uniquement
```

### 3. Rollback Strategy

#### Rollback Automatisé
```bash
# Conservation des versions précédentes
cp rpma-ppf-intervention.exe rpma-ppf-intervention-v0.0.9.exe
cp rpma-ppf-intervention.app rpma-ppf-intervention-v0.0.9.app

# Script de rollback
if [ "$UPDATE_FAILED" = "true" ]; then
    echo "Rollback to previous version..."
    ./rpma-ppf-intervention-v0.0.9.exe
fi
```

## 📊 Analytics de Déploiement

### 1. Métriques de Téléchargement

#### Tracking Integration
```javascript
// download-tracking.js
function trackDownload(platform, version) {
    gtag('event', 'download', {
        'event_category': 'Application',
        'event_label': `${platform}-${version}`,
        'custom_map': {
            'platform': platform,
            'version': version,
            'download_source': document.referrer
        }
    });
}
```

#### Dashboard Analytics
```
┌─────────────────────────────────────────────────────────────┐
│                    Analytics de Déploiement                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Downloads  │    │   Install    │    │   Active     │  │
│  │   by Platform │    │   Success    │    │   Users      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Version    │    │   Geography   │    │   Devices     │  │
│  │   Adoption   │    │   Distribution│    │   Types       │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Monitoring des Incidents

#### Alerting System
```rust
// src-tauri/src/alerting.rs
pub struct AlertManager {
    pub async fn check_system_health(&self) {
        if self.detect_critical_issue().await {
            self.send_alert(&Alert {
                level: AlertLevel::Critical,
                message: "System health degraded",
                component: "database",
                action: "Immediate restart required"
            }).await;
        }
    }
}
```

## 🔒 Sécurité de Déploiement

### 1. Signature des Applications

#### Windows Code Signing
```powershell
# sign-windows.ps1
$cert = "cert:\CurrentUser\My\RPMA_Certificate"
$timestamp_server = "http://timestamp.digicert.com"

signtool sign /f /t $timestamp_server /d "RPMA PPF Intervention" $cert rpma-ppf-intervention.exe
```

#### macOS Code Signing
```bash
# sign-macos.sh
IDENTITY="Developer ID Application: RPMA Team (TEAM_ID)"
ENTITLEMENTS="entitlements.plist"

codesign --force --options runtime --sign "$IDENTITY" --entitlements "$ENTITLEMENTS" "RPMA PPF Intervention.app"
```

### 2. Sécurité du Build

#### Security Headers
```json
{
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://api.rpma.com; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;"
  }
}
```

#### Hardening Runtime
```rust
// src-tauri/src/security.rs
pub fn setup_security_policies() {
    // Désactivation des fonctionnalités non sécurisées
    #[cfg(windows)]
    {
        // Windows hardening
        std::env::set_var("NODE_OPTIONS", "--no-sandbox");
    }
    
    // Validation des inputs
    validate_environment();
    
    // Restrictions réseau
    configure_network_policies();
}
```

## 📋 Support et Maintenance

### 1. Documentation Déployée

#### Site de Support
```
https://support.rpma.com/
├── Installation guides
├── User manuals  
├── Troubleshooting
├── FAQ
├── Video tutorials
└── Contact support
```

#### Knowledge Base Structure
```
knowledge/
├── Getting Started/
├── User Guides/
├── Technical Documentation/
├── Known Issues/
├── Best Practices/
└── Video Library/
```

### 2. Support Technique

#### Ticket System Integration
```rust
// src-tauri/src/support.rs
pub struct SupportManager {
    pub async fn create_support_ticket(&self, issue: SupportIssue) -> Result<String, AppError> {
        let ticket = json!({
            "title": issue.title,
            "description": issue.description,
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "user_id": self.get_user_id(),
            "logs": self.collect_relevant_logs(&issue).await
        });
        
        self.send_to_support_system(ticket).await
    }
}
```

---

*Cette documentation de déploiement est maintenue à jour avec chaque nouvelle version et plateforme supportée.*