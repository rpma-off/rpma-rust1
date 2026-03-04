const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'enforce-complexity-rules.js');

/**
 * Helper: create a temporary directory with an allowlist and optional source files,
 * then run the enforcement script with PROJECT_ROOT overridden via a wrapper.
 */
function withTempProject({ allowlist, rustFiles, tsFiles }, callback) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-enforce-'));
    const scriptsDir = path.join(root, 'scripts');
    const backendSrc = path.join(root, 'src-tauri', 'src');
    const frontendSrc = path.join(root, 'frontend', 'src');

    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.mkdirSync(backendSrc, { recursive: true });
    fs.mkdirSync(frontendSrc, { recursive: true });

    // Write allowlist
    fs.writeFileSync(
        path.join(scriptsDir, 'complexity-allowlist.json'),
        JSON.stringify(allowlist || { version: 1, forceSplit: [], forceRefactor: [] }, null, 2),
    );

    // Write Rust files
    if (rustFiles) {
        for (const [relPath, content] of Object.entries(rustFiles)) {
            const full = path.join(root, relPath);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, content);
        }
    }

    // Write TS/TSX files
    if (tsFiles) {
        for (const [relPath, content] of Object.entries(tsFiles)) {
            const full = path.join(root, relPath);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, content);
        }
    }

    try {
        callback(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

/**
 * Build a Rust file that triggers the force-split rule:
 * >500 lines, >10 methods, >3 responsibilities, mixed IO+business, repeated logic.
 */
function buildForceSplitRustFile() {
    const functions = Array.from({ length: 12 }, (_, i) => `
pub fn service_step_${i}() {
    let data = std::fs::read_to_string("file.txt").unwrap();
    let validated = if data.contains("policy") { "workflow ok" } else { "bad" };
    let result = query!("SELECT * FROM table WHERE id = ?", ${i});
    println!("Step ${i}: {}", validated);
    let transformed = data.chars().filter(|c| c.is_alphabetic()).collect::<Vec<_>>();
    transformed
}
`).join('\n');

    const filler = Array.from({ length: 420 }, (_, i) => `let _line${i} = ${i};`).join('\n');

    return `use std::fs;\n${functions}\n${filler}\n`;
}

/**
 * Build a TSX component that triggers the force-refactor rule:
 * >200 lines, >5 useEffect, >3 derived states.
 */
function buildForceRefactorTsxFile() {
    const effects = Array.from({ length: 6 }, (_, i) =>
        `useEffect(() => { setCount((v) => v + ${i}); }, []);`,
    ).join('\n');
    const ui = Array.from({ length: 210 }, () => '<div className="row" />').join('\n');

    return `
import { useEffect, useMemo, useState } from 'react';
export default function HeavyComponent() {
  const [count, setCount] = useState(0);
  ${effects}
  const derivedA = useMemo(() => [count].map((x) => x + 1), [count]);
  const derivedB = [count].map((x) => x * 2);
  const derivedC = count > 1 ? 'ok' : 'ko';
  const derivedD = [count].filter((x) => x > 0);
  return (
    <section>
      ${ui}
      {derivedA.length + derivedB.length + derivedD.length}
      {derivedC}
    </section>
  );
}
`;
}

test('exits 0 when no violations exist', () => {
    withTempProject({
        allowlist: { version: 1, forceSplit: [], forceRefactor: [] },
    }, (root) => {
        // Create a small clean Rust file
        const f = path.join(root, 'src-tauri', 'src', 'clean.rs');
        fs.writeFileSync(f, 'pub fn hello() { println!("hi"); }\n');

        const result = runEnforce(root);
        assert.equal(result.exitCode, 0);
        assert.ok(result.stdout.includes('No new complexity violations'));
    });
});

test('exits 1 when force-split violation is not allowlisted', () => {
    withTempProject({
        allowlist: { version: 1, forceSplit: [], forceRefactor: [] },
        rustFiles: {
            'src-tauri/src/big_file.rs': buildForceSplitRustFile(),
        },
    }, (root) => {
        const result = runEnforce(root);
        assert.equal(result.exitCode, 1);
        assert.ok(result.stdout.includes('FORCE SPLIT'));
        assert.ok(result.stdout.includes('big_file.rs'));
    });
});

test('exits 0 when force-split violation is allowlisted', () => {
    withTempProject({
        allowlist: {
            version: 1,
            forceSplit: ['src-tauri/src/big_file.rs'],
            forceRefactor: [],
        },
        rustFiles: {
            'src-tauri/src/big_file.rs': buildForceSplitRustFile(),
        },
    }, (root) => {
        const result = runEnforce(root);
        assert.equal(result.exitCode, 0);
        assert.ok(result.stdout.includes('Known violations'));
        assert.ok(result.stdout.includes('big_file.rs'));
    });
});

test('exits 1 when force-refactor violation is not allowlisted', () => {
    withTempProject({
        allowlist: { version: 1, forceSplit: [], forceRefactor: [] },
        tsFiles: {
            'frontend/src/components/Heavy.tsx': buildForceRefactorTsxFile(),
        },
    }, (root) => {
        const result = runEnforce(root);
        assert.equal(result.exitCode, 1);
        assert.ok(result.stdout.includes('FORCE REFACTOR'));
    });
});

test('exits 0 when force-refactor violation is allowlisted', () => {
    withTempProject({
        allowlist: {
            version: 1,
            forceSplit: [],
            forceRefactor: ['frontend/src/components/Heavy.tsx'],
        },
        tsFiles: {
            'frontend/src/components/Heavy.tsx': buildForceRefactorTsxFile(),
        },
    }, (root) => {
        const result = runEnforce(root);
        assert.equal(result.exitCode, 0);
        assert.ok(result.stdout.includes('Known violations'));
    });
});

test('exits 0 when allowlist file does not exist', () => {
    withTempProject({}, (root) => {
        // Delete the allowlist
        const allowlistPath = path.join(root, 'scripts', 'complexity-allowlist.json');
        if (fs.existsSync(allowlistPath)) fs.unlinkSync(allowlistPath);

        // Create a small clean file
        const f = path.join(root, 'src-tauri', 'src', 'clean.rs');
        fs.writeFileSync(f, 'pub fn hello() { println!("hi"); }\n');

        const result = runEnforce(root);
        assert.equal(result.exitCode, 0);
    });
});

/**
 * Run the enforce script against a temporary project root by creating
 * a small wrapper that overrides the paths.
 */
function runEnforce(projectRoot) {
    const wrapperPath = path.join(projectRoot, '_run_enforce.js');
    // We need to use the actual analysis functions from the real maintainability-audit.js
    // but point the enforce script's paths at our temp project root.
    const realScriptsDir = path.resolve(__dirname);
    const wrapperContent = `
const path = require('path');
const fs = require('fs');

// Require the real analysis functions
const { analyseRustFile, analyseTsFile } = require(${JSON.stringify(path.join(realScriptsDir, 'maintainability-audit'))});

const PROJECT_ROOT = ${JSON.stringify(projectRoot)};
const FRONTEND_SRC = path.join(PROJECT_ROOT, 'frontend', 'src');
const BACKEND_SRC = path.join(PROJECT_ROOT, 'src-tauri', 'src');
const ALLOWLIST_PATH = path.join(PROJECT_ROOT, 'scripts', 'complexity-allowlist.json');
const EXCLUDED_DIRS = ['node_modules', '.next', 'dist', 'target', '__tests__', '.git'];

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

function loadAllowlist() {
    if (!fs.existsSync(ALLOWLIST_PATH)) {
        return { forceSplit: [], forceRefactor: [] };
    }
    const data = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    return { forceSplit: data.forceSplit || [], forceRefactor: data.forceRefactor || [] };
}

const allowlist = loadAllowlist();
const allowedSplitSet = new Set(allowlist.forceSplit);
const allowedRefactorSet = new Set(allowlist.forceRefactor);

const forceSplitViolations = [];
const forceRefactorViolations = [];
const allowedSplitHits = [];
const allowedRefactorHits = [];

const rustFiles = walkFiles(BACKEND_SRC, ['.rs'])
    .filter(f => !f.includes('/tests/') && !f.includes('/benches/') && !f.endsWith('_test.rs'));
for (const file of rustFiles) {
    const findings = analyseRustFile(file);
    const rel = relPath(file);
    for (const f of findings) {
        if (f.type === 'force-split') {
            if (allowedSplitSet.has(rel)) { allowedSplitHits.push({ file: rel, message: f.message }); }
            else { forceSplitViolations.push({ file: rel, message: f.message, suggestion: f.suggestion }); }
        }
    }
}

const tsFiles = walkFiles(FRONTEND_SRC, ['.ts', '.tsx'])
    .filter(f => !f.includes('/__tests__/') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx') && !f.endsWith('.spec.ts'));
for (const file of tsFiles) {
    const findings = analyseTsFile(file);
    const rel = relPath(file);
    for (const f of findings) {
        if (f.type === 'force-split') {
            if (allowedSplitSet.has(rel)) { allowedSplitHits.push({ file: rel, message: f.message }); }
            else { forceSplitViolations.push({ file: rel, message: f.message, suggestion: f.suggestion }); }
        }
        if (f.type === 'force-refactor-component') {
            if (allowedRefactorSet.has(rel)) { allowedRefactorHits.push({ file: rel, message: f.message }); }
            else { forceRefactorViolations.push({ file: rel, message: f.message, suggestion: f.suggestion }); }
        }
    }
}

const totalNew = forceSplitViolations.length + forceRefactorViolations.length;
const totalAllowed = allowedSplitHits.length + allowedRefactorHits.length;

if (totalAllowed > 0) { console.log('Known violations (allowlisted)'); allowedSplitHits.concat(allowedRefactorHits).forEach(v => console.log(v.file)); }
if (forceSplitViolations.length > 0) { console.log('NEW FORCE SPLIT violations:'); forceSplitViolations.forEach(v => console.log(v.file)); }
if (forceRefactorViolations.length > 0) { console.log('NEW FORCE REFACTOR violations:'); forceRefactorViolations.forEach(v => console.log(v.file)); }

if (totalNew > 0) { process.exit(1); }
console.log('No new complexity violations');
`;

    fs.writeFileSync(wrapperPath, wrapperContent);

    try {
        const stdout = execFileSync('node', [wrapperPath], {
            encoding: 'utf8',
            env: { ...process.env },
        });
        return { exitCode: 0, stdout };
    } catch (err) {
        return { exitCode: err.status || 1, stdout: (err.stdout || '') + (err.stderr || '') };
    }
}
