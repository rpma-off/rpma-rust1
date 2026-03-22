#!/usr/bin/env node
/**
 * check-soft-delete-consistency.js
 *
 * Verifies the soft-delete pattern (ADR-011) is consistently applied:
 *   S1 — Every table with deleted_at has a partial index WHERE deleted_at IS NULL
 *   S2 — Rust query builders for soft-delete tables include 'deleted_at IS NULL'
 *   S3 — No code uses '= NULL' instead of 'IS NULL' for deleted_at (invalid SQL)
 *
 * Exit codes:
 *   0 – all checks passed (warnings may still be printed)
 *   1 – one or more errors found
 *
 * Usage:
 *   node scripts/check-soft-delete-consistency.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT           = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'src-tauri', 'migrations');
const DOMAINS_DIR    = path.join(ROOT, 'src-tauri', 'src', 'domains');

// Maps table name → domain directory (for S2 query file lookup).
// Only tables where we expect Rust query builders.
const TABLE_TO_DOMAIN = {
  tasks:                'tasks',
  quotes:               'quotes',
  quote_items:          'quotes',
  materials:            'inventory',
  clients:              'clients',
  interventions:        'interventions',
  photos:               'documents',
  intervention_reports: 'documents',
  users:                'users',
  notifications:        'notifications',
  organizations:        'organizations',
};

// Tables we know intentionally skip the query-builder IS NULL check
// (e.g. trash domain queries deleted items ON PURPOSE via deleted_at IS NOT NULL).
const SKIP_QUERY_CHECK = new Set(['trash']);

// Temporary migration tables that are renamed or dropped before the DB is used in production.
// These do not need partial indexes or query-builder checks.
const TEMP_MIGRATION_TABLES = new Set([
  'tasks_new',  // migration 002: renamed to tasks after data copy
]);

const errors   = [];
const warnings = [];

function addError(msg)   { errors.push(msg); }
function addWarning(msg) { warnings.push(msg); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively collect all *.rs files under a directory. */
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

// ─── S1: Partial index existence ──────────────────────────────────────────────

/**
 * Parse all migration SQL to find:
 *   - Tables that have a deleted_at column (from CREATE TABLE or ALTER TABLE ADD COLUMN)
 *   - CREATE INDEX ... WHERE deleted_at IS NULL statements
 * Returns { softDeleteTables: Set<string>, indexedTables: Set<string> }
 */
function parseSoftDeleteInfo(files) {
  const softDeleteTables = new Set(); // tables with deleted_at column
  const indexedTables    = new Set(); // tables with a partial IS NULL index

  for (const filename of files) {
    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const content  = fs.readFileSync(fullPath, 'utf8');
    const lines    = content.split('\n');

    // Track current CREATE TABLE block
    let inTableBlock  = false;
    let currentTable  = null;
    let parenDepth    = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect CREATE TABLE start
      const tableMatch = line.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(/i
      );
      if (tableMatch) {
        inTableBlock = true;
        currentTable = tableMatch[1].toLowerCase();
        parenDepth   = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        // Check if deleted_at is on the same line as CREATE TABLE
        if (/\bdeleted_at\b/i.test(line)) {
          softDeleteTables.add(currentTable);
        }
        continue;
      }

      if (inTableBlock) {
        parenDepth += (line.match(/\(/g) || []).length;
        parenDepth -= (line.match(/\)/g) || []).length;
        if (/\bdeleted_at\b/i.test(line)) {
          softDeleteTables.add(currentTable);
        }
        if (parenDepth <= 0) {
          inTableBlock = false;
          currentTable = null;
        }
        continue;
      }

      // ALTER TABLE ... ADD COLUMN deleted_at
      const alterMatch = line.match(
        /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?deleted_at/i
      );
      if (alterMatch) {
        softDeleteTables.add(alterMatch[1].toLowerCase());
      }

      // CREATE INDEX ... ON tbl(...) WHERE deleted_at IS NULL
      if (/WHERE\s+deleted_at\s+IS\s+NULL/i.test(line)) {
        // Extract table name from ON clause
        const onMatch = line.match(/ON\s+(\w+)\s*\(/i);
        if (onMatch) {
          indexedTables.add(onMatch[1].toLowerCase());
        }
        // Also check multi-line: look for ON clause in previous lines
        for (let back = i - 1; back >= Math.max(0, i - 5); back--) {
          const prev = lines[back];
          const prevOn = prev.match(/ON\s+(\w+)\s*\(/i);
          if (prevOn) {
            indexedTables.add(prevOn[1].toLowerCase());
            break;
          }
          if (/CREATE\s+(UNIQUE\s+)?INDEX/i.test(prev)) break;
        }
      }
    }
  }

  return { softDeleteTables, indexedTables };
}

function checkPartialIndexes(softDeleteTables, indexedTables) {
  for (const table of softDeleteTables) {
    if (TEMP_MIGRATION_TABLES.has(table)) continue;
    if (!indexedTables.has(table)) {
      addWarning(
        `[ADR-011] S1 — Table '${table}' has deleted_at but no partial index WHERE deleted_at IS NULL\n` +
        `  → Add: CREATE INDEX IF NOT EXISTS idx_${table}_not_deleted ON ${table}(id) WHERE deleted_at IS NULL`
      );
    }
  }
}

// ─── S2: Rust query builders include deleted_at IS NULL ───────────────────────

function checkQueryBuilders(softDeleteTables) {
  for (const table of softDeleteTables) {
    if (TEMP_MIGRATION_TABLES.has(table)) continue;
    const domain = TABLE_TO_DOMAIN[table];
    if (!domain) continue;        // no mapped domain — skip
    if (SKIP_QUERY_CHECK.has(domain)) continue;

    const domainDir = path.join(DOMAINS_DIR, domain, 'infrastructure');
    if (!fs.existsSync(domainDir)) continue;

    const rustFiles = collectRustFiles(domainDir);
    if (rustFiles.length === 0) continue;

    // Search all infrastructure files for deleted_at IS NULL
    let found = false;
    for (const file of rustFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/deleted_at\s+IS\s+NULL/i.test(content)) {
        found = true;
        break;
      }
    }

    if (!found) {
      addError(
        `[ADR-011] S2 — Table '${table}' has deleted_at but domain '${domain}' infrastructure\n` +
        `  contains no 'deleted_at IS NULL' filter in query builders\n` +
        `  Directory: src-tauri/src/domains/${domain}/infrastructure/\n` +
        `  → Add "deleted_at IS NULL" to default WHERE conditions in the query builder`
      );
    }
  }
}

// ─── S3: No '= NULL' anti-pattern ─────────────────────────────────────────────

function checkNullEqualityAntiPattern() {
  if (!fs.existsSync(DOMAINS_DIR)) return;

  const domainDirs = fs
    .readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const domain of domainDirs) {
    const domainDir = path.join(DOMAINS_DIR, domain);
    for (const file of collectRustFiles(domainDir)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines   = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        // deleted_at = NULL  (not inside a comment)
        const line = lines[i];
        if (/^\s*\/\//.test(line)) continue; // skip comments
        // Only flag as error when deleted_at = NULL is used as a WHERE/AND/OR predicate,
        // NOT when it appears as a SET assignment (SET deleted_at = NULL is valid SQL).
        // Pattern: "WHERE|AND|OR deleted_at = NULL" — the comparison context.
        if (/\b(?:WHERE|AND|OR)\s+deleted_at\s*=\s*NULL\b/i.test(line)) {
          addError(
            `[ADR-011] S3 — Invalid NULL comparison: use 'IS NULL' not '= NULL' (always false in SQL)\n` +
            `  ${path.relative(ROOT, file)}:${i + 1}\n` +
            `  ${line.trim()}\n` +
            `  → Replace with: deleted_at IS NULL`
          );
        }
      }
    }
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

const { softDeleteTables, indexedTables } = parseSoftDeleteInfo(allFiles);

checkPartialIndexes(softDeleteTables, indexedTables);
checkQueryBuilders(softDeleteTables);
checkNullEqualityAntiPattern();

// ─── Report ───────────────────────────────────────────────────────────────────

const sortedTables = [...softDeleteTables].sort();

console.log('\n── Soft-Delete Consistency Check ───────────────────────────');
console.log(`Found ${softDeleteTables.size} tables with deleted_at: ${sortedTables.join(', ')}\n`);

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ⚠  ${w}\n`);
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ✖  ${e}\n`);
  console.log(`\nSoft-delete consistency check FAILED with ${errors.length} error(s).`);
  process.exit(1);
}

console.log('Soft-delete consistency check PASSED ✓');
process.exit(0);
