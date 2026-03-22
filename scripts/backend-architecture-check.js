#!/usr/bin/env node
/**
 * backend-architecture-check.js
 *
 * Enforces ADR-001 (module boundaries) and ADR-002 (transaction boundaries /
 * persistence isolation) for the Rust backend.
 *
 * Detects:
 *  1. `rusqlite` imports in domain/ or application/ layers  (ADR-002)
 *  2. SQL keyword usage (SELECT/INSERT/UPDATE/DELETE) in
 *     domain/, application/, or ipc/ layers                 (ADR-002)
 *  3. Direct cross-domain imports between bounded contexts   (ADR-001)
 *  4. Business-logic orchestration in ipc/ handlers         (ADR-005)
 *  5. #[tauri::command] handlers missing resolve_context!   (ADR-006)
 *  6. pub use of domain/infrastructure internals in mod.rs  (ADR-001)
 *
 * Exit codes:
 *   0 – all checks passed (warnings may still be printed)
 *   1 – one or more errors found
 *
 * Usage:
 *   node scripts/backend-architecture-check.js [--strict]
 *
 * With --strict the script also fails on warnings.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ─────────────────────────────────────────────────────────────────

const ROOT        = path.resolve(__dirname, '..');
const DOMAINS_DIR = path.join(ROOT, 'src-tauri', 'src', 'domains');
const STRICT      = process.argv.includes('--strict');

// Cross-domain imports that are intentionally accepted (documented exceptions).
// Format: "SOURCE_DOMAIN -> TARGET_DOMAIN : reason"
const ALLOWED_CROSS_DOMAIN = [
  // Documents application layer needs Interventions types for PDF rendering
  { from: 'documents', to: 'interventions', layer: 'application' },
  // Documents application layer needs Clients types for report view-model tests
  { from: 'documents', to: 'clients',       layer: 'application' },
  // Reports application layer delegates PDF generation to Documents service
  { from: 'reports',   to: 'documents',     layer: 'application' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively collect all *.rs files under `dir`. */
function collectRustFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRustFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      results.push(full);
    }
  }
  return results;
}

/** Return the layer name ('domain', 'application', 'ipc', 'infrastructure', 'tests')
 *  for a file path, or null if it cannot be determined.
 *
 *  Extended to cover flat domain handler files (Gap A fix):
 *  - Root-level handler files (<domain>/<name>_handler.rs) are treated as IPC.
 *  - Files explicitly named ipc.rs inside handler directories are treated as IPC.
 *  - Repository/query files inside handler directories are skipped (infrastructure).
 */
function layerOf(filePath) {
  const rel   = path.relative(DOMAINS_DIR, filePath);
  const parts = rel.split(path.sep);
  // parts[0] = domain name, parts[1] = layer folder or handler dir or handler file

  if (parts.length < 2) return null;

  const second   = parts[1];
  const filename = parts[parts.length - 1];

  // Standard layers
  const STANDARD_LAYERS = new Set(['domain', 'application', 'ipc', 'infrastructure', 'tests']);
  if (STANDARD_LAYERS.has(second)) return second;

  // Flat handler *file* at domain root: settings_handler.rs, user_settings_handler.rs …
  // (e.g. settings/settings_handler.rs, documents/photo_handler.rs)
  if (parts.length === 2 && second.endsWith('_handler.rs')) return 'ipc';

  // Files explicitly named ipc.rs inside a handler directory
  // (e.g. clients/client_handler/ipc.rs, calendar/calendar_handler/ipc.rs)
  if (second.endsWith('_handler') && filename === 'ipc.rs') return 'ipc';

  // Everything else inside *_handler/ directories (repository.rs, mod.rs, etc.)
  // contains infrastructure/application code — skip to avoid false positives.

  return null;
}

/** Return the domain name for a file path, or null. */
function domainOf(filePath) {
  const rel = path.relative(DOMAINS_DIR, filePath);
  return rel.split(path.sep)[0] || null;
}

/** Check whether a cross-domain import is explicitly allowed. */
function isCrossDomainAllowed(fromDomain, toDomain, layer) {
  return ALLOWED_CROSS_DOMAIN.some(
    (e) => e.from === fromDomain && e.to === toDomain && e.layer === layer
  );
}

// ─── Checks ──────────────────────────────────────────────────────────────────

const errors   = [];
const warnings = [];

function addError(msg)   { errors.push(msg); }
function addWarning(msg) { warnings.push(msg); }

/** 1. Detect `rusqlite` imports in domain/ or application/ layers. */
function checkRusqliteInDomainOrApp(file, lines, domain, layer) {
  if (layer !== 'domain' && layer !== 'application') return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*use\s+rusqlite/.test(line) || /^\s*use\s+crate::db::FromSqlRow/.test(line)) {
      addError(
        `[ADR-002] rusqlite/FromSqlRow import in ${layer}/ layer:\n` +
        `  ${path.relative(ROOT, file)}:${i + 1}\n` +
        `  ${line.trim()}\n` +
        `  → Move row-mapping impls to infrastructure/ (see tasks domain pilot in task_row_mapping.rs)`
      );
    }
  }
}

/** 2. Detect raw SQL keywords in domain/, application/, or ipc/ layers.
 *     (ipc/ includes flat domain handler files — Gap A fix.) */
function checkSqlInDomainOrApp(file, lines, domain, layer) {
  if (layer !== 'domain' && layer !== 'application' && layer !== 'ipc') return;

  // Require paired SQL keywords to avoid false positives:
  //   SELECT ... FROM, INSERT INTO, UPDATE ... SET, DELETE FROM
  const sqlPattern = /["'`]\s*(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\s/i;
  for (let i = 0; i < lines.length; i++) {
    if (sqlPattern.test(lines[i])) {
      addError(
        `[ADR-002] SQL statement found in ${layer}/ layer:\n` +
        `  ${path.relative(ROOT, file)}:${i + 1}\n` +
        `  ${lines[i].trim()}\n` +
        `  → Move SQL to infrastructure/ repositories`
      );
    }
  }
}

/** 3. Detect cross-domain imports that are not explicitly allowed.
 *     Also audits same-domain absolute-path imports (ADR-002/ADR-003:
 *     prefer relative paths such as `super::` over full `crate::domains::`
 *     paths within the same domain). */
function checkCrossDomainImports(file, lines, fromDomain, layer) {
  if (layer === 'tests') return; // test helpers are allowed to cross domains

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match: use crate::domains::<domain>::
    const match = line.match(/use\s+crate::domains::([a-z_]+)::/);
    if (!match) continue;

    const toDomain = match[1];
    if (toDomain === fromDomain) {
      // [ADR-002/ADR-003] Same-domain absolute-path import — audit-mode warning.
      // Relative paths (e.g. `super::`, `self::`) make intra-domain
      // dependencies explicit to the module graph and cannot be mistaken
      // for cross-domain references.
      addWarning(
        `[ADR-002/ADR-003] Same-domain absolute import (prefer relative path) in ${layer}/:\n` +
        `  ${path.relative(ROOT, file)}:${i + 1}\n` +
        `  ${line.trim()}\n` +
        `  → Replace \`crate::domains::${fromDomain}::\` with a relative path (e.g. \`super::\`)`
      );
      continue;
    }

    if (!isCrossDomainAllowed(fromDomain, toDomain, layer)) {
      addError(
        `[ADR-001] Cross-domain import not in allowlist (${fromDomain} → ${toDomain}) in ${layer}/:\n` +
        `  ${path.relative(ROOT, file)}:${i + 1}\n` +
        `  ${line.trim()}\n` +
        `  → Use shared contracts, events, or add an entry to ALLOWED_CROSS_DOMAIN if justified`
      );
    }
  }
}

/** 5. Warn when a #[tauri::command] handler file does not call resolve_context!
 *     Non-public IPC handlers must resolve the request context to enforce auth
 *     (ADR-006). Publicly accessible handlers are listed in PUBLIC_HANDLER_FILES. */

// Files whose handlers are legitimately public (no auth required).
// Paths are relative to DOMAINS_DIR or SRC_DIR root.
const PUBLIC_HANDLER_FILES = new Set([
  // Authentication flows — callers are not yet authenticated
  path.join('auth', 'ipc', 'auth.rs'),
  path.join('auth', 'ipc', 'auth_security.rs'),
  // System / navigation commands do not touch domain data
  path.join('..', 'commands', 'navigation.rs'),
  path.join('..', 'commands', 'system.rs'),
  path.join('..', 'commands', 'mod.rs'),
  // Correlation ID passthrough — no business data
  path.join('..', 'shared', 'ipc', 'correlation.rs'),
  // Logging endpoint — no auth gate needed
  path.join('..', 'logging', 'mod.rs'),
]);

function checkResolveContext(file, content, layer) {
  if (layer !== 'ipc') return;
  if (!content.includes('#[tauri::command]')) return;

  // Skip files listed as intentionally public
  const relFromDomains = path.relative(DOMAINS_DIR, file);
  if (PUBLIC_HANDLER_FILES.has(relFromDomains)) return;

  if (!content.includes('resolve_context!')) {
    addWarning(
      `[ADR-006] CHECK-5 — IPC handler file has #[tauri::command] but no resolve_context! call:\n` +
      `  ${path.relative(ROOT, file)}\n` +
      `  → Either add resolve_context! to authenticate the request, or add this file\n` +
      `    to PUBLIC_HANDLER_FILES in backend-architecture-check.js if auth is intentionally skipped`
    );
  }
}

/** 6. Detect pub use of domain/ or infrastructure/ internals in ipc/ or application/ files
 *     (ADR-001: layer abstractions must not be bypassed by re-exporting internals). */
function checkPubUseInternals(file, lines, layer) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-pub-use lines and comment lines
    if (!/^\s*pub\s+use\b/.test(line)) continue;
    if (/^\s*\/\//.test(line)) continue;

    let violation = null;

    // ipc/ files must not re-export from domain/ or infrastructure/
    if (layer === 'ipc') {
      if (/::domain::/.test(line) || /::infrastructure::/.test(line)) {
        violation = 'ipc/ leaks domain/infrastructure internals';
      }
    }

    // application/ files must not re-export from infrastructure/
    if (layer === 'application') {
      if (/::infrastructure::/.test(line)) {
        violation = 'application/ leaks infrastructure internals';
      }
    }

    if (violation) {
      addError(
        `[ADR-001] CHECK-6 — pub use leaks layer internals (${violation}):\n` +
        `  ${path.relative(ROOT, file)}:${i + 1}\n` +
        `  ${line.trim()}\n` +
        `  → Remove pub use or move the type to a shared contract`
      );
    }
  }
}

/** 4. Warn when an ipc/ handler contains substantial business logic heuristics
 *     (complex match arms, domain-type construction, etc.). */
function checkBusinessLogicInIpc(file, lines, domain, layer) {
  if (layer !== 'ipc') return;

  // Heuristic: constructing a domain struct from another domain inside IPC
  for (let i = 0; i < lines.length; i++) {
    if (/crate::domains::[a-z_]+::domain::models::[a-z_]+::[A-Z][A-Za-z]+\s*\{/.test(lines[i])) {
      const match = lines[i].match(/crate::domains::([a-z_]+)::domain/);
      if (match && match[1] !== domain) {
        addWarning(
          `[ADR-005] Cross-domain domain-model construction in ipc/ handler:\n` +
          `  ${path.relative(ROOT, file)}:${i + 1}\n` +
          `  ${lines[i].trim()}\n` +
          `  → Move orchestration/conversion to the application/ layer`
        );
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DOMAINS_DIR)) {
  console.error(`ERROR: domains directory not found at ${DOMAINS_DIR}`);
  process.exit(1);
}

const allDomains = fs
  .readdirSync(DOMAINS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let filesChecked = 0;

for (const domain of allDomains) {
  const domainDir = path.join(DOMAINS_DIR, domain);
  const files = collectRustFiles(domainDir);

  for (const file of files) {
    const layer = layerOf(file);
    if (!layer) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines   = content.split('\n');

    checkRusqliteInDomainOrApp(file, lines, domain, layer);
    checkSqlInDomainOrApp(file, lines, domain, layer);
    checkCrossDomainImports(file, lines, domain, layer);
    checkBusinessLogicInIpc(file, lines, domain, layer);
    checkResolveContext(file, content, layer);
    checkPubUseInternals(file, lines, layer);

    filesChecked++;
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`\n── Backend Architecture Check ──────────────────────────────`);
console.log(`Checked ${filesChecked} Rust source files across ${allDomains.length} domains.\n`);

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ⚠  ${w}\n`);
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ✖  ${e}\n`);
  console.log(`\nBackend architecture check FAILED with ${errors.length} error(s).`);
  process.exit(1);
}

if (STRICT && warnings.length > 0) {
  console.log(`\nBackend architecture check FAILED in strict mode (${warnings.length} warning(s)).`);
  process.exit(1);
}

console.log('Backend architecture check PASSED ✓');
process.exit(0);
