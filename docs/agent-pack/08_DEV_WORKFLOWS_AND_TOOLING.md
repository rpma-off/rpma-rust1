# Dev Workflows & Tooling

Mastering the scripts in the `scripts/` folder is essential to staying within the guardrails of RPMA v2.

## Running the App Locally
```bash
# Start Next.js and Tauri concurrently
npm run dev

# Alternatively, run just the frontend to test UI purely (if mocking API)
npm run frontend:dev
```

## "If you change X, you must run Y" Checklist
- **Change a Rust Model (`ts-rs`)**: Must run `npm run types:sync` or CI will fail.
- **Change cross-domain imports**: Must run `npm run validate:bounded-contexts`.
- **Add a backend feature**: Must run `npm run architecture:check` to ensure you didn't bypass DDD boundaries.
- **Add an IPC Command**: Must ensure RBAC is applied and run `node scripts/ipc-authorization-audit.js`.
- **Modify SQL Migrations**: Must run `node scripts/validate-migration-system.js`.

## Quality Gates & Audits
Located in `package.json` and the `scripts/` dir, run `npm run prod:gate` to simulate CI:
1. `npm run fronted:lint`
2. `npm run frontend:type-check`
3. `node scripts/architecture-check.cjs`
4. `npm run test:ci`

### Additional Helpful Scripts
- `node scripts/detect-duplication.js`: Finds heavily copied code blocks.
- `node scripts/check-type-drift.js`: Asserts that TS types exactly match Rust definitions.
- `node scripts/security-audit.js`: Runs `npm audit` and `cargo-deny` together.

## Release Basics
- Use **Conventional Commits** (`feat:`, `fix:`, `refactor:`).
- Pushes to `main` are guarded by Husky hooks.
- Build for release: `npm run backend:build:release` or let GitHub Actions build the `.msi`/`.app` via the Tauri bundler.
