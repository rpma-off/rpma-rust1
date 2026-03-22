#!/usr/bin/env node
/**
 * validate-migration-system.js
 *
 * Enforces migration file-system integrity per ADR-010:
 *   V1 — File naming format (NNN_snake_case.sql)
 *   V2 — Sequential numbering with documented gap allowlist
 *   V3 — No duplicate migration numbers
 *   V4 — Idempotency: CREATE TABLE/INDEX/TRIGGER/VIEW must use IF NOT EXISTS
 *
 * Exit codes:
 *   0 – all checks passed (warnings may still be printed)
 *   1 – one or more errors found
 *
 * Usage:
 *   node scripts/validate-migration-system.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT           = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'src-tauri', 'migrations');

// Versions intentionally handled by Rust code (apply_migration match arms in
// src-tauri/src/db/migrations/mod.rs) that have NO corresponding .sql file.
// Version 1 is special: handled by schema.sql via init(), not a migration file.
// Versions 29 and 30 are pure Rust data migrations (no SQL file exists).
const KNOWN_RUST_ONLY_GAPS = new Set([1, 29, 30]);

const errors   = [];
const warnings = [];

function addError(msg)   { errors.push(msg); }
function addWarning(msg) { warnings.push(msg); }

// ─── V1: Naming format ────────────────────────────────────────────────────────

const VALID_NAME_RE = /^\d{3}_[a-z0-9_]+\.sql$/;

function checkNamingFormat(files) {
  for (const f of files) {
    if (!VALID_NAME_RE.test(f)) {
      addError(
        `[ADR-010] V1 — Invalid migration filename: "${f}"\n` +
        `  Expected format: NNN_snake_case_description.sql (e.g. 042_add_users_index.sql)`
      );
    }
  }
}

// ─── V2 + V3: Sequential numbering & duplicates ───────────────────────────────

function checkNumbering(files) {
  // Parse numeric prefix from each valid filename
  const parsed = [];
  for (const f of files) {
    const m = f.match(/^(\d{3})/);
    if (m) parsed.push({ version: parseInt(m[1], 10), name: f });
  }

  // V3: detect duplicates
  const seen = new Map(); // version → name
  for (const { version, name } of parsed) {
    if (seen.has(version)) {
      addError(
        `[ADR-010] V3 — Duplicate migration number ${String(version).padStart(3, '0')}:\n` +
        `  ${seen.get(version)}\n` +
        `  ${name}\n` +
        `  → Renumber one of these files`
      );
    } else {
      seen.set(version, name);
    }
  }

  if (parsed.length === 0) return;

  const max = Math.max(...parsed.map((p) => p.version));

  // V2: walk 1..max checking for unexpected gaps
  for (let v = 1; v <= max; v++) {
    if (seen.has(v)) continue;               // present as SQL file — OK
    if (KNOWN_RUST_ONLY_GAPS.has(v)) continue; // documented Rust-only — OK

    addError(
      `[ADR-010] V2 — Missing migration file for version ${String(v).padStart(3, '0')}\n` +
      `  No file matching "${String(v).padStart(3, '0')}_*.sql" found and version is not\n` +
      `  in KNOWN_RUST_ONLY_GAPS. Either add the SQL file or add ${v} to\n` +
      `  KNOWN_RUST_ONLY_GAPS in scripts/validate-migration-system.js`
    );
  }
}

// ─── V4: Idempotency ──────────────────────────────────────────────────────────

// Match bare CREATE <keyword> without IF NOT EXISTS.
const BARE_CREATE_RE = /^\s*CREATE\s+(UNIQUE\s+)?(?:TABLE|INDEX|TRIGGER|VIEW)\s+(?!IF\s+NOT\s+EXISTS)/i;

// Extract the object type + name from a CREATE or DROP statement.
const DDL_NAME_RE = /(?:CREATE|DROP)\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TRIGGER|VIEW)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)/i;

/**
 * SQLite does not support CREATE TRIGGER IF NOT EXISTS on older versions.
 * The canonical workaround is DROP TRIGGER/VIEW IF EXISTS immediately
 * before a bare CREATE TRIGGER/VIEW — this is accepted as idempotent.
 * Verify that a DROP IF EXISTS for the same object appears within the
 * 10 lines preceding the bare CREATE.
 */
function hasPrecedingDropIfExists(lines, createLineIdx) {
  const createLine = lines[createLineIdx];
  const nameMatch  = createLine.match(DDL_NAME_RE);
  if (!nameMatch) return false;
  const objectName = nameMatch[1].toLowerCase();

  const dropRe = new RegExp(
    `DROP\\s+(?:TRIGGER|VIEW|TABLE|INDEX)\\s+IF\\s+EXISTS\\s+${objectName}\\b`,
    'i'
  );

  const lookback = Math.max(0, createLineIdx - 10);
  for (let k = createLineIdx - 1; k >= lookback; k--) {
    if (dropRe.test(lines[k])) return true;
  }
  return false;
}

function checkIdempotency(sqlFile, content) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment-only lines and empty lines
    if (/^\s*--/.test(line) || /^\s*$/.test(line)) continue;
    if (!BARE_CREATE_RE.test(line)) continue;

    // DROP IF EXISTS + bare CREATE is the accepted SQLite idiom for triggers/views
    if (hasPrecedingDropIfExists(lines, i)) continue;

    addError(
      `[ADR-010] V4 — Non-idempotent DDL statement (missing IF NOT EXISTS):\n` +
      `  src-tauri/migrations/${path.basename(sqlFile)}:${i + 1}\n` +
      `  ${line.trim()}\n` +
      `  → Use CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS, or\n` +
      `    precede with DROP <TYPE> IF EXISTS <name> for TRIGGER/VIEW`
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.error(`ERROR: migrations directory not found at ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const allFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

checkNamingFormat(allFiles);
checkNumbering(allFiles);

for (const filename of allFiles) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const content  = fs.readFileSync(fullPath, 'utf8');
  checkIdempotency(fullPath, content);
}

// ─── Report ───────────────────────────────────────────────────────────────────

console.log('\n── Migration System Validation ─────────────────────────────');
console.log(`Checked ${allFiles.length} migration files.\n`);

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ⚠  ${w}\n`);
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ✖  ${e}\n`);
  console.log(`\nMigration system validation FAILED with ${errors.length} error(s).`);
  process.exit(1);
}

console.log('Migration system validation PASSED ✓');
process.exit(0);
