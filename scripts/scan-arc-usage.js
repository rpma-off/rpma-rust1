#!/usr/bin/env node
/**
 * scan-arc-usage.js
 *
 * Scans all *.rs files under src-tauri/src/ and reports every line that
 * references `Arc`, categorized by kind:
 *
 *   import       — `use std::sync::Arc` (or destructured import)
 *   type         — `Arc<…>` used as a type (struct field, fn param, return)
 *   construction — `Arc::new(…)` or `Arc::clone(…)` call sites
 *   clone        — `.clone()` on a line that also contains `Arc<` (heuristic;
 *                  best-effort — may include unrelated `.clone()` calls that
 *                  happen to co-occur with an Arc type annotation on the same
 *                  line)
 *   other        — any other line containing the token `Arc`
 *
 * Output modes:
 *   (default)   — grouped by file, each hit on one line
 *   --summary   — one totals table only (no per-file detail)
 *   --json      — machine-readable JSON to stdout
 *
 * Exit code: always 0 (informational scan, not a gate).
 *
 * Usage:
 *   node scripts/scan-arc-usage.js [--summary] [--json]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT    = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src-tauri', 'src');

const SUMMARY = process.argv.includes('--summary');
const AS_JSON = process.argv.includes('--json');

// Compiled once and reused across the entire scan.
const ARC_PATTERN = /\bArc\b/;

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

/**
 * Classify a single source line that is known to contain "Arc".
 *
 * @param {string} line  – raw source line (not trimmed)
 * @returns {'import'|'construction'|'clone'|'type'|'other'}
 */
function classify(line) {
  const t = line.trim();

  // Import statement
  if (/^\s*use\s+.*\bArc\b/.test(line)) return 'import';

  // Arc::new(…) or Arc::clone(…)
  if (/\bArc::(new|clone)\s*\(/.test(line)) return 'construction';

  // .clone() on a variable (best-effort: only when `Arc` also appears on the
  // same line, e.g. `let x: Arc<Foo> = repo.clone();`)
  if (/\.clone\(\)/.test(line) && /Arc</.test(line)) return 'clone';

  // Type annotation: Arc<…>
  if (/\bArc\s*</.test(line)) return 'type';

  return 'other';
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SRC_DIR)) {
  console.error(`ERROR: source directory not found at ${SRC_DIR}`);
  process.exit(1);
}

const files = collectRustFiles(SRC_DIR);

/**
 * @type {Array<{
 *   file: string,
 *   lineNo: number,
 *   kind: string,
 *   text: string
 * }>}
 */
const hits = [];

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (ARC_PATTERN.test(lines[i])) {
      hits.push({
        file:   path.relative(ROOT, file),
        lineNo: i + 1,
        kind:   classify(lines[i]),
        text:   lines[i].trim(),
      });
    }
  }
}

// ─── JSON output ─────────────────────────────────────────────────────────────

if (AS_JSON) {
  process.stdout.write(JSON.stringify(hits, null, 2) + '\n');
  process.exit(0);
}

// ─── Totals ───────────────────────────────────────────────────────────────────

const KINDS = ['import', 'type', 'construction', 'clone', 'other'];

const totals = Object.fromEntries(KINDS.map((k) => [k, 0]));
for (const h of hits) totals[h.kind]++;

// ─── Detailed output ─────────────────────────────────────────────────────────

if (!SUMMARY) {
  // Group hits by file
  /** @type {Map<string, typeof hits>} */
  const byFile = new Map();
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h);
  }

  console.log(`\n── Arc Usage Scan: src-tauri/src/ ${'─'.repeat(30)}`);
  console.log(`   Scanned ${files.length} Rust source files\n`);

  for (const [file, fileHits] of byFile) {
    console.log(`  ${file}  (${fileHits.length} hit${fileHits.length === 1 ? '' : 's'})`);
    for (const h of fileHits) {
      const tag = h.kind.padEnd(12);
      console.log(`    L${String(h.lineNo).padStart(4)}  [${tag}]  ${h.text}`);
    }
    console.log('');
  }
}

// ─── Summary table ────────────────────────────────────────────────────────────

const filesWithArc = new Set(hits.map((h) => h.file)).size;

console.log(`── Arc Usage Summary ${'─'.repeat(40)}`);
console.log(`  Files with Arc : ${filesWithArc} / ${files.length}`);
console.log(`  Total hits     : ${hits.length}`);
console.log('');
console.log('  Kind          Count');
console.log('  ────────────  ─────');
for (const k of KINDS) {
  console.log(`  ${k.padEnd(12)}  ${String(totals[k]).padStart(5)}`);
}
console.log('');

process.exit(0);
