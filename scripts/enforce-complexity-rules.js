#!/usr/bin/env node

/**
 * RPMA v2 Complexity Enforcement Script
 *
 * Enforces two hard rules that block CI when violated:
 *
 * FORCE SPLIT (backend + frontend files):
 *   - >500 lines
 *   - >10 methods
 *   - >3 responsibilities
 *   - mixes IO + business logic
 *   - contains repeated logic
 *
 * FORCE REFACTOR (React components):
 *   - >200 lines
 *   - >5 useEffect
 *   - >3 derived states
 *
 * New violations NOT in the allowlist cause a hard failure (exit 1).
 * Existing violations tracked in complexity-allowlist.json are permitted
 * but logged as warnings to encourage progressive cleanup.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const {
    analyseRustFile,
    analyseTsFile,
} = require('./maintainability-audit');

// ─── Configuration ────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.join(__dirname, '..');
const FRONTEND_SRC = path.join(PROJECT_ROOT, 'frontend', 'src');
const BACKEND_SRC = path.join(PROJECT_ROOT, 'src-tauri', 'src');
const ALLOWLIST_PATH = path.join(__dirname, 'complexity-allowlist.json');

const EXCLUDED_DIRS = ['node_modules', '.next', 'dist', 'target', '__tests__', '.git'];

// ─── Colour helpers ───────────────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

function colour(text, ...codes) {
    return codes.join('') + text + C.reset;
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function walkFiles(dir, extensions) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (EXCLUDED_DIRS.includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkFiles(full, extensions));
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            results.push(full);
        }
    }
    return results;
}

function relPath(filePath) {
    return path.relative(PROJECT_ROOT, filePath);
}

// ─── Allowlist management ─────────────────────────────────────────────────────

function loadAllowlist() {
    if (!fs.existsSync(ALLOWLIST_PATH)) {
        return { forceSplit: [], forceRefactor: [] };
    }
    const data = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    return {
        forceSplit: data.forceSplit || [],
        forceRefactor: data.forceRefactor || [],
    };
}

// ─── Main enforcement ─────────────────────────────────────────────────────────

function enforce() {
    console.log(colour('\n🔒 RPMA v2 Complexity Rules Enforcement', C.bold, C.cyan));
    console.log(colour('═'.repeat(60), C.dim));

    const allowlist = loadAllowlist();
    const allowedSplitSet = new Set(allowlist.forceSplit);
    const allowedRefactorSet = new Set(allowlist.forceRefactor);

    const forceSplitViolations = [];     // NEW violations (not in allowlist)
    const forceRefactorViolations = [];  // NEW violations (not in allowlist)
    const allowedSplitHits = [];         // Known violations (in allowlist)
    const allowedRefactorHits = [];      // Known violations (in allowlist)

    // --- Analyse Rust files ---
    const rustFiles = walkFiles(BACKEND_SRC, ['.rs'])
        .filter(f => !f.includes('/tests/') && !f.includes('/benches/') && !f.endsWith('_test.rs'));

    for (const file of rustFiles) {
        const findings = analyseRustFile(file);
        const rel = relPath(file);
        for (const f of findings) {
            if (f.type === 'force-split') {
                if (allowedSplitSet.has(rel)) {
                    allowedSplitHits.push({ file: rel, message: f.message });
                } else {
                    forceSplitViolations.push({ file: rel, message: f.message, suggestion: f.suggestion });
                }
            }
        }
    }

    // --- Analyse TypeScript / TSX files ---
    const tsFiles = walkFiles(FRONTEND_SRC, ['.ts', '.tsx'])
        .filter(f => !f.includes('/__tests__/') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx') && !f.endsWith('.spec.ts'));

    for (const file of tsFiles) {
        const findings = analyseTsFile(file);
        const rel = relPath(file);
        for (const f of findings) {
            if (f.type === 'force-split') {
                if (allowedSplitSet.has(rel)) {
                    allowedSplitHits.push({ file: rel, message: f.message });
                } else {
                    forceSplitViolations.push({ file: rel, message: f.message, suggestion: f.suggestion });
                }
            }
            if (f.type === 'force-refactor-component') {
                if (allowedRefactorSet.has(rel)) {
                    allowedRefactorHits.push({ file: rel, message: f.message });
                } else {
                    forceRefactorViolations.push({ file: rel, message: f.message, suggestion: f.suggestion });
                }
            }
        }
    }

    // --- Print results ---
    const totalNew = forceSplitViolations.length + forceRefactorViolations.length;
    const totalAllowed = allowedSplitHits.length + allowedRefactorHits.length;

    if (allowedSplitHits.length > 0 || allowedRefactorHits.length > 0) {
        console.log(colour(`\n⚠️  Known violations (allowlisted – ${totalAllowed} files):`, C.yellow));
        for (const v of [...allowedSplitHits, ...allowedRefactorHits]) {
            console.log(colour(`    ${v.file}`, C.dim));
        }
    }

    if (forceSplitViolations.length > 0) {
        console.log(colour('\n🔴 NEW FORCE SPLIT violations:', C.bold, C.red));
        console.log(colour('   Files that exceed ALL thresholds: >500 lines, >10 methods,', C.dim));
        console.log(colour('   >3 responsibilities, mixed IO+business, repeated logic', C.dim));
        console.log(colour('─'.repeat(60), C.dim));
        for (const v of forceSplitViolations) {
            console.log(colour(`  ✖ ${v.file}`, C.red));
            console.log(colour(`    ${v.message}`, C.dim));
            console.log(colour(`    💡 ${v.suggestion}`, C.dim));
        }
    }

    if (forceRefactorViolations.length > 0) {
        console.log(colour('\n🔴 NEW FORCE REFACTOR violations:', C.bold, C.red));
        console.log(colour('   Components that exceed ALL thresholds: >200 lines,', C.dim));
        console.log(colour('   >5 useEffect, >3 derived states', C.dim));
        console.log(colour('─'.repeat(60), C.dim));
        for (const v of forceRefactorViolations) {
            console.log(colour(`  ✖ ${v.file}`, C.red));
            console.log(colour(`    ${v.message}`, C.dim));
            console.log(colour(`    💡 ${v.suggestion}`, C.dim));
        }
    }

    // --- Summary ---
    console.log('\n' + colour('═'.repeat(60), C.dim));
    console.log(colour('📊 COMPLEXITY ENFORCEMENT SUMMARY', C.bold));
    console.log(`  Allowlisted violations : ${colour(String(totalAllowed), C.yellow)}`);
    console.log(`  New violations         : ${colour(String(totalNew), totalNew > 0 ? C.red : C.green)}`);

    if (totalNew > 0) {
        console.log(colour(`\n❌ ${totalNew} new complexity violation(s) detected.`, C.bold, C.red));
        console.log(colour('   Split oversized files or refactor complex components before merging.', C.dim));
        console.log(colour('═'.repeat(60), C.dim));
        process.exit(1);
    }

    console.log(colour('\n✅ No new complexity violations. All rules pass.', C.bold, C.green));
    console.log(colour('═'.repeat(60), C.dim));
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (require.main === module) {
    enforce();
}

module.exports = { enforce };
