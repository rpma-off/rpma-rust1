#!/usr/bin/env node
/**
 * backend-architecture-check.js
 *
 * Enforces ADR-001 (module boundaries) and ADR-002 (transaction boundaries /
 * persistence isolation) for the Rust backend.
 *
 * Detects:
 *  1. `rusqlite` imports in domain/ or application/ layers  (ADR-002)
 *  2. Direct cross-domain imports between bounded contexts   (ADR-001)
 *  3. SQL keyword usage (SELECT/INSERT/UPDATE/DELETE) in
 *     domain/ or application/ layers                        (ADR-002)
 *  4. Business-logic orchestration in ipc/ handlers         (ADR-005)
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
 *  for a file path, or null if it cannot be determined. */
function layerOf(filePath) {
  const rel = path.relative(DOMAINS_DIR, filePath);
  const parts = rel.split(path.sep);
  // parts[0] = domain name, parts[1] = layer folder, ...
  if (parts.length >= 2) return parts[1];
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

/** 2. Detect raw SQL keywords in domain/ or application/ layers. */
function checkSqlInDomainOrApp(file, lines, domain, layer) {
  if (layer !== 'domain' && layer !== 'application') return;

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

/** 3. Detect cross-domain imports that are not explicitly allowed. */
function checkCrossDomainImports(file, lines, fromDomain, layer) {
  if (layer === 'tests') return; // test helpers are allowed to cross domains

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match: use crate::domains::<other_domain>::
    const match = line.match(/use\s+crate::domains::([a-z_]+)::/);
    if (!match) continue;

    const toDomain = match[1];
    if (toDomain === fromDomain) continue; // same domain, OK

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
