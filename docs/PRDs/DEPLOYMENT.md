# Deployment Documentation

This document describes the deployment and distribution strategy for RPMA-Rust.

## Environment Configuration

The application uses environment variables for configuration during build and runtime. Key variables include:

- `RPMA_DB_KEY`: The encryption key used to protect the local SQLite database.
- `RPMA_DB_METRICS`: (Optional) If set, enables detailed database query performance tracking.

## Build Process

The application is built using the standard Tauri build pipeline, which packages the frontend and compiles the Rust backend into a platform-native executable.

### 1. Frontend Build
```bash
npm install
npm run frontend:build
```
This generates a static Next.js export in `frontend/out`.

### 2. Rust Backend Build
```bash
cd src-tauri
cargo build --release
```

### 3. Tauri Bundle
```bash
npm run build
```
This uses `tauri build` to package the static frontend assets and the compiled binary into an installer (e.g., `.msi` for Windows).

## Continuous Integration & Deployment (CI/CD)

The project uses GitHub Actions for automated testing, building, and releases.

### Workflows (`.github/workflows/`)

| Workflow | Description |
|---|---|
| `ci.yml` | Triggered on every push and PR. Runs linting, type-checking, and the full backend test suite (`make test`). |
| `build.yml` | Verifies that the application can be built successfully on all target platforms (Windows, Linux, macOS). |
| `release.yml` | Triggered when a new tag is pushed. Automatically builds production installers and creates a GitHub Release with the artifacts. |

## Distribution

As a Tauri desktop application, RPMA-Rust is distributed as a standalone installer:

- **Windows**: `.msi` or `.exe` installers.
- **macOS**: `.app` bundles or `.dmg` disk images.
- **Linux**: `.AppImage` or `.deb` packages.

### Updates
Tauri's built-in updater (if configured in `tauri.conf.json`) allows the application to check for new releases on GitHub and prompt the user to update.

## Hardware & OS Requirements

- **Windows**: Windows 10 or later (64-bit recommended).
- **macOS**: macOS 11 or later.
- **Linux**: Modern distribution (Ubuntu 22.04+, Fedora, etc.) with `webkit2gtk` dependencies.
- **Storage**: Minimum 200MB for the application + additional space for the encrypted SQLite database and stored photos.

## Deployment Checklist

- [ ] All Rust tests pass (`make test`).
- [ ] Frontend lint and type-check are clean.
- [ ] `npm run types:sync` has been run to ensure type consistency.
- [ ] Version number updated in `package.json` and `src-tauri/Cargo.toml`.
- [ ] Database migrations are consistent and tested.
- [ ] Encryption key `RPMA_DB_KEY` is securely stored and available to the build environment.
