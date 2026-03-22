#!/usr/bin/env node
/**
 * adr-guard.js
 *
 * Orchestration guard: runs all registered ADR compliance detectors in
 * sequence and produces a unified pass/fail report.
 *
 * Each detector is a standalone Node script that:
 *  - Writes human-readable output to stdout
 *  - Exits 0 (pass) or 1 (fail)
 *
 * Usage:
 *   node scripts/adr-guard.js [--strict] [--only=id1,id2] [--list] [--quiet]
 *
 * Options:
 *   --strict        Pass --strict to sub-scripts that support it (warnings → errors)
 *   --only=a,b,...  Run only the named check IDs (comma-separated)
 *   --list          Print available checks and exit
 *   --quiet         Suppress output from passing checks; only show failing output
 */

'use strict';

const { spawnSync } = require('child_process');
const path          = require('path');
const fs            = require('fs');

// ─── ANSI colours (disabled if not a TTY) ────────────────────────────────────

const isTTY   = process.stdout.isTTY;
const c = {
  reset:  isTTY ? '\x1b[0m'  : '',
  bold:   isTTY ? '\x1b[1m'  : '',
  dim:    isTTY ? '\x1b[2m'  : '',
  green:  isTTY ? '\x1b[32m' : '',
  red:    isTTY ? '\x1b[31m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  cyan:   isTTY ? '\x1b[36m' : '',
  white:  isTTY ? '\x1b[37m' : '',
};

// ─── Check Registry ───────────────────────────────────────────────────────────
//
// To add a new detector:
//   1. Create scripts/<your-script>.js (exit 0 = pass, exit 1 = fail)
//   2. Add an entry below with a unique `id`, human `name`, the `script`
//      filename, and the `adrs` it enforces.
//   3. Optionally add `args: ['--flag']` for extra CLI arguments.
//   4. Set `strictSupported: true` if the script respects the --strict flag.

const CHECKS = [
  // ── Migration & Schema ─────────────────────────────────────────────────────
  {
    id:              'migration-system',
    name:            'Migration system integrity',
    script:          'validate-migration-system.js',
    adrs:            ['ADR-010'],
    description:     'Naming format, sequential numbering, idempotency (IF NOT EXISTS)',
    strictSupported: false,
  },
  {
    id:              'schema-drift',
    name:            'Schema drift detection',
    script:          'detect-schema-drift.js',
    adrs:            ['ADR-012'],
    description:     '*_at columns must be INTEGER; FTS5 sync triggers; domain table coverage',
    strictSupported: false,
  },
  {
    id:              'soft-delete',
    name:            'Soft-delete consistency',
    script:          'check-soft-delete-consistency.js',
    adrs:            ['ADR-011'],
    description:     'deleted_at partial indexes; IS NULL in query builders; no = NULL anti-pattern',
    strictSupported: false,
  },

  // ── Type System ────────────────────────────────────────────────────────────
  {
    id:              'ts-rs-coverage',
    name:            'ts-rs type export coverage',
    script:          'check-ts-rs-coverage.js',
    adrs:            ['ADR-015'],
    description:     'All exported types have #[derive(TS)]; IPC return types are registered',
    strictSupported: false,
  },
  {
    id:              'type-duplicates',
    name:            'Frontend type deduplication',
    script:          'validate-types.js',
    adrs:            ['ADR-015'],
    description:     'No manual TS type redefinition vs auto-generated backend types',
    strictSupported: false,
  },

  // ── Architecture ───────────────────────────────────────────────────────────
  {
    id:              'backend-architecture',
    name:            'Backend architecture layers',
    script:          'backend-architecture-check.js',
    adrs:            ['ADR-001', 'ADR-002', 'ADR-005', 'ADR-006'],
    description:     'Layer isolation; no SQL in domain/app/ipc; cross-domain imports; resolve_context!; pub use internals',
    strictSupported: true,
  },
  {
    id:              'frontend-guard',
    name:            'Frontend IPC patterns',
    script:          'frontend-guard.js',
    adrs:            ['ADR-013'],
    description:     'UI code calls typed IPC wrappers; no raw tauri.invoke',
    strictSupported: false,
  },
];

// ─── CLI parsing ─────────────────────────────────────────────────────────────

const args         = process.argv.slice(2);
const STRICT       = args.includes('--strict');
const QUIET        = args.includes('--quiet');
const LIST_ONLY    = args.includes('--list');
const ONLY_ARG     = args.find((a) => a.startsWith('--only='));
const ONLY_IDS     = ONLY_ARG ? new Set(ONLY_ARG.replace('--only=', '').split(',')) : null;

if (LIST_ONLY) {
  console.log(`\n${c.bold}Available ADR compliance checks:${c.reset}\n`);
  const maxName = Math.max(...CHECKS.map((c) => c.name.length));
  for (const check of CHECKS) {
    const pad  = ' '.repeat(maxName - check.name.length);
    const adrs = check.adrs.join(', ');
    console.log(`  ${c.cyan}${check.id.padEnd(22)}${c.reset} ${check.name}${pad}  ${c.dim}[${adrs}]${c.reset}`);
    console.log(`  ${' '.repeat(22)} ${c.dim}${check.description}${c.reset}`);
  }
  console.log('');
  process.exit(0);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const SCRIPTS_DIR = __dirname;
const NODE        = process.execPath;

const results = [];
let   anyFailed = false;

const activeChecks = ONLY_IDS
  ? CHECKS.filter((c) => ONLY_IDS.has(c.id))
  : CHECKS;

if (activeChecks.length === 0) {
  console.error(`${c.red}ERROR: No checks matched --only filter.${c.reset}`);
  console.error(`Run with --list to see available check IDs.`);
  process.exit(1);
}

// Print header
console.log(`\n${c.bold}╔══ ADR Guard ─── ${activeChecks.length} check(s)${STRICT ? '  [strict]' : ''} ══════════════════════════════╗${c.reset}`);
console.log(`${c.bold}║${c.reset}  ADRs covered: ${[...new Set(activeChecks.flatMap((c) => c.adrs))].join(', ')}`);
console.log(`${c.bold}╚════════════════════════════════════════════════════════════════╝${c.reset}\n`);

const startAll = Date.now();

for (const check of activeChecks) {
  const scriptPath = path.join(SCRIPTS_DIR, check.script);

  if (!fs.existsSync(scriptPath)) {
    results.push({ check, status: 'missing', output: '', durationMs: 0 });
    anyFailed = true;
    console.log(`${c.red}✖ MISSING${c.reset}  ${check.name}  ${c.dim}(${check.script} not found)${c.reset}`);
    continue;
  }

  // Build args for sub-script
  const extraArgs = [];
  if (STRICT && check.strictSupported) extraArgs.push('--strict');

  const start  = Date.now();
  const result = spawnSync(NODE, [scriptPath, ...extraArgs], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  });
  const durationMs = Date.now() - start;

  const output  = (result.stdout || '') + (result.stderr || '');
  const passed  = result.status === 0;

  if (!passed) anyFailed = true;

  const statusLabel = passed
    ? `${c.green}✔ PASS${c.reset}   `
    : `${c.red}✖ FAIL${c.reset}   `;

  const adrsLabel = `${c.dim}[${check.adrs.join(', ')}]${c.reset}`;
  const timeLabel = `${c.dim}${durationMs}ms${c.reset}`;

  console.log(`${statusLabel} ${c.bold}${check.name}${c.reset}  ${adrsLabel}  ${timeLabel}`);

  // Show output for failing checks always; for passing checks only if not --quiet
  if (!passed || !QUIET) {
    // Indent sub-script output for readability
    const indented = output
      .split('\n')
      .map((l) => `         ${l}`)
      .join('\n')
      .trimEnd();
    if (indented.trim()) {
      console.log(indented);
      console.log('');
    }
  }

  results.push({ check, status: passed ? 'pass' : 'fail', output, durationMs });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const totalMs  = Date.now() - startAll;
const passed   = results.filter((r) => r.status === 'pass').length;
const failed   = results.filter((r) => r.status === 'fail').length;
const missing  = results.filter((r) => r.status === 'missing').length;

console.log(`\n${c.bold}── ADR Guard Summary ────────────────────────────────────────────${c.reset}`);
console.log(`Ran ${activeChecks.length} check(s) in ${totalMs}ms\n`);

for (const { check, status, durationMs } of results) {
  const icon =
    status === 'pass'    ? `${c.green}✔${c.reset}` :
    status === 'missing' ? `${c.yellow}?${c.reset}` :
                           `${c.red}✖${c.reset}`;
  const label =
    status === 'pass'    ? `${c.green}PASS${c.reset}` :
    status === 'missing' ? `${c.yellow}MISS${c.reset}` :
                           `${c.red}FAIL${c.reset}`;
  console.log(
    `  ${icon} ${label}  ${check.name.padEnd(34)}` +
    `${c.dim}[${check.adrs.join(', ')}]  ${durationMs}ms${c.reset}`
  );
}

console.log('');

if (anyFailed) {
  const parts = [];
  if (failed)  parts.push(`${c.red}${failed} failed${c.reset}`);
  if (missing) parts.push(`${c.yellow}${missing} missing${c.reset}`);
  console.log(`${c.bold}${c.red}ADR Guard FAILED${c.reset} — ${parts.join(', ')} out of ${activeChecks.length} checks.`);
  if (!STRICT) {
    console.log(`${c.dim}Tip: run with --strict to also fail on warnings.${c.reset}`);
  }
  process.exit(1);
} else {
  console.log(`${c.bold}${c.green}ADR Guard PASSED${c.reset} — all ${passed} check(s) clean.`);
  if (!STRICT) {
    console.log(`${c.dim}Tip: run with --strict to also fail on warnings.${c.reset}`);
  }
  process.exit(0);
}
