#!/usr/bin/env node
/**
 * detect-schema-drift.js
 *
 * Static analysis of migration SQL files to detect schema inconsistencies
 * without requiring a live database connection.
 *
 *   D1 — All *_at columns must use INTEGER type (ADR-012: ms since epoch)
 *   D2 — login_attempts TEXT timestamps pinned as WARN (known ADR-012 violation)
 *   D3 — Any FTS5 virtual table must have INSERT/UPDATE/DELETE sync triggers
 *   D4 — All Rust backend domains have at least one migration table
 *
 * Exit codes:
 *   0 – all checks passed (warnings may still be printed)
 *   1 – one or more errors found
 *
 * Usage:
 *   node scripts/detect-schema-drift.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT           = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'src-tauri', 'migrations');
const DOMAINS_DIR    = path.join(ROOT, 'src-tauri', 'src', 'domains');
// Initial bootstrap schema (ADR-010: fresh DBs init from this, then numbered migrations apply).
// Core tables (users, clients, tasks, interventions, etc.) are defined here, not in numbered migrations.
const SCHEMA_SQL     = path.join(ROOT, 'src-tauri', 'src', 'db', 'schema.sql');

// Tables whose *_at columns are known to use non-INTEGER types (legacy/known debt).
// Each entry: { table, columns: [...], migration, reason }
const KNOWN_TIMESTAMP_VIOLATIONS = [
  {
    table:     'login_attempts',
    columns:   ['first_attempt', 'last_attempt', 'lock_until', 'created_at', 'updated_at'],
    migration: '057_add_login_attempts_table.sql',
    reason:    'Created with TEXT timestamps; must be migrated to INTEGER (ms since epoch)',
  },
];

// Domain → expected table name(s). Used for D4 coverage check.
// Domains listed here must have at least one of their tables in the migrations.
const DOMAIN_TABLE_MAP = {
  auth:          ['users', 'sessions'],
  calendar:      ['user_settings'],     // calendar prefs stored in user_settings (migration 063)
  clients:       ['clients'],
  documents:     ['intervention_reports', 'photos'],
  interventions: ['interventions'],
  inventory:     ['materials', 'suppliers'],
  notifications: ['notifications'],
  quotes:        ['quotes', 'quote_items'],
  settings:      ['app_settings'],
  tasks:         ['tasks'],
  trash:         ['tasks', 'interventions'],  // trash queries existing tables
  users:         ['users'],
  organizations: ['organizations'],
};

const errors   = [];
const warnings = [];

function addError(msg)   { errors.push(msg); }
function addWarning(msg) { warnings.push(msg); }

// ─── SQL Parsing Helpers ──────────────────────────────────────────────────────

/**
 * Parse all CREATE TABLE blocks from SQL content.
 * Returns: Array of { table, columns: [{name, type}], file, lineStart }
 */
function parseCreateTables(content, filename) {
  const tables = [];
  // Match CREATE TABLE [IF NOT EXISTS] name (...)
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([^;]+?)\)\s*;/gis;
  let m;
  while ((m = tableRe.exec(content)) !== null) {
    const tableName = m[1];
    const body      = m[2];
    const lineStart = content.slice(0, m.index).split('\n').length;
    const columns   = parseColumns(body);
    tables.push({ table: tableName, columns, file: filename, lineStart });
  }
  return tables;
}

/**
 * Parse ALTER TABLE ... ADD COLUMN statements.
 * Returns: Array of { table, column: {name, type}, file, line }
 */
function parseAlterAddColumn(content, filename) {
  const results = [];
  const lines   = content.split('\n');
  // ALTER TABLE tbl ADD COLUMN [IF NOT EXISTS] col TYPE
  const re = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+(\w+)/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) {
      results.push({
        table:  m[1],
        column: { name: m[2], type: m[3].toUpperCase() },
        file:   filename,
        line:   i + 1,
      });
    }
  }
  return results;
}

/**
 * Crude column parser: split body on commas (ignoring nested parens),
 * extract name + type from each column definition.
 */
function parseColumns(body) {
  const cols = [];
  // Split on commas at depth 0
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '(') { depth++; current += ch; }
    else if (ch === ')') { depth--; current += ch; }
    else if (ch === ',' && depth === 0) {
      processColDef(current.trim(), cols);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) processColDef(current.trim(), cols);
  return cols;
}

function processColDef(def, cols) {
  // Skip constraint lines (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)
  if (/^\s*(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)/i.test(def)) return;
  // col_name TYPE [rest...]
  const m = def.trim().match(/^(\w+)\s+(\w+)/);
  if (m) cols.push({ name: m[1], type: m[2].toUpperCase() });
}

// ─── D1 + D2: Timestamp type consistency ─────────────────────────────────────

const KNOWN_VIOLATION_MAP = new Map(
  KNOWN_TIMESTAMP_VIOLATIONS.map((v) => [v.table, v])
);

/**
 * Check that all *_at columns are INTEGER (ADR-012).
 * Skips known violations (D2) and reports them as warnings instead.
 */
function checkTimestampTypes(allTables, allAlterCols) {
  const AT_COL_RE = /_at$/i;

  // Deduplicate: same table+column violation reported from both schema.sql and a migration
  const reportedErrors   = new Set(); // "table.col"
  const reportedWarnings = new Set(); // "table.col"

  // Check CREATE TABLE column definitions
  for (const { table, columns, file, lineStart } of allTables) {
    for (const col of columns) {
      if (!AT_COL_RE.test(col.name)) continue;
      if (col.type === 'INTEGER') continue;

      const key   = `${table}.${col.name}`;
      const known = KNOWN_VIOLATION_MAP.get(table);

      if (known && known.columns.includes(col.name)) {
        if (reportedWarnings.has(key)) continue;
        reportedWarnings.add(key);
        addWarning(
          `[ADR-012][KNOWN] D2 — ${table}.${col.name} uses ${col.type} instead of INTEGER\n` +
          `  ${file} (table "${table}", ~line ${lineStart})\n` +
          `  Reason: ${known.reason}\n` +
          `  → Add a follow-up migration to ALTER these columns to INTEGER (ms since epoch)`
        );
      } else {
        if (reportedErrors.has(key)) continue;
        reportedErrors.add(key);
        addError(
          `[ADR-012] D1 — Timestamp column '${col.name}' in table '${table}' uses ${col.type} instead of INTEGER\n` +
          `  ${file} (~line ${lineStart})\n` +
          `  → Per ADR-012 all *_at columns must be INTEGER (milliseconds since epoch)`
        );
      }
    }
  }

  // Check ALTER TABLE ADD COLUMN definitions
  for (const { table, column, file, line } of allAlterCols) {
    if (!AT_COL_RE.test(column.name)) continue;
    if (column.type === 'INTEGER') continue;

    const key   = `${table}.${column.name}`;
    const known = KNOWN_VIOLATION_MAP.get(table);

    if (known && known.columns.includes(column.name)) {
      if (reportedWarnings.has(key)) continue;
      reportedWarnings.add(key);
      addWarning(
        `[ADR-012][KNOWN] D2 — ${table}.${column.name} ALTER uses ${column.type} instead of INTEGER\n` +
        `  ${file}:${line}`
      );
    } else {
      if (reportedErrors.has(key)) continue;
      reportedErrors.add(key);
      addError(
        `[ADR-012] D1 — ALTER TABLE '${table}' adds '${column.name}' as ${column.type} instead of INTEGER\n` +
        `  ${file}:${line}\n` +
        `  → Per ADR-012 all *_at columns must be INTEGER (milliseconds since epoch)`
      );
    }
  }
}

// ─── D3: FTS5 sync triggers ───────────────────────────────────────────────────

/**
 * Any FTS5 virtual table must have all three sync triggers (INSERT, UPDATE, DELETE)
 * so the FTS5 index stays in sync with the base table.
 */
function checkFts5Triggers(allContent) {
  // Find FTS5 virtual tables: CREATE VIRTUAL TABLE name USING fts5(...)
  const fts5Re = /CREATE\s+VIRTUAL\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+USING\s+fts5\s*\(/gi;
  const fts5Tables = [];
  let m;
  while ((m = fts5Re.exec(allContent)) !== null) {
    fts5Tables.push(m[1].toLowerCase());
  }

  if (fts5Tables.length === 0) return; // no FTS5 tables — nothing to check

  // For each FTS5 table, find the underlying content table (content= param).
  // If not found, assume same name without _fts suffix.
  for (const ftsTable of fts5Tables) {
    // Try to infer the base table name from content= parameter
    const contentRe = new RegExp(`${ftsTable}[^;]*content\\s*=\\s*['"](\\w+)['"]`, 'i');
    const baseMatch = allContent.match(contentRe);
    const baseTable = baseMatch ? baseMatch[1].toLowerCase() : ftsTable.replace(/_fts$/, '');

    // Check for all three sync triggers on the base table
    const triggerTypes = ['insert', 'update', 'delete'];
    const missing = [];
    for (const triggerType of triggerTypes) {
      const triggerRe = new RegExp(
        `CREATE\\s+TRIGGER[^;]*AFTER\\s+${triggerType}\\s+ON\\s+${baseTable}`,
        'i'
      );
      if (!triggerRe.test(allContent)) {
        missing.push(triggerType.toUpperCase());
      }
    }

    if (missing.length > 0) {
      addError(
        `[ADR] D3 — FTS5 table '${ftsTable}' (base: '${baseTable}') is missing sync triggers:\n` +
        `  Missing: ${missing.join(', ')}\n` +
        `  → Add AFTER ${missing.join('/')} ON ${baseTable} triggers to keep the FTS5 index in sync`
      );
    }
  }
}

// ─── D4: Domain coverage ──────────────────────────────────────────────────────

/**
 * All Rust domains must have at least one table present in the migrations.
 */
function checkDomainCoverage(allTableNames) {
  const tableSet = new Set(allTableNames.map((t) => t.toLowerCase()));

  // Collect domain directories that exist on disk
  if (!fs.existsSync(DOMAINS_DIR)) return;
  const domainDirs = fs
    .readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const domain of domainDirs) {
    const expected = DOMAIN_TABLE_MAP[domain];
    if (!expected) {
      // Unknown domain — no mapping defined yet, skip silently
      continue;
    }
    const found = expected.some((t) => tableSet.has(t));
    if (!found) {
      addWarning(
        `[ADR-010] D4 — Domain '${domain}' has no migration table\n` +
        `  Expected one of: ${expected.join(', ')}\n` +
        `  → Add DOMAIN_TABLE_MAP entry in detect-schema-drift.js or create a migration`
      );
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

// Aggregate data across all SQL sources:
// 1. schema.sql (bootstrap — core tables live here per ADR-010)
// 2. Numbered migration files
const allTables    = [];
const allAlterCols = [];
let   combinedSQL  = '';

if (fs.existsSync(SCHEMA_SQL)) {
  const schemaContent = fs.readFileSync(SCHEMA_SQL, 'utf8');
  combinedSQL += schemaContent + '\n';
  for (const t of parseCreateTables(schemaContent, 'src-tauri/src/db/schema.sql')) allTables.push(t);
}

for (const filename of allFiles) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const content  = fs.readFileSync(fullPath, 'utf8');
  combinedSQL   += content + '\n';

  for (const t of parseCreateTables(content, filename)) allTables.push(t);
  for (const a of parseAlterAddColumn(content, filename)) allAlterCols.push(a);
}

// Run all checks
checkTimestampTypes(allTables, allAlterCols);
checkFts5Triggers(combinedSQL);
checkDomainCoverage(allTables.map((t) => t.table));

// ─── Report ───────────────────────────────────────────────────────────────────

console.log('\n── Schema Drift Detection ──────────────────────────────────');
console.log(`Parsed ${allFiles.length} migration files, found ${allTables.length} CREATE TABLE statements.\n`);

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ⚠  ${w}\n`);
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ✖  ${e}\n`);
  console.log(`\nSchema drift detection FAILED with ${errors.length} error(s).`);
  process.exit(1);
}

console.log('Schema drift detection PASSED ✓');
process.exit(0);
